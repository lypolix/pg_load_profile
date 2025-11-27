import React from "react";
import { SimpleLineChart } from "./SimpleLineChart";

export const QualityChart: React.FC = () => {
  const generateData = () => {
    const points = 5;
    return Array.from({ length: points }, () => ({
      value: Math.random() * 40 + 60,
    }));
  };

  const datasets = [
    {
      label: "DB total time",
      data: generateData(),
      color: "#8B5CF6",
    },
    {
      label: "DB total Committed",
      data: generateData(),
      color: "#3B82F6",
    },
    {
      label: "DB total time",
      data: generateData(),
      color: "#10B981",
    },
  ];

  return (
    <div className="bg-[#212020] rounded-[20px] border border-[#312f2f] p-6 h-[260px]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-['Inter'] font-bold text-white text-lg">
          Database quality
        </h3>
        <div className="flex gap-4">
          {datasets.map((dataset, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: dataset.color }}
              />
              <span className="text-xs text-white font-['Inter']">
                {dataset.label}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="h-[160px]">
        <SimpleLineChart datasets={datasets} width={540} height={150} maxValue={150} />
      </div>
    </div>
  );
};
