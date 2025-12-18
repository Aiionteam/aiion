"""FastAPI server for RAG with local Llama-3.1-Korean-8B-Instruct and pgvector."""

import os
import sys

# Add current directory to Python path
sys.path.insert(0, os.path.dirname(__file__))

from api.routers import rag, search  # type: ignore
from core.rag_chain import create_rag_chain, init_llm  # type: ignore
from core.vectorstore import init_vector_store  # type: ignore
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Load environment variables from root directory
env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
load_dotenv(env_path)

app = FastAPI(title="RAG API Server", version="1.0.0")

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event():
    """Initialize vector store and RAG chain on startup."""
    try:
        print("Initializing vector store...")
        vector_store = await init_vector_store()
        print("[OK] Vector store initialized!")

        print("Initializing LLM...")
        llm = init_llm()

        print("Creating RAG chain...")
        rag_chain_instance = create_rag_chain(vector_store, llm)
        print("[OK] RAG chain initialized!")

        # Set dependencies for routers
        rag.set_dependencies(vector_store, rag_chain_instance)
        search.set_dependencies(vector_store)

        print("API server is ready!")

    except Exception as e:
        print(f"[ERROR] Startup error: {e}")
        import traceback

        traceback.print_exc()
        raise


# Include routers
app.include_router(rag.router)
app.include_router(search.router)


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "RAG API Server",
        "version": "1.0.0",
        "endpoints": {
            "rag": "POST /rag - RAG (Retrieval + Generation)",
            "retrieve": "POST /retrieve - Retrieve similar documents",
            "add_document": "POST /documents - Add a document",
            "add_documents": "POST /documents/batch - Add multiple documents",
            "health": "GET /health - Health check",
        },
    }


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "vector_store": "initialized" if search.vector_store else "not initialized",
        "rag_chain": "initialized" if rag.rag_chain else "not initialized",
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)

