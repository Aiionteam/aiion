/**
 * AI 게이트웨이 API 클라이언트
 * 
 * 백엔드 가이드 문서 기반으로 작성된 AI 서버 (localhost:9000) 전용 API 클라이언트
 * 
 * 참고 문서:
 * - 프론트엔드_연결_가이드.md
 * - API_연결_요약.md
 */

import { fetchJSONFromAIGateway, fetchFromAIGateway } from './client';

// ============================================================================
// 타입 정의
// ============================================================================

export interface HealthResponse {
  status: string;
  service: string;
  message: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  message: string;
  model?: string;
  system_message?: string;
  conversation_history?: ChatMessage[];
}

// 분류 데이터 타입
export interface ClassificationData {
  // 공통 필드
  date?: string;
  content?: string;
  
  // 일기 (Diary)
  mood?: string;
  events?: string[];
  keywords?: string[];
  
  // 건강 (Health)
  type?: "운동" | "식단" | "수면" | "체중" | "건강검진";
  exercise_type?: string;
  duration?: number;
  distance?: number;
  calories?: number;
  weight?: number;
  
  // 가계 (Finance)
  // type 필드는 일기와 중복되므로 any로 처리 (실제로는 지출/수입)
  amount?: number;
  currency?: string;
  location?: string;
  category_detail?: string;
  payment_method?: "카드" | "현금" | "계좌이체";
  time?: string;
  
  // 문화 (Culture)
  // type 필드는 일기와 중복되므로 any로 처리 (실제로는 영화/책/전시 등)
  title?: string;
  genre?: string;
  rating?: number;
  author?: string;
  
  // 패스파인더 (Pathfinder)
  // type 필드는 일기와 중복되므로 any로 처리 (실제로는 목표/계획/탐색 등)
  goal?: string;
  deadline?: string;
  priority?: "high" | "medium" | "low";
  status?: string;
  tags?: string[];
}

export interface Classification {
  category: "일기" | "건강" | "가계" | "문화" | "패스파인더";
  confidence: number; // 0.0 ~ 1.0
  data: ClassificationData;
}

export interface ChatResponse {
  message: string;
  model: string;
  status: 'success' | 'error';
  classification?: Classification | null; // ⬅️ 새로 추가 (선택사항)
}

export interface WeatherMidForecastParams {
  stnId?: string;
  regionName?: string;
  regId?: string;
  tmFc?: string;
  pageNo?: number;
  numOfRows?: number;
  dataType?: 'JSON' | 'XML';
}

export interface WeatherShortForecastParams {
  nx: number;
  ny: number;
  base_date?: string;
  base_time?: string;
  pageNo?: number;
  numOfRows?: number;
  dataType?: 'JSON' | 'XML';
}

export interface WeatherRegion {
  name: string;
  regId: string;
}

export interface WeatherRegionsResponse {
  total: number;
  regions: WeatherRegion[];
}

export interface BugsMusicItem {
  rank: number;
  title: string;
  artist: string;
  album: string;
}

export interface NetflixItem {
  title: string;
  type: string;
  link: string;
  image: string;
}

export interface MovieItem {
  rank: number;
  title: string;
  director: string;
  year: number;
  link: string;
}

export interface DiaryItem {
  id: number;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClassifyResponse {
  success: boolean;
  classification?: Classification | null;
}

// ============================================================================
// API 클라이언트 클래스
// ============================================================================

class AIGatewayClient {
  /**
   * Health Check
   * GET /health
   */
  async healthCheck() {
    const { data, error, status } = await fetchJSONFromAIGateway<HealthResponse>('/health');
    
    if (error) {
      return {
        data: null,
        error,
        status,
      };
    }

    return {
      data,
      error: null,
      status,
    };
  }

  /**
   * 챗봇 - GET (테스트용)
   * GET /chatbot/chat
   */
  async getChatTest() {
    const { data, error, status } = await fetchJSONFromAIGateway<ChatResponse>('/chatbot/chat');
    
    return {
      data,
      error,
      status,
    };
  }

  /**
   * 챗봇 - POST (AI 대화)
   * POST /chatbot/chat
   * 
   * @param params - 챗봇 요청 파라미터
   * @returns AI 응답
   */
  async sendChat(params: ChatRequest) {
    const { data, error, status } = await fetchJSONFromAIGateway<ChatResponse>(
      '/chatbot/chat',
      {},
      {
        method: 'POST',
        body: JSON.stringify(params),
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    return {
      data,
      error,
      status,
    };
  }

  /**
   * 날씨 - 중기예보 조회 (3~10일)
   * GET /weather/mid-forecast
   * 
   * @param params - 중기예보 파라미터
   */
  async getMidForecast(params: WeatherMidForecastParams) {
    const queryParams: Record<string, string> = {};
    
    if (params.stnId) queryParams.stnId = params.stnId;
    if (params.regionName) queryParams.regionName = params.regionName;
    if (params.regId) queryParams.regId = params.regId;
    if (params.tmFc) queryParams.tmFc = params.tmFc;
    if (params.pageNo) queryParams.pageNo = String(params.pageNo);
    if (params.numOfRows) queryParams.numOfRows = String(params.numOfRows);
    if (params.dataType) queryParams.dataType = params.dataType;

    const { data, error, status } = await fetchJSONFromAIGateway('/weather/mid-forecast', queryParams);

    return {
      data,
      error,
      status,
    };
  }

  /**
   * 날씨 - 단기예보 조회 (현재~3일)
   * GET /weather/short-forecast
   * 
   * @param params - 단기예보 파라미터
   */
  async getShortForecast(params: WeatherShortForecastParams) {
    const queryParams: Record<string, string> = {
      nx: String(params.nx),
      ny: String(params.ny),
    };

    if (params.base_date) queryParams.base_date = params.base_date;
    if (params.base_time) queryParams.base_time = params.base_time;
    if (params.pageNo) queryParams.pageNo = String(params.pageNo);
    if (params.numOfRows) queryParams.numOfRows = String(params.numOfRows);
    if (params.dataType) queryParams.dataType = params.dataType;

    const { data, error, status } = await fetchJSONFromAIGateway('/weather/short-forecast', queryParams);

    return {
      data,
      error,
      status,
    };
  }

  /**
   * 날씨 - 지원 지역 목록 조회
   * GET /weather/regions
   */
  async getWeatherRegions() {
    const { data, error, status } = await fetchJSONFromAIGateway<WeatherRegionsResponse>('/weather/regions');

    return {
      data,
      error,
      status,
    };
  }

  /**
   * 날씨 - 날씨 서비스 상태 확인
   * GET /weather/health
   */
  async getWeatherHealth() {
    const { data, error, status } = await fetchJSONFromAIGateway<HealthResponse>('/weather/health');

    return {
      data,
      error,
      status,
    };
  }

  /**
   * 크롤러 - 벅스 실시간 차트
   * GET /crawler/bugsmusic
   */
  async getBugsMusic() {
    const { data, error, status } = await fetchJSONFromAIGateway<BugsMusicItem[]>('/crawler/bugsmusic');

    return {
      data,
      error,
      status,
    };
  }

  /**
   * 크롤러 - Netflix 영화 목록
   * GET /crawler/netflix
   * 
   * ⚠️ 주의: 최대 5분까지 소요될 수 있습니다.
   */
  async getNetflix() {
    const { data, error, status } = await fetchJSONFromAIGateway<NetflixItem[]>('/crawler/netflix');

    return {
      data,
      error,
      status,
    };
  }

  /**
   * 크롤러 - KMDB 영화 100선
   * GET /crawler/movie
   * 
   * ⚠️ 주의: 최대 2분까지 소요될 수 있습니다.
   */
  async getMovies() {
    const { data, error, status } = await fetchJSONFromAIGateway<MovieItem[]>('/crawler/movie');

    return {
      data,
      error,
      status,
    };
  }

  /**
   * 크롤러 - 다나와 TV 상품 목록
   * GET /crawler/danawa_tv
   */
  async getDanawaTV() {
    const { data, error, status } = await fetchJSONFromAIGateway('/crawler/danawa_tv');

    return {
      data,
      error,
      status,
    };
  }

  /**
   * 일기 - 일기 목록 조회
   * GET /diary/diaries
   */
  async getDiaries() {
    const { data, error, status } = await fetchJSONFromAIGateway<DiaryItem[]>('/diary/diaries');

    return {
      data,
      error,
      status,
    };
  }

  /**
   * 일기 - 일기 저장
   * POST /diary/diaries
   */
  async createDiary(diaryData: {
    diaryDate?: string;
    title: string;
    content: string;
    userId?: number;
  }) {
    const { data, error, status } = await fetchJSONFromAIGateway<DiaryItem>(
      '/diary/diaries',
      {},
      {
        method: 'POST',
        body: JSON.stringify(diaryData),
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    return {
      data,
      error,
      status,
    };
  }

  /**
   * 챗봇 - 텍스트 분류 (전용 API)
   * POST /chatbot/classify
   * 
   * 텍스트를 카테고리로 분류하고 구조화하는 전용 엔드포인트
   * 
   * @param text - 분류할 텍스트
   * @returns 분류 결과
   */
  async classifyText(text: string) {
    const { data, error, status } = await fetchJSONFromAIGateway<ClassifyResponse>(
      '/chatbot/classify',
      {},
      {
        method: 'POST',
        body: JSON.stringify({ text }),
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    return {
      data,
      error,
      status,
    };
  }
}

// 싱글톤 인스턴스 export
export const aiGatewayClient = new AIGatewayClient();
export default aiGatewayClient;

