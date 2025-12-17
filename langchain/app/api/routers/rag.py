"""RAG endpoints for retrieval and generation."""

from api.models import QueryRequest, RAGResponse  # type: ignore
from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/rag", tags=["RAG"])

# Global references (will be set by main app)
vector_store = None
rag_chain = None


def set_dependencies(vs, chain):
    """Set vector store and RAG chain dependencies."""
    global vector_store, rag_chain
    vector_store = vs
    rag_chain = chain


@router.post("", response_model=RAGResponse)
async def rag_query(request: QueryRequest):
    """RAG (Retrieval-Augmented Generation) - 검색 + 답변 생성.

    Args:
        request: Query request with question and k.

    Returns:
        RAG response with answer and retrieved documents.
    """
    if not rag_chain:
        raise HTTPException(status_code=500, detail="RAG chain not initialized")

    try:
        if not vector_store:
            raise HTTPException(status_code=500, detail="Vector store not initialized")

        print(f"[RAG] Received question: {request.question}, k={request.k}")

        # Retrieve documents with similarity scores (async)
        retrieved_docs_with_scores = await vector_store.asimilarity_search_with_score(
            request.question, k=request.k
        )

        # PGVector returns list of (Document, score) tuples
        # Filter documents by relevance threshold
        relevance_threshold = 0.8
        retrieved_docs = [
            doc
            for doc, score in retrieved_docs_with_scores
            if score < relevance_threshold  # Lower score = more similar in pgvector
        ]

        print(
            f"[RAG] Retrieved {len(retrieved_docs)} relevant documents (threshold: {relevance_threshold})"
        )

        # Generate answer with conversation history
        print("[RAG] Generating answer...")
        history = request.conversation_history or []
        print(f"[RAG] Conversation history: {len(history)} messages")

        # Format context from retrieved documents
        context = "\n\n".join(doc.page_content for doc in retrieved_docs)

        # Prepare input with history and context
        chain_input = {
            "question": request.question,
            "history": history,
            "context": context,
        }
        # Use async invoke for async mode
        answer: str = str(await rag_chain.ainvoke(chain_input))

        # 답변 정제: 불필요한 텍스트 제거
        answer = answer.strip()

        # Llama-3.1 추론 태그 처리: <think>추론 과정</think> 최종 답변
        # <think> 태그가 있으면 태그 제거하고 최종 답변만 추출
        if "<think>" in answer:
            # <think>...</think> 이후의 텍스트만 사용
            if "</think>" in answer:
                answer = answer.split("</think>")[-1].strip()
            else:
                # 닫는 태그가 없으면 전체 제거
                answer = answer.split("<think>")[0].strip()

        # Llama-3.1 특수 토큰 제거
        llama_tokens = [
            "<|start_header_id|>",
            "<|end_header_id|>",
            "<|eot_id|>",
            "<|begin_of_text|>",
            "system<|end_header_id|>",
            "user<|end_header_id|>",
            "assistant<|end_header_id|>",
        ]
        for token in llama_tokens:
            answer = answer.replace(token, "")

        # Stop sequences로 생성 중단
        stop_sequences = [
            "질문:",
            "참고 정보:",
            "규칙:",
            "\n\n참고",
            "\n\n질문",
            "<|start_header_id|>",
        ]
        for stop_seq in stop_sequences:
            if stop_seq in answer:
                answer = answer.split(stop_seq)[0].strip()

        # 프롬프트 잔여물 제거
        if "답변:" in answer and not answer.startswith("답변:"):
            answer = answer.split("답변:")[-1].strip()

        # 연속된 줄바꿈 정리
        while "\n\n\n" in answer:
            answer = answer.replace("\n\n\n", "\n\n")

        # 너무 긴 답변 자르기 (300자 제한)
        if len(answer) > 300:
            # 마지막 문장 완성도 확인
            answer_prefix: str = answer[:300]
            last_period: int = answer_prefix.rfind(".")
            if last_period > 200:
                answer = answer[: last_period + 1]
            else:
                answer = answer_prefix + "..."

        answer_preview: str = answer[:100] if len(answer) > 100 else answer
        print(f"[RAG] Answer generated: {answer_preview}...")

        return RAGResponse(
            question=request.question,
            answer=answer,
            retrieved_documents=[
                {
                    "content": doc.page_content,
                    "metadata": doc.metadata,
                }
                for doc in retrieved_docs
            ],
            retrieved_count=len(retrieved_docs),
        )
    except Exception as e:
        print(f"[RAG] Error: {str(e)}")
        import traceback

        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
