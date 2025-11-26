package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/joho/godotenv"

	"github.com/lypolix/pg_load_profile/internal/analyzer"
	"github.com/lypolix/pg_load_profile/internal/collector"
	"github.com/lypolix/pg_load_profile/internal/models"
	"github.com/lypolix/pg_load_profile/internal/storage"
	"github.com/lypolix/pg_load_profile/internal/generator"
)

func main() {
	// 1. Загрузка конфига
	_ = godotenv.Load()

	// 2. Подключение к БД
	pool, err := storage.ConnectDB()
	if err != nil {
		log.Fatalf("Failed to connect to DB: %v", err)
	}
	defer pool.Close()
	fmt.Println("Connected to PostgreSQL successfully.")

	// 3. Запуск сборщика метрик (Background Job)
	// Используем контекст для управления жизненным циклом
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	coll := collector.NewCollector(pool)
	coll.Start(ctx)
	fmt.Println("Collector started. Gathering data...")

	// 4. Запуск анализатора (Периодический вывод статистики в консоль)
	calc := analyzer.NewCalculator(pool)
	
	// Цикл анализа каждые 15 секунд
	ticker := time.NewTicker(15 * time.Second)
	for range ticker.C {
		// Анализируем данные за последнюю минуту
		metrics, err := calc.CalculateMetrics(ctx, 1*time.Minute)
		if err != nil {
			log.Printf("Error calculating metrics: %v", err)
			continue
		}
	
		// Красивый вывод в консоль
		printMetrics(metrics)
	}

	http.HandleFunc("/run", func(w http.ResponseWriter, r *http.Request) {
        mode := r.URL.Query().Get("mode") // ?mode=oltp
        if mode == "" {
            http.Error(w, "mode is required", http.StatusBadRequest)
            return
        }

        // Запускаем в отдельной горутине, чтобы не блокировать ответ
        go func() {
            fmt.Printf("Received command to run: %s\n", mode)
            if err := generator.RunScenario(mode); err != nil {
                fmt.Printf("Error running scenario: %v\n", err)
            }
        }()

        w.WriteHeader(http.StatusOK)
        w.Write([]byte(fmt.Sprintf("Started scenario: %s. Check logs/metrics.", mode)))
    })

    // Запускаем HTTP сервер в отдельной горутине
    go func() {
        log.Println("HTTP Server started on :8080")
        if err := http.ListenAndServe(":8080", nil); err != nil {
            log.Fatal(err)
        }
    }()
	
}

func printMetrics(m models.WorkloadMetrics) {
	
	fmt.Println("------ Workload Profile (Last 1 min) ------")
	fmt.Printf("DB Time Total (Samples): %.0f\n", m.DBTimeTotal)
	fmt.Printf("CPU Usage:      %.2f%%\n", m.CPUPercent)
	fmt.Printf("I/O Wait:       %.2f%%\n", m.IOPercent)
	fmt.Printf("Lock Wait:      %.2f%%\n", m.LockPercent)
	fmt.Println("-------------------------------------------")

	if m.IOPercent > 50 {
		fmt.Println(">> PREDICTION: OLAP / IO-Bound Workload")
	} else if m.CPUPercent > 80 {
		fmt.Println(">> PREDICTION: Compute Heavy / OLTP")
	} else if m.LockPercent > 20 {
		fmt.Println(">> PREDICTION: High Concurrency / Locked")
	} else {
		fmt.Println(">> PREDICTION: Idle or Mixed")
	}
	fmt.Println("")
}
