package generator

import (
	"fmt"
	"log"
	"os"
	"os/exec"
)

// RunBusinessScenario запускает предопределенный бизнес-сценарий нагрузки.
// Интенсивность (количество клиентов) зашита в каждый сценарий.
func RunBusinessScenario(scenario string) error {
	dbUrl := os.Getenv("DATABASE_URL")
	var cmd *exec.Cmd

	log.Printf("[GENERATOR] Starting Business Scenario: %s", scenario)

	switch scenario {

	// 0. INIT (Сброс базы)
	case "init":
		cmd = exec.Command("pgbench", "-i", "-s", "50", dbUrl)

	// 1. OLTP (Банк/Магазин)
	// Цель: высокая параллельность, короткие транзакции.
	case "oltp":
		cmd = exec.Command("pgbench", "-T", "60", "-c", "50", "-j", "4", dbUrl)

	// 2. OLAP (BI-система)
	// Цель: несколько тяжелых параллельных запросов.
	case "olap":
		cmd = exec.Command("pgbench", "-T", "60", "-c", "4", "-j", "2", "-f", "./scenarios/olap.sql", dbUrl)

	// 3. IOT (Write-Heavy)
	// Цель: постоянный поток вставок от множества датчиков.
	case "iot":
		cmd = exec.Command("pgbench", "-T", "60", "-c", "20", "-j", "4", "-f", "./scenarios/iot.sql", dbUrl)

	// 4. LOCKS (High-Concurrency Конфликт)
	// Цель: сильная конкуренция, имитация распродажи.
	case "locks":
		cmd = exec.Command("pgbench", "-T", "60", "-c", "100", "-j", "8", "-f", "./scenarios/locks.sql", dbUrl)

	// 5. REPORTING (Read-Heavy Отчеты)
	// Цель: много легких чтений из кэша, загрузка CPU.
	case "reporting":
		cmd = exec.Command("pgbench", "-T", "60", "-c", "40", "-j", "4", "-f", "./scenarios/reporting.sql", dbUrl)

	// 6. MIXED (Гибрид)
	// Цель: смесь транзакций и аналитики.
	case "mixed":
		cmd = exec.Command("pgbench", "-T", "60", "-c", "25", "-j", "4", "-N", dbUrl)

	// 7. ETL (Массовая загрузка)
	// Цель: имитация ночной выгрузки, стресс для WAL.
	case "etl":
		cmd = exec.Command("pgbench", "-T", "60", "-c", "80", "-j", "8", "-f", "./scenarios/iot.sql", dbUrl)

	// 8. COLD (Архив)
	// Цель: одна тяжелая операция по обслуживанию.
	case "cold":
		cmd = exec.Command("psql", dbUrl, "-c", "VACUUM FULL pgbench_accounts;")

	default:
		return fmt.Errorf("unknown business scenario: %s", scenario)
	}

	// Настройка вывода
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	if err := cmd.Run(); err != nil {
		log.Printf("[GENERATOR] Scenario %s failed: %v", scenario, err)
		return fmt.Errorf("scenario failed: %w", err)
	}

	log.Printf("[GENERATOR] Scenario %s finished successfully.", scenario)
	return nil
}
