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
  maxValue = 120,
}) => {
  const padding = { top: 20, right: 20, bottom: 30, left: 50 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const pointCount = datasets[0]?.data.length || 11;
  const xStep = chartWidth / (pointCount - 1);

  // Генерация path для каждого dataset
  const generatePath = (data: DataPoint[]) => {
    return data
      .map((point, index) => {
        const x = padding.left + index * xStep;
        const y = padding.top + chartHeight - (point.value / maxValue) * chartHeight;
        return `${index === 0 ? "M" : "L"} ${x},${y}`;
      })
      .join(" ");
  };

  // Y-axis labels
  const yLabels = [0, 20, 40, 60, 80, 100, 120];

  return (
    <svg width={width} height={height} className="w-full h-full">
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

