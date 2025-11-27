-- Конкурентное обновление одного и того же счета (Hot spot)
BEGIN;
UPDATE pgbench_accounts SET abalance = abalance + 1 WHERE aid = 1;
COMMIT;
