package configurator

import (
	"context"
	"fmt"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/lypolix/pg_load_profile/internal/analyzer"
)

// ApplyCustomConfig применяет произвольные настройки из карты (для PATCH)
func ApplyCustomConfig(pool *pgxpool.Pool, configMap map[string]string) error {
	ctx := context.Background()

	for key, value := range configMap {
		// Валидация ключей (чтобы не выполнить SQL Injection или не сломать базу левым параметром)
		if !isValidKey(key) {
			return fmt.Errorf("invalid or forbidden parameter: %s", key)
		}

		query := fmt.Sprintf("ALTER SYSTEM SET %s = '%s';", key, value)
		if _, err := pool.Exec(ctx, query); err != nil {
			return fmt.Errorf("failed to set %s: %w", key, err)
		}
	}

	// Перечитываем конфиг, чтобы применилось без рестарта (для поддерживаемых параметров)
	if _, err := pool.Exec(ctx, "SELECT pg_reload_conf();"); err != nil {
		return fmt.Errorf("failed to reload conf: %w", err)
	}

	return nil
}

// ApplyRecommendations применяет структуру TuningConfig, полученную от AI
func ApplyRecommendations(pool *pgxpool.Pool, cfg analyzer.TuningConfig) error {
	settings := map[string]string{
		"shared_buffers":                  cfg.SharedBuffers,
		"work_mem":                        cfg.WorkMem,
		"max_wal_size":                    cfg.MaxWalSize,
		"checkpoint_timeout":              cfg.CheckpointTimeout,
		"synchronous_commit":              cfg.SynchronousCommit,
		"max_parallel_workers_per_gather": cfg.MaxParallelWorkers,
		"deadlock_timeout":                cfg.DeadlockTimeout,
	}
	
	// Фильтруем пустые значения, если вдруг они есть
	cleanSettings := make(map[string]string)
	for k, v := range settings {
		if v != "" {
			cleanSettings[k] = v
		}
	}

	return ApplyCustomConfig(pool, cleanSettings)
}

// ApplyPreset применяет заранее заготовленный пресет (для демо)
func ApplyPreset(pool *pgxpool.Pool, presetName string) error {
	settings := GetSettingsForPreset(presetName)
	if settings == nil {
		return fmt.Errorf("unknown preset: %s", presetName)
	}
	return ApplyCustomConfig(pool, settings)
}

// isValidKey проверяет, разрешено ли менять этот параметр через API
func isValidKey(key string) bool {
	allowed := map[string]bool{
		"shared_buffers":                  true,
		"work_mem":                        true,
		"max_wal_size":                    true,
		"checkpoint_timeout":              true,
		"synchronous_commit":              true,
		"max_parallel_workers_per_gather": true,
		"deadlock_timeout":                true,
		"autovacuum_naptime":              true,
		"effective_cache_size":            true,
		"wal_compression":                 true,
		"maintenance_work_mem":            true,
		"max_connections":                 true,
	}
	return allowed[key]
}

// GetSettingsForPreset возвращает настройки для заданного профиля
func GetSettingsForPreset(name string) map[string]string {
	switch name {
	case "oltp": // Банк, Магазин
		return map[string]string{
			"shared_buffers":                  "128MB",
			"work_mem":                        "4MB",
			"max_wal_size":                    "1GB",
			"checkpoint_timeout":              "15min",
			"synchronous_commit":              "on",
			"max_parallel_workers_per_gather": "0",
			"deadlock_timeout":                "1s",
		}
	case "olap": // BI, Отчеты
		return map[string]string{
			"shared_buffers":                  "256MB",
			"work_mem":                        "32MB",
			"max_wal_size":                    "4GB",
			"checkpoint_timeout":              "30min",
			"max_parallel_workers_per_gather": "2",
			"synchronous_commit":              "on",
			"deadlock_timeout":                "1s",
		}
	case "write_heavy": // IoT
		return map[string]string{
			"shared_buffers":     "128MB",
			"max_wal_size":       "8GB",
			"checkpoint_timeout": "30min",
			"synchronous_commit": "off",
			"autovacuum_naptime": "1min",
			"deadlock_timeout":   "1s",
		}
	case "high_concurrency": // Распродажа
		return map[string]string{
			"shared_buffers":   "128MB",
			"work_mem":         "4MB",
			"deadlock_timeout": "100ms",
			"max_connections":  "200",
		}
	case "reporting": // Read-Heavy (Catalog)
		return map[string]string{
			"shared_buffers":       "350MB",
			"work_mem":             "16MB",
			"effective_cache_size": "1GB",
			"synchronous_commit":   "on",
			"deadlock_timeout":     "1s",
		}
	case "mixed": // HTAP
		return map[string]string{
			"shared_buffers":                  "200MB",
			"work_mem":                        "16MB",
			"max_parallel_workers_per_gather": "2",
			"synchronous_commit":              "on",
			"deadlock_timeout":                "1s",
		}
	case "etl": // Bulk Load
		return map[string]string{
			"maintenance_work_mem": "256MB",
			"max_wal_size":         "10GB",
			"checkpoint_timeout":   "1h",
			"wal_compression":      "on",
			"deadlock_timeout":     "1s",
		}
	case "cold": // Archive
		return map[string]string{
			"work_mem":                        "64MB",
			"max_parallel_workers_per_gather": "4",
			"synchronous_commit":              "on",
			"deadlock_timeout":                "1s",
		}
	default:
		return nil
	}
}
