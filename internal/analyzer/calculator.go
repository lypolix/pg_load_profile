package analyzer

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/lypolix/pg_load_profile/internal/models"
)

type Calculator struct {
	pool *pgxpool.Pool
}

func NewCalculator(pool *pgxpool.Pool) *Calculator {
	return &Calculator{pool: pool}
}

// CalculateMetrics считает метрики в точном соответствии с ТЗ
func (c *Calculator) CalculateMetrics(ctx context.Context, duration time.Duration) (models.WorkloadMetrics, error) {
	var m models.WorkloadMetrics

	
	querySnapshot := `
		WITH range_snaps AS (
			SELECT total_exec_time 
			FROM profile_metrics.snapshots 
			WHERE snapshot_time >= NOW() - $1::interval 
			ORDER BY snapshot_time ASC
		)
		SELECT 
			(SELECT total_exec_time FROM range_snaps ORDER BY total_exec_time DESC LIMIT 1) - 
			(SELECT total_exec_time FROM range_snaps ORDER BY total_exec_time ASC LIMIT 1)
		AS db_time_delta;
	`
	
	// В PostgreSQL total_exec_time хранится в миллисекундах
	var dbTimeTotalMs *float64 
	err := c.pool.QueryRow(ctx, querySnapshot, duration.String()).Scan(&dbTimeTotalMs)
	if err != nil && err != pgx.ErrNoRows {
		return m, fmt.Errorf("failed to get snapshot delta: %w", err)
	}

	if dbTimeTotalMs == nil || *dbTimeTotalMs <= 0 {
		// Если снэпшотов недостаточно, возвращаем пустую структуру или ошибку
		return m, nil 
	}

	// Переводим в секунды для удобства (или оставляем в мс, главное быть последовательным)
	m.DBTimeTotal = *dbTimeTotalMs / 1000.0 

	// ========================================================================
	// 2. Считаем пропорции нагрузки через ASH (pg_stat_activity)
	// ========================================================================
	// Нам нужно понять, какая доля времени ушла на CPU, IO и Lock
	queryASH := `
		WITH ash_stats AS (
			SELECT
				count(*) as total_samples,
				-- DB Time ASH (CPU): active без wait_event
				count(*) FILTER (WHERE wait_event IS NULL) as cpu_samples,
				
				-- DB Time ASH (IO): конкретные ивенты чтения/записи файлов
				count(*) FILTER (WHERE wait_event IN (
					'DataFileRead', 'DataFileWrite', 'DataFileExtend', 'DataFileTruncate',
                    'WALWrite', 'WALSync' 
				) OR wait_event_type = 'IO') as io_samples,
				
				-- DB Time ASH (Lock): блокировки
				count(*) FILTER (WHERE wait_event_type IN ('Lock', 'LWLock')) as lock_samples
			FROM profile_metrics.ash_samples
			WHERE sample_time >= NOW() - $1::interval
		)
		SELECT total_samples, cpu_samples, io_samples, lock_samples FROM ash_stats;
	`

	var totalSamples, cpuSamples, ioSamples, lockSamples float64
	err = c.pool.QueryRow(ctx, queryASH, duration.String()).Scan(&totalSamples, &cpuSamples, &ioSamples, &lockSamples)
	if err != nil {
		return m, fmt.Errorf("failed to get ash stats: %w", err)
	}

	if totalSamples == 0 {
		// Если ASH пуст, но DB Time есть (быстрые запросы проскочили между сэмплами),
		// считаем, что все это было CPU (Committed)
		m.DBTimeCommitted = m.DBTimeTotal
		m.CPUTime = m.DBTimeTotal
		m.CPUPercent = 100
		return m, nil
	}

	// ========================================================================
	// 3. Применяем формулы
	// ========================================================================

	// Вычисляем доли (percentages)
	ratioCPU := cpuSamples / totalSamples
	ratioIO := ioSamples / totalSamples
	ratioLock := lockSamples / totalSamples

	// Распределяем реальное время (DB Time Total) согласно пропорциям ASH
	m.CPUTime = m.DBTimeTotal * ratioCPU
	m.IOTime = m.DBTimeTotal * ratioIO
	m.LockTime = m.DBTimeTotal * ratioLock

	// Формула: DB Time Committed = DB Time - Wait Time
	// Wait Time = IO + Lock + Other Waits
	// Соответственно Committed ≈ CPU Time (чистое время выполнения)
	m.DBTimeCommitted = m.CPUTime

	// Проценты для вывода
	m.CPUPercent = ratioCPU * 100
	m.IOPercent = ratioIO * 100
	m.LockPercent = ratioLock * 100

	return m, nil
}
