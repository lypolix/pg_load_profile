from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Dict
import pandas as pd
import json
from catboost import CatBoostClassifier
import numpy as np
import logging
import os

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Database Load Scenario Classifier", version="1.0.0")

class Metrics(BaseModel):
    db_time_total: float
    db_time_committed: float
    cpu_time: float
    io_time: float
    lock_time: float
    cpu_percent: float
    io_percent: float
    lock_percent: float
    tps: float
    qps: float
    avg_query_latency_ms: float
    rollback_rate: float
    total_commits: int
    total_rollbacks: int
    total_calls: int
    active_config: str

class PredictionRequest(BaseModel):
    metrics: Metrics

class PredictionResponse(BaseModel):
    predicted_scenario: str
    confidence: float
    probabilities: Dict[str, float]
    status: str = "success"

model = None
feature_columns = None
categorical_features = None
class_names = None

def load_model():
    """Загрузка обученной модели"""
    global model, feature_columns, categorical_features, class_names
    
    try:

        model = CatBoostClassifier()
        
        model.load_model('model/catboost_model.cbm')
        
        if os.path.exists('model_info.json'):
            with open('model_info.json', 'r') as f:
                model_info = json.load(f)
            feature_columns = model_info['feature_columns']
            categorical_features = model_info['categorical_features']
            class_names = model_info['class_names']
        else:
            feature_columns = [
                'db_time_total', 'db_time_committed', 'cpu_time', 'io_time', 
                'lock_time', 'cpu_percent', 'io_percent', 'lock_percent', 
                'tps', 'qps', 'avg_query_latency_ms', 'rollback_rate', 
                'total_commits', 'total_rollbacks', 'total_calls', 'active_config'
            ]
            categorical_features = ['active_config']
            class_names = model.classes_.tolist() if hasattr(model, 'classes_') else []
            
            model_info = {
                'feature_columns': feature_columns,
                'categorical_features': categorical_features,
                'class_names': class_names
            }
            with open('model_info.json', 'w') as f:
                json.dump(model_info, f, indent=2)
        
        return True
        
    except Exception as e:
        logger.error(f"Error loading model: {e}")
        return False

@app.on_event("startup")
async def startup_event():
    """Загрузка модели при старте приложения"""
    logger.info("Starting up API server...")
    success = load_model()

@app.get("/")
async def root():
    return {
        "message": "Database Load Scenario Classification API", 
        "status": "running",
        "model_loaded": model is not None
    }

@app.get("/health")
async def health_check():
    """Проверка здоровья сервиса"""
    if model is None:
        raise HTTPException(
            status_code=503, 
            detail="Model not loaded. Please check if model files exist."
        )
    return {
        "status": "healthy", 
        "model_loaded": model is not None,
        "model_classes": class_names
    }

@app.post("/predict", response_model=PredictionResponse)
async def predict(request: PredictionRequest):
    """
    Предсказание сценария нагрузки на основе метрик БД
    """
    try:
        if model is None:
            raise HTTPException(
                status_code=503, 
                detail="Model not loaded. Please check server logs."
            )
        
        input_data = request.metrics.model_dump()
        
        df = pd.DataFrame([input_data])[feature_columns]

        for col in categorical_features:
            df[col] = df[col].astype('category')
        
        prediction = model.predict(df)
        probabilities = model.predict_proba(df)
        
        predicted_class = str(prediction[0]) 
        confidence = float(np.max(probabilities[0]))
        
        prob_dict = {}
        for i, class_name in enumerate(class_names):
            prob_dict[str(class_name)] = float(probabilities[0][i]) 
        
        logger.info(f"Prediction: {predicted_class}, Confidence: {confidence:.4f}")
        
        return PredictionResponse(
            predicted_scenario=predicted_class,
            confidence=confidence,
            probabilities=prob_dict
        )
        
    except Exception as e:
        logger.error(f"Prediction error: {e}")
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")

@app.get("/model_info")
async def model_info():
    """Информация о загруженной модели"""
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    return {
        "model_type": "CatBoostClassifier",
        "feature_columns": feature_columns,
        "categorical_features": categorical_features,
        "n_features": len(feature_columns),
        "classes": class_names,
        "model_loaded": True
    }

@app.post("/reload_model")
async def reload_model():
    """Перезагрузка модели"""
    success = load_model()
    if success:
        return {"status": "success", "message": "Model reloaded successfully"}
    else:
        raise HTTPException(status_code=500, detail="Failed to reload model")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)