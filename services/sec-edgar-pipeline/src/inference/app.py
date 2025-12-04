import os
import boto3
import torch
import uvicorn
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from transformers import AutoTokenizer, AutoModelForSequenceClassification

app = FastAPI(title="SEC BERT Inference Service")

# Global model variables
model = None
tokenizer = None
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

class PredictionRequest(BaseModel):
    text: str

class PredictionResponse(BaseModel):
    label: str
    confidence: float
    logits: list

@app.on_event("startup")
async def load_model():
    global model, tokenizer
    print("🚀 Starting Inference Service...")
    
    bucket = os.getenv("PROCESSED_BUCKET_NAME")
    if not bucket:
        raise RuntimeError("PROCESSED_BUCKET_NAME env var not set")
    
    local_model_path = "/tmp/model"
    os.makedirs(local_model_path, exist_ok=True)
    
    # Download model from S3
    print(f"⬇️ Downloading model from s3://{bucket}/model/ to {local_model_path}")
    s3 = boto3.client('s3')
    
    # List objects in model/ prefix
    objects = s3.list_objects_v2(Bucket=bucket, Prefix="model/")
    if 'Contents' not in objects:
        raise RuntimeError(f"No model found in s3://{bucket}/model/")
        
    for obj in objects['Contents']:
        key = obj['Key']
        # Remove 'model/' prefix for local path
        rel_path = key[len("model/"):]
        if not rel_path: continue
        
        local_file_path = os.path.join(local_model_path, rel_path)
        os.makedirs(os.path.dirname(local_file_path), exist_ok=True)
        
        print(f"  Downloading {key} -> {local_file_path}")
        s3.download_file(bucket, key, local_file_path)
        
    print("✅ Model downloaded. Loading into memory...")
    
    try:
        tokenizer = AutoTokenizer.from_pretrained(local_model_path)
        model = AutoModelForSequenceClassification.from_pretrained(local_model_path)
        model.to(device)
        model.eval()
        print("✅ Model loaded successfully!")
    except Exception as e:
        print(f"❌ Failed to load model: {e}")
        raise e

@app.post("/predict", response_model=PredictionResponse)
async def predict(request: PredictionRequest):
    if not model or not tokenizer:
        raise HTTPException(status_code=503, detail="Model not loaded")
        
    inputs = tokenizer(request.text, return_tensors="pt", truncation=True, padding=True, max_length=128)
    inputs = {k: v.to(device) for k, v in inputs.items()}
    
    with torch.no_grad():
        outputs = model(**inputs)
        logits = outputs.logits
        probabilities = torch.softmax(logits, dim=1)
        
    # Map label id to name (assuming 0: operating, 1: investing, 2: financing)
    # This mapping should ideally come from config/model metadata
    label_map = {0: 'operating', 1: 'investing', 2: 'financing'}
    predicted_class_id = torch.argmax(probabilities, dim=1).item()
    confidence = probabilities[0][predicted_class_id].item()
    
    return {
        "label": label_map.get(predicted_class_id, "unknown"),
        "confidence": confidence,
        "logits": logits[0].tolist()
    }

@app.get("/health")
def health():
    return {"status": "healthy", "model_loaded": model is not None}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8080)
