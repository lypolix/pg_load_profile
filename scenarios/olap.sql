-- Вычисляем средний баланс по всем счетам (Full Scan)
SELECT count(*), avg(abalance) 
FROM pgbench_accounts 
WHERE abalance > 0;
