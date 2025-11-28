// API Response Types

export interface WorkloadMetrics {
  db_time_total: number;
  db_time_committed: number;
  cpu_time: number;
  io_time: number;
  lock_time: number;
  cpu_percent: number;
  io_percent: number;
  lock_percent: number;
  tps: number;
  qps: number;
  avg_query_latency_ms: number;
  rollback_rate: number;
  total_commits: number;
  total_rollbacks: number;
  total_calls: number;
  commit_ratio: number;
  wasted_db_time: number;
  dominate_db_time: number;
}

export interface TuningConfig {
  shared_buffers: string;
  work_mem: string;
  max_wal_size: string;
  checkpoint_timeout: string;
  synchronous_commit: string;
  max_parallel_workers_per_gather: string;
  deadlock_timeout: string;
  autovacuum_naptime?: string;
}

export interface Diagnosis {
  profile: string;
  description: string;
  confidence: string;
  metrics: WorkloadMetrics;
  tuning_recommendations: TuningConfig;
  reasoning: string;
}

export interface ScenarioInfo {
  load_scenario: string;
  active_config: string;
  start_time: string;
}

export interface StatusResponse {
  timestamp: string;
  ground_truth: ScenarioInfo | null;
  diagnosis: Diagnosis;
}

export interface WaitEventSummary {
  event: string;
  count: number;
}

export interface TableStats {
  table_name: string;
  size_pretty: string;
  size_bytes: number;
  usage_percent: number;
  seq_scans: number;
  index_scans: number;
  rows_inserted: number;
  dead_rows: number;
}

export interface DashboardData {
  version: string;
  uptime: string;
  db_size: string;
  active_connections: number;
  idle_connections: number;
  cache_hit_ratio: number;
  top_wait_events_5min: WaitEventSummary[];
  top_tables_by_size: TableStats[];
}

