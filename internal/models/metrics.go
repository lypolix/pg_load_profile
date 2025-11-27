package models

// WorkloadMetrics содержит рассчитанные метрики профиля
type WorkloadMetrics struct {
	// --- DB Time Metrics (Уже были) ---
	DBTimeTotal     float64 `json:"db_time_total"`
	DBTimeCommitted float64 `json:"db_time_committed"`
	CPUTime         float64 `json:"cpu_time"`
	IOTime          float64 `json:"io_time"`
	LockTime        float64 `json:"lock_time"`

	CPUPercent  float64 `json:"cpu_percent"`
	IOPercent   float64 `json:"io_percent"`
	LockPercent float64 `json:"lock_percent"`

	// --- NEW: Throughput & Counters (Новые) ---
	TPS              float64 `json:"tps"`                 // Транзакций в секунду
	QPS              float64 `json:"qps"`                 // Запросов в секунду
	AvgLatency       float64 `json:"avg_query_latency_ms"`// Среднее время запроса
	RollbackRate     float64 `json:"rollback_rate"`       // Откатов в секунду
	
	TotalCommits     int64   `json:"total_commits"`       // Счетчик на момент замера
	TotalRollbacks   int64   `json:"total_rollbacks"`     // Счетчик на момент замера
	TotalCalls       int64   `json:"total_calls"`         // Счетчик pg_stat_statements
}