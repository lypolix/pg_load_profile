import React from "react";

interface DataPoint {
  value: number;
}

interface Dataset {
  label: string;
  data: DataPoint[];
  color: string;
}

interface SimpleLineChartProps {
  datasets: Dataset[];
  width?: number;
  height?: number;
  maxValue?: number;
}

export const SimpleLineChart: React.FC<SimpleLineChartProps> = ({
  datasets,
  width = 500,
  height = 300,
  maxValue: providedMaxValue,
}) => {
  const padding = { top: 20, right: 20, bottom: 30, left: 60 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const pointCount = datasets[0]?.data.length || 11;
  const xStep = chartWidth / Math.max(pointCount - 1, 1);

  // Автомасштабирование: находим максимальное значение в данных
  const dataMax = Math.max(
    ...datasets.flatMap(d => d.data.map(p => p.value)),
    0.1 // Минимум 0.1, чтобы избежать деления на 0
  );
  
  // Округляем максимум до красивого числа
  const getNiceMax = (val: number) => {
    if (val <= 0) return 10;
    if (val < 1) return 1;
    if (val < 5) return 5;
    if (val < 10) return 10;
    if (val < 20) return 20;
    if (val < 50) return 50;
    if (val < 100) return 100;
    if (val < 200) return 200;
    if (val < 500) return 500;
    if (val < 1000) return 1000;
    if (val < 2000) return 2000;
    return Math.ceil(val / 1000) * 1000;
  };
  
  const maxValue = providedMaxValue ?? getNiceMax(dataMax * 1.2);

  // Генерация path для каждого dataset
  const generatePath = (data: DataPoint[]) => {
    if (data.length === 0) return "";
    return data
      .map((point, index) => {
        const x = padding.left + index * xStep;
        const y = padding.top + chartHeight - (point.value / maxValue) * chartHeight;
        return `${index === 0 ? "M" : "L"} ${x},${y}`;
      })
      .join(" ");
  };

  // Динамические Y-axis labels
  const generateYLabels = () => {
    const labelCount = 7;
    const step = maxValue / (labelCount - 1);
    return Array.from({ length: labelCount }, (_, i) => Math.round(i * step));
  };
  
  const yLabels = generateYLabels();

  return (
    <svg 
      viewBox={`0 0 ${width} ${height}`} 
      className="w-full h-full" 
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Grid lines */}
      {yLabels.map((value) => {
        const y = padding.top + chartHeight - (value / maxValue) * chartHeight;
        return (
          <g key={value}>
            <line
              x1={padding.left}
              y1={y}
              x2={width - padding.right}
              y2={y}
              stroke="rgba(49, 47, 47, 0.5)"
              strokeWidth="1"
            />
            <text
              x={padding.left - 10}
              y={y + 4}
              textAnchor="end"
              className="text-[10px] fill-[#999]"
              fontFamily="Inter"
            >
              {value}
            </text>
          </g>
        );
      })}

      {/* X-axis labels */}
      {Array.from({ length: pointCount }).map((_, index) => {
        const x = padding.left + index * xStep;
        return (
          <text
            key={index}
            x={x}
            y={height - 10}
            textAnchor="middle"
            className="text-[10px] fill-[#999]"
            fontFamily="Inter"
          >
            T{index}
          </text>
        );
      })}

      {/* Data lines */}
      {datasets.map((dataset, idx) => (
        <path
          key={idx}
          d={generatePath(dataset.data)}
          fill="none"
          stroke={dataset.color}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      ))}

      {/* Axes */}
      <line
        x1={padding.left}
        y1={padding.top}
        x2={padding.left}
        y2={height - padding.bottom}
        stroke="#312f2f"
        strokeWidth="1"
      />
      <line
        x1={padding.left}
        y1={height - padding.bottom}
        x2={width - padding.right}
        y2={height - padding.bottom}
        stroke="#312f2f"
        strokeWidth="1"
      />
    </svg>
  );
};

