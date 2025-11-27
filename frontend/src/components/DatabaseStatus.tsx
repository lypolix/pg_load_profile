import React from "react";
import { TableStats } from "../types/api";

interface DatabaseStatusProps {
  cacheHitRatio?: number;
  topTables?: TableStats[];
}

export const DatabaseStatus: React.FC<DatabaseStatusProps> = ({
  cacheHitRatio = 0,
  topTables = [],
}) => {
  const isAlive = cacheHitRatio > 0;

  return (
    <div className="space-y-4">
      {/* Status Block - Отдельный блок */}
      <div className={`relative rounded-[20px] overflow-hidden ${
        isAlive
          ? "bg-gradient-to-t from-[#44E916]/40 via-[#44E916]/20 to-[#44E916]/5"
          : "bg-gradient-to-t from-[#EF4444]/40 via-[#EF4444]/20 to-[#EF4444]/5"
      }`}
      style={{
        boxShadow: isAlive 
          ? 'inset 0 -80px 100px rgba(68, 233, 22, 0.15)'
          : 'inset 0 -80px 100px rgba(239, 68, 68, 0.15)'
      }}>
        <div className="p-6">
          <h2 className="font-['Inter'] font-bold text-white text-2xl mb-4">
            Database Status
          </h2>
          <div className="flex items-center justify-center py-4">
            <span className={`font-['Inter'] font-bold text-[80px] uppercase tracking-wider ${
              isAlive 
                ? "text-[#44E916]" 
                : "text-[#EF4444]"
            }`}
            style={{
              textShadow: isAlive
                ? '0 0 40px rgba(68, 233, 22, 0.8), 0 0 80px rgba(68, 233, 22, 0.4)'
                : '0 0 40px rgba(239, 68, 68, 0.8), 0 0 80px rgba(239, 68, 68, 0.4)'
            }}>
              {isAlive ? "ALIVE" : "OFFLINE"}
            </span>
          </div>
        </div>
      </div>

      {/* Rest in grey block */}
      <div className="bg-[#212020] rounded-[20px] border border-[#312f2f] p-6">
        {/* Cache Hit Ratio */}
        <div className="mb-6">
          <h3 className="font-['Inter'] font-bold text-white text-sm mb-3">
            Cache Hit Ratio
          </h3>
          <div className="bg-gradient-to-br from-[#06B6D4]/20 to-[#06B6D4]/5 rounded-lg p-4 border border-[#312f2f]/50">
            <div className="flex items-center justify-between">
              <span className="font-['Inter'] font-bold text-3xl text-[#06B6D4]">
                {cacheHitRatio.toFixed(1)}%
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
            Disc usage (Top Tables)
          </h3>
          <div className="space-y-3 max-h-[200px] overflow-y-auto">
            {topTables.length > 0 ? (
              topTables.map((item, index) => (
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
  );
};
