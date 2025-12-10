package collector

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Collector struct {
	pool *pgxpool.Pool
}

func NewCollector(pool *pgxpool.Pool) *Collector {
	return &Collector{pool: pool}
}

// Start запускает фоновый процесс сбора
func (c *Collector) Start(ctx context.Context) {
	ashTicker := time.NewTicker(5 * time.Second)
	snapshotTicker := time.NewTicker(10 * time.Second)

	go func() {
		for {
			select {
			case <-ctx.Done():
				return
			case <-ashTicker.C:
				if _, err := c.pool.Exec(ctx, "SELECT profile_metrics.collect_ash()"); err != nil {
					fmt.Printf("[ERROR] Collecting ASH: %v\n", err)
				}
			case <-snapshotTicker.C:
				if _, err := c.pool.Exec(ctx, "SELECT profile_metrics.take_snapshot()"); err != nil {
					fmt.Printf("[ERROR] Taking snapshot: %v\n", err)
				}
			}
		}
	}()
}

type RawStats struct {
	Timestamp     time.Time `json:"timestamp"`
	
	// Из pg_stat_database
	XactCommit    int64     `json:"xact_commit"`
	XactRollback  int64     `json:"xact_rollback"`
	
	// Из pg_stat_statements (может быть 0, если расширения нет)
	TotalCalls    int64     `json:"total_calls"`
	TotalExecTime float64   `json:"total_exec_time"`
}

// GetRawStats собирает счетчики для вычисления дельт
func GetRawStats(pool *pgxpool.Pool) (*RawStats, error) {
	ctx := context.Background()
	stats := &RawStats{
		Timestamp: time.Now(),
	}

	// 1. Транзакции (Commit / Rollback)
	err := pool.QueryRow(ctx, `
		SELECT xact_commit, xact_rollback 
		FROM pg_stat_database 
		WHERE datname = current_database()
	`).Scan(&stats.XactCommit, &stats.XactRollback)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch pg_stat_database: %w", err)
	}

	// 2. Запросы (Calls / Time) из pg_stat_statements
	// Используем SUM(), так как нам нужна общая нагрузка системы
	// Обрабатываем случай, когда расширение не установлено
	err = pool.QueryRow(ctx, `
		SELECT 
			sum(calls)::bigint, 
			sum(total_exec_time)::float8 
		FROM pg_stat_statements
	`).Scan(&stats.TotalCalls, &stats.TotalExecTime)

	if err != nil {
		// Расширение не установлено или таблица пустая -> возвращаем нули, но не ошибку
		// fmt.Printf("Warning: pg_stat_statements query failed: %v\n", err)
		stats.TotalCalls = 0
		stats.TotalExecTime = 0
	}

	return stats, nil
}
