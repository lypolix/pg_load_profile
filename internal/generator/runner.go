package generator

import (
	"fmt"
	"log"
	"os"
	"os/exec"
)

// RunScenario запускает pgbench с заданными параметрами
// mode: "oltp", "olap", "iot", "init"
func RunScenario(mode string) error {
	// Настройки подключения (берем из ENV)
	dbUrl := os.Getenv("DATABASE_URL") 
    // pgbench не всегда хорошо парсит URL, надежнее передать переменные окружения PGPASSWORD и т.д.
    // Но для простоты попробуем передать URL, pgbench это умеет.

	var cmd *exec.Cmd

	switch mode {
	case "init":
		// Инициализация базы (сброс и наполнение)
		// -i: init, -s 10: масштаб (поменьше для скорости демо)
		cmd = exec.Command("pgbench", "-i", "-s", "10", dbUrl)

	case "oltp":
		// Стандартный тест TPC-B (чтение+запись)
		cmd = exec.Command("pgbench", "-T", "60", "-c", "10", "-j", "2", dbUrl)

	case "olap":
		// Ваши кастомные скрипты
		cmd = exec.Command("pgbench", "-T", "60", "-c", "4", "-f", "./scenarios/olap.sql", dbUrl)

	case "iot":
		cmd = exec.Command("pgbench", "-T", "60", "-c", "10", "-f", "./scenarios/iot.sql", dbUrl)
        
    case "locks":
        cmd = exec.Command("pgbench", "-T", "60", "-c", "20", "-f", "./scenarios/locks.sql", dbUrl)

	default:
		return fmt.Errorf("unknown mode: %s", mode)
	}

	// Перенаправляем вывод команды в консоль Go (чтобы видеть логи в докере)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	log.Printf("Starting scenario: %s...", mode)
	err := cmd.Run() // Ждем завершения
	if err != nil {
		return fmt.Errorf("scenario failed: %w", err)
	}
	log.Printf("Scenario %s finished successfully!", mode)

	return nil
}
