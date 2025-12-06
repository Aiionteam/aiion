#!/usr/bin/env python3
"""
특정 텍스트의 감정 예측 테스트
"""

import requests
import json

def test_emotion_prediction(text: str):
    """ML 서비스에 감정 예측 요청"""
    url = "http://localhost:9005/diary-emotion/predict"
    
    try:
        response = requests.post(
            url,
            json={"text": text},
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"\n텍스트: {text[:100]}...")
            print(f"예측된 감정: {result.get('emotion')} ({result.get('emotion_label')})")
            print(f"\n모든 감정 확률:")
            if 'probabilities' in result:
                for emotion, prob in sorted(result['probabilities'].items(), key=lambda x: x[1], reverse=True):
                    print(f"  {emotion}: {prob:.4f} ({prob*100:.2f}%)")
            return result
        else:
            print(f"오류: HTTP {response.status_code}")
            print(response.text)
            return None
            
    except Exception as e:
        print(f"예외 발생: {e}")
        return None

if __name__ == "__main__":
    # 문제가 된 텍스트
    problem_text = """적선이 줄지어 정박했는데, 두번이나 유인했으나, 진작부터 우리 수군을 겁내어 나올 듯하다가도 돌아가 버리므로, 끝내 잡아 없애지 못하였다. 참으로 분하다."""
    
    print("=" * 60)
    print("감정 예측 테스트")
    print("=" * 60)
    
    result = test_emotion_prediction(problem_text)
    
    if result:
        predicted_emotion = result.get('emotion')
        if predicted_emotion == 1:
            print("\n⚠️ 문제 발견: 분노 텍스트가 기쁨으로 분류됨!")
        elif predicted_emotion == 3:
            print("\n✓ 정상: 분노로 올바르게 분류됨")
        else:
            print(f"\n? 예상과 다른 감정: {result.get('emotion_label')}")
