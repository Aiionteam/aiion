"""
로컬 KoELECTRA 모델을 사용한 감성 분석 클래스

단계별 구현:
1. ✅ 파일 확인: electra_local 폴더에 필요한 파일들이 모두 있음
2. ✅ PyTorch로 모델 & 토크나이저 로드
3. ✅ 감성 분석 함수 구현
4. ✅ 클래스로 저장하여 재사용 가능
"""

import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification
from pathlib import Path
from typing import Tuple, Optional
import logging

try:
    from common.utils import setup_logging
    logger = setup_logging("nlp_service")
except ImportError:
    logging.basicConfig(level=logging.INFO)
    logger = logging.getLogger("nlp_service")


class EmotionInterence:
    """
    로컬 KoELECTRA 모델을 사용한 감성 분석 클래스
    
    NSMC 데이터로 fine-tuning된 모델을 사용하여
    별도의 학습 데이터 없이 감성 분석 수행
    """
    
    def __init__(self, model_path: Optional[str] = None):
        """
        초기화
        
        Args:
            model_path: 로컬 모델 경로 (None이면 자동으로 electra_local 찾기)
        """
        # 모델 경로 설정
        if model_path is None:
            # 현재 파일 기준으로 electra_local 폴더 찾기
            current_file = Path(__file__)
            # ml_service/electra_local 경로 계산
            base_dir = current_file.parent.parent.parent.parent  # ml_service 디렉토리
            model_path = str(base_dir / "electra_local")
        
        self.model_path = Path(model_path)
        
        # 단계 1: 파일 확인
        required_files = [
            "pytorch_model.bin",
            "tokenizer_config.json",
            "vocab.txt",
            "config.json"
        ]
        
        missing_files = []
        for file_name in required_files:
            file_path = self.model_path / file_name
            if not file_path.exists():
                missing_files.append(file_name)
        
        if missing_files:
            raise FileNotFoundError(
                f"필수 파일이 없습니다: {missing_files}\n"
                f"모델 경로: {self.model_path}\n"
                f"필요한 파일: {required_files}"
            )
        
        logger.info(f"✅ 모델 파일 확인 완료: {self.model_path}")
        
        # 단계 2: PyTorch로 모델 & 토크나이저 로드
        try:
            logger.info("토크나이저 로드 중...")
            self.tokenizer = AutoTokenizer.from_pretrained(str(self.model_path))
            logger.info("✅ 토크나이저 로드 완료")
            
            logger.info("모델 로드 중...")
            self.model = AutoModelForSequenceClassification.from_pretrained(str(self.model_path))
            logger.info("✅ 모델 로드 완료")
            
            # 디바이스 설정
            self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
            self.model.to(self.device)
            self.model.eval()  # 추론 모드
            
            if self.device.type == "cuda":
                logger.info(f"✅ GPU 사용: {torch.cuda.get_device_name(0)}")
            else:
                logger.info("⚠️ CPU 사용")
                
        except Exception as e:
            logger.error(f"모델 로드 실패: {e}")
            raise
    
    def predict(self, text: str) -> Tuple[str, float]:
        """
        감성 분석 예측
        
        Args:
            text: 분석할 텍스트
            
        Returns:
            (label, confidence): (예측 라벨, 신뢰도)
                - label: "긍정" 또는 "부정"
                - confidence: 0.0 ~ 1.0 사이의 확률값
        """
        if not text or not text.strip():
            return "중립", 0.5
        
        try:
            # 입력 전처리
            inputs = self.tokenizer(
                text,
                return_tensors="pt",
                truncation=True,
                padding=True,
                max_length=128
            )
            
            # 디바이스로 이동
            inputs = {k: v.to(self.device) for k, v in inputs.items()}
            
            # 예측
            with torch.no_grad():
                outputs = self.model(**inputs)
                probs = torch.softmax(outputs.logits, dim=1)
                pred = torch.argmax(probs, dim=1).item()
                confidence = probs[0][pred].item()
            
            # 라벨 변환 (0: 부정, 1: 긍정)
            label = "긍정" if pred == 1 else "부정"
            
            return label, round(confidence, 4)
            
        except Exception as e:
            logger.error(f"예측 중 오류 발생: {e}")
            return "중립", 0.0
    
    def predict_batch(self, texts: list) -> list:
        """
        여러 텍스트에 대한 일괄 감성 분석
        
        Args:
            texts: 분석할 텍스트 리스트
            
        Returns:
            [(label, confidence), ...] 형태의 리스트
        """
        results = []
        for text in texts:
            result = self.predict(text)
            results.append(result)
        return results


# 사용 예시 및 테스트
if __name__ == "__main__":
    # 테스트 실행
    print("=" * 60)
    print("로컬 KoELECTRA 감성 분석 테스트")
    print("=" * 60)
    
    try:
        # 분석기 초기화
        analyzer = EmotionInterence()
        
        # 테스트 문장들
        test_texts = [
            "내 인생 최고의 영화였다!",
            "진짜 별로였다. 시간 아까움.",
            "배우 연기가 압권이야",
            "정말 감동적이었어요",
            "별로 재미없었어요"
        ]
        
        print("\n단일 예측 테스트:")
        print("-" * 60)
        for text in test_texts:
            label, prob = analyzer.predict(text)
            print(f"문장: {text}")
            print(f"→ 예측: {label} (확률: {prob})\n")
        
        print("\n일괄 예측 테스트:")
        print("-" * 60)
        results = analyzer.predict_batch(test_texts)
        for text, (label, prob) in zip(test_texts, results):
            print(f"{text} → {label} ({prob})")
        
        print("\n✅ 테스트 완료!")
        
    except Exception as e:
        print(f"❌ 오류 발생: {e}")
        import traceback
        traceback.print_exc()
