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
	"github.com/lypolix/pg_load_profile/internal/analyzer"
	"github.com/lypolix/pg_load_profile/internal/collector"
	"github.com/lypolix/pg_load_profile/internal/generator"
	"github.com/lypolix/pg_load_profile/internal/models"
	"github.com/lypolix/pg_load_profile/internal/storage"
)

type GlobalState struct {
	mu              sync.RWMutex
	LatestDiagnosis analyzer.Diagnosis
	LastUpdate      time.Time
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

	// Запуск Анализатора (Calculator & Classifier) в отдельной горутине
	calc := analyzer.NewCalculator(pool)

	go func() {
		// Анализируем каждые 5 секунд, чтобы интерфейс обновлялся быстро
		ticker := time.NewTicker(5 * time.Second)
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				// Берем окно данных за последние 30 секунд для реактивности
				metrics, err := calc.CalculateMetrics(ctx, 30*time.Second)
				if err != nil {
					log.Printf("[ERROR] Calculating metrics: %v", err)
					continue
				}

				// Классифицируем нагрузку на основе метрик
				diagnosis := analyzer.ClassifyWorkload(metrics)

				// Сохраняем результат в глобальное состояние (потокобезопасно)
				state.mu.Lock()
				state.LatestDiagnosis = diagnosis
				state.LastUpdate = time.Now()
				state.mu.Unlock()

				// Дублируем краткий вывод в консоль для удобства разработчика
				printMetricsToConsole(metrics, diagnosis)
			}
		}
	}()

	setupHTTPServer()

	select {}
}

func setupHTTPServer() {
	// Ручка для запуска нагрузки (INPUT)
	// Пример: GET /run?mode=olap&intensity=8
	http.HandleFunc("/run", func(w http.ResponseWriter, r *http.Request) {
		mode := r.URL.Query().Get("mode")
		intensity := r.URL.Query().Get("intensity")

		if mode == "" {
			http.Error(w, "Usage: /run?mode=[oltp|olap|iot|...]&intensity=[1-8]", http.StatusBadRequest)
			return
		}

		if intensity == "" {
			intensity = "4" 
		}

		go func() {
			fmt.Printf("[GENERATOR] Starting scenario: %s | Intensity: %s\n", mode, intensity)
			if err := generator.RunScenario(mode, intensity); err != nil {
				fmt.Printf("[GENERATOR] Error running scenario %s: %v\n", mode, err)
			} else {
				fmt.Printf("[GENERATOR] Scenario %s finished successfully.\n", mode)
			}
		}()

		w.WriteHeader(http.StatusOK)
		w.Write([]byte(fmt.Sprintf("Started load scenario: %s with intensity %s. Watch logs or check /status in 10-15 seconds.", mode, intensity)))
	})

	// Ручка для получения результата (OUTPUT)
	// Пример: GET /status
	http.HandleFunc("/status", func(w http.ResponseWriter, r *http.Request) {
		state.mu.RLock()
		defer state.mu.RUnlock()

		w.Header().Set("Content-Type", "application/json")
		
		// Формируем ответ с метаданными
		response := struct {
			Timestamp time.Time          `json:"timestamp"`
			Diagnosis analyzer.Diagnosis `json:"diagnosis"`
		}{
			Timestamp: state.LastUpdate,
			Diagnosis: state.LatestDiagnosis,
		}

		if err := json.NewEncoder(w).Encode(response); err != nil {
			http.Error(w, "Failed to encode JSON", http.StatusInternalServerError)
		}
	})

	// Запускаем сервер в отдельной горутине
	go func() {
		port := ":8080"
		log.Printf("HTTP API Server started on port %s", port)
		if err := http.ListenAndServe(port, nil); err != nil {
			log.Fatal(err)
		}
	}()
}

func printMetricsToConsole(m models.WorkloadMetrics, d analyzer.Diagnosis) {
	// Вывод, который вы видите в логах Docker
	fmt.Println("------ Workload Analysis (Last 30s) ------")
	fmt.Printf("DB Time: %.1f sec | CPU: %.1f%% | IO: %.1f%% | Lock: %.1f%%\n",
		m.DBTimeTotal, m.CPUPercent, m.IOPercent, m.LockPercent)
	fmt.Printf(">> DIAGNOSIS: [%s] (Confidence: %s)\n", d.Profile, d.Confidence)
	fmt.Println("------------------------------------------")
}
