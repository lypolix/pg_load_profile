-- 1. Создаем отдельную схему для наших метрик, чтобы не мусорить в public
CREATE SCHEMA IF NOT EXISTS profile_metrics;

-- 2. Включаем расширение pg_stat_statements (если еще нет)
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- 3. Таблица для хранения снимков активных сессий (ASH)
-- Сюда мы будем писать "что происходит прямо сейчас" каждые N секунд.
CREATE TABLE IF NOT EXISTS profile_metrics.ash_samples (
    sample_time     TIMESTAMPTZ DEFAULT NOW(),
    pid             INT,
    wait_event_type TEXT,
    wait_event      TEXT,
    state           TEXT,
    query_id        BIGINT, -- ID запроса из pg_stat_statements
    query           TEXT    -- Текст запроса (можно обрезать, чтобы экономить место)
);

-- Индекс по времени, чтобы быстро строить графики/отчеты
CREATE INDEX ON profile_metrics.ash_samples (sample_time);

-- 4. Таблица для хранения снимков общей статистики (Snapshots)
-- Сюда мы будем писать "разницу" (дельту) счетчиков: сколько транзакций прошло, сколько блоков прочитано
CREATE TABLE IF NOT EXISTS profile_metrics.snapshots (
    snapshot_id         SERIAL PRIMARY KEY,
    snapshot_time       TIMESTAMPTZ DEFAULT NOW(),
    
    -- Метрики из pg_stat_database
    xact_commit         BIGINT, -- кол-во коммитов
    xact_rollback       BIGINT, -- кол-во откатов
    blks_read           BIGINT, -- чтение с диска
    blks_hit            BIGINT, -- чтение из кэша
    tup_returned        BIGINT, -- возвращено строк
    tup_fetched         BIGINT, -- выбрано строк
    tup_inserted        BIGINT, 
    tup_updated         BIGINT, 
    tup_deleted         BIGINT,
    
    -- Метрики из pg_stat_bgwriter (важно для IO)
    buffers_checkpoint  BIGINT, -- буферов записано чекпоинтом
    buffers_clean       BIGINT, -- буферов записано фоновым процессом
    buffers_backend     BIGINT  -- буферов записано самим бэкендом
);

-- Функция сбора ASH (активных сессий)
-- Сохраняет только тех, кто работает (active) или ждет блокировку
CREATE OR REPLACE FUNCTION profile_metrics.collect_ash() RETURNS void AS $$
BEGIN
    INSERT INTO profile_metrics.ash_samples (pid, wait_event_type, wait_event, state, query_id, query)
    SELECT 
        pid, 
        wait_event_type, 
        wait_event, 
        state, 
        query_id, 
        left(query, 200) -- Берем первые 200 символов запроса
    FROM pg_stat_activity
    WHERE state = 'active' 
      AND pid != pg_backend_pid(); -- Исключаем сам процесс сбора
END;
$$ LANGUAGE plpgsql;

-- Функция создания снэпшота общей статистики
CREATE OR REPLACE FUNCTION profile_metrics.take_snapshot() RETURNS void AS $$
BEGIN
    INSERT INTO profile_metrics.snapshots (
        xact_commit, xact_rollback, blks_read, blks_hit, 
        tup_returned, tup_fetched, tup_inserted, tup_updated, tup_deleted,
        buffers_checkpoint, buffers_clean, buffers_backend
    )
    SELECT 
        d.xact_commit, d.xact_rollback, d.blks_read, d.blks_hit,
        d.tup_returned, d.tup_fetched, d.tup_inserted, d.tup_updated, d.tup_deleted,
        b.buffers_checkpoint, b.buffers_clean, b.buffers_backend
    FROM pg_stat_database d, pg_stat_bgwriter b
    WHERE d.datname = current_database();
END;
$$ LANGUAGE plpgsql;

-- 1. Добавляем колонку для хранения суммы времени выполнения всех запросов
ALTER TABLE profile_metrics.snapshots 
ADD COLUMN IF NOT EXISTS total_exec_time FLOAT8;

-- 2. Обновляем функцию создания снэпшота
-- Теперь она суммирует total_exec_time из pg_stat_statements
CREATE OR REPLACE FUNCTION profile_metrics.take_snapshot() RETURNS void AS $$
DECLARE
    v_total_exec_time float8;
BEGIN
    -- Считаем общее время выполнения всех запросов на данный момент
    SELECT sum(total_exec_time) INTO v_total_exec_time FROM pg_stat_statements;

    INSERT INTO profile_metrics.snapshots (
        snapshot_time,
        xact_commit, xact_rollback, blks_read, blks_hit, 
        tup_returned, tup_fetched, tup_inserted, tup_updated, tup_deleted,
        buffers_checkpoint, buffers_clean, buffers_backend,
        total_exec_time -- << Новое поле
    )
    SELECT 
        now(),
        d.xact_commit, d.xact_rollback, d.blks_read, d.blks_hit,
        d.tup_returned, d.tup_fetched, d.tup_inserted, d.tup_updated, d.tup_deleted,
        b.buffers_checkpoint, b.buffers_clean, b.buffers_backend,
        COALESCE(v_total_exec_time, 0)
    FROM pg_stat_database d, pg_stat_bgwriter b
    WHERE d.datname = current_database();
END;
$$ LANGUAGE plpgsql;


-- 1. Добавляем колонку для хранения суммы времени выполнения всех запросов
ALTER TABLE profile_metrics.snapshots 
ADD COLUMN IF NOT EXISTS total_exec_time FLOAT8;

-- 2. Обновляем функцию создания снэпшота
-- Теперь она суммирует total_exec_time из pg_stat_statements
CREATE OR REPLACE FUNCTION profile_metrics.take_snapshot() RETURNS void AS $$
DECLARE
    v_total_exec_time float8;
BEGIN
    -- Считаем общее время выполнения всех запросов на данный момент
    SELECT sum(total_exec_time) INTO v_total_exec_time FROM pg_stat_statements;

    INSERT INTO profile_metrics.snapshots (
        snapshot_time,
        xact_commit, xact_rollback, blks_read, blks_hit, 
        tup_returned, tup_fetched, tup_inserted, tup_updated, tup_deleted,
        buffers_checkpoint, buffers_clean, buffers_backend,
        total_exec_time -- << Новое поле
    )
    SELECT 
        now(),
        d.xact_commit, d.xact_rollback, d.blks_read, d.blks_hit,
        d.tup_returned, d.tup_fetched, d.tup_inserted, d.tup_updated, d.tup_deleted,
        b.buffers_checkpoint, b.buffers_clean, b.buffers_backend,
        COALESCE(v_total_exec_time, 0)
    FROM pg_stat_database d, pg_stat_bgwriter b
    WHERE d.datname = current_database();
END;
$$ LANGUAGE plpgsql;
