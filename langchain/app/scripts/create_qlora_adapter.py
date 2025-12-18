"""
QLoRA 어댑터 생성 스크립트

베이스 모델에서 QLoRA 어댑터를 생성합니다.
"""

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from service.chat_service import train_qlora_adapter  # type: ignore


def main():
    """QLoRA 어댑터 생성 메인 함수."""
    # 모델 경로 설정
    model_path = os.path.join(
        os.path.dirname(os.path.dirname(__file__)),
        "model",
        "llama_ko"
    )

    # 어댑터 저장 경로
    adapter_output_dir = os.path.join(
        os.path.dirname(os.path.dirname(__file__)),
        "model",
        "llama_ko_adapter"
    )

    print("=" * 60)
    print("QLoRA Adapter Creation")
    print("=" * 60)
    print(f"Base model: {model_path}")
    print(f"Output directory: {adapter_output_dir}")
    print("=" * 60 + "\n")

    # 어댑터 생성
    adapter_path = train_qlora_adapter(
        model_path=model_path,
        output_dir=adapter_output_dir,
        lora_r=16,  # LoRA rank (낮을수록 적은 파라미터, 빠른 학습)
        lora_alpha=32,  # LoRA alpha
        lora_dropout=0.05,  # LoRA dropout
    )

    print(f"\n✅ Adapter created at: {adapter_path}")
    print("\n📝 Next steps:")
    print("1. Add to your .env file:")
    print(f"   PEFT_ADAPTER_PATH=./app/model/llama_ko_adapter")
    print("\n2. Restart the server to load the adapter")


if __name__ == "__main__":
    main()

