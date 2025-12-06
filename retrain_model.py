#!/usr/bin/env python3
"""
하이퍼파라미터 튜닝된 모델 재학습 스크립트
"""
import requests
import json
import time
import sys

def train_model():
    url = "http://localhost:9005/diary-emotion/train"
    
    print("=" * 60)
    print("하이퍼파라미터 튜닝된 모델 재학습 시작")
    print("목표: 정확도 95% 이상")
    print("=" * 60)
    print()
    
    try:
        print("학습 중... (하이퍼파라미터 튜닝으로 시간이 더 걸릴 수 있습니다)")
        start_time = time.time()
        
        response = requests.post(url, timeout=600)
        response.raise_for_status()
        
        elapsed_time = time.time() - start_time
        result = response.json()
        
        print()
        print("✅ 학습 완료! (소요 시간: {:.2f}초)".format(elapsed_time))
        print()
        print("학습 결과:")
        print("  메시지: {}".format(result.get("message", "")))
        print("  모델 저장: {}".format(result.get("model_saved", False)))
        print("  모델 경로: {}".format(result.get("model_path", "")))
        print()
        
        if "evaluation" in result:
            eval_data = result["evaluation"]
            print("평가 결과:")
            if "accuracy" in eval_data:
                accuracy = eval_data["accuracy"]
                print("  정확도: {:.2f}%".format(accuracy * 100))
                if accuracy >= 0.95:
                    print("  🎉 목표 달성! 95% 이상 달성!")
                else:
                    print("  목표까지: {:.2f}% 부족".format((0.95 - accuracy) * 100))
            print()
            
            if "classification_report" in eval_data:
                print("분류 보고서:")
                report = eval_data["classification_report"]
                if isinstance(report, dict):
                    for key, value in report.items():
                        if isinstance(value, dict) and 'precision' in value:
                            print("  {}: precision={:.2f}, recall={:.2f}, f1={:.2f}".format(
                                key, value.get('precision', 0), value.get('recall', 0), value.get('f1-score', 0)
                            ))
        
        return True
        
    except requests.exceptions.RequestException as e:
        print()
        print("❌ 오류 발생:")
        if hasattr(e, 'response') and e.response is not None:
            print("  상태 코드: {}".format(e.response.status_code))
            try:
                error_detail = e.response.json()
                print("  상세 오류:")
                print(json.dumps(error_detail, indent=2, ensure_ascii=False))
                if "detail" in error_detail:
                    print("\n  오류 메시지: {}".format(error_detail["detail"]))
            except:
                print("  응답 본문:")
                print("  {}".format(e.response.text))
        else:
            print("  {}".format(str(e)))
        print("\n💡 Docker 로그 확인:")
        print("  docker-compose logs aihoyun-ml-service --tail 50")
        return False

if __name__ == "__main__":
    success = train_model()
    sys.exit(0 if success else 1)
