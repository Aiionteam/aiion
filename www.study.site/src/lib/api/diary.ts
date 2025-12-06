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
  data: Diary[] | Diary; // DiaryModel 배열 또는 단일 DiaryModel
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
 * JWT 토큰에서 userId를 자동으로 추출하여 조회합니다.
 * @param userId - 선택적 파라미터 (하위 호환성 유지). 제공되지 않으면 JWT 토큰에서 자동 추출
 */
export async function getUserDiaries(userId?: string): Promise<Diary[]> {
  try {
    // userId가 제공되지 않으면 JWT 토큰 기반 엔드포인트 사용 (권장)
    const endpoint = userId ? `/diary/diaries/user/${userId}` : `/diary/diaries/user`;
    const response = await apiClient.get<MessengerResponse>(endpoint);
    // Messenger 형식: { code, message, data }
    if (response.data.code === 200 && response.data.data) {
      // data가 배열인지 확인
      const data = response.data.data;
      return Array.isArray(data) ? data : [data];
    }
    throw new Error(response.data.message || "일기 목록을 가져올 수 없습니다.");
  } catch (error: any) {
    console.error("[Diary API] 사용자 일기 조회 실패:", error);
    throw error;
  }
}

/**
 * 단일 일기 조회 (일괄 조회 방식 사용, N+1 문제 해결)
 */
export async function getDiaryById(diaryId: number, userId: number): Promise<Diary> {
  try {
    const response = await apiClient.post<{ code: number; message: string; data: Diary }>(
      `/diary/diaries/findById`,
      { id: diaryId, userId: userId }
    );
    // Messenger 형식: { code, message, data }
    if (response.data.code === 200 && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.message || "일기를 가져올 수 없습니다.");
  } catch (error: any) {
    console.error("[Diary API] 일기 조회 실패:", error);
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

/**
 * 일기 생성 요청 인터페이스 (id 제외)
 */
export interface CreateDiaryRequest {
  diaryDate: string; // yyyy-MM-dd 형식
  title: string;
  content: string;
  userId: number;
}

/**
 * 일기 생성
 */
export async function createDiary(diaryData: CreateDiaryRequest | Diary): Promise<Diary> {
  try {
    // 새 일기 생성 시 id를 제거 (백엔드에서 자동 생성)
    const { id, ...requestData } = diaryData as Diary;
    const cleanData: CreateDiaryRequest = {
      diaryDate: requestData.diaryDate,
      title: requestData.title,
      content: requestData.content,
      userId: requestData.userId,
    };

    console.log("[createDiary] 전송한 요청 본문:", cleanData);

    const response = await apiClient.post<MessengerResponse>(
      `/diary/diaries/save`,
      cleanData
    );

    // Messenger 형식: { code, message, data }
    if (response.data.code === 200 && response.data.data) {
      const data = response.data.data;
      // data가 배열인 경우 첫 번째 요소 반환, 단일 객체인 경우 그대로 반환
      const diary = Array.isArray(data) ? data[0] : data;
      return diary;
    }
    
    const errorMessage = response.data.message || "저장 실패";
    const errorCode = response.data.code;
    console.error(`[createDiary] 저장 실패: ${errorMessage} (코드: ${errorCode})`);
    throw new Error(`${errorMessage} (코드: ${errorCode})`);
  } catch (error: any) {
    console.error("[createDiary] 예외 발생:", error);
    // 에러 메시지에서 코드 추출
    if (error.response?.data) {
      const errorData = error.response.data;
      const errorMessage = errorData.message || "저장 실패";
      const errorCode = errorData.code;
      throw new Error(`${errorMessage} (코드: ${errorCode})`);
    }
    throw error;
  }
}
