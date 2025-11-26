package generator

import (
	"fmt"
	"log"
	"os"
	"os/exec"
	"strconv"
)

// RunScenario запускает тест.
// mode: oltp, olap, iot, locks, reporting, mixed, etl, cold
// intensity: 1 (min) ... 8 (max)
func RunScenario(mode string, intensityStr string) error {
	dbUrl := os.Getenv("DATABASE_URL")

	// 1. Парсим уровень интенсивности (1-8)
	level, err := strconv.Atoi(intensityStr)
	if err != nil || level < 1 {
		level = 1 // Default min
	}
	if level > 8 {
		level = 8 // Default max
	}

	// 2. Определяем базовое количество клиентов (concurrency) для уровня
	// Шкала: 1, 2, 5, 10, 20, 40, 80, 150
	baseClients := []int{1, 2, 5, 10, 20, 40, 80, 150}
	clients := baseClients[level-1]
	cStr := strconv.Itoa(clients)

	var cmd *exec.Cmd

	switch mode {
	
	// 0. INIT
	case "init":
		cmd = exec.Command("pgbench", "-i", "-s", "50", dbUrl)

	// 1. OLTP (Банк)
	case "oltp":
		// Стандартный TPC-B. Растет число клиентов.
		cmd = exec.Command("pgbench", "-T", "60", "-c", cStr, "-j", "2", dbUrl)

	// 2. OLAP (Аналитика)
	case "olap":
		// Для OLAP много клиентов = смерть, поэтому берем масштаб поменьше
		// Шкала для OLAP: 1, 1, 2, 2, 3, 4, 5, 6
		olapClients := []int{1, 1, 2, 2, 3, 4, 5, 6}
		ocStr := strconv.Itoa(olapClients[level-1])
		cmd = exec.Command("pgbench", "-T", "60", "-c", ocStr, "-f", "./scenarios/olap.sql", dbUrl)

	// 3. IOT (Запись)
	case "iot":
		cmd = exec.Command("pgbench", "-T", "60", "-c", cStr, "-f", "./scenarios/iot.sql", dbUrl)

	// 4. LOCKS (Конкуренция)
	case "locks":
		// Тут важно число клиентов, дерущихся за ресурс. Используем базовую шкалу.
		cmd = exec.Command("pgbench", "-T", "60", "-c", cStr, "-f", "./scenarios/locks.sql", dbUrl)

	// 5. REPORTING (Чтение)
	case "reporting":
		cmd = exec.Command("pgbench", "-T", "60", "-c", cStr, "-f", "./scenarios/reporting.sql", dbUrl)

	// 6. MIXED / HTAP
	case "mixed":
		// Стандартный тест, но пропускаем обновление teller/branch (-N), чтобы снизить локи
		cmd = exec.Command("pgbench", "-T", "60", "-c", cStr, "-N", dbUrl)

	// 7. ETL (Массовая)
	case "etl":
		// Для ETL нагрузка должна быть выше IoT. Умножаем клиентов на 2.
		etlClients := clients * 2
		if etlClients > 200 { etlClients = 200 } // Cap
		ecStr := strconv.Itoa(etlClients)
		cmd = exec.Command("pgbench", "-T", "60", "-c", ecStr, "-f", "./scenarios/iot.sql", dbUrl)

	// 8. COLD (Архив)
	case "cold":
		// Здесь интенсивность не меняет команду (VACUUM один),
		// но для галочки оставим запуск.
		cmd = exec.Command("psql", dbUrl, "-c", "VACUUM FULL pgbench_accounts;")

	default:
		return fmt.Errorf("unknown mode: %s", mode)
	}

	// Настройка вывода
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	log.Printf("[GENERATOR] Starting Mode: %s | Intensity: %d (Clients: %s)", mode, level, cStr)
	
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("scenario failed: %w", err)
	}
	
	log.Printf("[GENERATOR] Finished Mode: %s", mode)
	return nil
}
