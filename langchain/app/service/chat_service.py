"""
😎😎 chat_service.py 서빙 관련 서비스

단순 채팅/대화형 LLM 인터페이스.

세션별 히스토리 관리, 요약, 토큰 절약 전략 등.
"""

import os
from typing import Any, List, Optional

import torch
from langchain_core.documents import Document
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import PromptTemplate
from langchain_core.runnables import Runnable
from langchain_huggingface import HuggingFacePipeline
from langchain_postgres import PGVector
from peft import (  # type: ignore
    LoraConfig,
    PeftModel,
    get_peft_model,
    prepare_model_for_kbit_training,
)
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    BitsAndBytesConfig,
    PreTrainedTokenizerFast,
    pipeline,
)


def _get_model_path() -> str:
    """Get model path from environment variables or default location.

    Returns:
        Normalized absolute path to the model directory.

    Raises:
        FileNotFoundError: If model directory is not found.
    """
    local_model_dir = os.getenv("LOCAL_MODEL_DIR")

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

    # 모델 경로 존재 확인
    if not os.path.exists(model_path):
        raise FileNotFoundError(
            f"Model directory not found: {model_path}\n"
            f"Please set LOCAL_MODEL_DIR in .env file or ensure model exists."
        )

    return model_path


def train_qlora_adapter(
    model_path: str,
    output_dir: str = "app/model/llama_ko_adapter",
    *,
    lora_r: int = 16,
    lora_alpha: int = 32,
    lora_dropout: float = 0.05,
) -> str:
    """Train QLoRA adapter for fine-tuning.

    Args:
        model_path: Path to base model.
        output_dir: Directory to save adapter.
        lora_r: LoRA rank (lower = fewer parameters, faster training).
        lora_alpha: LoRA alpha scaling factor.
        lora_dropout: LoRA dropout rate.

    Returns:
        Path to saved adapter directory.

    Raises:
        FileNotFoundError: If model directory is not found.
    """
    print("\n" + "=" * 60)
    print("Starting QLoRA adapter training...")
    print("=" * 60)

    # 4bit 양자화 설정
    bnb_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_compute_dtype=torch.bfloat16,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_use_double_quant=True,
    )

    # 토크나이저 로드
    tokenizer = AutoTokenizer.from_pretrained(model_path, use_fast=True)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token
        tokenizer.pad_token_id = tokenizer.eos_token_id

    # 모델 로드
    print("Loading base model...")
    model: Any = AutoModelForCausalLM.from_pretrained(
        model_path,
        quantization_config=bnb_config,
        device_map="auto",
        dtype=torch.bfloat16,
    )

    # 모델을 학습 가능하도록 준비
    print("Preparing model for k-bit training...")
    model = prepare_model_for_kbit_training(model)

    # LoRA 설정
    print(
        f"Configuring LoRA (r={lora_r}, alpha={lora_alpha}, dropout={lora_dropout})..."
    )
    peft_config = LoraConfig(
        r=lora_r,
        lora_alpha=lora_alpha,
        lora_dropout=lora_dropout,
        bias="none",
        task_type="CAUSAL_LM",
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj"],  # Llama attention
    )

    # PEFT 모델 생성
    print("Creating PEFT model...")
    model = get_peft_model(model, peft_config)  # type: ignore
    model.print_trainable_parameters()  # type: ignore

    # 어댑터 저장
    print(f"\nSaving adapter to: {output_dir}")
    os.makedirs(output_dir, exist_ok=True)
    model.save_pretrained(output_dir)
    tokenizer.save_pretrained(output_dir)

    print("=" * 60)
    print("✅ QLoRA adapter created successfully!")
    print(f"✅ Adapter saved to: {output_dir}")
    print("\nTo use the adapter, set in .env file:")
    print(f"PEFT_ADAPTER_PATH={output_dir}")
    print("=" * 60 + "\n")

    return output_dir


def init_tokenizer() -> PreTrainedTokenizerFast:
    """Initialize tokenizer for Llama-3.1-Korean-8B-Instruct model.

    Returns:
        PreTrainedTokenizerFast instance with Llama-3.1 tokenizer.

    Raises:
        FileNotFoundError: If model directory is not found.
    """
    print("[CHAT_SERVICE] 🔤 init_tokenizer() called")
    model_path = _get_model_path()

    print("Loading Llama-3.1 tokenizer...")
    tokenizer = AutoTokenizer.from_pretrained(model_path, use_fast=True)

    # Llama-3.1 토크나이저는 EOS를 PAD로 사용
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    print(f"Tokenizer vocab size: {len(tokenizer)}")
    print(f"BOS token: {tokenizer.bos_token} (ID: {tokenizer.bos_token_id})")
    print(f"EOS token: {tokenizer.eos_token} (ID: {tokenizer.eos_token_id})")
    print(f"PAD token: {tokenizer.pad_token} (ID: {tokenizer.pad_token_id})")

    return tokenizer


def init_llm() -> HuggingFacePipeline:
    """Initialize LLM with local Llama-3.1-Korean-8B-Instruct model (4bit quantization).

    Returns:
        HuggingFacePipeline instance with Llama-3.1-Korean-8B-Instruct.

    Raises:
        FileNotFoundError: If model directory is not found.
    """
    print("\n" + "=" * 60)
    print("[CHAT_SERVICE] 🚀 init_llm() called - Starting LLM initialization")
    print("=" * 60)
    model_path = _get_model_path()
    llm_provider = os.getenv("LLM_PROVIDER", "llama")

    print(f"LLM Provider: {llm_provider}")
    print(f"Loading local model from: {model_path}")
    print("Using 4bit quantization...")

    # GPU 확인
    use_gpu = torch.cuda.is_available()
    if use_gpu:
        print(f"GPU detected: {torch.cuda.get_device_name(0)}")
        print(
            f"GPU memory: {torch.cuda.get_device_properties(0).total_memory / 1024**3:.2f} GB"
        )
        print("Using 4bit quantization on GPU...")
    else:
        print("WARNING: No GPU detected. Using CPU mode (will be VERY slow)")
        print("CPU mode: Using float32 without quantization for compatibility")

    # 토크나이저 로딩 (별도 함수 사용)
    tokenizer = init_tokenizer()

    # GPU/CPU에 따라 다른 설정 사용
    model: Any
    if use_gpu:
        # GPU: 4bit 양자화 설정 (메모리 11GB -> 3.5GB, 속도 2-4배 향상)
        bnb_config = BitsAndBytesConfig(
            load_in_4bit=True,
            bnb_4bit_compute_dtype=torch.bfloat16,
            bnb_4bit_quant_type="nf4",
            bnb_4bit_use_double_quant=True,
        )
        print("Loading model with 4bit quantization on GPU (this may take a while)...")
        model = AutoModelForCausalLM.from_pretrained(
            model_path,
            quantization_config=bnb_config,
            device_map="auto",  # Automatically use GPU
            dtype=torch.bfloat16,
        )
        print("[OK] Base model loaded with 4bit quantization on GPU")
    else:
        # CPU: 양자화 없이 float32로 로드 (CPU는 양자화 지원 제한적)
        print("Loading model on CPU without quantization (this may take a while)...")
        print("Note: CPU inference will be very slow. Consider using GPU if available.")
        model = AutoModelForCausalLM.from_pretrained(
            model_path,
            device_map="cpu",  # Explicitly use CPU
            torch_dtype=torch.float32,  # CPU는 float32 사용
            low_cpu_mem_usage=True,  # 메모리 효율적 로딩
        )
        print("[OK] Base model loaded on CPU (no quantization)")

    # PEFT/QLoRA adapter 로드 (선택적)
    print("\n" + "=" * 60)
    print("[QLoRA] Checking for PEFT/QLoRA adapter...")
    print("=" * 60)
    peft_adapter_path = os.getenv("PEFT_ADAPTER_PATH")
    peft_loaded = False

    if peft_adapter_path:
        # 절대 경로 또는 상대 경로 처리
        if os.path.isabs(peft_adapter_path):
            adapter_path = peft_adapter_path
        else:
            root_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
            adapter_path = os.path.join(root_dir, peft_adapter_path.lstrip("./"))

        adapter_path = os.path.normpath(os.path.abspath(adapter_path))

        print(f"[QLoRA] Checking adapter path: {adapter_path}")

        if os.path.exists(adapter_path):
            print(f"[QLoRA] Loading PEFT/QLoRA adapter from: {adapter_path}")
            try:
                # 4bit 양자화된 모델에 PEFT adapter 로드
                # adapter_name_or_path를 키워드 인자로 명시적으로 전달
                model = PeftModel.from_pretrained(
                    model,
                    adapter_path,
                    device_map="auto",  # GPU 자동 할당
                )
                peft_loaded = True
                print("[QLoRA] ✅ PEFT/QLoRA adapter loaded successfully!")
                print(f"[QLoRA] Model type: {type(model).__name__}")
            except Exception as e:
                print(f"[QLoRA] ❌ ERROR: Failed to load PEFT adapter: {e}")
                import traceback

                traceback.print_exc()
                print("[QLoRA] Continuing with base model...")
        else:
            print(f"[QLoRA] ⚠️  WARNING: PEFT adapter path not found: {adapter_path}")
    else:
        print("[QLoRA] ℹ️  No PEFT_ADAPTER_PATH specified in environment variables")

    # 최종 상태 출력
    print("=" * 60)
    if peft_loaded:
        print("[QLoRA] ✅ Status: QLoRA adapter is ACTIVE")
        print("[QLoRA] ✅ Fine-tuned model is ready!")
    else:
        print("[QLoRA] ℹ️  Status: Using base model (no QLoRA adapter)")
        print("[QLoRA] ℹ️  To use QLoRA, set PEFT_ADAPTER_PATH in .env file")
    print("=" * 60 + "\n")

    print("Creating pipeline with Llama-3.1 optimized settings...")
    # 파이프라인 구성 (Llama-3.1 추론형 모델 최적화)
    # PeftModel은 PreTrainedModel을 래핑하므로 pipeline에 전달 가능
    pipe = pipeline(
        "text-generation",
        model=model,  # type: ignore
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
    print("[CHAT_SERVICE] ✅ init_llm() completed - Returning HuggingFacePipeline")
    print("=" * 60 + "\n")
    return llm


def create_rag_chain(vector_store: PGVector, llm: HuggingFacePipeline) -> Runnable:
    """Create RAG chain with retriever and LLM.

    Args:
        vector_store: PGVector instance for document retrieval.
        llm: HuggingFacePipeline instance for generation.

    Returns:
        RAG chain (runnable).
    """
    print("\n" + "=" * 60)
    print("[CHAT_SERVICE] 🔗 create_rag_chain() called")
    print(f"[CHAT_SERVICE]   - vector_store type: {type(vector_store).__name__}")
    print(f"[CHAT_SERVICE]   - llm type: {type(llm).__name__}")
    print("=" * 60)
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
        print("[CHAT_SERVICE] 📥 create_rag_input() called")
        print(f"[CHAT_SERVICE]   - question: {input_data.get('question', '')[:50]}...")
        print(
            f"[CHAT_SERVICE]   - history length: {len(input_data.get('history', []))}"
        )
        print(
            f"[CHAT_SERVICE]   - context length: {len(input_data.get('context', ''))}"
        )
        question = input_data.get("question", "")
        history = input_data.get("history", None)

        # Documents will be retrieved separately in the router
        # This function just formats the input
        return {
            "context": input_data.get("context", ""),
            "history": format_history(history),
            "question": question,
        }

    rag_chain: Runnable = create_rag_input | prompt | llm | StrOutputParser()

    print("[CHAT_SERVICE] ✅ create_rag_chain() completed - Returning RAG chain")
    print("=" * 60 + "\n")
    return rag_chain
