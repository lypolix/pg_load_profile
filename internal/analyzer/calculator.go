package analyzer

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/lypolix/pg_load_profile/internal/models"
)

type Calculator struct {
	pool *pgxpool.Pool
}

func NewCalculator(pool *pgxpool.Pool) *Calculator {
	return &Calculator{pool: pool}
}

// CalculateMetrics считает метрики за последние duration времени
func (c *Calculator) CalculateMetrics(ctx context.Context, duration time.Duration) (models.WorkloadMetrics, error) {
	var m models.WorkloadMetrics
	
	startTime := time.Now().Add(-duration)

	// 1. Считаем DB Time Total из pg_stat_statements (прирост total_exec_time)
	// Примечание: для точности тут нужно сравнивать снапшоты, но для старта возьмем сумму из ASH как прокси активности
	// В идеале ASH count * 1 sec = DB Time (в секундах)
	
	// Для данного этапа используем ASH данные, так как они точнее показывают распределение во времени
	query := `
		WITH ash_stats AS (
			SELECT
				count(*) as total_samples,
				count(*) FILTER (WHERE wait_event IS NULL) as cpu_samples,
				count(*) FILTER (WHERE wait_event_type IN ('IO', 'LWLock', 'Lock')) as wait_samples,
				count(*) FILTER (WHERE wait_event_type = 'IO') as io_samples,
				count(*) FILTER (WHERE wait_event_type IN ('Lock', 'LWLock')) as lock_samples
			FROM profile_metrics.ash_samples
			WHERE sample_time > $1
		)
		SELECT 
			total_samples,
			cpu_samples,
			io_samples,
			lock_samples
		FROM ash_stats;
	`

	var total, cpu, io, lock float64
	err := c.pool.QueryRow(ctx, query, startTime).Scan(&total, &cpu, &io, &lock)
	if err != nil {
		return m, fmt.Errorf("failed to calc metrics: %w", err)
	}

	// Если данных нет
	if total == 0 {
		return m, nil
	}

	// Конвертируем сэмплы во время (предполагая, что сэмпл берется раз в 5 сек, но ASH хранит состояние. 
	// Стандартный подход: ASH Count = Average Active Sessions (AAS).
	// Чтобы получить "время", мы смотрим пропорции.
	
	m.DBTimeTotal = total
	m.CPUTime = cpu
	m.IOTime = io
	m.LockTime = lock
	
	// DB Time Committed = Total - All Waits (упрощенно CPU Time - это время выполнения кода)
	m.DBTimeCommitted = m.CPUTime 

	// Расчет процентов
	m.CPUPercent = (m.CPUTime / m.DBTimeTotal) * 100
	m.IOPercent = (m.IOTime / m.DBTimeTotal) * 100
	m.LockPercent = (m.LockTime / m.DBTimeTotal) * 100

	return m, nil
}
