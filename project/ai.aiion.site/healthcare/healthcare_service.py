"""
건강 데이터 서비스 레이어
"""
from typing import Dict, Optional
from healthcare_method import HealthcareMethod
from healthcare_dataset import HealthcareDataset
from healthcare_model import HealthcareModel


class HealthcareService:
    """건강 데이터 서비스"""
    
    def __init__(self):
        """초기화"""
        self.method = HealthcareMethod()
        self._model_trained = False
    
    def train(self, test_size: float = 0.2, save_model: bool = True) -> Dict:
        """
        모델 학습
        
        Args:
            test_size: 테스트 데이터 비율
            save_model: 모델 저장 여부
            
        Returns:
            학습 결과
        """
        try:
            results = self.method.train_model(
                test_size=test_size,
                save_model=save_model
            )
            self._model_trained = True
            return {
                'status': 'success',
                'message': '모델 학습이 완료되었습니다.',
                'results': results
            }
        except Exception as e:
            return {
                'status': 'error',
                'message': f'모델 학습 중 오류가 발생했습니다: {str(e)}',
                'error': str(e)
            }
    
    def predict(
        self,
        symptom: str,
        accompanying_symptom: str,
        age: int,
        gender: str
    ) -> Dict:
        """
        증상 기반 진료과 및 병명 예측
        
        Args:
            symptom: 증상
            accompanying_symptom: 동반증상
            age: 연령대
            gender: 성별 ("남성" 또는 "여성")
            
        Returns:
            예측 결과
        """
        try:
            # 입력 검증
            if not symptom or not accompanying_symptom:
                return {
                    'status': 'error',
                    'message': '증상과 동반증상을 모두 입력해주세요.'
                }
            
            if age < 0 or age > 150:
                return {
                    'status': 'error',
                    'message': '올바른 연령대를 입력해주세요.'
                }
            
            if gender not in ['남성', '여성']:
                return {
                    'status': 'error',
                    'message': '성별은 "남성" 또는 "여성"으로 입력해주세요.'
                }
            
            # 예측 수행
            result = self.method.predict(
                symptom=symptom,
                accompanying_symptom=accompanying_symptom,
                age=age,
                gender=gender
            )
            
            return {
                'status': 'success',
                'prediction': result
            }
        except Exception as e:
            return {
                'status': 'error',
                'message': f'예측 중 오류가 발생했습니다: {str(e)}',
                'error': str(e)
            }
    
    def get_model_info(self) -> Dict:
        """
        모델 정보 조회
        
        Returns:
            모델 정보
        """
        try:
            info = self.method.get_model_info()
            return {
                'status': 'success',
                'info': info
            }
        except Exception as e:
            return {
                'status': 'error',
                'message': f'모델 정보 조회 중 오류가 발생했습니다: {str(e)}',
                'error': str(e)
            }
    
    def get_dataset_stats(self) -> Dict:
        """
        데이터셋 통계 정보 조회
        
        Returns:
            데이터셋 통계 정보
        """
        try:
            # 데이터 로딩 및 전처리
            self.method.dataset.preprocess_data()
            stats = self.method.dataset.get_stats()
            
            return {
                'status': 'success',
                'stats': stats
            }
        except Exception as e:
            return {
                'status': 'error',
                'message': f'데이터셋 통계 조회 중 오류가 발생했습니다: {str(e)}',
                'error': str(e)
            }

