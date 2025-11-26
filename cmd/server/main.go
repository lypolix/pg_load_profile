package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/joho/godotenv"
	
	// Замените на ваш реальный путь
	"github.com/lypolix/pg_load_profile/internal/analyzer"
	"github.com/lypolix/pg_load_profile/internal/collector"
	"github.com/lypolix/pg_load_profile/internal/generator"
	"github.com/lypolix/pg_load_profile/internal/models"
	"github.com/lypolix/pg_load_profile/internal/storage"
)

// ScenarioInfo хранит правду о том, что мы запустили
type ScenarioInfo struct {
	Mode      string    `json:"mode"`
	Intensity string    `json:"intensity"`
	StartTime time.Time `json:"start_time"`
}

type GlobalState struct {
	mu              sync.RWMutex
	LatestDiagnosis analyzer.Diagnosis
	LastUpdate      time.Time
	// Новое поле: храним последний запущенный сценарий
	CurrentScenario *ScenarioInfo
}

var state GlobalState

func main() {
	_ = godotenv.Load()

	pool, err := storage.ConnectDB()
	if err != nil {
		log.Fatalf("Failed to connect to DB: %v", err)
	}
	defer pool.Close()
	fmt.Println("Connected to PostgreSQL successfully.")

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	coll := collector.NewCollector(pool)
	coll.Start(ctx)
	fmt.Println("Collector started. Gathering data...")

	calc := analyzer.NewCalculator(pool)

	go func() {
		ticker := time.NewTicker(5 * time.Second)
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				metrics, err := calc.CalculateMetrics(ctx, 30*time.Second)
				if err != nil {
					log.Printf("[ERROR] Calculating metrics: %v", err)
					continue
				}

				diagnosis := analyzer.ClassifyWorkload(metrics)

				state.mu.Lock()
				state.LatestDiagnosis = diagnosis
				state.LastUpdate = time.Now()
				state.mu.Unlock()

				printMetricsToConsole(metrics, diagnosis)
			}
		}
	}()

	setupHTTPServer()
	select {}
}

func setupHTTPServer() {
	// GET /run?mode=oltp&intensity=8
	http.HandleFunc("/run", func(w http.ResponseWriter, r *http.Request) {
		mode := r.URL.Query().Get("mode")
		intensity := r.URL.Query().Get("intensity")

		if mode == "" {
			http.Error(w, "Usage: /run?mode=[oltp|olap|...]&intensity=[1-8]", http.StatusBadRequest)
			return
		}
		if intensity == "" {
			intensity = "4"
		}

		// 1. Сохраняем "Правду" (Ground Truth)
		state.mu.Lock()
		state.CurrentScenario = &ScenarioInfo{
			Mode:      mode,
			Intensity: intensity,
			StartTime: time.Now(),
		}
		state.mu.Unlock()

		// 2. Запускаем генератор
		go func() {
			fmt.Printf("[GENERATOR] Starting: %s (Intensity %s)\n", mode, intensity)
			if err := generator.RunScenario(mode, intensity); err != nil {
				fmt.Printf("[GENERATOR] Error: %v\n", err)
			} else {
				fmt.Printf("[GENERATOR] Finished: %s\n", mode)
			}
		}()

		// Ответ клиенту
		response := map[string]string{
			"status":      "started",
			"mode":        mode,
			"intensity":   intensity,
			"description": getDescriptionForMode(mode),
			"message":     "Check /status to see if AI detects this workload correctly.",
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
	})

	// GET /status
	http.HandleFunc("/status", func(w http.ResponseWriter, r *http.Request) {
		state.mu.RLock()
		defer state.mu.RUnlock()

		w.Header().Set("Content-Type", "application/json")
		
		// Формируем ответ: Диагноз + Правда
		response := struct {
			Timestamp       time.Time          `json:"timestamp"`
			ActiveScenario  *ScenarioInfo      `json:"ground_truth_scenario"` // << Вот оно
			Diagnosis       analyzer.Diagnosis `json:"diagnosis"`
		}{
			Timestamp:      state.LastUpdate,
			ActiveScenario: state.CurrentScenario,
			Diagnosis:      state.LatestDiagnosis,
		}

		if err := json.NewEncoder(w).Encode(response); err != nil {
			http.Error(w, "Failed to encode JSON", http.StatusInternalServerError)
		}
	})

	go func() {
		log.Println("Server on :8080")
		http.ListenAndServe(":8080", nil)
	}()
}

func getDescriptionForMode(mode string) string {
	switch mode {
	case "oltp": return "Transactional (CPU/WAL)"
	case "olap": return "Analytical (IO/Compute)"
	case "iot": return "Write-Heavy (WAL)"
	case "locks": return "High Contention"
	case "reporting": return "Read-Heavy (Memory)"
	case "init": return "Initialization"
	case "etl": return "Bulk Load"
	case "cold": return "Maintenance"
	default: return "Unknown"
	}
}

func printMetricsToConsole(m models.WorkloadMetrics, d analyzer.Diagnosis) {
	fmt.Printf("[Analyzer] Profile: %s | IO: %.0f%% CPU: %.0f%%\n", d.Profile, m.IOPercent, m.CPUPercent)
}
