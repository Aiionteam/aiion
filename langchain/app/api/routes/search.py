"""Search and document management endpoints."""

from api.models import (  # type: ignore
    DocumentListRequest,
    DocumentRequest,
    QueryRequest,
    SearchResponse,
)
from fastapi import APIRouter, HTTPException
from langchain_core.documents import Document

router = APIRouter(tags=["Search & Documents"])

# Global reference (will be set by main app)
vector_store = None


def set_dependencies(vs):
    """Set vector store dependency."""
    global vector_store
    vector_store = vs


@router.post("/retrieve", response_model=SearchResponse)
async def retrieve(request: QueryRequest):
    """Retrieve similar documents (검색만 수행).

    Args:
        request: Query request with question and k.

    Returns:
        Search response with retrieved documents.
    """
    if not vector_store:
        raise HTTPException(status_code=500, detail="Vector store not initialized")

    try:
        # Use async similarity_search from PGVector
        results = await vector_store.asimilarity_search(request.question, k=request.k)

        return SearchResponse(
            question=request.question,
            k=request.k,
            results=[
                {
                    "content": doc.page_content,
                    "metadata": doc.metadata,
                }
                for doc in results
            ],
            count=len(results),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/documents")
async def add_document(request: DocumentRequest):
    """Add a single document to the vector store.

    Args:
        request: Document request with content and metadata.

    Returns:
        Success message.
    """
    if not vector_store:
        raise HTTPException(status_code=500, detail="Vector store not initialized")

    try:
        # Use async add_texts from PGVector
        doc = Document(
            page_content=request.content,
            metadata=request.metadata or {},
        )
        await vector_store.aadd_documents([doc])

        return {
            "message": "Document added successfully",
            "content": request.content,
            "metadata": request.metadata,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/documents/batch")
async def add_documents(request: DocumentListRequest):
    """Add multiple documents to the vector store.

    Args:
        request: Document list request.

    Returns:
        Success message with count.
    """
    if not vector_store:
        raise HTTPException(status_code=500, detail="Vector store not initialized")

    try:
        # Use async add_documents from PGVector
        docs = [
            Document(
                page_content=doc["content"],
                metadata=doc.get("metadata", {}),
            )
            for doc in request.documents
        ]
        await vector_store.aadd_documents(docs)

        return {
            "message": f"{len(docs)} documents added successfully",
            "count": len(docs),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
