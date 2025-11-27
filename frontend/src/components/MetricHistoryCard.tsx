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

  // Форматируем значение (запятая вместо точки для десятичных)
  const formatValue = (val: number): string => {
    if (val >= 1000) {
      return val.toFixed(0);
    }
    return val.toFixed(1).replace('.', ',');
  };

  // Определяем цвет градиента в зависимости от цвета метрики
  const getGradientColors = () => {
    if (color === "#10B981") {
      // Зеленый для Commit Ratio
      return {
        from: "from-[#10B981]/40",
        via: "via-[#10B981]/20",
        to: "to-[#10B981]/5",
        shadow: "rgba(16, 185, 129, 0.15)"
      };
    } else if (color === "#06B6D4") {
      // Голубой для Wasted DB time
      return {
        from: "from-[#06B6D4]/40",
        via: "via-[#06B6D4]/20",
        to: "to-[#06B6D4]/5",
        shadow: "rgba(6, 182, 212, 0.15)"
      };
    } else {
      // Фиолетовый для Dominate DB time
      return {
        from: "from-[#A855F7]/40",
        via: "via-[#A855F7]/20",
        to: "to-[#A855F7]/5",
        shadow: "rgba(168, 85, 247, 0.15)"
      };
    }
  };

  const gradient = getGradientColors();

  return (
    <div 
      className={`relative rounded-[20px] overflow-hidden bg-gradient-to-t ${gradient.from} ${gradient.via} ${gradient.to} border border-[#312f2f] p-6 flex flex-col h-full`}
      style={{
        boxShadow: `inset 0 -80px 100px ${gradient.shadow}`
      }}
    >
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

