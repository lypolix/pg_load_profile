import { StatusResponse, DashboardData } from '../types/api';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8081';

export class ApiService {
  /**
   * Получить статус системы и AI диагностику
   */
  static async getStatus(): Promise<StatusResponse> {
    const response = await fetch(`${API_BASE_URL}/status`);
    if (!response.ok) {
      throw new Error(`Failed to fetch status: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Получить данные для дашборда
   */
  static async getDashboard(): Promise<DashboardData> {
    const response = await fetch(`${API_BASE_URL}/dashboard`);
    if (!response.ok) {
      throw new Error(`Failed to fetch dashboard: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Применить пресет конфигурации
   */
  static async applyPreset(preset: string): Promise<{ status: string; message: string }> {
    const response = await fetch(`${API_BASE_URL}/config/apply?preset=${preset}`);
    if (!response.ok) {
      throw new Error(`Failed to apply preset: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Запустить нагрузку
   */
  static async startLoad(scenario: string): Promise<{ status: string; message: string }> {
    const response = await fetch(`${API_BASE_URL}/load/start?scenario=${scenario}`);
    if (!response.ok) {
      throw new Error(`Failed to start load: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Применить рекомендации AI
   */
  static async applyRecommendations(mlProfile?: string): Promise<{ status: string; message: string }> {
    const body: any = {};
    if (mlProfile) {
      body.ml_profile = mlProfile;
      console.log("[API] Applying ML recommendations with profile:", mlProfile);
    } else {
      console.log("[API] Applying recommendations without ML profile");
    }
    
    const response = await fetch(`${API_BASE_URL}/config/apply-recommendations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body), // Всегда отправляем body, даже если пустой
    });
    if (!response.ok) {
      throw new Error(`Failed to apply recommendations: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Применить кастомную конфигурацию
   */
  static async applyCustomConfig(config: Record<string, string>): Promise<{ status: string; message: string }> {
    const response = await fetch(`${API_BASE_URL}/config/custom`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(config),
    });
    if (!response.ok) {
      throw new Error(`Failed to apply custom config: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Получить предсказание от ML сервиса
   */
  static async getMLPrediction(): Promise<{
    predicted_scenario: string;
    confidence: number;
    probabilities: Record<string, number>;
    status: string;
  }> {
    const response = await fetch(`${API_BASE_URL}/ml/predict`);
    if (!response.ok) {
      throw new Error(`Failed to get ML prediction: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Получить текущую конфигурацию БД
   */
  static async getCurrentConfig(): Promise<Record<string, string>> {
    const response = await fetch(`${API_BASE_URL}/config/current`);
    if (!response.ok) {
      throw new Error(`Failed to get current config: ${response.statusText}`);
    }
    return response.json();
  }
}

