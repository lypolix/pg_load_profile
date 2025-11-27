import React from "react";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  variant?: "green" | "cyan" | "purple" | "default";
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  variant = "default",
}) => {
  const getValueColor = () => {
    switch (variant) {
      case "green":
        return "text-[#10B981]";
      case "cyan":
        return "text-[#06B6D4]";
      case "purple":
        return "text-[#A855F7]";
      default:
        return "text-[#F59E0B]";
    }
  };

  return (
    <div className="bg-[#212020] rounded-[20px] border border-[#312f2f] p-6">
      <h3 className="font-['Inter'] font-bold text-white text-lg mb-6">
        {title}
      </h3>
      <div className={`font-['Inter'] font-bold text-5xl ${getValueColor()} mb-2`}>
        {value}
      </div>
      {subtitle && (
        <p className="font-['Inter'] text-[#626262] text-sm">{subtitle}</p>
      )}
    </div>
  );
};

