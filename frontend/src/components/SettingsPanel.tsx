import React, { useState, useEffect } from "react";
import { TuningConfig } from "../types/api";
import { ApiService } from "../services/api";

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  recommendations?: TuningConfig;
  currentConfig?: TuningConfig;
  profile?: string;
  onApplyRecommendations: () => Promise<void>;
  onApplyCustomConfig: (config: Record<string, string>) => Promise<void>;
}

interface ConfigField {
  id: string;
  label: string;
  currentValue: string;
  value: string;
  unit: string;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  isOpen,
  onClose,
  recommendations,
  currentConfig,
  profile,
  onApplyRecommendations,
  onApplyCustomConfig,
}) => {
  // Парсим значение из строки типа "128MB" или "4MB"
  const parseValue = (str: string | undefined): string => {
    if (!str) return "8";
    const match = str.match(/(\d+\.?\d*)/);
    return match ? match[1] : "8";
  };

  // Получаем единицу измерения из строки
  const parseUnit = (str: string | undefined, defaultUnit: string): string => {
    if (!str) return defaultUnit;
    if (str.includes("MB")) return "MB";
    if (str.includes("GB")) return "GB";
    if (str.includes("min")) return "MIN";
    if (str.includes("ms")) return "ms";
    if (str.includes("s") && !str.includes("ms")) return "s"; // для deadlock_timeout "1s"
    if (str.includes("workers")) return "workers";
    return defaultUnit;
  };

  const [memoryFields, setMemoryFields] = useState<ConfigField[]>([
    {
      id: "shared_buffers",
      label: "shared_buffers",
      currentValue: currentConfig?.shared_buffers || "128MB",
      value: parseValue(currentConfig?.shared_buffers),
      unit: parseUnit(currentConfig?.shared_buffers, "MB"),
    },
    {
      id: "work_mem",
      label: "work_mem",
      currentValue: currentConfig?.work_mem || "4MB",
      value: parseValue(currentConfig?.work_mem),
      unit: parseUnit(currentConfig?.work_mem, "MB"),
    },
  ]);

  const [walFields, setWalFields] = useState<ConfigField[]>([
    {
      id: "max_wal_size",
      label: "max_wal_size",
      currentValue: currentConfig?.max_wal_size || "1GB",
      value: parseValue(currentConfig?.max_wal_size),
      unit: parseUnit(currentConfig?.max_wal_size, "GB"),
    },
    {
      id: "checkpoint_timeout",
      label: "checkpoint_timeout",
      currentValue: currentConfig?.checkpoint_timeout || "15min",
      value: parseValue(currentConfig?.checkpoint_timeout),
      unit: parseUnit(currentConfig?.checkpoint_timeout, "MIN"),
    },
    {
      id: "synchronous_commit",
      label: "synchronous_commit",
      currentValue: currentConfig?.synchronous_commit || "on",
      value: currentConfig?.synchronous_commit || "on",
      unit: "",
    },
  ]);

  const [parallelFields, setParallelFields] = useState<ConfigField[]>([
    {
      id: "max_parallel_workers_per_gather",
      label: "max_parallel_workers_per_gather",
      currentValue: currentConfig?.max_parallel_workers_per_gather || "0",
      value: parseValue(currentConfig?.max_parallel_workers_per_gather),
      unit: parseUnit(currentConfig?.max_parallel_workers_per_gather, "workers"),
    },
    {
      id: "deadlock_timeout",
      label: "deadlock_timeout",
      currentValue: currentConfig?.deadlock_timeout || "1s",
      value: parseValue(currentConfig?.deadlock_timeout),
      unit: parseUnit(currentConfig?.deadlock_timeout, "s"),
    },
  ]);

  // Обновляем значения при изменении currentConfig
  useEffect(() => {
    if (currentConfig) {
      setMemoryFields([
        {
          id: "shared_buffers",
          label: "shared_buffers",
          currentValue: currentConfig.shared_buffers || "128MB",
          value: parseValue(currentConfig.shared_buffers),
          unit: parseUnit(currentConfig.shared_buffers, "MB"),
        },
        {
          id: "work_mem",
          label: "work_mem",
          currentValue: currentConfig.work_mem || "4MB",
          value: parseValue(currentConfig.work_mem),
          unit: parseUnit(currentConfig.work_mem, "MB"),
        },
      ]);
      setWalFields([
        {
          id: "max_wal_size",
          label: "max_wal_size",
          currentValue: currentConfig.max_wal_size || "1GB",
          value: parseValue(currentConfig.max_wal_size),
          unit: parseUnit(currentConfig.max_wal_size, "GB"),
        },
        {
          id: "checkpoint_timeout",
          label: "checkpoint_timeout",
          currentValue: currentConfig.checkpoint_timeout || "15min",
          value: parseValue(currentConfig.checkpoint_timeout),
          unit: parseUnit(currentConfig.checkpoint_timeout, "MIN"),
        },
        {
          id: "synchronous_commit",
          label: "synchronous_commit",
          currentValue: currentConfig.synchronous_commit || "on",
          value: currentConfig.synchronous_commit || "on",
          unit: "",
        },
      ]);
      setParallelFields([
        {
          id: "max_parallel_workers_per_gather",
          label: "max_parallel_workers_per_gather",
          currentValue: currentConfig.max_parallel_workers_per_gather || "0",
          value: parseValue(currentConfig.max_parallel_workers_per_gather),
          unit: parseUnit(currentConfig.max_parallel_workers_per_gather, "workers"),
        },
        {
          id: "deadlock_timeout",
          label: "deadlock_timeout",
          currentValue: currentConfig.deadlock_timeout || "1s",
          value: parseValue(currentConfig.deadlock_timeout),
          unit: parseUnit(currentConfig.deadlock_timeout, "s"),
        },
      ]);
    }
  }, [currentConfig]);

  const handleValueChange = (setter: React.Dispatch<React.SetStateAction<ConfigField[]>>, id: string, newValue: string) => {
    setter((prev) =>
      prev.map((field) =>
        field.id === id ? { ...field, value: newValue } : field,
      ),
    );
  };

  const handleApplyAll = async () => {
    if (!recommendations) return;
    
    try {
      await onApplyRecommendations();
      onClose();
    } catch (error) {
      console.error("Error applying recommendations:", error);
    }
  };

  const handleApplyCustom = async () => {
    const customConfig: Record<string, string> = {};
    
    [...memoryFields, ...walFields, ...parallelFields].forEach(field => {
      if (field.unit) {
        if (field.unit === "MB") {
          customConfig[field.id] = `${field.value}MB`;
        } else if (field.unit === "GB") {
          customConfig[field.id] = `${field.value}GB`;
        } else if (field.unit === "MIN") {
          customConfig[field.id] = `${field.value}min`;
        } else if (field.unit === "ms") {
          customConfig[field.id] = `${field.value}ms`;
        } else if (field.unit === "s") {
          customConfig[field.id] = `${field.value}s`;
        } else if (field.unit === "workers") {
          customConfig[field.id] = field.value;
        } else {
          customConfig[field.id] = field.value;
        }
      } else {
        customConfig[field.id] = field.value;
      }
    });

    try {
      await onApplyCustomConfig(customConfig);
      onClose();
    } catch (error) {
      console.error("Error applying custom config:", error);
    }
  };

  const handleApplyDeveloperRecommendations = async () => {
    if (!recommendations) return;
    
    // Преобразуем TuningConfig в Record<string, string>
    const config: Record<string, string> = {};
    Object.entries(recommendations).forEach(([key, value]) => {
      if (value !== undefined) {
        config[key] = value;
      }
    });
    
    try {
      await onApplyCustomConfig(config);
      onClose();
    } catch (error) {
      console.error("Error applying developer recommendations:", error);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />
      
      {/* Side Panel */}
      <div className="fixed top-0 right-0 h-full w-[1208px] bg-[#0d0d0d] z-50 overflow-y-auto shadow-2xl">
        <div className="p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <h1 className="font-['Inter'] font-bold text-white text-2xl">
              Настройка конфигурации
            </h1>
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center rounded-lg bg-[#212020] border border-[#312f2f] hover:bg-[#2a2a2a] transition-colors"
            >
              <span className="text-white text-xl">×</span>
            </button>
          </div>

          {/* Cluster Info */}
          <div className="mb-8 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#10B981]"></div>
            <span className="font-['Inter'] text-white text-base">
              Кластер: {profile || "OLTP"}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-6">
            {/* Left Column: Configuration Parameters */}
            <div className="space-y-6">
              <div>
                <p className="font-['Inter'] text-[#7b7575] text-sm mb-4">
                  Можно менять вручную или применить рекомендации AI
                </p>
              </div>

              {/* Memory Section */}
              <div className="bg-[#212020] rounded-[20px] border border-[#312f2f] p-6">
                <h2 className="font-['Inter'] font-semibold text-[#7b7575] text-base mb-6">
                  Память
                </h2>
                <div className="space-y-6">
                  {memoryFields.map((field) => (
                    <div key={field.id} className="flex items-center gap-4">
                      <div className="w-[148px] flex flex-col gap-1.5">
                        <label className="font-['Inter'] font-normal text-white text-base">
                          {field.label}
                        </label>
                        <div className="font-['Inter'] font-normal text-[#727278] text-xs">
                          Текущее значение: {field.currentValue}
                        </div>
                      </div>
                      <div className="w-[202px] h-11 relative">
                        <div className="absolute top-0 left-0 w-full h-full bg-[#373636] rounded-[30px] border border-[#656161]" />
                        <input
                          type="text"
                          value={field.value}
                          onChange={(e) => handleValueChange(setMemoryFields, field.id, e.target.value)}
                          className="absolute top-2.5 left-[23px] font-['Inter'] font-normal text-white text-xl bg-transparent border-none outline-none w-[150px]"
                        />
                      </div>
                      {field.unit && (
                        <div className="w-[108px] h-11 relative">
                          <div className="absolute top-0 left-0 w-full h-full bg-[#373636] rounded-[30px] border border-[#656161]" />
                          <span className="absolute top-2.5 left-[39px] font-['Inter'] font-normal text-white text-xl">
                            {field.unit}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* WAL and Checkpoints Section */}
              <div className="bg-[#212020] rounded-[20px] border border-[#312f2f] p-6">
                <h2 className="font-['Inter'] font-semibold text-[#7b7575] text-base mb-6">
                  Wall и чекпоинты
                </h2>
                <div className="space-y-6">
                  {walFields.map((field) => (
                    <div key={field.id} className="flex items-center gap-4">
                      <div className="w-[148px] flex flex-col gap-1.5">
                        <label className="font-['Inter'] font-normal text-white text-base">
                          {field.label}
                        </label>
                        <div className="font-['Inter'] font-normal text-[#727278] text-xs">
                          Текущее значение: {field.currentValue}
                        </div>
                      </div>
                      <div className="w-[202px] h-11 relative">
                        <div className="absolute top-0 left-0 w-full h-full bg-[#373636] rounded-[30px] border border-[#656161]" />
                        <input
                          type="text"
                          value={field.value}
                          onChange={(e) => handleValueChange(setWalFields, field.id, e.target.value)}
                          className="absolute top-2.5 left-[23px] font-['Inter'] font-normal text-white text-xl bg-transparent border-none outline-none w-[150px]"
                        />
                      </div>
                      {field.unit && (
                        <div className="w-[108px] h-11 relative">
                          <div className="absolute top-0 left-0 w-full h-full bg-[#373636] rounded-[30px] border border-[#656161]" />
                          <span className="absolute top-2.5 left-[39px] font-['Inter'] font-normal text-white text-xl">
                            {field.unit}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Parallelism and Locks Section */}
              <div className="bg-[#212020] rounded-[20px] border border-[#312f2f] p-6">
                <h2 className="font-['Inter'] font-semibold text-[#7b7575] text-base mb-6">
                  Параллелизм и блокировки
                </h2>
                <div className="space-y-6">
                  {parallelFields.map((field) => (
                    <div key={field.id} className="flex items-center gap-4">
                      <div className="w-[148px] flex flex-col gap-1.5">
                        <label className="font-['Inter'] font-normal text-white text-base">
                          {field.label}
                        </label>
                        <div className="font-['Inter'] font-normal text-[#727278] text-xs">
                          Текущее значение: {field.currentValue}
                        </div>
                      </div>
                      <div className="w-[202px] h-11 relative">
                        <div className="absolute top-0 left-0 w-full h-full bg-[#373636] rounded-[30px] border border-[#656161]" />
                        <input
                          type="text"
                          value={field.value}
                          onChange={(e) => handleValueChange(setParallelFields, field.id, e.target.value)}
                          className="absolute top-2.5 left-[23px] font-['Inter'] font-normal text-white text-xl bg-transparent border-none outline-none w-[150px]"
                        />
                      </div>
                      {field.unit && (
                        <div className="w-[108px] h-11 relative">
                          <div className="absolute top-0 left-0 w-full h-full bg-[#373636] rounded-[30px] border border-[#656161]" />
                          <span className={`absolute top-2.5 font-['Inter'] font-normal text-white text-xl ${
                            field.unit === "workers" ? "left-[15px]" : "left-[39px]"
                          }`}>
                            {field.unit}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Apply Custom Button */}
              <button
                onClick={handleApplyCustom}
                className="w-full px-6 py-3 bg-[#10B981] text-white font-['Inter'] font-semibold rounded-lg hover:bg-[#059669] transition-colors"
              >
                Применить настройки
              </button>
            </div>

            {/* Right Column: Recommendations */}
            <div className="space-y-6">
              {/* Developer Recommendations */}
              <div className="bg-[#212020] rounded-[20px] border border-[#312f2f] p-6">
                <h2 className="font-['Inter'] font-semibold text-white text-lg mb-4">
                  Рекомендации разработчиков
                </h2>
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-2 h-2 rounded-full bg-[#10B981]"></div>
                  <span className="font-['Inter'] text-white text-sm">
                    {recommendations ? "Рекомендации доступны" : "Ожидает запуска"}
                  </span>
                </div>
                
                {recommendations ? (
                  <>
                    <div className="bg-[#373636] rounded-[30px] border border-[#656161] p-6 mb-6 min-h-[200px]">
                      <div className="space-y-4">
                        {Object.entries(recommendations).map(([key, value]) => (
                          <div key={key} className="flex justify-between items-center">
                            <span className="font-['Inter'] text-white text-sm">{key}:</span>
                            <span className="font-['Inter'] text-[#10B981] text-sm font-semibold">{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={handleApplyDeveloperRecommendations}
                      className="w-full px-6 py-3 bg-[#10B981] text-white font-['Inter'] font-semibold rounded-lg hover:bg-[#059669] transition-colors shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                    >
                      Применить рекомендации разработчиков
                    </button>
                  </>
                ) : (
                  <div className="bg-[#373636] rounded-[30px] border border-[#656161] p-6 min-h-[200px] flex items-center justify-center">
                    <p className="font-['Inter'] text-[#727278] text-sm text-center">
                      Нет активных рекомендаций.<br />
                      Запустите нагрузку для получения рекомендаций.
                    </p>
                  </div>
                )}
              </div>

              {/* AI Recommendations */}
              <div className="bg-[#212020] rounded-[20px] border border-[#312f2f] p-6">
                <h2 className="font-['Inter'] font-semibold text-white text-lg mb-4">
                  AI-рекомендатор
                </h2>
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-2 h-2 rounded-full bg-[#F59E0B]"></div>
                  <span className="font-['Inter'] text-white text-sm">
                    {recommendations ? "Рекомендации доступны" : "Ожидает запуска"}
                  </span>
                </div>
                
                {recommendations ? (
                  <>
                    <div className="bg-[#373636] rounded-[30px] border border-[#656161] p-6 mb-6 min-h-[200px]">
                      <div className="space-y-4">
                        {Object.entries(recommendations).map(([key, value]) => (
                          <div key={key} className="flex justify-between items-center">
                            <span className="font-['Inter'] text-white text-sm">{key}:</span>
                            <span className="font-['Inter'] text-[#10B981] text-sm font-semibold">{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={handleApplyAll}
                      className="w-full px-6 py-3 bg-[#06B6D4] text-white font-['Inter'] font-semibold rounded-lg hover:bg-[#0891B2] transition-colors shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                    >
                      Применить рекомендации AI
                    </button>
                  </>
                ) : (
                  <div className="bg-[#373636] rounded-[30px] border border-[#656161] p-6 min-h-[200px] flex items-center justify-center">
                    <p className="font-['Inter'] text-[#727278] text-sm text-center">
                      Нет активных рекомендаций AI.<br />
                      Запустите нагрузку для получения рекомендаций.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

