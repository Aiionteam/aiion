"""RAG chain initialization with local Llama-3.1-Korean-8B-Instruct model."""

import os
from typing import List, Optional

import torch
from langchain_core.documents import Document
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import PromptTemplate
from langchain_core.runnables import Runnable, RunnablePassthrough
from langchain_huggingface import HuggingFacePipeline
from langchain_postgres import PGVector
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    BitsAndBytesConfig,
    pipeline,
)


def init_llm() -> HuggingFacePipeline:
    """Initialize LLM with local Llama-3.1-Korean-8B-Instruct model (4bit quantization).

    Returns:
        HuggingFacePipeline instance with Llama-3.1-Korean-8B-Instruct.
    """
    # 환경 변수에서 모델 경로 읽기
    local_model_dir = os.getenv("LOCAL_MODEL_DIR")
    llm_provider = os.getenv("LLM_PROVIDER", "llama")

    if local_model_dir:
        # 절대 경로 또는 상대 경로 처리
        if os.path.isabs(local_model_dir):
            model_path = local_model_dir
        else:
            # 상대 경로인 경우 langchain 루트 폴더 기준으로 변환
            root_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
            model_path = os.path.join(root_dir, local_model_dir.lstrip("./"))
    else:
        # 기본값: app/model/llama_ko (app 폴더 기준)
        app_dir = os.path.dirname(os.path.dirname(__file__))
        model_path = os.path.join(app_dir, "model", "llama_ko")

    # 경로 정규화
    model_path = os.path.normpath(os.path.abspath(model_path))

    print(f"LLM Provider: {llm_provider}")
    print(f"Loading local model from: {model_path}")
    print("Using 4bit quantization...")

    # 모델 경로 존재 확인
    if not os.path.exists(model_path):
        raise FileNotFoundError(
            f"Model directory not found: {model_path}\n"
            f"Please set LOCAL_MODEL_DIR in .env file or ensure model exists."
        )

    # GPU 확인
    if torch.cuda.is_available():
        print(f"GPU detected: {torch.cuda.get_device_name(0)}")
        print(
            f"GPU memory: {torch.cuda.get_device_properties(0).total_memory / 1024**3:.2f} GB"
        )
    else:
        print("WARNING: No GPU detected. Using CPU (will be VERY slow)")

    # 4bit 양자화 설정 (메모리 11GB -> 3.5GB, 속도 2-4배 향상)
    bnb_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_compute_dtype=torch.bfloat16,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_use_double_quant=True,
    )

    # 토크나이저 & 모델 로딩
    print("Loading Llama-3.1 tokenizer...")
    tokenizer = AutoTokenizer.from_pretrained(model_path, use_fast=True)

    # Llama-3.1 토크나이저는 EOS를 PAD로 사용
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    print(f"Tokenizer vocab size: {len(tokenizer)}")
    print(f"BOS token: {tokenizer.bos_token} (ID: {tokenizer.bos_token_id})")
    print(f"EOS token: {tokenizer.eos_token} (ID: {tokenizer.eos_token_id})")
    print(f"PAD token: {tokenizer.pad_token} (ID: {tokenizer.pad_token_id})")

    print("Loading model with 4bit quantization (this may take a while)...")
    model = AutoModelForCausalLM.from_pretrained(
        model_path,
        quantization_config=bnb_config,
        device_map="auto",  # Automatically use GPU if available
        dtype=torch.bfloat16,  # torch_dtype 대신 dtype 사용 (deprecated 경고 해결)
    )

    print("Creating pipeline with Llama-3.1 optimized settings...")
    # 파이프라인 구성 (Llama-3.1 추론형 모델 최적화)
    pipe = pipeline(
        "text-generation",
        model=model,
        tokenizer=tokenizer,
        max_new_tokens=200,  # 추론 과정을 위한 충분한 길이
        do_sample=True,  # 샘플링으로 더 자연스러운 답변
        temperature=0.6,  # 추론형 모델이므로 약간 낮춤 (더 일관성 있게)
        top_p=0.9,  # Nucleus sampling
        top_k=50,  # Top-k sampling 추가 (Llama-3 권장)
        repetition_penalty=1.2,  # 반복 방지 (너무 높으면 추론이 끊김)
        return_full_text=False,  # 입력 텍스트 제외하고 생성된 텍스트만 반환
        pad_token_id=tokenizer.pad_token_id,  # 패딩 토큰 설정
        eos_token_id=tokenizer.eos_token_id,  # EOS 토큰 설정
    )

    # LangChain LLM 객체로 래핑
    llm = HuggingFacePipeline(pipeline=pipe)

    print("[OK] Llama-3.1-Korean-8B-Instruct LLM initialized with 4bit quantization!")
    return llm


def create_rag_chain(vector_store: PGVector, llm: HuggingFacePipeline) -> Runnable:
    """Create RAG chain with retriever and LLM.

    Args:
        vector_store: PGVector instance for document retrieval.
        llm: HuggingFacePipeline instance for generation.

    Returns:
        RAG chain (runnable).
    """
    # Create RAG prompt template for Llama-3.1-Korean-Reasoning
    # 이 모델은 추론형 모델이므로 단계적 사고를 유도하는 instruction 형식 사용
    template = """<|begin_of_text|><|start_header_id|>system<|end_header_id|>

당신은 Llama-3.1-Korean-8B-Instruct 모델입니다. 정확한 정보만 제공하는 AI 어시스턴트입니다.
주어진 참고 정보를 바탕으로 질문에 단계적으로 사고한 후 답변하세요.

규칙:
1. 참고 정보에 있는 내용만 사용하세요
2. 참고 정보에 없는 내용은 "정보가 없습니다"라고 답변하세요
3. 인사말에는 간단히 인사로만 응답하세요
4. 답변은 간결하고 명확하게 작성하세요
5. 자신의 모델에 대한 질문에는 "저는 Llama-3.1-Korean-8B-Instruct 모델입니다"라고 답변하세요
6. 이전 대화 내용을 참고하여 일관성 있는 답변을 제공하세요<|eot_id|><|start_header_id|>user<|end_header_id|>

{history}

참고 정보:
{context}

질문: {question}<|eot_id|><|start_header_id|>assistant<|end_header_id|>

"""

    prompt = PromptTemplate.from_template(template)

    def format_docs(docs: List[Document]) -> str:
        return "\n\n".join(doc.page_content for doc in docs)

    def format_history(history: Optional[List[dict]]) -> str:
        """Format conversation history for the prompt."""
        if not history or len(history) == 0:
            return ""

        # 최근 10개 대화만 포함 (토큰 제한 고려)
        recent_history = history[-10:] if len(history) > 10 else history

        history_text = "이전 대화:\n"
        for msg in recent_history:
            role = msg.get("role", "")
            content = msg.get("content", "")
            if role == "user":
                history_text += f"사용자: {content}\n"
            elif role == "assistant":
                history_text += f"어시스턴트: {content}\n"

        return history_text + "\n"

    def create_rag_input(input_data: dict) -> dict:
        """Create input for RAG chain with history.

        Note: Retriever is called separately in the router to support async_mode.
        """
        question = input_data.get("question", "")
        history = input_data.get("history", None)

        # Documents will be retrieved separately in the router
        # This function just formats the input
        return {
            "context": input_data.get("context", ""),
            "history": format_history(history),
            "question": question,
        }

    rag_chain: Runnable = (
        create_rag_input
        | prompt
        | llm
        | StrOutputParser()
    )

    return rag_chain
