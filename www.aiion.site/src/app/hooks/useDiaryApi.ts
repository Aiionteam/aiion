/**
 * 일기 API 함수
 * 백엔드 diary-service와 통신
 */

import { fetchJSONFromGateway } from '../../lib/api/client';
import { SERVICE_ENDPOINTS } from '../../lib/constants/endpoints';
import { Diary } from '../../components/types';

// 백엔드 응답 형식 (code는 소문자로 고정)
interface Messenger {
  code: number; // @JsonProperty("code")로 소문자 고정
  message: string;
  data: any;
}

// 백엔드 DiaryModel 형식
interface DiaryModel {
  id?: number;
  diaryDate?: string; // "YYYY-MM-DD"
  title: string;
  content: string;
  userId?: number;
  // 감정 분석 결과 (백엔드에서 자동으로 포함)
  emotion?: number; // 감정 코드 (0: 평가불가, 1: 기쁨, 2: 슬픔, 3: 분노, 4: 두려움, 5: 혐오, 6: 놀람)
  emotionLabel?: string; // 감정 라벨
  emotionConfidence?: number; // 신뢰도 (0.0 ~ 1.0)
}

/**
 * 감정 코드를 이모지로 변환
 */
function emotionCodeToEmoji(emotionCode?: number): string {
  const emotionMap: Record<number, string> = {
    0: '😐', // 평가불가
    1: '😊', // 기쁨
    2: '😢', // 슬픔
    3: '😠', // 분노
    4: '😨', // 두려움
    5: '🤢', // 혐오
    6: '😲', // 놀람
  };
  return emotionCode !== undefined && emotionCode in emotionMap 
    ? emotionMap[emotionCode] 
    : '😊'; // 기본값
}

/**
 * 백엔드 DiaryModel을 프론트엔드 Diary로 변환
 */
function modelToDiary(model: DiaryModel): Diary {
  console.log('[modelToDiary] 변환 시작:', model);
  
  // 백엔드에서 감정 분석 결과가 있으면 사용, 없으면 기본값
  const emotion = model.emotionLabel 
    ? emotionCodeToEmoji(model.emotion) 
    : '😊';
  const emotionScore = model.emotionConfidence !== undefined 
    ? Math.round(model.emotionConfidence * 10) // 0.0~1.0을 0~10으로 변환
    : 5; // 기본값
  
  const diary = {
    id: model.id?.toString() || Date.now().toString(),
    date: model.diaryDate || new Date().toISOString().split('T')[0],
    title: model.title || '',
    content: model.content || '',
    emotion: emotion,
    emotionScore: emotionScore,
  };
  console.log('[modelToDiary] 변환 완료:', diary, {
    원본_감정코드: model.emotion,
    원본_감정라벨: model.emotionLabel,
    원본_신뢰도: model.emotionConfidence,
    변환된_이모지: emotion,
    변환된_점수: emotionScore
  });
  return diary;
}

/**
 * 프론트엔드 Diary를 백엔드 DiaryModel로 변환
 */
function diaryToModel(diary: Diary, userId?: number): DiaryModel {
  // userId 유효성 검사 (필수)
  if (!userId || userId === undefined || userId === null) {
    console.error('[diaryToModel] ❌ userId가 필수입니다!', { diary, userId });
    throw new Error('사용자 ID가 필요합니다. 로그인 상태를 확인해주세요.');
  }
  
  // 날짜 형식을 YYYY-MM-DD로 보장
  let formattedDate = diary.date;
  
  // 날짜 유효성 검사
  if (!formattedDate || formattedDate.trim() === '') {
    console.error('[diaryToModel] ❌ 날짜가 없습니다!', diary);
    throw new Error('일기 날짜는 필수 항목입니다.');
  }
  
  // 날짜 형식 검증 및 변환
  if (formattedDate) {
    // 이미 YYYY-MM-DD 형식인지 확인
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!datePattern.test(formattedDate)) {
      // 다른 형식이라면 변환 시도
      try {
        const date = new Date(formattedDate);
        if (!isNaN(date.getTime())) {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          formattedDate = `${year}-${month}-${day}`;
        } else {
          console.error('[diaryToModel] ❌ 유효하지 않은 날짜:', formattedDate);
          throw new Error(`유효하지 않은 날짜 형식입니다: ${formattedDate}`);
        }
      } catch (e) {
        console.error('[diaryToModel] 날짜 변환 실패:', formattedDate, e);
        throw new Error(`날짜 변환 실패: ${formattedDate}`);
      }
    }
  }
  
  const diaryModel: DiaryModel = {
    id: diary.id ? parseInt(diary.id) : undefined,
    diaryDate: formattedDate,
    title: diary.title || '',
    content: diary.content || '',
    userId: userId,
  };
  
  console.log('[diaryToModel] 변환 완료:', {
    원본_날짜: diary.date,
    변환된_날짜: formattedDate,
    userId: userId,
    title: diaryModel.title,
    contentLength: diaryModel.content?.length || 0
  });
  
  return diaryModel;
}

/**
 * 사용자별 일기 조회
 */
export async function fetchDiariesByUserId(userId?: number): Promise<Diary[]> {
  // Gateway 라우팅: /diary/** → diary-service
  // 백엔드 컨트롤러: @RequestMapping("/diaries")
  // JWT 토큰 기반 조회: /diary/diaries/user (토큰에서 userId 자동 추출)
  // 또는 기존 방식: /diary/diaries/user/{userId} (하위 호환성)
  const endpoint = userId ? `/diary/diaries/user/${userId}` : `/diary/diaries/user`;
  console.log('[fetchDiariesByUserId] API 호출 시작:', endpoint, userId ? `(userId: ${userId})` : '(JWT 토큰 기반)');
  
  try {
    const response = await fetchJSONFromGateway<Messenger>(
      endpoint,
      {},
      {
        method: 'GET',
      }
    );

    console.log('[fetchDiariesByUserId] 응답 상태:', response.status);
    console.log('[fetchDiariesByUserId] 응답 데이터:', JSON.stringify(response.data, null, 2));
    console.log('[fetchDiariesByUserId] 응답 에러:', response.error);

    // 네트워크 에러나 파싱 에러가 있는 경우
    if (response.error) {
      console.error('[fetchDiariesByUserId] 응답 에러:', response.error);
      // 에러가 있어도 빈 배열 반환 (에러를 throw하지 않음)
      return [];
    }

    // 응답 데이터가 없는 경우
    if (!response.data) {
      console.warn('[fetchDiariesByUserId] 응답 데이터가 없음');
      return [];
    }

    const messenger = response.data as Messenger;
    // code는 소문자로 고정 (@JsonProperty("code") 사용)
    const responseCode = messenger.code;
    
    console.log('[fetchDiariesByUserId] Messenger 객체:', {
      code: messenger.code,
      message: messenger.message,
      dataType: Array.isArray(messenger.data) ? 'array' : typeof messenger.data,
      dataLength: Array.isArray(messenger.data) ? messenger.data.length : 'N/A'
    });
    
    // 응답 코드가 200이 아니면 빈 배열 반환 (에러를 throw하지 않음)
    if (responseCode !== 200) {
      console.warn('[fetchDiariesByUserId] 응답 코드가 200이 아님:', responseCode, messenger.message);
      return [];
    }

    // data가 배열인 경우
    if (Array.isArray(messenger.data)) {
      console.log('[fetchDiariesByUserId] 배열 데이터:', messenger.data.length, '개');
      if (messenger.data.length === 0) {
        console.log('[fetchDiariesByUserId] 빈 배열 반환');
        return [];
      }
      const diaries = messenger.data.map((item: DiaryModel) => {
        console.log('[fetchDiariesByUserId] 일기 항목 변환:', item);
        return modelToDiary(item);
      });
      console.log('[fetchDiariesByUserId] 변환된 일기:', diaries.length, '개', diaries);
      return diaries;
    }

    // data가 단일 객체인 경우
    if (messenger.data && typeof messenger.data === 'object' && !Array.isArray(messenger.data)) {
      console.log('[fetchDiariesByUserId] 단일 객체 데이터:', messenger.data);
      return [modelToDiary(messenger.data as DiaryModel)];
    }

    console.warn('[fetchDiariesByUserId] 데이터 형식이 예상과 다름:', typeof messenger.data);
    return [];
  } catch (error) {
    console.error('[fetchDiariesByUserId] 예외 발생:', error);
    // 예외가 발생해도 빈 배열 반환 (에러를 throw하지 않음)
    return [];
  }
}

/**
 * 전체 일기 조회
 */
export async function fetchDiaries(): Promise<Diary[]> {
  const endpoint = `/diary/diaries`;
  console.log('[fetchDiaries] 전체 일기 조회 시작:', endpoint);
  
  try {
    const response = await fetchJSONFromGateway<Messenger>(
      endpoint,
      {},
      {
        method: 'GET',
      }
    );

    console.log('[fetchDiaries] 응답 상태:', response.status);
    console.log('[fetchDiaries] 응답 데이터 타입:', typeof response.data);
    console.log('[fetchDiaries] 응답 데이터 키:', response.data ? Object.keys(response.data) : 'null');
    console.log('[fetchDiaries] 응답 데이터 (첫 500자):', JSON.stringify(response.data, null, 2).substring(0, 500));
    console.log('[fetchDiaries] 응답 에러:', response.error);

    // 네트워크 에러나 파싱 에러가 있는 경우
    if (response.error) {
      console.error('[fetchDiaries] 응답 에러:', response.error);
      return [];
    }

    // 응답 데이터가 없는 경우
    if (!response.data) {
      console.warn('[fetchDiaries] 응답 데이터가 없음');
      return [];
    }

    // 응답 구조 확인 (code로 통일)
    // 백엔드 Messenger 형식: { code: 200, message: "...", data: [...] }
    console.log('[fetchDiaries] 원본 응답 데이터:', response.data);
    console.log('[fetchDiaries] 응답 데이터 타입:', typeof response.data);
    console.log('[fetchDiaries] 응답 데이터 키:', response.data ? Object.keys(response.data) : 'null');
    
    // response.data가 이미 Messenger 형식인 경우
    const messenger = response.data as Messenger;
    const responseCode = messenger?.code; // code는 소문자로 고정
    const responseData = messenger?.data;
    
    console.log('[fetchDiaries] 응답 구조:', {
      code: responseCode,
      hasData: !!responseData,
      dataType: Array.isArray(responseData) ? 'array' : typeof responseData,
      dataLength: Array.isArray(responseData) ? responseData.length : 'N/A',
      responseKeys: response.data ? Object.keys(response.data) : [],
    });
    
    // 응답 코드가 200이 아니면 빈 배열 반환
    if (responseCode !== 200) {
      console.warn('[fetchDiaries] 응답 코드가 200이 아님:', responseCode);
      return [];
    }
    
    // data가 배열인 경우
    if (Array.isArray(responseData)) {
      console.log('[fetchDiaries] 배열 데이터:', responseData.length, '개');
      if (responseData.length === 0) {
        console.log('[fetchDiaries] 빈 배열 반환');
        return [];
      }
      const diaries = responseData.map((item: DiaryModel) => {
        console.log('[fetchDiaries] 일기 항목 변환:', item);
        return modelToDiary(item);
      });
      console.log('[fetchDiaries] 변환된 일기:', diaries.length, '개', diaries.slice(0, 3));
      return diaries;
    }
    
    // data가 없는 경우
    if (!responseData) {
      console.warn('[fetchDiaries] 응답 데이터가 없음');
      return [];
    }

    // Messenger 형식인 경우 (messenger.data가 배열)
    // 백엔드 응답 형식: { code: 200, message: "...", data: [...] }
    if (messenger && messenger.data) {
      if (Array.isArray(messenger.data)) {
        console.log('[fetchDiaries] Messenger 배열 데이터:', messenger.data.length, '개');
        if (messenger.data.length === 0) {
          console.log('[fetchDiaries] 빈 배열 반환');
          return [];
        }
        const diaries = messenger.data.map((item: DiaryModel) => {
          console.log('[fetchDiaries] 일기 항목 변환:', item);
          return modelToDiary(item);
        });
        console.log('[fetchDiaries] 변환된 일기:', diaries.length, '개', diaries.slice(0, 3));
        return diaries;
      }
      
      // data가 단일 객체인 경우
      if (typeof messenger.data === 'object' && !Array.isArray(messenger.data)) {
        console.log('[fetchDiaries] 단일 객체 데이터:', messenger.data);
        return [modelToDiary(messenger.data as DiaryModel)];
      }
    }

    console.warn('[fetchDiaries] 데이터 형식이 예상과 다름:', {
      responseDataType: typeof responseData,
      messengerDataType: messenger?.data ? typeof messenger.data : 'null',
      responseData: response.data,
      responseKeys: response.data ? Object.keys(response.data) : []
    });
    return [];
  } catch (error) {
    console.error('[fetchDiaries] 예외 발생:', error);
    return [];
  }
}

/**
 * 일기 저장
 */
export async function createDiary(diary: Diary, userId: number): Promise<Diary> {
  console.log('[createDiary] 일기 저장 시작:', { diary, userId });
  const diaryModel = diaryToModel(diary, userId);
  console.log('[createDiary] 변환된 DiaryModel:', diaryModel);
  console.log('[createDiary] 날짜 형식 확인:', {
    diaryDate: diaryModel.diaryDate,
    format: 'YYYY-MM-DD',
    isValid: /^\d{4}-\d{2}-\d{2}$/.test(diaryModel.diaryDate || '')
  });
  
  const requestBody = JSON.stringify(diaryModel);
  console.log('[createDiary] Gateway로 전송할 요청 본문:', requestBody);
  
  try {
    const response = await fetchJSONFromGateway<Messenger>(
      `/diary/diaries`,
      {},
      {
        method: 'POST',
        body: requestBody,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('[createDiary] API 응답 상태:', response.status);
    console.log('[createDiary] API 응답 데이터:', response.data);
    console.log('[createDiary] API 응답 에러:', response.error);

    if (response.error) {
      console.error('[createDiary] API 클라이언트 에러:', response.error);
      throw new Error(`API 에러: ${response.error}`);
    }

    if (!response.data) {
      console.error('[createDiary] 응답 데이터가 없음');
      throw new Error('응답 데이터가 없습니다.');
    }

    const messenger = response.data as Messenger;
    console.log('[createDiary] 원본 응답 데이터:', response.data);
    console.log('[createDiary] Messenger 객체:', {
      code: messenger.code,
      message: messenger.message,
      data: messenger.data
    });
    
    // code는 소문자로 고정
    const responseCode = messenger.code;
    console.log('[createDiary] 응답 코드:', responseCode);
    
    if (responseCode !== 200) {
      console.error('[createDiary] ⚠️ 백엔드 에러 응답 발생!');
      console.error('[createDiary] 에러 코드:', responseCode);
      console.error('[createDiary] 에러 메시지:', messenger.message);
      console.error('[createDiary] 전송한 DiaryModel:', JSON.stringify(diaryModel, null, 2));
      console.error('[createDiary] 전송한 요청 본문:', requestBody);
      
      // 구체적인 에러 메시지 제공
      let errorMessage = messenger.message || `저장 실패 (코드: ${responseCode})`;
      
      // 백엔드 검증 에러 메시지에 따라 더 친절한 메시지 제공
      if (responseCode === 400) {
        if (messenger.message?.includes('일자 정보')) {
          errorMessage = `날짜 정보가 올바르지 않습니다: ${diaryModel.diaryDate}`;
        } else if (messenger.message?.includes('사용자 ID')) {
          errorMessage = `사용자 ID가 필요합니다. 현재 userId: ${diaryModel.userId}`;
        }
      }
      
      throw new Error(errorMessage);
    }

    if (!messenger.data) {
      console.error('[createDiary] Messenger.data가 없음');
      throw new Error('저장된 일기 데이터가 없습니다.');
    }

    const savedDiary = modelToDiary(messenger.data as DiaryModel);
    console.log('[createDiary] 저장 완료:', savedDiary);
    return savedDiary;
  } catch (error) {
    console.error('[createDiary] 예외 발생:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('일기를 저장하는데 실패했습니다.');
  }
}

/**
 * 일기 수정
 */
export async function updateDiary(diary: Diary, userId: number): Promise<Diary> {
  const diaryModel = diaryToModel(diary, userId);
  
  const response = await fetchJSONFromGateway<Messenger>(
    `/diary/diaries`,
    {},
    {
      method: 'PUT',
      body: JSON.stringify(diaryModel),
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  if (response.error || !response.data) {
    throw new Error(response.error || '일기를 수정하는데 실패했습니다.');
  }

  const messenger = response.data as Messenger;
  
  // code 필드 확인 (소문자로 통일)
  const responseCode = messenger.code;
  
  if (responseCode !== 200) {
    throw new Error(messenger.message || '일기를 수정하는데 실패했습니다.');
  }

  return modelToDiary(messenger.data as DiaryModel);
}

/**
 * 일기 삭제
 */
export async function deleteDiary(diary: Diary, userId: number): Promise<void> {
  const diaryModel = diaryToModel(diary, userId);
  
  const response = await fetchJSONFromGateway<Messenger>(
    `/diary/diaries`,
    {},
    {
      method: 'DELETE',
      body: JSON.stringify(diaryModel),
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  if (response.error || !response.data) {
    throw new Error(response.error || '일기를 삭제하는데 실패했습니다.');
  }

  const messenger = response.data as Messenger;
  
  // code 필드 확인 (소문자로 통일)
  const responseCode = messenger.code;
  
  if (responseCode !== 200) {
    throw new Error(messenger.message || '일기를 삭제하는데 실패했습니다.');
  }
}

