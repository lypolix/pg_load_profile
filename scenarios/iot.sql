-- Вставляем данные в историю (как будто это логи с датчиков)
INSERT INTO pgbench_history (tid, bid, aid, delta, mtime) 
VALUES (1, 1, 1, 0, CURRENT_TIMESTAMP);
