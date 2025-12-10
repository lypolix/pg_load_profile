package analyzer

import (
	"fmt"
	"github.com/lypolix/pg_load_profile/internal/configurator"
	"github.com/lypolix/pg_load_profile/internal/models"
)

type Diagnosis struct {
	Profile     string                 `json:"profile"`
	Description string                 `json:"description"`
	Confidence  string                 `json:"confidence"`
	Metrics     models.WorkloadMetrics `json:"metrics"`
	Tuning      models.TuningConfig    `json:"tuning_recommendations"`
	Reasoning   string                 `json:"reasoning"`
}

// ClassifyWorkload использует систему баллов для определения победителя
func ClassifyWorkload(m models.WorkloadMetrics) Diagnosis {
	d := Diagnosis{Metrics: m}

	// 0. IDLE Check (Fast Path)
	if m.DBTimeTotal < 1.0 {
		d.Profile = "IDLE"
		d.Description = "Система простаивает. Нагрузки нет."
		d.Confidence = "High"
		// Легкие настройки для простоя
		d.Tuning = models.TuningConfig{
			SharedBuffers:      "128MB",
			WorkMem:            "4MB",
			CheckpointTimeout:  "30min",
			MaxWalSize:         "1GB",
			SynchronousCommit:  "on",
			MaxParallelWorkers: "0",
			DeadlockTimeout:    "1s",
		}
		return d
	}

	// --- SCORING SYSTEM ---
	scores := map[string]float64{
		"OLAP":      0,
		"OLTP":      0,
		"IOT":       0,
		"LOCKS":     0,
		"COLD":      0,
		"REPORTING": 0,
		"ETL":       0,
	}

	// 1. Анализ IO (Disk bound)
	if m.IOPercent > 40 {
		scores["COLD"] += 3.0
		scores["OLAP"] += 2.0
		scores["ETL"] += 1.5
	} else if m.IOPercent > 20 {
		scores["OLAP"] += 1.5
		scores["IOT"] += 2.0
		scores["ETL"] += 1.0
	} else if m.IOPercent < 5 {
		scores["OLTP"] += 2.0
		scores["REPORTING"] += 2.0
	}

	// 2. Анализ CPU (Compute bound)
	if m.CPUPercent > 80 {
		scores["REPORTING"] += 3.0
		scores["OLTP"] += 2.0
	} else if m.CPUPercent > 50 {
		scores["OLTP"] += 2.0
		scores["OLAP"] += 1.0
	} else if m.CPUPercent < 15 {
		scores["COLD"] += 2.0
		scores["IOT"] += 1.0
	}

	// 3. Анализ Locks (Contention)
	if m.LockPercent > 15 {
		scores["LOCKS"] += 5.0
	} else if m.LockPercent > 5 {
		scores["LOCKS"] += 2.0
		scores["OLTP"] -= 1.0
	}

	// 4. Анализ Соотношений (Ratio)
	if m.CPUPercent > m.IOPercent*4 {
		scores["REPORTING"] += 1.0
	}
	if m.IOPercent > m.CPUPercent*2 {
		scores["COLD"] += 1.0
		scores["IOT"] += 1.0
	}

	// --- ВЫБОР ПОБЕДИТЕЛЯ ---
	var winner string
	var maxScore float64

	for name, score := range scores {
		if score > maxScore {
			maxScore = score
			winner = name
		}
	}

	// Fallback
	if maxScore < 2.0 {
		winner = "MIXED"
	}

	d.Profile = winner
	d.Reasoning = fmt.Sprintf("Score: %.1f | IO: %.0f%%, CPU: %.0f%%, Lock: %.0f%%", maxScore, m.IOPercent, m.CPUPercent, m.LockPercent)

	// Заполняем детали
	return fillDetails(d)
}

// fillDetails заполняет конфиг РЕАЛЬНЫМИ параметрами postgresql.conf
func fillDetails(d Diagnosis) Diagnosis {
	presetName := ""
	switch d.Profile {
	case "LOCKS":
		d.Profile = "HIGH CONCURRENCY"
		d.Description = "Критическая конкуренция за ресурсы (Row locks, LWLock)."
		d.Confidence = "High"
		presetName = "high_concurrency"
	case "COLD":
		d.Profile = "COLD / ARCHIVE-SCAN"
		d.Description = "Полное сканирование холодных данных. Бэкап или SeqScan."
		d.Confidence = "High"
		presetName = "cold"
	case "OLAP":
		d.Profile = "OLAP (ANALYTICAL)"
		d.Description = "Тяжелые запросы, JOIN, агрегации. Data Mining."
		d.Confidence = "Medium"
		presetName = "olap"
	case "ETL":
		d.Profile = "BULK ETL / BATCH LOAD"
		d.Description = "Массовая загрузка данных. Высокая нагрузка на WAL."
		d.Confidence = "Medium"
		presetName = "etl"
	case "IOT":
		d.Profile = "WRITE-HEAVY (IoT)"
		d.Description = "Постоянный поток вставок. Телеметрия."
		d.Confidence = "Low"
		presetName = "write_heavy"
	case "REPORTING":
		d.Profile = "READ-HEAVY / REPORTING"
		d.Description = "Агрессивное чтение из кэша (RAM). Горячие отчеты."
		d.Confidence = "Medium"
		presetName = "reporting"
	case "OLTP":
		d.Profile = "CLASSIC OLTP"
		d.Description = "Банкинг, Биржа. Короткие транзакции."
		d.Confidence = "High"
		presetName = "oltp"
	default: // MIXED
		d.Profile = "MIXED / HTAP"
		d.Description = "Смешанная нагрузка: транзакции + аналитика."
		d.Confidence = "Low"
		presetName = "mixed"
	}

	settings := configurator.GetSettingsForPreset(presetName)
	if settings != nil {
		d.Tuning = models.TuningConfig{
			SharedBuffers:      settings["shared_buffers"],
			WorkMem:            settings["work_mem"],
			MaxWalSize:         settings["max_wal_size"],
			CheckpointTimeout:  settings["checkpoint_timeout"],
			SynchronousCommit:  settings["synchronous_commit"],
			MaxParallelWorkers: settings["max_parallel_workers_per_gather"],
			DeadlockTimeout:    settings["deadlock_timeout"],
			AutovacuumNaptime:  settings["autovacuum_naptime"],
		}
	}

	return d
}
