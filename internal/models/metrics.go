package models

// WorkloadMetrics содержит рассчитанные метрики профиля
type WorkloadMetrics struct {
	DBTimeTotal     float64 // Общее время базы (из pg_stat_statements)
	DBTimeCommitted float64 // Чистое время работы (DB Time - Waits)
	CPUTime         float64 // Время на CPU
	IOTime          float64 // Время на I/O
	LockTime        float64 // Время на блокировках
	
	// Процентные соотношения для удобства классификации
	CPUPercent  float64
	IOPercent   float64
	LockPercent float64
}
