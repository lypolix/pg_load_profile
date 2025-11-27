package collector

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type DashboardData struct {
	DBVersion       string             `json:"version"`
	Uptime          string             `json:"uptime"`
	DBSize          string             `json:"db_size"`
	ActiveConns     int                `json:"active_connections"`
	IdleConns       int                `json:"idle_connections"`
	CacheHitRatio   float64            `json:"cache_hit_ratio"`
	TopWaitEvents   []WaitEventSummary `json:"top_wait_events_5min"`
	TopTables       []TableStats       `json:"top_tables_by_size"`
}

type WaitEventSummary struct {
	Event string `json:"event"`
	Count int    `json:"count"`
}

type TableStats struct {
	TableName    string  `json:"table_name"`
	Size         string  `json:"size_pretty"`
	SizeBytes    int64   `json:"size_bytes"`
	UsagePercent float64 `json:"usage_percent"`
	SeqScans     int64   `json:"seq_scans"`
	IndexScans   int64   `json:"index_scans"`
	RowsInserted int64   `json:"rows_inserted"`
	DeadRows     int64   `json:"dead_rows"`
}

// GetSystemSummary собирает общую статистику по базе
func GetSystemSummary(pool *pgxpool.Pool) (*DashboardData, error) {
	ctx := context.Background()
	data := &DashboardData{}

	// 1. Версия, Аптайм, Размер БД
	var startTime time.Time
	err := pool.QueryRow(ctx, `
		SELECT 
			version(), 
			pg_postmaster_start_time(), 
			pg_size_pretty(pg_database_size(current_database()))
	`).Scan(&data.DBVersion, &startTime, &data.DBSize)
	if err != nil {
		return nil, fmt.Errorf("failed to get basic info: %w", err)
	}
	data.Uptime = time.Since(startTime).Round(time.Second).String()

	// 2. Активные и ждущие соединения
	err = pool.QueryRow(ctx, `
		SELECT 
			count(*) FILTER (WHERE state = 'active'),
			count(*) FILTER (WHERE state = 'idle')
		FROM pg_stat_activity
	`).Scan(&data.ActiveConns, &data.IdleConns)
	if err != nil {
		return nil, fmt.Errorf("failed to get connections: %w", err)
	}

	// 3. Общий Cache Hit Ratio
	err = pool.QueryRow(ctx, `
		SELECT 
			ROUND((sum(blks_hit) * 100.0 / NULLIF(sum(blks_hit + blks_read), 0))::numeric, 2)
		FROM pg_stat_database 
		WHERE datname = current_database()
	`).Scan(&data.CacheHitRatio)
	if err != nil {
		data.CacheHitRatio = 0
	}

	// 4. Топ-5 ожиданий за последние 5 минут
	rows, err := pool.Query(ctx, `
		SELECT COALESCE(wait_event, 'CPU') as event, count(*) as cnt
		FROM profile_metrics.ash_samples
		WHERE sample_time > NOW() - INTERVAL '5 minutes'
		GROUP BY 1
		ORDER BY 2 DESC
		LIMIT 5
	`)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var w WaitEventSummary
			if err := rows.Scan(&w.Event, &w.Count); err == nil {
				data.TopWaitEvents = append(data.TopWaitEvents, w)
			}
		}
	}

	// 5. Топ таблиц (для дашборда)
	var maxSize int64
	_ = pool.QueryRow(ctx, "SELECT MAX(pg_total_relation_size(relid)) FROM pg_stat_user_tables").Scan(&maxSize)
	if maxSize == 0 { maxSize = 1 }

	tableRows, err := pool.Query(ctx, `
		SELECT 
			relname,
			pg_size_pretty(pg_total_relation_size(relid)),
			pg_total_relation_size(relid),
			seq_scan, idx_scan, n_tup_ins, n_dead_tup
		FROM pg_stat_user_tables
		ORDER BY pg_total_relation_size(relid) DESC
		LIMIT 5
	`)
	if err == nil {
		defer tableRows.Close()
		for tableRows.Next() {
			var t TableStats
			if err := tableRows.Scan(&t.TableName, &t.Size, &t.SizeBytes, &t.SeqScans, &t.IndexScans, &t.RowsInserted, &t.DeadRows); err == nil {
				t.UsagePercent = float64(t.SizeBytes) / float64(maxSize) * 100.0
				data.TopTables = append(data.TopTables, t)
			}
		}
	}

	return data, nil
}
