package configurator

import (
	"context"
	"fmt"
	"github.com/jackc/pgx/v5/pgxpool"
)

func ApplyPreset(pool *pgxpool.Pool, presetName string) error {
	settings := getSettingsForPreset(presetName)
	if settings == nil {
		return fmt.Errorf("unknown preset: %s", presetName)
	}

	ctx := context.Background()
	for key, value := range settings {
		query := fmt.Sprintf("ALTER SYSTEM SET %s = '%s';", key, value)
		if _, err := pool.Exec(ctx, query); err != nil {
			return fmt.Errorf("failed to set %s: %w", key, err)
		}
	}

	if _, err := pool.Exec(ctx, "SELECT pg_reload_conf();"); err != nil {
		return fmt.Errorf("failed to reload conf: %w", err)
	}

	return nil
}

func getSettingsForPreset(name string) map[string]string {
	switch name {
	case "oltp": // Банк, Магазин
		return map[string]string{
			"shared_buffers": "128MB", 
			"work_mem": "4MB",
			"max_wal_size": "1GB",
			"checkpoint_timeout": "15min",
			"synchronous_commit": "on",
			"max_parallel_workers_per_gather": "0", 
		}
	case "olap": // BI, Отчеты
		return map[string]string{
			"shared_buffers": "256MB",
			"work_mem": "32MB", // Больше памяти для хешей
			"max_wal_size": "4GB",
			"checkpoint_timeout": "30min",
			"max_parallel_workers_per_gather": "2", // Включаем параллелизм
		}
	case "write_heavy": // IoT
		return map[string]string{
			"shared_buffers": "128MB",
			"max_wal_size": "8GB", // Огромный WAL
			"checkpoint_timeout": "30min",
			"synchronous_commit": "off", // Жертвуем надежностью ради скорости
			"autovacuum_naptime": "1min",
		}
	case "high_concurrency": // Распродажа
		return map[string]string{
			"shared_buffers": "128MB",
			"work_mem": "4MB",
			"deadlock_timeout": "1s", // Быстро ловим дедлоки
			"max_connections": "200",
		}
	case "reporting": // Read-Heavy (Catalog)
		return map[string]string{
			"shared_buffers": "350MB", // Максимум в кэш (RAM)
			"work_mem": "16MB",
			"effective_cache_size": "1GB",
		}
	case "mixed": // HTAP
		return map[string]string{
			"shared_buffers": "200MB",
			"work_mem": "16MB",
			"max_parallel_workers_per_gather": "2",
		}
	case "etl": // Bulk Load
		return map[string]string{
			"maintenance_work_mem": "256MB", // Ускоряем индексы
			"max_wal_size": "10GB",
			"checkpoint_timeout": "1h",
			"wal_compression": "on",
		}
	case "cold": // Archive
		return map[string]string{
			"work_mem": "64MB", // Для одного жирного скана
			"max_parallel_workers_per_gather": "4",
		}
	default:
		return nil
	}
}
