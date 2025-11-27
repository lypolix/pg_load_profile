import React from "react";
import vector4 from "../assets/vector-4.svg";
import vector5 from "../assets/vector-5.svg";
import vector6 from "../assets/vector-6.svg";
import vector7 from "../assets/vector-7.svg";
import { SimpleLineChart } from "./SimpleLineChart";

interface DBTimeChartProps {
  dbTimeTotal?: number;
  cpuTime?: number;
  ioTime?: number;
  lockTime?: number;
}

export const DBTimeChart: React.FC<DBTimeChartProps> = ({
  dbTimeTotal = 73,
  cpuTime = 0,
  ioTime = 0,
  lockTime = 0,
}) => {
  const legendItems = [
    { id: 1, icon: vector4, label: "DB total time", color: "#8B5CF6" },
    { id: 2, icon: vector5, label: "CPU time", color: "#3B82F6" },
    { id: 3, icon: vector6, label: "IO time", color: "#10B981" },
    { id: 4, icon: vector7, label: "Lock time", color: "#F59E0B" },
  ];

  // Mock data for visualization (можно позже заменить на историю из бэкенда)
  const generateMockHistory = (baseValue: number) => {
    return Array.from({ length: 11 }, () => ({
      value: Math.max(0, baseValue + (Math.random() - 0.5) * 20),
    }));
  };

  const datasets = [
    {
      label: "DB total time",
      data: generateMockHistory(dbTimeTotal),
      color: "#8B5CF6",
    },
    {
      label: "CPU time",
      data: generateMockHistory(cpuTime),
      color: "#3B82F6",
    },
    {
      label: "IO time",
      data: generateMockHistory(ioTime),
      color: "#10B981",
    },
    {
      label: "Lock time",
      data: generateMockHistory(lockTime),
      color: "#F59E0B",
    },
  ];

  return (
    <div className="w-full h-[500px] flex flex-col bg-[#212020] rounded-[20px] border border-solid border-[#312f2f] p-4">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="font-['Inter'] font-bold text-white text-2xl mb-1">
            DBTimetotal
          </h2>
          <p className="font-['Inter'] text-[#626262] text-xs">
            DB Time breakdown (Total {dbTimeTotal.toFixed(1)} ms)
          </p>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          {legendItems.map((item) => (
            <div key={item.id} className="flex items-center gap-2">
              <img
                className="w-[39px] h-0.5"
                alt=""
                src={item.icon}
                role="presentation"
              />
              <span className="font-['Inter'] font-medium text-white text-xs whitespace-nowrap">
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="flex-1 min-h-0 flex items-center justify-center">
        <SimpleLineChart datasets={datasets} width={520} height={350} />
      </div>
    </div>
  );
};
