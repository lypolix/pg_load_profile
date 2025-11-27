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

	// 1. Подключение к БД
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

	// 4. Запуск HTTP сервера
	setupHTTPServer(pool)
	select {}
}

// corsMiddleware добавляет CORS заголовки для всех запросов
func corsMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		
		// Обработка preflight запросов
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}
		
		next(w, r)
	}
}

func setupHTTPServer(pool *pgxpool.Pool) {
	
	// -------------------------------------------------------------------------
	// Эндпоинт 1: Применение ПРЕСЕТА конфигурации БД
	// GET /config/apply?preset=oltp
	// -------------------------------------------------------------------------
	http.HandleFunc("/config/apply", corsMiddleware(func(w http.ResponseWriter, r *http.Request) {
		preset := r.URL.Query().Get("preset")
		if preset == "" {
			http.Error(w, "Usage: /config/apply?preset=[oltp|olap|iot...]", http.StatusBadRequest)
			return
		}

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

		response := map[string]string{
			"status":      "success",
			"preset":      preset,
			"message":     fmt.Sprintf("Successfully applied DB configuration for profile: %s", preset),
			"description": "PostgreSQL configuration reloaded. Check postgresql.conf changes.",
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(response)
	}))

	// -------------------------------------------------------------------------
	// Эндпоинт 2: Ручное изменение параметров (PATCH)
	// PATCH /config/custom 
	// Body: {"work_mem": "64MB"}
	// -------------------------------------------------------------------------
	http.HandleFunc("/config/custom", corsMiddleware(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPatch && r.Method != http.MethodPost {
			http.Error(w, "Method not allowed (use PATCH or POST)", http.StatusMethodNotAllowed)
			return
		}

		var configMap map[string]string
		if err := json.NewDecoder(r.Body).Decode(&configMap); err != nil {
			http.Error(w, "Invalid JSON body", http.StatusBadRequest)
			return
		}

		if err := configurator.ApplyCustomConfig(pool, configMap); err != nil {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{
				"status": "error",
				"error":  fmt.Sprintf("Failed to apply custom config: %v", err),
			})
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"status": "success",
			"message": "Custom configuration applied.",
			"applied_settings": configMap,
		})
	}))

	// -------------------------------------------------------------------------
	// Эндпоинт 3: Применение РЕКОМЕНДАЦИЙ AI (POST)
	// POST /config/apply-recommendations
	// -------------------------------------------------------------------------
	http.HandleFunc("/config/apply-recommendations", corsMiddleware(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed (use POST)", http.StatusMethodNotAllowed)
			return
		}

		// 1. Берем текущие рекомендации из стейта
		state.mu.RLock()
		recommendations := state.LatestDiagnosis.Tuning
		profile := state.LatestDiagnosis.Profile
		state.mu.RUnlock()

		if profile == "" || profile == "IDLE" {
			http.Error(w, "No active recommendations to apply (System is IDLE or Init)", http.StatusBadRequest)
			return
		}

		// 2. Применяем их
		if err := configurator.ApplyRecommendations(pool, recommendations); err != nil {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{
				"status": "error",
				"error":  fmt.Sprintf("Error applying recommendations: %v", err),
			})
			return
		}
		
		// 3. Обновляем стейт
		state.mu.Lock()
		if state.CurrentScenario == nil { state.CurrentScenario = &ScenarioInfo{} }
		state.CurrentScenario.ActiveConfig = "AI_RECOMMENDED (" + profile + ")"
		state.mu.Unlock()

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"status": "success",
			"message": "Recommendations applied successfully.",
			"applied_config": recommendations,
		})
	}))

	// -------------------------------------------------------------------------
	// Эндпоинт 4: Запуск нагрузки
	// GET /load/start?scenario=oltp
	// -------------------------------------------------------------------------
	http.HandleFunc("/load/start", corsMiddleware(func(w http.ResponseWriter, r *http.Request) {
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
	}))

	// -------------------------------------------------------------------------
	// Эндпоинт 5: Статус (AI Diagnosis)
	// GET /status
	// -------------------------------------------------------------------------
	http.HandleFunc("/status", corsMiddleware(func(w http.ResponseWriter, r *http.Request) {
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
	}))

	// -------------------------------------------------------------------------
	// Эндпоинт 6: Сводная панель (Dashboard)
	// GET /dashboard
	// -------------------------------------------------------------------------
	http.HandleFunc("/dashboard", corsMiddleware(func(w http.ResponseWriter, r *http.Request) {
		summary, err := collector.GetSystemSummary(pool)
		if err != nil {
			http.Error(w, fmt.Sprintf("Failed to get dashboard data: %v", err), http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(summary)
	}))

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
