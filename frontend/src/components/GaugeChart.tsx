import React from "react";

interface GaugeChartProps {
  title: string;
  value: number;
  max?: number;
  color?: string;
  unit?: string;
  status?: "normal" | "warning" | "critical";
}

export const GaugeChart: React.FC<GaugeChartProps> = ({
  title,
  value,
  max = 100,
  color,
  unit = "%",
  status = "normal",
}) => {
  const percentage = Math.min((value / max) * 100, 100);
  // Стрелка на верхнем полукруге (где метки)
  // 0% = слева = 180°, 50% = сверху = 270°, 100% = справа = 0° (360°)
  // Используем ту же формулу, что и для меток
  const rotation = 180 + (percentage / 100) * 180; // От 180° до 360° (0°)
  const normalizedRotation = rotation >= 360 ? rotation - 360 : rotation;

  const getColor = () => {
    if (color) return color;
    if (status === "critical") return "#EF4444";
    if (status === "warning") return "#F59E0B";
    return "#55f7dc";
  };

  const getStatusDot = () => {
    if (status === "critical") return "bg-red-500";
    if (status === "warning") return "bg-orange-500";
    return "bg-green-500";
  };

  const gaugeColor = getColor();

  // Центр спидометра (относительно viewBox)
  // viewBox: 0 0 341 200, дуга от (65, 171) до (277, 171) с радиусом 106
  // Центр круга: (171, 171) - на уровне дуги (как было раньше)
  const centerX = 171; // центр по X
  const centerY = 171; // центр круга по Y (на уровне дуги)
  const radius = 106; // радиус дуги

  // Позиции меток на верхнем полукруге
  // В SVG с центром (171, 171): 0° справа, 90° снизу, 180° слева, 270° сверху
  // Верхний полукруг: от 180° (слева) через 270° (сверху) до 0° (справа)
  // 0% = слева = 180°, 100% = справа = 0° (или 360°), 50% = сверху = 270°
  const gaugeLabels = [
    { value: "15", percent: 15 },
    { value: "30", percent: 30 },
    { value: "45", percent: 45 },
    { value: "60", percent: 60 },
    { value: "75", percent: 75 },
    { value: "90", percent: 90 },
  ].map(label => {
    // Преобразуем процент в угол верхнего полукруга
    // 0% = 180° (слева), 100% = 0° (справа), 50% = 270° (сверху)
    const angle = 180 + (label.percent / 100) * 180;
    // Нормализуем угол (0° и 360° это одно и то же)
    const normalizedAngle = angle >= 360 ? angle - 360 : angle;
    const angleRad = (normalizedAngle * Math.PI) / 180;
    // Позиция метки на верхнем полукруге (немного дальше от центра)
    const labelRadius = radius + 15;
    const x = centerX + labelRadius * Math.cos(angleRad);
    const y = centerY + labelRadius * Math.sin(angleRad);
    // Угол поворота текста - горизонтально (0°), без поворота
    const textRotation = 0;
    return {
      value: label.value,
      x: x,
      y: y,
      rotation: textRotation,
    };
  });

  return (
    <div className="bg-[#212020] rounded-[20px] border border-[#312f2f] p-6 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="font-['Inter'] font-bold text-white text-lg">{title}</h3>
        <div className={`w-2 h-2 rounded-full ${getStatusDot()}`}></div>
      </div>

      <div className="relative flex-1 flex items-center justify-center min-h-[200px]">
        <svg className="w-full max-w-[341px] h-[200px]" viewBox="0 0 341 200" preserveAspectRatio="xMidYMid meet">
          {/* Gauge circle background - полукруг от -90° до +90° */}
          <path
            d="M 65 171 A 106 106 0 0 1 277 171"
            fill="none"
            stroke="#424040"
            strokeWidth="2"
          />
          
          {/* Gauge labels */}
          {gaugeLabels.map((label, index) => (
            <text
              key={index}
              x={label.x}
              y={label.y}
              fill="#747070"
              fontSize="11"
              fontFamily="Inter"
              fontWeight="500"
              textAnchor="middle"
              dominantBaseline="middle"
              transform={`rotate(${label.rotation}, ${label.x}, ${label.y})`}
            >
              {label.value}
            </text>
          ))}

          {/* Needle/Indicator - стрелка лежит на верхнем полукруге, видна только на окружности */}
          {(() => {
            const angleRad = (normalizedRotation * Math.PI) / 180;
            // Начало стрелки на окружности (радиус 106)
            const startX = centerX + radius * Math.cos(angleRad);
            const startY = centerY + radius * Math.sin(angleRad);
            // Конец стрелки чуть дальше от окружности (радиус 106 + 16)
            const endX = centerX + (radius + 16) * Math.cos(angleRad);
            const endY = centerY + (radius + 16) * Math.sin(angleRad);
            return (
              <line
                x1={startX}
                y1={startY}
                x2={endX}
                y2={endY}
                stroke={gaugeColor}
                strokeWidth="4"
                strokeLinecap="round"
                style={{
                  filter: `drop-shadow(0px 0px 7px ${gaugeColor}99)`
                }}
              />
            );
          })()}
        </svg>
        
        {/* Label "Нагрузка" и Value - поверх SVG, ниже как было */}
        <div className="absolute bottom-[50px] left-1/2 transform -translate-x-1/2 text-center">
          <div className="font-['Inter'] text-[#d3d3d3] text-xs mb-1">
            Нагрузка
          </div>
          <div 
            className="font-['Inter'] font-bold text-[32px]"
            style={{ 
              color: gaugeColor,
              textShadow: `0px 4px 13px ${gaugeColor}33`
            }}
          >
            {Math.round(value)}{unit}
          </div>
        </div>
      </div>
    </div>
  );
};

