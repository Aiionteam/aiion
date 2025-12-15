import chatApiClient from "./chatClient";

/**
 * 기상청 API 함수들
 * 백엔드 게이트웨이 서버 (localhost:8080)를 통해 기상청 서비스와 연동
 */

export interface MidForecastRequest {
  stnId?: string; // 지역 코드 (108: 서울, 109: 인천, 105: 강릉, 133: 대전, 143: 대구, 156: 광주, 184: 제주)
  regionName?: string; // 지역명 (권장) - 예: "서울", "인천", "과천", "광명" 등
  regId?: string; // 중기기온예보구역코드 - 예: "11B10101" (서울)
  tmFc?: string; // 발표시각 (YYYYMMDDHHmm 형식) - 생략 시 자동 계산
  pageNo?: number;
  numOfRows?: number;
  dataType?: "JSON" | "XML";
}

export interface ShortForecastRequest {
  base_date?: string; // 발표일자 (YYYYMMDD 형식, 예: 20240101) - 생략 시 자동 계산
  base_time?: string; // 발표시각 (HHmm 형식, 예: 0500) - 생략 시 자동 계산
  nx: number; // 예보지점 X 좌표 (격자 X)
  ny: number; // 예보지점 Y 좌표 (격자 Y)
  pageNo?: number;
  numOfRows?: number;
  dataType?: "JSON" | "XML";
}

export interface WeatherResponse {
  response: {
    header: {
      resultCode: string;
      resultMsg: string;
    };
    body: {
      items?: {
        item?: any[] | any; // item은 배열이거나 단일 객체일 수 있음
      };
      totalCount?: number;
    };
  };
}

export interface WeatherHealthResponse {
  status: string;
  service: string;
  kma_api_key_configured: boolean;
  kma_short_key_configured: boolean;
}

/**
 * 중기예보 조회 (3일~10일 예보)
 * GET /weather/mid-forecast
 */
export const getMidForecast = async (
  params: MidForecastRequest
): Promise<WeatherResponse> => {
  const queryParams = new URLSearchParams();
  
  // 지역 지정 방법 (하나만 선택)
  if (params.regionName) {
    queryParams.append("regionName", params.regionName);
  } else if (params.stnId) {
    queryParams.append("stnId", params.stnId);
  } else if (params.regId) {
    queryParams.append("regId", params.regId);
  }
  
  // tmFc는 선택적 - 생략 시 백엔드에서 자동 계산
  if (params.tmFc) {
    queryParams.append("tmFc", params.tmFc);
  }
  
  if (params.pageNo) queryParams.append("pageNo", params.pageNo.toString());
  if (params.numOfRows) queryParams.append("numOfRows", params.numOfRows.toString());
  if (params.dataType) queryParams.append("dataType", params.dataType);
  else queryParams.append("dataType", "JSON");

  try {
    const response = await chatApiClient.get<WeatherResponse>(
      `/weather/mid-forecast?${queryParams.toString()}`
    );
    return response.data;
  } catch (error: any) {
    console.error("[Weather API] 중기예보 요청 실패:", error);
    // 에러 응답도 반환할 수 있도록 처리
    if (error.response?.data) {
      throw error;
    }
    throw error;
  }
};

/**
 * 단기예보 조회 (현재부터 3일 예보)
 * GET /weather/short-forecast
 */
export const getShortForecast = async (
  params: ShortForecastRequest
): Promise<WeatherResponse> => {
  const queryParams = new URLSearchParams();
  // base_date와 base_time은 선택적 - 생략 시 백엔드에서 자동 계산
  if (params.base_date) {
    queryParams.append("base_date", params.base_date);
  }
  if (params.base_time) {
    queryParams.append("base_time", params.base_time);
  }
  queryParams.append("nx", params.nx.toString());
  queryParams.append("ny", params.ny.toString());
  if (params.pageNo) queryParams.append("pageNo", params.pageNo.toString());
  if (params.numOfRows) queryParams.append("numOfRows", params.numOfRows.toString());
  if (params.dataType) queryParams.append("dataType", params.dataType);
  else queryParams.append("dataType", "JSON");

  try {
    const response = await chatApiClient.get<WeatherResponse>(
      `/weather/short-forecast?${queryParams.toString()}`
    );
    return response.data;
  } catch (error: any) {
    console.error("[Weather API] 단기예보 요청 실패:", error);
    // 에러 응답도 반환할 수 있도록 처리
    if (error.response?.data) {
      throw error;
    }
    throw error;
  }
};

/**
 * 기상청 서비스 상태 확인
 * GET /weather/health
 */
export const checkWeatherHealth = async (): Promise<WeatherHealthResponse> => {
  const response = await chatApiClient.get<WeatherHealthResponse>("/weather/health");
  return response.data;
};

/**
 * 주요 지역 코드 및 격자 좌표
 */
export const REGION_CODES = {
  SEOUL: { stnId: "108", nx: 60, ny: 127 },
  INCHEON: { stnId: "109", nx: 55, ny: 124 },
  GANGNEUNG: { stnId: "105", nx: 73, ny: 134 },
  DAEJEON: { stnId: "133", nx: 67, ny: 100 },
  DAEGU: { stnId: "143", nx: 89, ny: 90 },
  GWANGJU: { stnId: "156", nx: 58, ny: 74 },
  JEJU: { stnId: "184", nx: 52, ny: 38 },
  BUSAN: { stnId: null, nx: 98, ny: 76 },
  ULSAN: { stnId: null, nx: 102, ny: 84 },
} as const;

/**
 * 현재 시간 기준으로 가장 최근 발표 시간 계산
 * 단기예보는 매일 특정 시간에 발표: 0200, 0500, 0800, 1100, 1400, 1700, 2000, 2300
 */
export const getLatestBaseTime = (): string => {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  
  // 발표 시간 목록 (역순으로 정렬)
  const baseTimes = ["2300", "2000", "1700", "1400", "1100", "0800", "0500", "0200"];
  
  // 현재 시간보다 이전의 가장 최근 발표 시간 찾기
  const currentTime = `${String(hours).padStart(2, "0")}${String(minutes).padStart(2, "0")}`;
  
  for (const baseTime of baseTimes) {
    if (currentTime >= baseTime) {
      return baseTime;
    }
  }
  
  // 현재 시간이 0200 이전이면 전날 2300 사용
  return "2300";
};

/**
 * 오늘 날짜를 YYYYMMDD 형식으로 반환
 */
export const getTodayDate = (): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
};

/**
 * 중기예보용 발표시각 생성 (YYYYMMDDHHmm 형식)
 */
export const getMidForecastTime = (): string => {
  const today = getTodayDate();
  const baseTime = getLatestBaseTime();
  return `${today}${baseTime}`;
};

