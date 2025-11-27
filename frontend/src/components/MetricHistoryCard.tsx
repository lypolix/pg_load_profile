import React from "react";

interface MetricHistoryCardProps {
  title: string;
  value: number;
  color: string;
  history?: number[];
}

export const MetricHistoryCard: React.FC<MetricHistoryCardProps> = ({
  title,
  value,
  color,
  history = [],
}) => {
  // Формируем список значений: текущее + история (последние 5)
  const displayValues = [
    { value, timestamp: "now" },
    ...history.slice(-5).reverse().map((val, idx) => ({
      value: val,
      timestamp: `${2 * (idx + 1)}s ago`
    }))
  ];

  // Форматируем значение
  const formatValue = (val: number): string => {
    if (val >= 1000) {
      return val.toFixed(0);
    }
    return val.toFixed(1);
  };

  return (
    <div className="bg-[#212020] rounded-[20px] border border-[#312f2f] p-6 flex flex-col h-full">
      <h3 className="font-['Inter'] font-bold text-white text-lg mb-4">
        {title}
      </h3>
      
      {/* Current Value */}
      <div className="mb-4">
        <div className="flex items-baseline justify-between">
          <span 
            className="font-['Inter'] font-bold text-5xl"
            style={{ color }}
          >
            {formatValue(value)}
          </span>
          <span className="font-['Inter'] text-[#626262] text-xs">
            now
          </span>
        </div>
      </div>

      {/* History Values */}
      <div className="flex-1 flex flex-col justify-end space-y-2">
        {displayValues.slice(1).map((item, index) => (
          <div key={index} className="flex items-center justify-between">
            <span 
              className="font-['Inter'] text-lg"
              style={{ color }}
            >
              {formatValue(item.value)}
            </span>
            <span className="font-['Inter'] text-[#626262] text-xs">
              {item.timestamp}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

