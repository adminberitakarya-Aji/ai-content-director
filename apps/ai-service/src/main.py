from fastapi import FastAPI

app = FastAPI(
    title="AI Content Production Director - AI Service",
    description="Prompt compilation dan continuity scoring",
    version="0.1.0",
)


@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "service": "ai-service",
        "timestamp": __import__("datetime").datetime.now().isoformat(),
    }