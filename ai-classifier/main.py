import os
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List
import uvicorn
from transformers import pipeline
import torch

from fastapi.middleware.cors import CORSMiddleware

# Initialize FastAPI
app = FastAPI(title="Smart AI Product Classifier - Multilingual")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all for local integration
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve static files
current_dir = os.path.dirname(os.path.abspath(__file__))
static_dir = os.path.join(current_dir, "static")
app.mount("/static", StaticFiles(directory=static_dir), name="static")

# Model Configuration
# We switch to M-DeBERTa which is state-of-the-art for Multilingual (Indonesian included)
MODEL_NAME = "MoritzLaurer/mDeBERTa-v3-base-mnli-xnli"
classifier = None

@app.on_event("startup")
async def load_model():
    global classifier
    print(f"Loading Multilingual AI Model: {MODEL_NAME}...")
    # Use GPU if available, else CPU
    device = 0 if torch.cuda.is_available() else -1
    classifier = pipeline("zero-shot-classification", model=MODEL_NAME, device=device)
    print("Multilingual Model loaded successfully!")

class ClassifyRequest(BaseModel):
    text: str
    labels: List[str]

class ClassifyResponse(BaseModel):
    text: str
    scores: List[float]
    labels: List[str]
    best_match: str

@app.get("/")
async def read_index():
    return FileResponse(os.path.join(static_dir, "index.html"))

@app.post("/api/classify", response_model=ClassifyResponse)
async def classify_text(request: ClassifyRequest):
    if not classifier:
        raise HTTPException(status_code=503, detail="Model is still loading...")
    
    if not request.text or not request.labels:
        raise HTTPException(status_code=400, detail="Text and labels are required")

    try:
        # We use a custom hypothesis template in Indonesian to improve accuracy for local context
        indonesian_template = "Produk ini termasuk dalam kategori {}"
        
        # Perform zero-shot classification
        result = classifier(
            request.text, 
            request.labels, 
            multi_label=False,
            hypothesis_template=indonesian_template
        )
        
        return ClassifyResponse(
            text=result["sequence"],
            labels=result["labels"],
            scores=result["scores"],
            best_match=result["labels"][0]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
