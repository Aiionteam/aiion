/**
 * 일기 API 함수들
 * 백엔드 게이트웨이 서버 (localhost:8080)와 연동
 */

import apiClient from "./client";

export interface Diary {
  id: number;
  diaryDate: string; // yyyy-MM-dd 형식
  title: string;
  content: string;
  userId: number;
  emotion?: number; // 0: 평가불가, 1: 기쁨, 2: 슬픔, 3: 분노, 4: 두려움, 5: 혐오, 6: 놀람
  emotionLabel?: string;
  emotionConfidence?: number;
}

export interface NanjungDiariesResponse {
  count: number;
  diaries: Diary[];
}

// diary-service의 Messenger 응답 형식
export interface MessengerResponse {
  code: number;
  message: string;
  data: Diary[]; // DiaryModel 배열
}

/**
 * 난중일기 목록 조회
 */
export async function getNanjungDiaries(limit: number = 10): Promise<NanjungDiariesResponse> {
  try {
    const response = await apiClient.get<NanjungDiariesResponse>(
      `/diary-emotion/nanjung?limit=${limit}`
    );
    return response.data;
  } catch (error: any) {
    console.error("[Diary API] 난중일기 조회 실패:", error);
    throw error;
  }
}

/**
 * 사용자의 일기 목록 조회
 */
export async function getUserDiaries(userId: string): Promise<Diary[]> {
  try {
    const response = await apiClient.get<MessengerResponse>(
      `/diary/diaries/user/${userId}`
    );
    // Messenger 형식: { code, message, data }
    if (response.data.code === 200 && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.message || "일기 목록을 가져올 수 없습니다.");
  } catch (error: any) {
    console.error("[Diary API] 사용자 일기 조회 실패:", error);
    throw error;
  }
}

/**
 * 감정 예측 요청/응답 인터페이스
 */
export interface PredictEmotionRequest {
  text: string;
}

export interface PredictEmotionResponse {
  emotion: number; // 0: 평가불가, 1: 기쁨, 2: 슬픔, 3: 분노, 4: 두려움, 5: 혐오, 6: 놀람
  emotion_label: string;
  confidence?: number;
  probabilities?: Record<string, number>;
}

/**
 * 일기 텍스트의 감정 분석
 */
export async function predictEmotion(text: string, timeout: number = 20000): Promise<PredictEmotionResponse> {
  try {
    const response = await apiClient.post<PredictEmotionResponse>(
      `/diary-emotion/predict`,
      { text },
      { timeout } // 기본 20초 타임아웃
    );
    return response.data;
  } catch (error: any) {
    console.error("[Diary API] 감정 분석 실패:", error);
    throw error;
  }
}
