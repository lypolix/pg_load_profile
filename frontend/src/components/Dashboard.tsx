import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { DBTimeChart } from "./DBTimeChart";
import { MetricCard } from "./MetricCard";
import { GaugeChart } from "./GaugeChart";
import { DatabaseStatus } from "./DatabaseStatus";
import { QualityChart } from "./QualityChart";
import { MetricHistoryCard } from "./MetricHistoryCard";
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
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isLoadMenuOpen, setIsLoadMenuOpen] = useState(false);
  const [selectedLoad, setSelectedLoad] = useState("Выбор нагрузки");
  const [isInitializing, setIsInitializing] = useState(false);
  
  // История метрик для графиков (последние 20 точек)
  const [metricsHistory, setMetricsHistory] = useState<Array<{
    timestamp: number;
    dbTimeTotal: number;
    cpuTime: number;
    ioTime: number;
    lockTime: number;
  }>>([]);

  // История для карточек метрик (последние 5 точек)
  const [metricsCardsHistory, setMetricsCardsHistory] = useState<Array<{
    commitRatio: number;
    wastedDBTime: number;
    dominateDBTime: number;
  }>>([]);

  const configModes = [
    { label: "OLTP", value: "oltp" },
    { label: "OLAP", value: "olap" },
    { label: "Write-heavy", value: "write_heavy" },
    { label: "High-concurrency", value: "high_concurrency" },
    { label: "Read-heavy", value: "reporting" },
    { label: "HTAP", value: "mixed" },
    { label: "Bulk ETL", value: "etl" },
    { label: "Archive-Scan", value: "cold" },
  ];

  const loadScenarios = [
    { value: "oltp", label: "OLTP" },
    { value: "olap", label: "OLAP" },
    { value: "iot", label: "Write-heavy" },
    { value: "locks", label: "High - concurrency" },
    { value: "reporting", label: "Read-heavy" },
    { value: "mixed", label: "HTAP" },
    { value: "etl", label: "Bulk ETL" },
    { value: "cold", label: "Archive-Scan" },
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
      
      // Добавляем данные в историю для графика
      if (status?.diagnosis?.metrics) {
        const newPoint = {
          timestamp: Date.now(),
          dbTimeTotal: status.diagnosis.metrics.db_time_total || 0,
          cpuTime: status.diagnosis.metrics.cpu_time || 0,
          ioTime: status.diagnosis.metrics.io_time || 0,
          lockTime: status.diagnosis.metrics.lock_time || 0,
        };
        
        setMetricsHistory(prev => {
          const updated = [...prev, newPoint];
          // Храним только последние 20 точек
          return updated.slice(-20);
        });

        // Добавляем данные в историю для карточек метрик
        const newCardPoint = {
          commitRatio: status.diagnosis.metrics.commit_ratio || 0,
          wastedDBTime: status.diagnosis.metrics.wasted_db_time || 0,
          dominateDBTime: status.diagnosis.metrics.dominate_db_time || 0,
        };
        
        setMetricsCardsHistory(prev => {
          const updated = [...prev, newCardPoint];
          // Храним только последние 5 точек
          return updated.slice(-5);
        });
      }
      
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

  // Закрытие меню при клике вне его
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (isProfileMenuOpen && !target.closest('.profile-menu-container')) {
        setIsProfileMenuOpen(false);
      }
      if (isLoadMenuOpen && !target.closest('.load-menu-container')) {
        setIsLoadMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isProfileMenuOpen, isLoadMenuOpen]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleConfigApply = async (presetValue: string, presetLabel: string) => {
    setSelectedMode(presetLabel);
    try {
      await ApiService.applyPreset(presetValue);
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

  const handleInitDB = async () => {
    if (isInitializing) return;
    
    const confirmed = window.confirm(
      "Инициализация базы данных создаст тестовые таблицы pgbench.\n\n" +
      "Это займет 30-60 секунд. Продолжить?"
    );
    
    if (!confirmed) return;
    
    try {
      setIsInitializing(true);
      await ApiService.startLoad("init");
      alert("База данных инициализируется. Подождите 30-60 секунд, затем можете запускать нагрузку.");
    } catch (err) {
      console.error("Error initializing DB:", err);
      alert("Ошибка инициализации базы данных");
    } finally {
      setTimeout(() => setIsInitializing(false), 60000); // Разблокировать через минуту
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
        <div className="max-w-[1800px] mx-auto px-6">
          {/* Top row - Avatar only */}
          <div className="flex items-center justify-end gap-4 py-3 border-b border-[#2a2a2a]">
            {/* Avatar with dropdown */}
            <div className="relative profile-menu-container">
              <button
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                className="w-10 h-10 rounded-full bg-gradient-to-br from-[#10B981] to-[#059669] flex items-center justify-center text-white font-semibold text-sm hover:shadow-[0_0_15px_rgba(16,185,129,0.4)] transition-all"
              >
                A
              </button>
              
              {isProfileMenuOpen && (
                <div className="absolute right-0 top-12 w-48 bg-[#1a1a1a] border border-[#312f2f] rounded-lg shadow-xl overflow-hidden z-50">
                  <button
                    className="w-full px-4 py-3 text-left text-white hover:bg-[#2a2a2a] transition-colors flex items-center gap-3"
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      handleLogout();
                    }}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Выйти
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Bottom row - Config buttons, load selector and info */}
          <div className="flex items-center justify-between gap-4 py-4">
            {/* Left side: Config Presets + Load Scenario */}
            <div className="flex items-center gap-2">
              {configModes.map((mode) => (
                <button
                  key={mode.value}
                  onClick={() => handleConfigApply(mode.value, mode.label)}
                  className={`px-4 py-2 rounded-lg text-sm transition-all ${
                    selectedMode === mode.label
                      ? "bg-[#10B981] text-white font-semibold shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                      : "bg-transparent text-[#8a8a8a] border border-[#3a3a3a] hover:border-[#10B981] hover:text-[#10B981]"
                  }`}
                >
                  {mode.label}
                </button>
              ))}
              
              {/* Load Scenario Custom Dropdown */}
              <div className="relative ml-2 load-menu-container">
                <button
                  onClick={() => setIsLoadMenuOpen(!isLoadMenuOpen)}
                  className="px-4 py-2 bg-transparent text-white rounded-xl border border-[#3a3a3a] hover:border-[#10B981] text-sm cursor-pointer transition-all pr-10 min-w-[180px] text-left"
                >
                  {selectedLoad}
                </button>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#626262] transition-transform" style={{ transform: `translateY(-50%) rotate(${isLoadMenuOpen ? '180deg' : '0deg'})` }}>
                  ▼
                </div>
                
                {isLoadMenuOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-[#1a1a1a] border border-[#312f2f] rounded-xl shadow-xl overflow-hidden z-50">
                    {loadScenarios.map((scenario) => (
                      <button
                        key={scenario.value}
                        onClick={() => {
                          setSelectedLoad(scenario.label);
                          setIsLoadMenuOpen(false);
                          handleLoadStart(scenario.value);
                        }}
                        className="w-full px-4 py-3 text-left text-white hover:bg-[#10B981] hover:text-white transition-colors text-sm"
                      >
                        {scenario.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right side: Last update info + Init DB button */}
            <div className="flex items-center gap-4">
              <button
                onClick={handleInitDB}
                disabled={isInitializing}
                className={`px-4 py-2 rounded-lg text-sm border transition-all ${
                  isInitializing
                    ? "bg-[#FFA500]/20 text-[#FFA500] border-[#FFA500] cursor-not-allowed opacity-60"
                    : "bg-[#FFA500]/10 text-[#FFA500] border-[#FFA500] hover:bg-[#FFA500] hover:text-white"
                }`}
                title="Инициализация базы данных для тестирования (выполнить один раз)"
              >
                {isInitializing ? "Инициализация..." : "Init DB"}
              </button>
              <div className="text-right">
                <div className="text-xs text-[#626262]">
                  Last update: {statusData?.timestamp ? new Date(statusData.timestamp).toLocaleTimeString() : 'N/A'}
                </div>
                <button
                  onClick={fetchData}
                  className="text-sm text-[#06B6D4] hover:text-[#0891B2]"
                >
                  обновить
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1800px] mx-auto px-6 py-6">
        {/* Top Row - Chart, Metrics and Status (до карточек Commit Ratio) */}
        <div className="grid grid-cols-12 gap-4 items-stretch">
          {/* DB Time Chart */}
          <div className="col-span-5">
            <DBTimeChart
              dbTimeTotal={metrics?.db_time_total || 0}
              cpuTime={metrics?.cpu_time || 0}
              ioTime={metrics?.io_time || 0}
              lockTime={metrics?.lock_time || 0}
              history={metricsHistory}
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
              value={`${Math.round(metrics?.rollback_rate || 0)}%`} 
              variant="default" 
            />
            <MetricCard 
              title="AvgQuery Time" 
              value={metrics?.avg_query_latency_ms && metrics.avg_query_latency_ms > 0 
                ? `${Math.round(metrics.avg_query_latency_ms * 100) / 100}ms` 
                : '0ms'} 
              variant="default" 
            />
          </div>

          {/* Database Status - только верхняя часть (Status + Metrics Cards) */}
          <div className="col-span-5">
            <div className="space-y-4 h-full flex flex-col">
              {/* Status Block */}
              <div className={`relative rounded-[20px] overflow-hidden ${
                (dashboardData?.cache_hit_ratio || 0) > 0
                  ? "bg-gradient-to-t from-[#44E916]/40 via-[#44E916]/20 to-[#44E916]/5"
                  : "bg-gradient-to-t from-[#EF4444]/40 via-[#EF4444]/20 to-[#EF4444]/5"
              }`}
              style={{
                boxShadow: (dashboardData?.cache_hit_ratio || 0) > 0
                  ? 'inset 0 -80px 100px rgba(68, 233, 22, 0.15)'
                  : 'inset 0 -80px 100px rgba(239, 68, 68, 0.15)'
              }}>
                <div className="p-6">
                  <h2 className="font-['Inter'] font-bold text-white text-2xl mb-4">
                    Database Status
                  </h2>
                  <div className="flex items-center justify-center py-4">
                    <span className={`font-['Inter'] font-bold text-[80px] uppercase tracking-wider ${
                      (dashboardData?.cache_hit_ratio || 0) > 0
                        ? "text-[#44E916]" 
                        : "text-[#EF4444]"
                    }`}
                    style={{
                      textShadow: (dashboardData?.cache_hit_ratio || 0) > 0
                        ? '0 0 40px rgba(68, 233, 22, 0.8), 0 0 80px rgba(68, 233, 22, 0.4)'
                        : '0 0 40px rgba(239, 68, 68, 0.8), 0 0 80px rgba(239, 68, 68, 0.4)'
                    }}>
                      {(dashboardData?.cache_hit_ratio || 0) > 0 ? "ALIVE" : "OFFLINE"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Metrics Cards with History */}
              <div className="grid grid-cols-3 gap-4 flex-1">
                <MetricHistoryCard
                  title="Commit Ratio"
                  value={metrics?.commit_ratio || 0}
                  color="#10B981"
                  history={metricsCardsHistory.map(h => h.commitRatio)}
                />
                <MetricHistoryCard
                  title="Wasted DB time"
                  value={metrics?.wasted_db_time || 0}
                  color="#06B6D4"
                  history={metricsCardsHistory.map(h => h.wastedDBTime)}
                />
                <MetricHistoryCard
                  title="Dominate DB time"
                  value={metrics?.dominate_db_time || 0}
                  color="#A855F7"
                  history={metricsCardsHistory.map(h => h.dominateDBTime)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Row - Gauges, Quality Chart и Cache + Disc usage */}
        <div className="grid grid-cols-12 gap-4 mt-4">
          {/* Gauges and Quality Chart - занимают столько же по ширине, сколько большой график + карточки (col-span-7) */}
          <div className="col-span-7">
            <div className="grid grid-cols-2 gap-4 h-full">
              {/* CPU Usage */}
              <div>
                <GaugeChart 
                  title="CPU Usage" 
                  value={metrics?.cpu_percent || 0} 
                  status={
                    (metrics?.cpu_percent || 0) > 80 ? "critical" : 
                    (metrics?.cpu_percent || 0) > 50 ? "warning" : "normal"
                  } 
                />
              </div>
              
              {/* IO Usage */}
              <div>
                <GaugeChart 
                  title="IO Usage" 
                  value={metrics?.io_percent || 0} 
                  status={
                    (metrics?.io_percent || 0) > 80 ? "critical" : 
                    (metrics?.io_percent || 0) > 50 ? "warning" : "normal"
                  } 
                />
              </div>
              
              {/* Lock time usage */}
              <div>
                <GaugeChart 
                  title="Lock time usage" 
                  value={metrics?.lock_percent || 0} 
                  status={
                    (metrics?.lock_percent || 0) > 15 ? "critical" : 
                    (metrics?.lock_percent || 0) > 5 ? "warning" : "normal"
                  } 
                />
              </div>

              {/* Quality Chart */}
              <div>
                <QualityChart history={metricsHistory} />
              </div>
            </div>
          </div>
          
          {/* Cache + Disc usage - выравнивается с нижней сеткой */}
          <div className="col-span-5">
            <div className="bg-[#212020] rounded-[20px] border border-[#312f2f] p-6 h-full">
              {/* Cache Hit Ratio */}
              <div className="mb-6">
                <h3 className="font-['Inter'] font-bold text-white text-sm mb-3">
                  Cache Hit Ratio
                </h3>
                <div className="bg-gradient-to-br from-[#06B6D4]/20 to-[#06B6D4]/5 rounded-lg p-4 border border-[#312f2f]/50">
                  <div className="flex items-center justify-between">
                    <span className="font-['Inter'] font-bold text-3xl text-[#06B6D4]">
                      {(dashboardData?.cache_hit_ratio || 0).toFixed(1)}%
                    </span>
                    <span className="font-['Inter'] text-[#626262] text-xs">
                      current
                    </span>
                  </div>
                </div>
              </div>

              {/* Disc Usage */}
              <div>
                <h3 className="font-['Inter'] font-bold text-white text-lg mb-4">
                  Disc usage
                </h3>
                <div className="space-y-3 max-h-[200px] overflow-y-auto">
                  {dashboardData?.top_tables_by_size && dashboardData.top_tables_by_size.length > 0 ? (
                    dashboardData.top_tables_by_size.map((item, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <span className="font-['Inter'] text-white text-sm w-32 truncate">
                          {item.table_name}
                        </span>
                        <div className="flex-1 h-6 bg-[#2a2929] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-[#06B6D4] to-[#0891B2] transition-all duration-500"
                            style={{ width: `${Math.min(item.usage_percent, 100)}%` }}
                          />
                        </div>
                        <span className="font-['Inter'] text-white text-sm w-20 text-right">
                          {item.size_pretty}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-[#626262] py-4 font-['Inter']">
                      No table data available
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
