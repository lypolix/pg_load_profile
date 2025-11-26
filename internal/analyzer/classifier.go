package analyzer

import (
	"fmt"
	"github.com/lypolix/pg_load_profile/internal/models"
)

// TuningConfig — структура для хранения рекомендуемых параметров
type TuningConfig struct {
	TempFileLimit               string `json:"temp_file_limit"`
	CheckpointTimeout           string `json:"checkpoint_timeout"`
	MinWalSize                  string `json:"min_wal_size"`
	MaxWalSize                  string `json:"max_wal_size"`
	MaxParallelWorkersPerGather string `json:"max_parallel_workers_per_gather"`
	MaxParallelWorkers          string `json:"max_parallel_workers"`
	AutovacuumNaptime           string `json:"autovacuum_naptime,omitempty"`
	EffectiveCacheSize          string `json:"effective_cache_size,omitempty"`
}

type Diagnosis struct {
	Profile     string                 `json:"profile"`
	Description string                 `json:"description"`
	Confidence  string                 `json:"confidence"`
	Metrics     models.WorkloadMetrics `json:"metrics"`
	Tuning      TuningConfig           `json:"tuning_recommendations"`
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
		d.Tuning = TuningConfig{CheckpointTimeout: "300s", MaxWalSize: "1GB"}
		return d
	}

	// --- SCORING SYSTEM ---
	// Мы начисляем очки каждому профилю на основе метрик
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
		scores["COLD"] += 3.0 // Очень высокий IO -> Cold Scan
		scores["OLAP"] += 2.0 // Высокий IO -> OLAP
		scores["ETL"] += 1.5  // ETL тоже любит IO
	} else if m.IOPercent > 20 {
		scores["OLAP"] += 1.5
		scores["IOT"] += 2.0 // IoT часто в этой зоне
		scores["ETL"] += 1.0
	} else if m.IOPercent < 5 {
		scores["OLTP"] += 2.0      // Всё в памяти -> OLTP
		scores["REPORTING"] += 2.0 // Или отчеты
	}

	// 2. Анализ CPU (Compute bound)
	if m.CPUPercent > 80 {
		scores["REPORTING"] += 3.0 // Числодробилка в памяти
		scores["OLTP"] += 2.0      // Активный OLTP
	} else if m.CPUPercent > 50 {
		scores["OLTP"] += 2.0
		scores["OLAP"] += 1.0 // OLAP тоже жрет CPU на хэшах/сортировках
	} else if m.CPUPercent < 15 {
		scores["COLD"] += 2.0 // Диск работает, проц стоит -> Бэкап
		scores["IOT"] += 1.0  // IoT тупой, проц не грузит
	}

	// 3. Анализ Locks (Contention)
	if m.LockPercent > 15 {
		scores["LOCKS"] += 5.0 // Lock перебивает всё!
	} else if m.LockPercent > 5 {
		scores["LOCKS"] += 2.0
		scores["OLTP"] -= 1.0 // В хорошем OLTP локов быть не должно
	}

	// 4. Анализ Соотношений (Ratio)
	// Если CPU много, а IO мало -> Reporting/OLTP
	if m.CPUPercent > m.IOPercent*4 {
		scores["REPORTING"] += 1.0
	}
	// Если IO много, а CPU мало -> Cold/IoT
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

	// Fallback для смешанной нагрузки
	if maxScore < 2.0 {
		winner = "MIXED"
	}

	d.Profile = winner
	d.Reasoning = fmt.Sprintf("IO: %.0f%%, CPU: %.0f%%, Lock: %.0f%%", m.IOPercent, m.CPUPercent, m.LockPercent)

	// Заполняем детали
	return fillDetails(d)
}

// fillDetails заполняет конфиг и описание для победителя
func fillDetails(d Diagnosis) Diagnosis {
	switch d.Profile {
	case "LOCKS":
		d.Profile = "HIGH CONCURRENCY"
		d.Description = "Критическая конкуренция за ресурсы (Row locks, LWLock)."
		d.Confidence = "High"
		d.Tuning = TuningConfig{
			TempFileLimit:               "5% от /pg_data",
			CheckpointTimeout:           "600s",
			MinWalSize:                  "1GB",
			MaxWalSize:                  "4GB",
			MaxParallelWorkersPerGather: "0",
			MaxParallelWorkers:          "0",
			AutovacuumNaptime:           "10s",
		}

	case "COLD":
		d.Profile = "COLD / ARCHIVE-SCAN"
		d.Description = "Полное сканирование холодных данных. Бэкап или SeqScan без кэша."
		d.Confidence = "High"
		d.Tuning = TuningConfig{
			EffectiveCacheSize:          "90% RAM",
			MaxParallelWorkersPerGather: "CPU / 2",
			AutovacuumNaptime:           "5min",
		}

	case "OLAP":
		d.Profile = "OLAP (ANALYTICAL)"
		d.Description = "Тяжелые запросы, JOIN, агрегации. Data Mining."
		d.Confidence = "Medium"
		d.Tuning = TuningConfig{
			TempFileLimit:               "10% от /pg_data",
			CheckpointTimeout:           "1800s",
			MinWalSize:                  "4GB",
			MaxWalSize:                  "16GB",
			MaxParallelWorkersPerGather: "CPU / 4",
			MaxParallelWorkers:          "CPU / 2",
			EffectiveCacheSize:          "75% RAM",
		}

	case "ETL":
		d.Profile = "BULK ETL / BATCH LOAD"
		d.Description = "Массовая загрузка данных (COPY, Loader). Высокая нагрузка на WAL."
		d.Confidence = "Medium"
		d.Tuning = TuningConfig{
			CheckpointTimeout: "30min", MaxWalSize: "64GB",
			AutovacuumNaptime: "1min", MinWalSize: "4GB",
		}

	case "IOT":
		d.Profile = "WRITE-HEAVY (IoT)"
		d.Description = "Постоянный поток вставок. Телеметрия."
		d.Confidence = "Low"
		d.Tuning = TuningConfig{
			CheckpointTimeout: "1800s", MaxWalSize: "16GB", AutovacuumNaptime: "1min",
		}

	case "REPORTING":
		d.Profile = "READ-HEAVY / REPORTING"
		d.Description = "Агрессивное чтение из кэша (RAM). Горячие отчеты."
		d.Confidence = "Medium"
		d.Tuning = TuningConfig{
			EffectiveCacheSize:          "80% RAM",
			MaxParallelWorkersPerGather: "0",
			CheckpointTimeout:           "30min",
		}

	case "OLTP":
		d.Profile = "CLASSIC OLTP"
		d.Description = "Банкинг, Биржа. Короткие транзакции."
		d.Confidence = "High"
		d.Tuning = TuningConfig{
			TempFileLimit:               "5% от /pg_data",
			CheckpointTimeout:           "900s",
			MinWalSize:                  "2GB",
			MaxWalSize:                  "8GB",
			MaxParallelWorkersPerGather: "0",
			MaxParallelWorkers:          "0",
			EffectiveCacheSize:          "50% RAM",
		}

	default: // MIXED
		d.Profile = "MIXED / HTAP"
		d.Description = "Смешанная нагрузка: транзакции + аналитика."
		d.Confidence = "Low"
		d.Tuning = TuningConfig{
			TempFileLimit:               "8% от /pg_data",
			CheckpointTimeout:           "1200s",
			MinWalSize:                  "2GB",
			MaxWalSize:                  "12GB",
			MaxParallelWorkersPerGather: "2",
			MaxParallelWorkers:          "4",
		}
	}
	return d
}
