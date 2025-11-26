package analyzer

import (
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
	Profile     string         `json:"profile"`
	Description string         `json:"description"`
	Confidence  string         `json:"confidence"`
	Metrics     models.WorkloadMetrics `json:"metrics"`
	Tuning      TuningConfig   `json:"tuning_recommendations"`
	Reasoning   string         `json:"reasoning"` // Объяснение, почему выбран этот профиль
}

func ClassifyWorkload(m models.WorkloadMetrics) Diagnosis {
	d := Diagnosis{
		Metrics: m,
	}

	// 0. IDLE (Простой)
	if m.DBTimeTotal < 0.5 {
		d.Profile = "IDLE"
		d.Description = "Система простаивает. Нагрузки нет."
		d.Confidence = "High"
		d.Tuning = TuningConfig{CheckpointTimeout: "300s", MaxWalSize: "1GB"}
		return d
	}

	// 1. HIGH CONCURRENCY (Блокировки)
	if m.LockPercent > 20 {
		d.Profile = "HIGH CONCURRENCY"
		d.Description = "Критическая конкуренция за ресурсы (Row locks, LWLock)."
		d.Confidence = "High"
		d.Tuning = TuningConfig{
            // Тюнинг для снижения блокировок
			TempFileLimit: "5% от /pg_data", CheckpointTimeout: "600s", MinWalSize: "1GB", MaxWalSize: "4GB",
			MaxParallelWorkersPerGather: "0", MaxParallelWorkers: "0", AutovacuumNaptime: "10s",
		}
		return d
	}

	// 2. COLD / ARCHIVE-SCAN (Редкие полные сканы)
	// Диск вычитывается "в полку", процессор почти спит. Это бэкап или SeqScan холодной таблицы.
	if m.IOPercent > 80 && m.CPUPercent < 15 {
		d.Profile = "COLD / ARCHIVE-SCAN"
		d.Description = "Полное сканирование холодных данных. Бэкап или SeqScan без кэша."
		d.Confidence = "High"
		d.Tuning = TuningConfig{
			EffectiveCacheSize: "90% RAM", // Максимизируем кэш файловой системы
			MaxParallelWorkersPerGather: "CPU / 2", // Помогаем читать параллельно
            AutovacuumNaptime: "5min",
		}
		return d
	}

	// 3. ANALYTICAL OLAP (Аналитика)
	// Высокий IO (но не 100%), значительный CPU (считаем хэши, агрегаты).
	if m.IOPercent > 40 {
		d.Profile = "OLAP (ANALYTICAL)"
		d.Description = "Тяжелые запросы, JOIN, агрегации. Data Mining."
		d.Confidence = "Medium"
		d.Tuning = TuningConfig{
			TempFileLimit: "10% от /pg_data", CheckpointTimeout: "1800s", MinWalSize: "4GB", MaxWalSize: "16GB",
			MaxParallelWorkersPerGather: "CPU / 4", MaxParallelWorkers: "CPU / 2", EffectiveCacheSize: "75% RAM",
		}
		return d
	}

	// 4. READ-HEAVY / REPORTING (Отчетность в памяти)
	// Почти нет IO (всё в кэше), очень высокий CPU, но нет блокировок (чтение не блокирует).
	if m.CPUPercent > 80 && m.IOPercent < 5 && m.LockPercent < 5 {
		d.Profile = "READ-HEAVY / REPORTING"
		d.Description = "Агрессивное чтение из кэша (RAM). Горячие отчеты."
		d.Confidence = "High"
		d.Tuning = TuningConfig{
			EffectiveCacheSize: "80% RAM", 
            MaxParallelWorkersPerGather: "0", // Обычно короткие запросы
            CheckpointTimeout: "30min", // Писать нечего
		}
		return d
	}

	// 5. CLASSIC OLTP (Транзакционный)
	// Умеренный IO (WAL), высокий CPU, небольшие блокировки.
	if m.CPUPercent > 50 {
		d.Profile = "CLASSIC OLTP"
		d.Description = "Банкинг, Биржа. Короткие транзакции."
		d.Confidence = "High"
		d.Tuning = TuningConfig{
			TempFileLimit: "5% от /pg_data", CheckpointTimeout: "900s", MinWalSize: "2GB", MaxWalSize: "8GB",
			MaxParallelWorkersPerGather: "0", MaxParallelWorkers: "0", EffectiveCacheSize: "50% RAM",
		}
		return d
	}

	// 6. BULK ETL / BATCH LOAD (Массовая загрузка)
	// Доминирует IO (запись), но блокировок мало (COPY). 
	// Отличается от IoT тем, что IO выше (поток плотнее), а CPU совсем низкий.
	if m.IOPercent > 30 && m.CPUPercent < 20 {
		d.Profile = "BULK ETL / BATCH LOAD"
		d.Description = "Массовая загрузка данных (COPY, Loader). Высокая нагрузка на WAL."
		d.Confidence = "Medium"
		d.Tuning = TuningConfig{
			CheckpointTimeout: "30min", MaxWalSize: "64GB", // Огромный WAL, чтобы не тормозить
            AutovacuumNaptime: "1min", MinWalSize: "4GB",
		}
		return d
	}

    // 7. WRITE-HEAVY (IoT)
    // Похоже на ETL, но нагрузка "полегче", CPU чуть выше (индексы обновляются чаще).
    // Ловится как "остаточный" профиль с IO > 20.
    if m.IOPercent > 15 {
        d.Profile = "WRITE-HEAVY (IoT)"
        d.Description = "Постоянный поток вставок. Телеметрия."
        d.Confidence = "Low"
        d.Tuning = TuningConfig{
             CheckpointTimeout: "1800s", MaxWalSize: "16GB", AutovacuumNaptime: "1min",
        }
        return d
    }

	// 8. MIXED / HTAP (Гибридный)
	// Всё остальное.
	d.Profile = "MIXED / HTAP"
	d.Description = "Смешанная нагрузка: транзакции + аналитика."
	d.Confidence = "Low"
	d.Tuning = TuningConfig{
		TempFileLimit: "8% от /pg_data", CheckpointTimeout: "1200s", MinWalSize: "2GB", MaxWalSize: "12GB",
		MaxParallelWorkersPerGather: "2", MaxParallelWorkers: "4",
	}

	return d
}
