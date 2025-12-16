"""FastAPI server for RAG with OpenAI and pgvector. --> api server"""

import os
from typing import List, Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from langchain_core.documents import Document
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_postgres import PGVector
from pydantic import BaseModel

# Load environment variables from root directory
env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
load_dotenv(env_path)

app = FastAPI(title="RAG API Server", version="1.0.0")

# CORS 설정 (Postman에서 접근 가능하도록)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables for vector store and LLM
vector_store: Optional[PGVector] = None
rag_chain = None


class QueryRequest(BaseModel):
    """Query request model."""

    question: str
    k: int = 3


class DocumentRequest(BaseModel):
    """Document add request model."""

    content: str
    metadata: Optional[dict] = None


class DocumentListRequest(BaseModel):
    """Multiple documents add request model."""

    documents: List[dict]  # [{"content": "...", "metadata": {...}}]


def init_vector_store() -> PGVector:
    """Initialize vector store with pgvector."""
    postgres_user = os.getenv("PGVECTOR_USER", "langchain")
    postgres_password = os.getenv("PGVECTOR_PASSWORD", "langchain")
    postgres_host = os.getenv("PGVECTOR_HOST", "localhost")
    postgres_port = int(os.getenv("PGVECTOR_PORT", "5432"))
    postgres_db = os.getenv("PGVECTOR_DATABASE", "langchain")

    connection_string = (
        f"postgresql+psycopg://{postgres_user}:{postgres_password}"
        f"@{postgres_host}:{postgres_port}/{postgres_db}"
    )

    # Use OpenAI embeddings
    print("Using OpenAI embeddings (text-embedding-3-small)")
    embeddings = OpenAIEmbeddings(model="text-embedding-3-small")

    collection_name = os.getenv("COLLECTION_NAME", "rag_collection")

    store = PGVector(
        connection=connection_string,
        embeddings=embeddings,
        collection_name=collection_name,
    )

    return store


def init_llm() -> ChatOpenAI:
    """Initialize LLM with OpenAI."""
    print("Using OpenAI LLM (gpt-3.5-turbo)")
    llm = ChatOpenAI(
        model="gpt-3.5-turbo",
        temperature=0.7,
    )
    print("✓ OpenAI LLM initialized!")
    return llm


@app.on_event("startup")
async def startup_event():
    """Initialize vector store and RAG chain on startup."""
    global vector_store, rag_chain

    try:
        print("Initializing vector store...")
        vector_store = init_vector_store()
        print("✓ Vector store initialized!")

        print("Initializing LLM...")
        llm = init_llm()

        # Create RAG prompt template (Korean)
        template = """다음 컨텍스트를 바탕으로 질문에 답변해주세요.

컨텍스트:
{context}

질문: {question}

답변:"""

        prompt = ChatPromptTemplate.from_template(template)

        def format_docs(docs: List[Document]) -> str:
            return "\n\n".join(doc.page_content for doc in docs)

        retriever = vector_store.as_retriever(search_kwargs={"k": 3})

        rag_chain = (
            {"context": retriever | format_docs, "question": RunnablePassthrough()}
            | prompt
            | llm
            | StrOutputParser()
        )

        print("✓ RAG chain initialized!")
        print("API server is ready!")

    except Exception as e:
        print(f"✗ Startup error: {e}")
        import traceback

        traceback.print_exc()
        raise


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "RAG API Server",
        "version": "1.0.0",
        "endpoints": {
            "retrieve": "POST /retrieve - Retrieve similar documents",
            "rag": "POST /rag - RAG (Retrieval + Generation)",
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
        "vector_store": "initialized" if vector_store else "not initialized",
        "rag_chain": "initialized" if rag_chain else "not initialized",
    }


@app.post("/retrieve")
async def retrieve(request: QueryRequest):
    """
    Retrieve similar documents (검색만 수행).

    Postman에서 테스트:
    POST http://localhost:8000/retrieve
    Body (JSON):
    {
        "question": "LangChain이 뭐야?",
        "k": 3
    }
    """
    if not vector_store:
        raise HTTPException(status_code=500, detail="Vector store not initialized")

    try:
        results = vector_store.similarity_search(request.question, k=request.k)

        return {
            "question": request.question,
            "k": request.k,
            "results": [
                {
                    "content": doc.page_content,
                    "metadata": doc.metadata,
                }
                for doc in results
            ],
            "count": len(results),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/rag")
async def rag(request: QueryRequest):
    """
    RAG (Retrieval-Augmented Generation) - 검색 + 답변 생성.

    Postman에서 테스트:
    POST http://localhost:8000/rag
    Body (JSON):
    {
        "question": "LangChain이 뭐야?",
        "k": 3
    }
    """
    if not rag_chain:
        raise HTTPException(status_code=500, detail="RAG chain not initialized")

    try:
        if not vector_store:
            raise HTTPException(status_code=500, detail="Vector store not initialized")

        print(f"[RAG] Received question: {request.question}, k={request.k}")

        # Retrieve documents
        retrieved_docs = vector_store.similarity_search(request.question, k=request.k)
        print(f"[RAG] Retrieved {len(retrieved_docs)} documents")

        # Generate answer
        print("[RAG] Generating answer...")
        answer = rag_chain.invoke(request.question)
        print(f"[RAG] Answer generated: {answer[:100]}...")

        return {
            "question": request.question,
            "answer": answer,
            "retrieved_documents": [
                {
                    "content": doc.page_content,
                    "metadata": doc.metadata,
                }
                for doc in retrieved_docs
            ],
            "retrieved_count": len(retrieved_docs),
        }
    except Exception as e:
        print(f"[RAG] Error: {str(e)}")
        import traceback

        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/documents")
async def add_document(request: DocumentRequest):
    """
    Add a single document to the vector store.

    Postman에서 테스트:
    POST http://localhost:8000/documents
    Body (JSON):
    {
        "content": "LangChain은 LLM 애플리케이션을 구축하기 위한 프레임워크입니다.",
        "metadata": {"source": "manual"}
    }
    """
    if not vector_store:
        raise HTTPException(status_code=500, detail="Vector store not initialized")

    try:
        doc = Document(
            page_content=request.content,
            metadata=request.metadata or {},
        )
        vector_store.add_documents([doc])

        return {
            "message": "Document added successfully",
            "content": request.content,
            "metadata": request.metadata,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/documents/batch")
async def add_documents(request: DocumentListRequest):
    """
    Add multiple documents to the vector store.

    Postman에서 테스트:
    POST http://localhost:8000/documents/batch
    Body (JSON):
    {
        "documents": [
            {"content": "문서 1 내용", "metadata": {"source": "test"}},
            {"content": "문서 2 내용", "metadata": {"source": "test"}}
        ]
    }
    """
    if not vector_store:
        raise HTTPException(status_code=500, detail="Vector store not initialized")

    try:
        docs = [
            Document(
                page_content=doc["content"],
                metadata=doc.get("metadata", {}),
            )
            for doc in request.documents
        ]
        vector_store.add_documents(docs)

        return {
            "message": f"{len(docs)} documents added successfully",
            "count": len(docs),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
