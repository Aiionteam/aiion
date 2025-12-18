# QLoRA 어댑터 사용 가이드

## QLoRA란?

QLoRA(Quantized Low-Rank Adaptation)는 대형 언어 모델을 효율적으로 파인튜닝하는 기법입니다.

- **4bit 양자화**: 메모리 사용량 대폭 감소 (11GB → 3.5GB)
- **LoRA**: 소수의 파라미터만 학습하여 빠른 학습
- **어댑터 방식**: 베이스 모델은 그대로 유지하고 작은 어댑터만 추가

## 1. QLoRA 어댑터 생성

### 방법 1: 기본 어댑터 생성 (학습 없이)

베이스 모델에서 어댑터 구조만 생성합니다:

```bash
cd app/scripts
python create_qlora_adapter.py
```

이렇게 생성된 어댑터는 학습되지 않은 상태이므로, 베이스 모델과 동일하게 작동합니다.

### 방법 2: 데이터로 파인튜닝 (추후 구현)

실제 데이터로 모델을 파인튜닝하여 어댑터를 생성합니다.

## 2. 어댑터 사용

### .env 파일 설정

프로젝트 루트의 `.env` 파일에 추가:

```env
# QLoRA 어댑터 경로
PEFT_ADAPTER_PATH=./app/model/llama_ko_adapter
```

### 서버 재시작

```bash
cd app
python main.py
```

서버 시작 시 다음과 같은 로그가 표시됩니다:

```
[QLoRA] ✅ Status: QLoRA adapter is ACTIVE
[QLoRA] ✅ Fine-tuned model is ready!
```

## 3. LoRA 하이퍼파라미터

`train_qlora_adapter()` 함수의 파라미터:

- **lora_r** (default: 16): LoRA rank
  - 낮을수록 적은 파라미터, 빠른 학습
  - 일반적으로 8, 16, 32 사용

- **lora_alpha** (default: 32): LoRA alpha scaling
  - 일반적으로 `lora_alpha = 2 * lora_r`

- **lora_dropout** (default: 0.05): LoRA dropout
  - 과적합 방지용
  - 0.05 ~ 0.1 사이 값 사용

## 4. 어댑터 파일 구조

생성된 어댑터 디렉토리:

```
app/model/llama_ko_adapter/
├── adapter_config.json    # LoRA 설정
├── adapter_model.bin       # 어댑터 가중치 (또는 .safetensors)
├── special_tokens_map.json
├── tokenizer_config.json
└── tokenizer.json
```

## 5. 어댑터 비활성화

어댑터를 비활성화하려면 `.env`에서 제거하거나 주석 처리:

```env
# PEFT_ADAPTER_PATH=./app/model/llama_ko_adapter
```

## 참고사항

- 어댑터 생성 시 GPU 메모리 약 4-5GB 필요
- 어댑터 파일 크기: 약 60-100MB (베이스 모델 16GB에 비해 매우 작음)
- 여러 어댑터를 만들어 다른 태스크에 사용 가능

