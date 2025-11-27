import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

interface DatabaseStats {
  totalQueries: number;
  avgResponseTime: number;
  activeConnections: number;
  cacheHitRatio: number;
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const [stats, setStats] = useState<DatabaseStats>({
    totalQueries: 0,
    avgResponseTime: 0,
    activeConnections: 0,
    cacheHitRatio: 0,
  });

  useEffect(() => {
    // Симуляция загрузки данных
    const simulateData = () => {
      setStats({
        totalQueries: Math.floor(Math.random() * 10000) + 5000,
        avgResponseTime: Math.random() * 100 + 50,
        activeConnections: Math.floor(Math.random() * 50) + 10,
        cacheHitRatio: Math.random() * 20 + 75,
      });
    };

    simulateData();
    const interval = setInterval(simulateData, 3000);

    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="animated-gradient min-h-screen w-full overflow-x-hidden">
      {/* Header */}
      <header className="bg-[#212020]/90 backdrop-blur-sm border-b border-[#312f2f] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-white font-['Inter']">
              PG Load Profile
            </h1>
            <span className="text-sm text-[#4f4e4e]">
              PostgreSQL Performance Dashboard
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-white font-['Inter']">{user}</span>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-[#191818] text-white rounded-lg border border-[#312f2f] hover:bg-[#212020] hover:border-[#4a4747] transition-all duration-300 font-['Inter'] text-sm"
            >
              Выйти
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Welcome Section */}
        <div className="mb-8 animate-fade-in">
          <h2 className="text-3xl font-bold text-white mb-2 font-['Inter']">
            Добро пожаловать в панель управления
          </h2>
          <p className="text-[#4f4e4e] font-['Inter']">
            Мониторинг производительности базы данных в реальном времени
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Queries */}
          <div className="bg-[#212020]/90 backdrop-blur-sm rounded-xl border border-[#312f2f] p-6 hover:border-[#4a4747] transition-all duration-300 animate-fade-up" style={{'--animation-delay': '0.1s'} as React.CSSProperties}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[#4f4e4e] text-sm font-['Inter']">
                Всего запросов
              </h3>
              <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-white font-['Inter']">
              {stats.totalQueries.toLocaleString()}
            </p>
          </div>

          {/* Avg Response Time */}
          <div className="bg-[#212020]/90 backdrop-blur-sm rounded-xl border border-[#312f2f] p-6 hover:border-[#4a4747] transition-all duration-300 animate-fade-up" style={{'--animation-delay': '0.2s'} as React.CSSProperties}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[#4f4e4e] text-sm font-['Inter']">
                Среднее время ответа
              </h3>
              <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-white font-['Inter']">
              {stats.avgResponseTime.toFixed(2)} <span className="text-lg text-[#4f4e4e]">мс</span>
            </p>
          </div>

          {/* Active Connections */}
          <div className="bg-[#212020]/90 backdrop-blur-sm rounded-xl border border-[#312f2f] p-6 hover:border-[#4a4747] transition-all duration-300 animate-fade-up" style={{'--animation-delay': '0.3s'} as React.CSSProperties}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[#4f4e4e] text-sm font-['Inter']">
                Активные соединения
              </h3>
              <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-white font-['Inter']">
              {stats.activeConnections}
            </p>
          </div>

          {/* Cache Hit Ratio */}
          <div className="bg-[#212020]/90 backdrop-blur-sm rounded-xl border border-[#312f2f] p-6 hover:border-[#4a4747] transition-all duration-300 animate-fade-up" style={{'--animation-delay': '0.4s'} as React.CSSProperties}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[#4f4e4e] text-sm font-['Inter']">
                Коэффициент попаданий в кеш
              </h3>
              <div className="w-8 h-8 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-white font-['Inter']">
              {stats.cacheHitRatio.toFixed(1)} <span className="text-lg text-[#4f4e4e]">%</span>
            </p>
          </div>
        </div>

        {/* Additional Info */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <div className="bg-[#212020]/90 backdrop-blur-sm rounded-xl border border-[#312f2f] p-6 animate-fade-up" style={{'--animation-delay': '0.5s'} as React.CSSProperties}>
            <h3 className="text-xl font-bold text-white mb-4 font-['Inter']">
              Последняя активность
            </h3>
            <div className="space-y-3">
              {[1, 2, 3, 4].map((item) => (
                <div key={item} className="flex items-center gap-3 p-3 bg-[#191818] rounded-lg border border-[#312f2f]">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-white text-sm font-['Inter']">
                      Запрос выполнен успешно
                    </p>
                    <p className="text-[#4f4e4e] text-xs font-['Inter']">
                      {new Date().toLocaleTimeString('ru-RU')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* System Status */}
          <div className="bg-[#212020]/90 backdrop-blur-sm rounded-xl border border-[#312f2f] p-6 animate-fade-up" style={{'--animation-delay': '0.6s'} as React.CSSProperties}>
            <h3 className="text-xl font-bold text-white mb-4 font-['Inter']">
              Статус системы
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-[#4f4e4e] text-sm font-['Inter']">Использование CPU</span>
                  <span className="text-white text-sm font-['Inter']">45%</span>
                </div>
                <div className="w-full h-2 bg-[#191818] rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: '45%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-[#4f4e4e] text-sm font-['Inter']">Использование памяти</span>
                  <span className="text-white text-sm font-['Inter']">68%</span>
                </div>
                <div className="w-full h-2 bg-[#191818] rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full" style={{ width: '68%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-[#4f4e4e] text-sm font-['Inter']">Использование диска</span>
                  <span className="text-white text-sm font-['Inter']">32%</span>
                </div>
                <div className="w-full h-2 bg-[#191818] rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500 rounded-full" style={{ width: '32%' }}></div>
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

