import uvicorn

if __name__ == "__main__":
    print("🚀 Starting RAG Streaming API Server...")
    print("📖 API Documentation: http://localhost:8000/docs")
    print("💡 Health Check: http://localhost:8000/health")
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        reload_dirs=[".", "../"],
        log_level="info"
    )
