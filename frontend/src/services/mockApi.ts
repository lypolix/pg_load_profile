import { StatusResponse, DashboardData } from '../types/api';

// Mock данные для демонстрации
export class MockApiService {
  static async getStatus(): Promise<StatusResponse> {
    // Симуляция задержки сети
    await new Promise(resolve => setTimeout(resolve, 300));
    
    return {
      timestamp: new Date().toISOString(),
      ground_truth: {
        load_scenario: "oltp",
        active_config: "CLASSIC OLTP",
        start_time: new Date(Date.now() - 3600000).toISOString(),
      },
      diagnosis: {
        profile: "CLASSIC OLTP",
        description: "Банкинг, Биржа. Короткие транзакции.",
        confidence: "High",
        metrics: {
          db_time_total: 73.5,
          db_time_committed: 65.2,
          cpu_time: 45.3,
          io_time: 15.8,
          lock_time: 12.4,
          cpu_percent: 62,
          io_percent: 21,
          lock_percent: 17,
          tps: 145,
          qps: 892,
          avg_query_latency_ms: 12.5,
          rollback_rate: 2.3,
          total_commits: 8745,
          total_rollbacks: 138,
          total_calls: 53580,
          commit_ratio: 98.4, // (8745 / (8745 + 138)) * 100
          wasted_db_time: 17, // lock_percent
          dominate_db_time: 62, // max(cpu_percent, io_percent, lock_percent)
        },
        tuning_recommendations: {
          shared_buffers: "128MB",
          work_mem: "4MB",
          max_wal_size: "1GB",
          checkpoint_timeout: "15min",
          synchronous_commit: "on",
          max_parallel_workers_per_gather: "0",
          deadlock_timeout: "1s",
        },
        reasoning: "Score: 8.5 | IO: 21%, CPU: 62%, Lock: 17%",
      },
    };
  }

  static async getDashboard(): Promise<DashboardData> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    return {
      version: "PostgreSQL 15.3 on x86_64-pc-linux-gnu",
      uptime: "2h 34m 12s",
      db_size: "245 MB",
      active_connections: 12,
      idle_connections: 8,
      cache_hit_ratio: 98.7,
      top_wait_events_5min: [
        { event: "CPU", count: 1245 },
        { event: "DataFileRead", count: 342 },
        { event: "WALWrite", count: 156 },
        { event: "Lock", count: 89 },
        { event: "BufferIO", count: 45 },
      ],
      top_tables_by_size: [
        {
          table_name: "stock_unit",
          size_pretty: "32.5 GB",
          size_bytes: 34896183296,
          usage_percent: 85,
          seq_scans: 123,
          index_scans: 45678,
          rows_inserted: 123456,
          dead_rows: 234,
        },
        {
          table_name: "event_data",
          size_pretty: "28.3 GB",
          size_bytes: 30384537600,
          usage_percent: 74,
          seq_scans: 89,
          index_scans: 34567,
          rows_inserted: 98765,
          dead_rows: 456,
        },
        {
          table_name: "execution",
          size_pretty: "18.7 GB",
          size_bytes: 20079206400,
          usage_percent: 49,
          seq_scans: 234,
          index_scans: 23456,
          rows_inserted: 76543,
          dead_rows: 123,
        },
        {
          table_name: "container",
          size_pretty: "12.1 GB",
          size_bytes: 12992929792,
          usage_percent: 32,
          seq_scans: 456,
          index_scans: 12345,
          rows_inserted: 54321,
          dead_rows: 89,
        },
        {
          table_name: "analytics",
          size_pretty: "8.5 GB",
          size_bytes: 9126805504,
          usage_percent: 22,
          seq_scans: 678,
          index_scans: 9876,
          rows_inserted: 43210,
          dead_rows: 67,
        },
      ],
    };
  }

  static async applyPreset(preset: string): Promise<{ status: string; message: string }> {
    await new Promise(resolve => setTimeout(resolve, 500));
    return {
      status: "success",
      message: `Preset ${preset} applied successfully (mock)`,
    };
  }

  static async startLoad(scenario: string): Promise<{ status: string; message: string }> {
    await new Promise(resolve => setTimeout(resolve, 500));
    return {
      status: "started",
      message: `Load scenario ${scenario} started (mock)`,
    };
  }

  static async applyRecommendations(): Promise<{ status: string; message: string }> {
    await new Promise(resolve => setTimeout(resolve, 500));
    return {
      status: "success",
      message: "Recommendations applied successfully (mock)",
    };
  }

  static async applyCustomConfig(config: Record<string, string>): Promise<{ status: string; message: string }> {
    await new Promise(resolve => setTimeout(resolve, 500));
    return {
      status: "success",
      message: "Custom config applied successfully (mock)",
    };
  }
}

