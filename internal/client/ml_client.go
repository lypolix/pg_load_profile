package client

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"time"

	"github.com/lypolix/pg_load_profile/internal/models"
)

// MLMetrics представляет метрики для отправки в ML сервис.
type MLMetrics struct {
	DBTimeTotal       float64 `json:"db_time_total"`
	DBTimeCommitted   float64 `json:"db_time_committed"`
	CPUTime           float64 `json:"cpu_time"`
	IOTime            float64 `json:"io_time"`
	LockTime          float64 `json:"lock_time"`
	CPUPercent        float64 `json:"cpu_percent"`
	IOPercent         float64 `json:"io_percent"`
	LockPercent       float64 `json:"lock_percent"`
	TPS               float64 `json:"tps"`
	QPS               float64 `json:"qps"`
	AvgQueryLatencyMS float64 `json:"avg_query_latency_ms"`
	RollbackRate      float64 `json:"rollback_rate"`
	TotalCommits      int64   `json:"total_commits"`
	TotalRollbacks    int64   `json:"total_rollbacks"`
	TotalCalls        int64   `json:"total_calls"`
	ActiveConfig      string  `json:"active_config"`
}

// MLPredictionRequest — запрос на предсказание.
type MLPredictionRequest struct {
	Metrics MLMetrics `json:"metrics"`
}

// MLPredictionResponse — ответ с предсказанием.
type MLPredictionResponse struct {
	PredictedScenario string             `json:"predicted_scenario"`
	Confidence        float64            `json:"confidence"`
	Probabilities     map[string]float64 `json:"probabilities"`
	Status            string             `json:"status"`
}

// MLModelInfoResponse — информация о модели.
type MLModelInfoResponse struct {
	ModelType           string   `json:"model_type"`
	FeatureColumns      []string `json:"feature_columns"`
	CategoricalFeatures []string `json:"categorical_features"`
	NFeatures           int      `json:"n_features"`
	Classes             []string `json:"classes"`
	ModelLoaded         bool     `json:"model_loaded"`
}

// MLClient — клиент для взаимодействия с ML сервисом.
type MLClient struct {
	baseURL    string
	httpClient *http.Client
}

// NewMLClient создает новый экземпляр клиента.
func NewMLClient() *MLClient {
	baseURL := os.Getenv("ML_SERVICE_URL")
	if baseURL == "" {
		baseURL = "http://localhost:8000" // fallback for local development
	}
	return &MLClient{
		baseURL: baseURL,
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

// Predict отправляет метрики для получения предсказания.
func (c *MLClient) Predict(ctx context.Context, metrics models.WorkloadMetrics, activeConfig string) (*MLPredictionResponse, error) {
	mlMetrics := MLMetrics{
		DBTimeTotal:       metrics.DBTimeTotal,
		DBTimeCommitted:   metrics.DBTimeCommitted,
		CPUTime:           metrics.CPUTime,
		IOTime:            metrics.IOTime,
		LockTime:          metrics.LockTime,
		CPUPercent:        metrics.CPUPercent,
		IOPercent:         metrics.IOPercent,
		LockPercent:       metrics.LockPercent,
		TPS:               metrics.TPS,
		QPS:               metrics.QPS,
		AvgQueryLatencyMS: metrics.AvgLatency,
		RollbackRate:      metrics.RollbackRate,
		TotalCommits:      metrics.TotalCommits,
		TotalRollbacks:    metrics.TotalRollbacks,
		TotalCalls:        metrics.TotalCalls,
		ActiveConfig:      activeConfig,
	}

	reqPayload := MLPredictionRequest{Metrics: mlMetrics}
	payloadBytes, err := json.Marshal(reqPayload)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal prediction request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", c.baseURL+"/predict", bytes.NewBuffer(payloadBytes))
	if err != nil {
		return nil, fmt.Errorf("failed to create prediction request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to send prediction request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("ml service returned non-200 status: %s", resp.Status)
	}

	var predResp MLPredictionResponse
	if err := json.NewDecoder(resp.Body).Decode(&predResp); err != nil {
		return nil, fmt.Errorf("failed to decode prediction response: %w", err)
	}

	return &predResp, nil
}

// GetModelInfo получает информацию о модели.
func (c *MLClient) GetModelInfo(ctx context.Context) (*MLModelInfoResponse, error) {
	req, err := http.NewRequestWithContext(ctx, "GET", c.baseURL+"/model_info", nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create model info request: %w", err)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to send model info request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("ml service returned non-200 status: %s", resp.Status)
	}

	var infoResp MLModelInfoResponse
	if err := json.NewDecoder(resp.Body).Decode(&infoResp); err != nil {
		return nil, fmt.Errorf("failed to decode model info response: %w", err)
	}

	return &infoResp, nil
}
