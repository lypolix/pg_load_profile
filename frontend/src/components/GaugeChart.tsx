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
  const rotation = (percentage / 100) * 150 - 75; // От -75° до +75°

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

  const gaugeLabels = [
    { value: "15", top: "142px", left: "22px" },
    { value: "30", top: "80px", left: "50px" },
    { value: "45", top: "38px", left: "99px" },
    { value: "60", top: "42px", left: "233px" },
    { value: "75", top: "84px", left: "283px" },
    { value: "90", top: "149px", left: "304px" },
  ];

  return (
    <div className="bg-[#212020] rounded-[20px] border border-[#312f2f] p-6">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="font-['Inter'] font-bold text-white text-lg">{title}</h3>
        <div className={`w-2 h-2 rounded-full ${getStatusDot()}`}></div>
      </div>

      <div className="relative w-[341px] h-[200px] overflow-hidden mx-auto">
        {/* Gauge circle background */}
        <div className="absolute top-[65px] left-[65px] w-[212px] h-[212px] rounded-[106px] border-[2px] border-solid border-[#424040]" />
        
        {/* Label "Нагрузка" */}
        <div className="absolute top-[122px] left-[145px] font-['Inter'] text-[#d3d3d3] text-xs">
          Нагрузка
        </div>
        
        {/* Value */}
        <div 
          className="absolute top-[138px] left-[139px] font-['Inter'] font-bold text-[32px]"
          style={{ 
            color: gaugeColor,
            textShadow: `0px 4px 13px ${gaugeColor}33`
          }}
        >
          {value}{unit}
        </div>

        {/* Gauge labels */}
        {gaugeLabels.map((label, index) => (
          <div
            key={index}
            className="absolute font-['Inter'] font-medium text-[#747070] text-[11px] whitespace-nowrap"
            style={{ top: label.top, left: label.left }}
          >
            {label.value}
          </div>
        ))}

        {/* Needle/Indicator */}
        <div 
          className="absolute top-[125px] left-[34px] w-[63px] h-[9px] rounded-md transition-transform duration-500"
          style={{ 
            backgroundColor: gaugeColor,
            boxShadow: `0px 0px 7px ${gaugeColor}99`,
            transform: `rotate(${rotation}deg)`,
            transformOrigin: "100% center"
          }}
        />
      </div>
    </div>
  );
};

