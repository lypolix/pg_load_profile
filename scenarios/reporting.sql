-- Очень быстрые чтения по индексу (100 штук за транзакцию)
-- Это заставит CPU работать на 100%, а диск спать (если данные в кэше)
\set aid random(1, 100000 * :scale)
SELECT abalance FROM pgbench_accounts WHERE aid = :aid;
