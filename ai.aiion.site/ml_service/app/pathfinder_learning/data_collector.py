"""
Learning Recommendation Data Collector
학습 추천을 위한 데이터 수집 모듈

실제 일기 데이터를 diary-service에서 가져와서
ML 분석 결과(emotion, behavior, MBTI)와 결합하여
학습용 데이터를 생성합니다.
"""

import os
import requests
from typing import List, Dict, Optional
from pathlib import Path
import pandas as pd
from datetime import datetime

try:
    from icecream import ic
except ImportError:
    def ic(*args, **kwargs):
        if args or kwargs:
            print(*args, **kwargs)
        return args[0] if args else None


class LearningRecommendationDataCollector:
    """학습 추천 데이터 수집기"""
    
    def __init__(self):
        """초기화"""
        # 서비스 URL (Docker 네트워크 내부 또는 환경 변수)
        self.diary_service_url = os.getenv(
            "DIARY_SERVICE_URL", 
            "http://diary-service:8083"  # Docker 네트워크 내부
        )
        self.gateway_url = os.getenv(
            "API_GATEWAY_URL",
            "http://api-gateway:8080"  # Docker 네트워크 내부
        )
        self.ml_service_url = os.getenv(
            "ML_SERVICE_URL",
            "http://aihoyun-ml-service:9005"  # 감정 분석 ML 서비스
        )
        
        # 출력 CSV 경로
        self.output_csv_path = Path(__file__).parent / "learning_recommendation_dataset.csv"
    
    def collect_diaries_from_csv(self, limit: Optional[int] = None) -> List[Dict]:
        """diary_emotion/diary.csv 파일에서 일기 데이터 수집"""
        try:
            # diary_emotion/diary.csv 파일 경로
            diary_csv_path = Path(__file__).parent.parent / "diary_emotion" / "diary.csv"
            
            if not diary_csv_path.exists():
                ic(f"[DataCollector] CSV 파일이 없습니다: {diary_csv_path}")
                return []
            
            ic(f"[DataCollector] CSV 파일에서 일기 데이터 수집 시작: {diary_csv_path}")
            
            # CSV 파일 읽기
            df = pd.read_csv(
                diary_csv_path,
                encoding='utf-8',
                engine='python',
                sep=',',
                skip_blank_lines=True,
                skipinitialspace=True,
            )
            
            # 데이터프레임을 딕셔너리 리스트로 변환
            diaries = []
            for _, row in df.iterrows():
                diary = {
                    "id": int(row.get("id", 0)),
                    "title": str(row.get("title", "")),
                    "content": str(row.get("content", "")),
                    "userId": row.get("userid", ""),  # userid 컬럼
                    "diaryDate": str(row.get("localdate", "")),  # localdate 컬럼
                    "emotion": int(row.get("emotion", 0))  # 이미 분석된 감정
                }
                diaries.append(diary)
            
            if limit:
                diaries = diaries[:limit]
            
            ic(f"[DataCollector] CSV에서 일기 데이터 수집 완료: {len(diaries)}개")
            return diaries
            
        except Exception as e:
            ic(f"[DataCollector] CSV 읽기 오류: {e}")
            import traceback
            traceback.print_exc()
            return []
    
    def collect_diaries_from_service(self, user_id: Optional[int] = None) -> List[Dict]:
        """diary-service에서 일기 데이터 수집 (백업용)"""
        try:
            if user_id:
                # 특정 사용자 일기 조회
                url = f"{self.diary_service_url}/diaries/user/{user_id}"
            else:
                # 모든 일기 조회 (관리자용)
                url = f"{self.diary_service_url}/diaries"
            
            ic(f"[DataCollector] 일기 데이터 수집 시작: {url}")
            response = requests.get(url, timeout=30)
            
            if response.status_code != 200:
                ic(f"[DataCollector] 일기 조회 실패: {response.status_code}")
                return []
            
            data = response.json()
            
            # Messenger 형식 파싱
            if isinstance(data, dict) and data.get("code") == 200:
                diaries = data.get("data", [])
            else:
                diaries = data if isinstance(data, list) else []
            
            ic(f"[DataCollector] 일기 데이터 수집 완료: {len(diaries)}개")
            return diaries
            
        except Exception as e:
            ic(f"[DataCollector] 일기 수집 오류: {e}")
            return []
    
    def get_emotion_analysis(self, emotion_code: int) -> Dict:
        """감정 분석 결과 (CSV에서 이미 분석된 감정 코드 사용)"""
        emotion_labels = {
            0: "평가불가",
            1: "기쁨",
            2: "슬픔",
            3: "분노",
            4: "두려움",
            5: "혐오",
            6: "놀람"
        }
        
        return {
            "emotion": emotion_code,
            "emotion_label": emotion_labels.get(emotion_code, "평가불가"),
            "emotion_confidence": 0.85  # CSV 데이터는 이미 분석된 것이므로 높은 신뢰도
        }
    
    def extract_behavior_patterns(self, content: str) -> tuple:
        """일기 내용에서 행동 패턴 추출 (간단한 키워드 기반)"""
        # TODO: 실제 행동 분석 서비스가 있으면 그쪽으로 연결
        # 현재는 간단한 키워드 매칭
        behavior_keywords = {
            "요리": ["요리", "요리법", "레시피", "조리", "음식"],
            "운동": ["운동", "헬스", "달리기", "요가", "피트니스"],
            "여행": ["여행", "여행지", "관광", "여행 계획"],
            "공부": ["공부", "학습", "공부법", "시험", "수업"],
            "병원": ["병원", "의사", "상처", "치료", "응급"],
            "글쓰기": ["글쓰기", "일기", "작문", "기록"],
            "날씨": ["날씨", "비", "눈", "맑", "흐림"]
        }
        
        behaviors = []
        frequencies = {}
        
        content_lower = content.lower()
        for behavior, keywords in behavior_keywords.items():
            count = sum(1 for keyword in keywords if keyword in content_lower)
            if count > 0:
                behaviors.append(behavior)
                frequencies[behavior] = count
        
        behavior_str = ", ".join(behaviors) if behaviors else ""
        frequency_str = ", ".join([f"{k}:{v}" for k, v in frequencies.items()]) if frequencies else ""
        
        return behavior_str, frequency_str
    
    def generate_recommendation(self, diary: Dict, emotion: Dict, behaviors: tuple) -> Dict:
        """추천 학습 주제 생성 (간단한 규칙 기반)"""
        # TODO: 실제 추천 로직은 학습된 모델로 대체
        # 현재는 간단한 규칙 기반 추천
        
        behavior_str, frequency_str = behaviors
        emotion_code = emotion.get("emotion", 0)
        
        # 행동 패턴 기반 추천
        recommendations = {
            "요리": {"topic": "요리 기초", "category": "생활", "score": 0.9},
            "운동": {"topic": "운동 및 피트니스", "category": "건강", "score": 0.88},
            "여행": {"topic": "여행 계획 및 준비", "category": "문화", "score": 0.80},
            "공부": {"topic": "학습 방법론", "category": "교육", "score": 0.90},
            "병원": {"topic": "응급처치 기초", "category": "의료", "score": 0.75},
            "글쓰기": {"topic": "글쓰기 및 기록", "category": "문서", "score": 0.87},
            "날씨": {"topic": "기상 관찰 및 기록", "category": "기상", "score": 0.78}
        }
        
        # 가장 빈번한 행동 찾기
        if frequency_str:
            max_freq = 0
            top_behavior = None
            for item in frequency_str.split(", "):
                if ":" in item:
                    behavior, freq = item.split(":", 1)
                    freq = int(freq.strip())
                    if freq > max_freq:
                        max_freq = freq
                        top_behavior = behavior.strip()
            
            if top_behavior and top_behavior in recommendations:
                rec = recommendations[top_behavior]
                reason = f"{top_behavior} 관련 행동이 {max_freq}회 발견되었고"
                if emotion_code == 1:  # 기쁨
                    reason += " 긍정적 감정과 연관되어 있어"
                reason += f" {rec['topic']} 학습을 추천합니다."
                
                return {
                    "recommended_topic": rec["topic"],
                    "recommendation_reason": reason,
                    "recommendation_score": rec["score"],
                    "learning_category": rec["category"]
                }
        
        # 기본 추천
        return {
            "recommended_topic": "학습 방법론",
            "recommendation_reason": "일기 내용을 분석한 결과 학습 방법론을 추천합니다.",
            "recommendation_score": 0.70,
            "learning_category": "교육"
        }
    
    def collect_and_save(self, user_id: Optional[int] = None, limit: Optional[int] = None, use_csv: bool = True) -> int:
        """데이터 수집 및 CSV 저장
        
        Args:
            user_id: 특정 사용자 ID (use_csv=False일 때만 사용)
            limit: 최대 수집 개수
            use_csv: True이면 diary_emotion/diary.csv 사용, False이면 diary-service에서 가져오기
        """
        ic("=" * 80)
        ic("학습 추천 데이터 수집 시작")
        ic("=" * 80)
        
        # 1. 일기 데이터 수집
        if use_csv:
            ic("[DataCollector] CSV 파일에서 데이터 수집 모드")
            diaries = self.collect_diaries_from_csv(limit)
        else:
            ic("[DataCollector] diary-service에서 데이터 수집 모드")
            diaries = self.collect_diaries_from_service(user_id)
            if limit:
                diaries = diaries[:limit]
        
        if not diaries:
            ic("[DataCollector] 수집된 일기 데이터가 없습니다.")
            return 0
        
        ic(f"[DataCollector] {len(diaries)}개 일기 처리 시작")
        
        # 2. 각 일기 데이터 처리
        training_data = []
        
        for i, diary in enumerate(diaries, 1):
            try:
                diary_id = diary.get("id")
                title = diary.get("title", "")
                content = diary.get("content", "")
                
                # userid 처리 (CSV는 userid, 서비스는 userId)
                userid = diary.get("userId") or diary.get("userid") or diary.get("user_id")
                if isinstance(userid, str) and userid.startswith("user_"):
                    userid_str = userid
                else:
                    userid_str = f"user_{userid:02d}" if userid else "user_01"
                
                # 날짜 처리
                diary_date = diary.get("diaryDate") or diary.get("diary_date") or diary.get("localdate")
                
                if not content:
                    continue
                
                # 감정 분석 (CSV에서 이미 분석된 감정 코드 사용)
                emotion_code = diary.get("emotion", 0)
                emotion = self.get_emotion_analysis(emotion_code)
                
                # 행동 패턴 추출
                behaviors = self.extract_behavior_patterns(content)
                
                # 추천 생성
                recommendation = self.generate_recommendation(diary, emotion, behaviors)
                
                # 학습 데이터 구성
                training_data.append({
                    "id": i,
                    "localdate": diary_date or datetime.now().strftime("%m/%d/%Y"),
                    "title": title or "제목 없음",
                    "content": content,
                    "userid": userid_str,
                    "emotion": emotion.get("emotion", 0),
                    "behavior_patterns": behaviors[0],
                    "behavior_frequency": behaviors[1],
                    "mbti_type": "UNKNOWN",  # TODO: MBTI 분석 서비스 연결
                    "mbti_confidence": 0.0,  # TODO: MBTI 분석 서비스 연결
                    "recommended_topic": recommendation["recommended_topic"],
                    "recommendation_reason": recommendation["recommendation_reason"],
                    "recommendation_score": recommendation["recommendation_score"],
                    "learning_category": recommendation["learning_category"]
                })
                
                if i % 100 == 0:
                    ic(f"[DataCollector] {i}/{len(diaries)} 처리 완료")
                    
            except Exception as e:
                ic(f"[DataCollector] 일기 {diary.get('id')} 처리 오류: {e}")
                import traceback
                traceback.print_exc()
                continue
        
        # 3. CSV 저장
        if training_data:
            df = pd.DataFrame(training_data)
            df.to_csv(self.output_csv_path, index=False, encoding='utf-8')
            ic(f"[DataCollector] {len(training_data)}개 데이터를 {self.output_csv_path}에 저장 완료")
            return len(training_data)
        else:
            ic("[DataCollector] 저장할 데이터가 없습니다.")
            return 0

