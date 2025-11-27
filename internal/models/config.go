package models

// TuningConfig — Реальные параметры postgresql.conf, которые можно применить
type TuningConfig struct {
	SharedBuffers      string `json:"shared_buffers"`
	WorkMem            string `json:"work_mem"`
	MaxWalSize         string `json:"max_wal_size"`       // wal_size
	CheckpointTimeout  string `json:"checkpoint_timeout"` // checkpoint
	SynchronousCommit  string `json:"synchronous_commit"` // sync_commit
	MaxParallelWorkers string `json:"max_parallel_workers_per_gather"` // parallel
	DeadlockTimeout    string `json:"deadlock_timeout"`   // deadlock_to
	AutovacuumNaptime  string `json:"autovacuum_naptime,omitempty"`
}
