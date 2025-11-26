package collector

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Collector struct {
	pool *pgxpool.Pool
}

func NewCollector(pool *pgxpool.Pool) *Collector {
	return &Collector{pool: pool}
}

// Start запускает фоновый процесс сбора
func (c *Collector) Start(ctx context.Context) {
	ashTicker := time.NewTicker(5 * time.Second)
	snapshotTicker := time.NewTicker(10 * time.Second)

	go func() {
		for {
			select {
			case <-ctx.Done():
				return
			case <-ashTicker.C:
				if _, err := c.pool.Exec(ctx, "SELECT profile_metrics.collect_ash()"); err != nil {
					fmt.Printf("[ERROR] Collecting ASH: %v\n", err)
				}
			case <-snapshotTicker.C:
				if _, err := c.pool.Exec(ctx, "SELECT profile_metrics.take_snapshot()"); err != nil {
					fmt.Printf("[ERROR] Taking snapshot: %v\n", err)
				}
			}
		}
	}()
}
