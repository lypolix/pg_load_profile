import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { DBTimeChart } from "./DBTimeChart";
import { MetricCard } from "./MetricCard";
import { GaugeChart } from "./GaugeChart";
import { DatabaseStatus } from "./DatabaseStatus";
import { QualityChart } from "./QualityChart";
import { ApiService } from "../services/api";
import { StatusResponse, DashboardData } from "../types/api";

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [selectedMode, setSelectedMode] = useState("OLTP");
  const [statusData, setStatusData] = useState<StatusResponse | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const configModes = [
    "OLTP",
    "OLAP",
    "Write-heavy",
    "High - concurrency",
    "Read-heavy",
    "HTAP",
    "Bulk ETL",
    "Archive-Scan",
  ];

  const loadScenarios = [
    { value: "oltp", label: "OLTP" },
    { value: "olap", label: "OLAP" },
    { value: "iot", label: "IoT/Write-heavy" },
    { value: "locks", label: "High Concurrency" },
    { value: "reporting", label: "Read-heavy" },
  ];

  // Загрузка данных
  const fetchData = async () => {
    try {
      setError(null);
      const [status, dashboard] = await Promise.all([
        ApiService.getStatus(),
        ApiService.getDashboard(),
      ]);
      setStatusData(status);
      setDashboardData(dashboard);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Не удалось загрузить данные с сервера");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000); // Обновление каждые 5 секунд
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleConfigApply = async (preset: string) => {
    setSelectedMode(preset);
    try {
      await ApiService.applyPreset(preset.toLowerCase().replace(/\s+/g, "_"));
      fetchData();
    } catch (err) {
      console.error("Error applying config:", err);
    }
  };

  const handleLoadStart = async (scenario: string) => {
    try {
      await ApiService.startLoad(scenario);
      fetchData();
    } catch (err) {
      console.error("Error starting load:", err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-[#0d0d0d] flex items-center justify-center">
        <div className="text-white text-xl font-['Inter']">Загрузка...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen w-full bg-[#0d0d0d] flex items-center justify-center">
        <div className="text-red-500 text-xl font-['Inter']">{error}</div>
      </div>
    );
  }

  const metrics = statusData?.diagnosis?.metrics;
  const profile = statusData?.diagnosis?.profile || "UNKNOWN";

  return (
    <div className="min-h-screen w-full bg-[#0d0d0d] overflow-x-hidden">
      {/* Header */}
      <header className="bg-[#1a1a1a]/95 backdrop-blur-sm border-b border-[#312f2f] sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-6 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Config Presets */}
            <div className="flex items-center gap-2">
              {configModes.map((mode) => (
                <button
                  key={mode}
                  onClick={() => handleConfigApply(mode)}
                  className={`px-4 py-2 rounded-lg text-sm font-['Inter'] transition-all ${
                    selectedMode === mode
                      ? "bg-[#10B981] text-white shadow-[0_0_15px_rgba(16,185,129,0.5)]"
                      : "bg-[#212020] text-[#626262] border border-[#312f2f] hover:border-[#4a4747]"
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>

            {/* Right side */}
            <div className="flex items-center gap-4">
              {/* Load Scenario Dropdown */}
              <div className="relative">
                <select
                  onChange={(e) => handleLoadStart(e.target.value)}
                  className="px-4 py-2 bg-[#212020] text-white rounded-lg border border-[#312f2f] hover:border-[#4a4747] font-['Inter'] text-sm cursor-pointer transition-all appearance-none pr-10"
                  defaultValue=""
                >
                  <option value="" disabled>Выбор нагрузки</option>
                  {loadScenarios.map((scenario) => (
                    <option key={scenario.value} value={scenario.value}>
                      {scenario.label}
                    </option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#626262]">
                  ▼
                </div>
              </div>

              <div className="px-4 py-2 bg-[#212020] text-white rounded-lg border border-[#312f2f] font-['Inter'] text-sm">
                Профиль: <span className="text-[#10B981] font-bold">{profile}</span>
              </div>
              <div className="text-right">
                <div className="text-xs text-[#626262] font-['Inter']">
                  Last update: {statusData?.timestamp ? new Date(statusData.timestamp).toLocaleTimeString() : 'N/A'}
                </div>
                <button
                  onClick={fetchData}
                  className="text-sm text-[#06B6D4] hover:text-[#0891B2] font-['Inter']"
                >
                  обновить
                </button>
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-[#212020] text-white rounded-lg border border-[#312f2f] hover:bg-[#2a2929] transition-all font-['Inter'] text-sm"
              >
                Выйти
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1800px] mx-auto px-6 py-6">
        {/* Top Row - Chart, Metrics and Status */}
        <div className="grid grid-cols-12 gap-4 mb-4">
          {/* DB Time Chart */}
          <div className="col-span-5">
            <DBTimeChart
              dbTimeTotal={metrics?.db_time_total || 0}
              cpuTime={metrics?.cpu_time || 0}
              ioTime={metrics?.io_time || 0}
              lockTime={metrics?.lock_time || 0}
            />
          </div>

          {/* Metrics Column */}
          <div className="col-span-2 flex flex-col gap-4">
            <MetricCard 
              title="TPS" 
              value={Math.round(metrics?.tps || 0)} 
              variant="green" 
            />
            <MetricCard 
              title="Rollback%" 
              value={Math.round(metrics?.rollback_rate || 0)} 
              variant="default" 
            />
            <MetricCard 
              title="AvgQuery Time" 
              value={`${Math.round(metrics?.avg_query_latency_ms || 0)}ms`} 
              variant="default" 
            />
          </div>

          {/* Database Status */}
          <div className="col-span-5">
            <DatabaseStatus 
              cacheHitRatio={dashboardData?.cache_hit_ratio || 0}
              topTables={dashboardData?.top_tables_by_size || []}
            />
          </div>
        </div>

        {/* Bottom Row - Gauges and Quality Chart */}
        <div className="grid grid-cols-12 gap-4">
          {/* Gauges */}
          <div className="col-span-3">
            <GaugeChart 
              title="CPU Usage" 
              value={Math.round(metrics?.cpu_percent || 0)} 
              status={
                (metrics?.cpu_percent || 0) > 80 ? "critical" : 
                (metrics?.cpu_percent || 0) > 50 ? "warning" : "normal"
              } 
            />
          </div>
          <div className="col-span-3">
            <GaugeChart 
              title="IO Usage" 
              value={Math.round(metrics?.io_percent || 0)} 
              status={
                (metrics?.io_percent || 0) > 80 ? "critical" : 
                (metrics?.io_percent || 0) > 50 ? "warning" : "normal"
              } 
            />
          </div>
          <div className="col-span-3">
            <GaugeChart 
              title="Lock time usage" 
              value={Math.round(metrics?.lock_percent || 0)} 
              status={
                (metrics?.lock_percent || 0) > 15 ? "critical" : 
                (metrics?.lock_percent || 0) > 5 ? "warning" : "normal"
              } 
            />
          </div>

          {/* Quality Chart */}
          <div className="col-span-3">
            <QualityChart />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
