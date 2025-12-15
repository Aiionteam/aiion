/**
 * lib 모듈 통합 export
 * 
 * 사용 예시:
 * import { fetchWithRetry, parseInput, getLocalDateStr } from '@/lib';
 */

// API 클라이언트
export { 
  fetchWithRetry, 
  fetchFromGateway, 
  fetchJSONFromGateway,
  fetchFromAIGateway,
  fetchJSONFromAIGateway,
  parseJSONResponse,
  getAccessToken,
  getRefreshToken,
  setTokens,
  clearTokens,
  type FetchOptions,
  type JSONResponse 
} from './api/client';

// AI 게이트웨이 클라이언트
export {
  aiGatewayClient,
  type ChatRequest,
  type ChatResponse,
  type ChatMessage,
  type Classification,
  type ClassificationData,
  type ClassifyResponse,
  type HealthResponse,
  type WeatherMidForecastParams,
  type WeatherShortForecastParams,
  type WeatherRegionsResponse,
  type WeatherRegion,
  type BugsMusicItem,
  type NetflixItem,
  type MovieItem,
  type DiaryItem,
} from './api/aiGateway';

// 유틸리티
export { getLocalDateStr, getDayOfWeek, parseDateStr, daysBetween } from './utils/dateUtils';
export { extractCategories } from './utils/parser';

// 상수
export { 
  AGENT_ENDPOINTS, 
  SERVICE_ENDPOINTS, 
  GATEWAY_CONFIG,
  AI_GATEWAY_CONFIG 
} from './constants/endpoints';

