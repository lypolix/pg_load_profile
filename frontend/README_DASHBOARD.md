# PG Load Profile Dashboard

## Описание
Dashboard для мониторинга производительности PostgreSQL в реальном времени с AI-диагностикой профиля нагрузки.

## API Endpoints

Фронтенд подключается к бэкенду по адресу `http://localhost:8080` и использует следующие эндпоинты:

### Основные эндпоинты для дашборда:
- `GET /status` - Получить текущий статус и AI диагностику
- `GET /dashboard` - Получить общую статистику системы

### Управление нагрузкой:
- `GET /load/start?scenario=<name>` - Запустить сценарий нагрузки
  - Доступные сценарии: `oltp`, `olap`, `iot`, `locks`, `reporting`, `etl`

### Управление конфигурацией:
- `GET /config/apply?preset=<name>` - Применить пресет конфигурации
- `POST /config/apply-recommendations` - Применить рекомендации AI
- `PATCH /config/custom` - Применить кастомную конфигурацию

## Структура данных

### StatusResponse
```typescript
{
  timestamp: string;
  ground_truth: {
    load_scenario: string;
    active_config: string;
    start_time: string;
  };
  diagnosis: {
    profile: string;  // OLTP, OLAP, IoT, LOCKS, etc.
    description: string;
    confidence: string;
    metrics: {
      db_time_total: number;
      cpu_time: number;
      io_time: number;
      lock_time: number;
      cpu_percent: number;
      io_percent: number;
      lock_percent: number;
      tps: number;
      rollback_rate: number;
      avg_query_latency_ms: number;
      // ... другие метрики
    };
    tuning_recommendations: {
      shared_buffers: string;
      work_mem: string;
      max_wal_size: string;
      // ... другие параметры
    };
    reasoning: string;
  };
}
```

### DashboardData
```typescript
{
  version: string;
  uptime: string;
  db_size: string;
  active_connections: number;
  idle_connections: number;
  cache_hit_ratio: number;
  top_wait_events_5min: Array<{
    event: string;
    count: number;
  }>;
  top_tables_by_size: Array<{
    table_name: string;
    size_pretty: string;
    size_bytes: number;
    usage_percent: number;
    seq_scans: number;
    index_scans: number;
    rows_inserted: number;
    dead_rows: number;
  }>;
}
```

## Запуск

1. Убедитесь, что бэкенд запущен на порту 8080
2. Установите зависимости: `npm install`
3. Запустите фронтенд: `npm start`
4. Откройте http://localhost:3000

## Компоненты

- **Dashboard** - Главный компонент с общим видом
- **DBTimeChart** - График DB Time breakdown
- **MetricCard** - Карточка с метрикой (TPS, Rollback%, AvgQuery Time)
- **GaugeChart** - Круговой индикатор (CPU, IO, Lock usage)
- **DatabaseStatus** - Статус БД и использование диска
- **QualityChart** - График качества БД
- **SimpleLineChart** - Простой линейный график на SVG (без тяжелых библиотек)

## Обновления данных

- Данные обновляются автоматически каждые 5 секунд
- Можно обновить вручную кнопкой "обновить"
- При выборе режима нагрузки автоматически отправляется запрос на бэкенд

## Примечания

- Графики используют простой SVG для быстрой работы
- В будущем можно подключить Chart.js или другую библиотеку для более сложных графиков
- API URL можно изменить в файле `src/services/api.ts`

