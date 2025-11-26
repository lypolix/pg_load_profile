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
    
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/lypolix/pg_load_profile/internal/analyzer"
	"github.com/lypolix/pg_load_profile/internal/collector"
	"github.com/lypolix/pg_load_profile/internal/configurator"
	"github.com/lypolix/pg_load_profile/internal/generator"
	"github.com/lypolix/pg_load_profile/internal/models"
	"github.com/lypolix/pg_load_profile/internal/storage"
)

type ScenarioInfo struct {
	LoadScenario string    `json:"load_scenario"` // Какую нагрузку дали (oltp, olap...)
	ActiveConfig string    `json:"active_config"` // Какой пресет настроек применили
	StartTime    time.Time `json:"start_time"`
}

type GlobalState struct {
	mu              sync.RWMutex
	LatestDiagnosis analyzer.Diagnosis
	LastUpdate      time.Time
	CurrentScenario *ScenarioInfo
}

var state GlobalState

func main() {
	_ = godotenv.Load()

	// 1. Подключение к БД (возвращает *pgxpool.Pool)
	pool, err := storage.ConnectDB()
	if err != nil {
		log.Fatalf("Failed to connect to DB: %v", err)
	}
	defer pool.Close()
	fmt.Println("Connected to PostgreSQL successfully.")

	// 2. Запуск коллектора
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	coll := collector.NewCollector(pool)
	coll.Start(ctx)
	fmt.Println("Collector started. Gathering data...")

	// 3. Запуск анализатора
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

	// 4. Запуск HTTP сервера (передаем pool)
	setupHTTPServer(pool)
	select {}
}

func setupHTTPServer(pool *pgxpool.Pool) {
	
	// Эндпоинт 1: Применение конфигурации БД
	http.HandleFunc("/config/apply", func(w http.ResponseWriter, r *http.Request) {
		preset := r.URL.Query().Get("preset")
		if preset == "" {
			http.Error(w, "Usage: /config/apply?preset=[oltp|olap|iot...]", http.StatusBadRequest)
			return
		}

		// Вызываем Configurator (убедитесь, что он тоже принимает *pgxpool.Pool из v5)
		if err := configurator.ApplyPreset(pool, preset); err != nil {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{
				"status": "error",
				"error":  fmt.Sprintf("Failed to apply preset: %v", err),
			})
			return
		}

		state.mu.Lock()
		if state.CurrentScenario == nil {
			state.CurrentScenario = &ScenarioInfo{}
		}
		state.CurrentScenario.ActiveConfig = preset
		state.mu.Unlock()

		// Красивый JSON ответ
		response := map[string]string{
			"status":      "success",
			"preset":      preset,
			"message":     fmt.Sprintf("Successfully applied DB configuration for profile: %s", preset),
			"description": "PostgreSQL configuration reloaded. Check postgresql.conf changes.",
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(response)
	})

	// Эндпоинт 2: Запуск нагрузки
	http.HandleFunc("/load/start", func(w http.ResponseWriter, r *http.Request) {
		scenario := r.URL.Query().Get("scenario")
		if scenario == "" {
			http.Error(w, "Usage: /load/start?scenario=[oltp|olap|iot...]", http.StatusBadRequest)
			return
		}

		state.mu.Lock()
		if state.CurrentScenario == nil {
			state.CurrentScenario = &ScenarioInfo{}
		}
		state.CurrentScenario.LoadScenario = scenario
		state.CurrentScenario.StartTime = time.Now()
		state.mu.Unlock()

		go func() {
			fmt.Printf("[GENERATOR] Starting Business Scenario: %s\n", scenario)
			if err := generator.RunBusinessScenario(scenario); err != nil {
				fmt.Printf("[GENERATOR] Error: %v\n", err)
			} else {
				fmt.Printf("[GENERATOR] Finished: %s\n", scenario)
			}
		}()

		response := map[string]string{
			"status":      "started",
			"scenario":    scenario,
			"message":     "Load started.",
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
	})

	// Эндпоинт 3: Статус
	http.HandleFunc("/status", func(w http.ResponseWriter, r *http.Request) {
		state.mu.RLock()
		defer state.mu.RUnlock()

		w.Header().Set("Content-Type", "application/json")
		
		response := struct {
			Timestamp       time.Time          `json:"timestamp"`
			ActiveScenario  *ScenarioInfo      `json:"ground_truth"` 
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
		log.Println("Server running on :8080")
		if err := http.ListenAndServe(":8080", nil); err != nil {
			log.Fatal(err)
		}
	}()
}

func printMetricsToConsole(m models.WorkloadMetrics, d analyzer.Diagnosis) {
	fmt.Printf("[Analyzer] Profile: %s | IO: %.0f%% CPU: %.0f%%\n", d.Profile, m.IOPercent, m.CPUPercent)
}
