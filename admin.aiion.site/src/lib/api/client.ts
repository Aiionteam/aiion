/**
 * 공통 API 클라이언트
 * 
 * 12개 서비스 (AI 에이전트 5개 + MS 7개)를 위한 재사용 가능한 API 클라이언트
 * Lambda & JSON 최적화 포함
 */

import { AI_GATEWAY_CONFIG } from '../constants/endpoints';

const REQUEST_TIMEOUT = 30000;
const MAX_RETRIES = 2;
const RETRY_DELAY = 1000;
const MAX_JSON_SIZE = 10 * 1024 * 1024; // 10MB

export interface FetchOptions extends RequestInit {
  retries?: number;
  timeout?: number;
}

export interface JSONResponse<T = any> {
  data: T;
  error?: string;
  status: number;
}

/**
 * 안전한 JSON 파싱 (에러 핸들링 및 크기 제한)
 * Lambda 최적화: 메모리 효율적인 스트리밍 파싱
 */
export async function parseJSONResponse<T = any>(
  response: Response,
  maxSize: number = MAX_JSON_SIZE
): Promise<JSONResponse<T>> {
  try {
    // Content-Length 확인
    const contentLength = response.headers.get('content-length');
    if (contentLength) {
      const size = parseInt(contentLength);
      if (!isNaN(size) && size > maxSize) {
        return {
          data: null as any,
          error: `Response too large: ${size} bytes (max: ${maxSize} bytes)`,
          status: response.status,
        };
      }
    }

    // Clone response to avoid consuming the body
    const clonedResponse = response.clone();
    
    // Content-Type 확인 및 인코딩 추출
    const contentType = response.headers.get('Content-Type') || '';
    const charsetMatch = contentType.match(/charset=([^;]+)/i);
    const charset = charsetMatch ? charsetMatch[1].toLowerCase() : 'utf-8';
    
    // 텍스트로 읽기 (UTF-8 명시)
    let text: string;
    try {
      if (clonedResponse.body) {
        const buffer = await clonedResponse.arrayBuffer();
        // UTF-8로 명시적으로 디코딩 (BOM 무시 옵션)
        const decoder = new TextDecoder('utf-8', { fatal: false, ignoreBOM: true });
        text = decoder.decode(buffer);
        console.log('[parseJSONResponse] ArrayBuffer 디코딩 완료, 텍스트 길이:', text.length);
      } else {
        text = await clonedResponse.text();
        console.log('[parseJSONResponse] text() 메서드 사용, 텍스트 길이:', text.length);
      }
      
      // 디코딩 결과 확인 (한글 포함 여부 체크)
      const hasKorean = /[가-힣]/.test(text);
      if (hasKorean) {
        console.log('[parseJSONResponse] 한글 문자 감지됨:', text.substring(0, 100));
      }
    } catch (textError) {
      console.error('[parseJSONResponse] 텍스트 읽기 실패:', textError);
      // arrayBuffer 실패 시 기본 text() 사용
      text = await clonedResponse.text();
    }
    
    // 크기 확인
    if (text.length > maxSize) {
      return {
        data: null as any,
        error: `Response exceeds maximum size: ${text.length} bytes (max: ${maxSize} bytes)`,
        status: response.status,
      };
    }

    // JSON 파싱
    let data: T;
    try {
      data = JSON.parse(text) as T;
      console.log('[parseJSONResponse] JSON 파싱 성공');
    } catch (parseError) {
      return {
        data: null as any,
        error: parseError instanceof Error 
          ? `JSON parse error: ${parseError.message}` 
          : 'Invalid JSON format',
        status: response.status,
      };
    }

    return {
      data,
      status: response.status,
    };
  } catch (error) {
    return {
      data: null as any,
      error: error instanceof Error ? error.message : 'Unknown error',
      status: response.status,
    };
  }
}

/**
 * 재시도 로직이 포함된 fetch 함수
 * 
 * @param url - 요청 URL
 * @param options - fetch 옵션
 * @param retries - 재시도 횟수 (기본값: MAX_RETRIES)
 * @returns Promise<Response>
 */
export async function fetchWithRetry(
  url: string,
  options: FetchOptions = {},
  retries: number = options.retries ?? MAX_RETRIES
): Promise<Response> {
  const timeout = options.timeout ?? REQUEST_TIMEOUT;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // 5xx 에러인 경우 재시도
    if (!response.ok && response.status >= 500 && retries > 0) {
      console.log(
        `[API Client] 서버 에러 발생 (${response.status}), ${retries}회 재시도 남음`
      );
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
      return fetchWithRetry(url, options, retries - 1);
    }

    // 4xx 에러는 재시도하지 않음
    if (!response.ok && response.status >= 400 && response.status < 500) {
      console.warn(`[API Client] 클라이언트 에러 (${response.status}): 재시도하지 않음`);
    }

    return response;
  } catch (error) {
    // 네트워크 에러인 경우 재시도
    if (retries > 0 && error instanceof Error) {
      if (
        error.name === 'AbortError' ||
        error.message.includes('fetch') ||
        error.message.includes('network')
      ) {
        console.log(`[API Client] 네트워크 에러 발생, ${retries}회 재시도 남음`);
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
        return fetchWithRetry(url, options, retries - 1);
      }
    }
    throw error;
  }
}

/**
 * Gateway를 통한 백엔드 API 호출
 * 
 * @param endpoint - API 엔드포인트 (예: "/api/agent1")
 * @param params - 쿼리 파라미터
 * @param options - 추가 fetch 옵션
 * @returns Promise<Response>
 */
/**
 * localStorage에서 JWT 토큰 가져오기
 */
export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('access_token');
}

/**
 * localStorage에서 Refresh 토큰 가져오기
 */
export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('refresh_token');
}

/**
 * JWT 토큰 저장
 */
export function setTokens(accessToken: string, refreshToken?: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('access_token', accessToken);
  if (refreshToken) {
    localStorage.setItem('refresh_token', refreshToken);
  }
}

/**
 * JWT 토큰 삭제
 */
export function clearTokens(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('auth_provider');
}

export async function fetchFromGateway(
  endpoint: string,
  params: Record<string, string> = {},
  options: FetchOptions = {}
): Promise<Response> {
  // 브라우저에서 실행되므로 항상 localhost 사용 (Docker 컨테이너 이름은 사용 불가)
  // 브라우저는 컨테이너 내부 네트워크에 접근할 수 없으므로 localhost만 사용 가능
  // 환경 변수에 gateway나 gateway-server가 있어도 브라우저에서는 해석 불가
  const gatewayHost = 'localhost';
  const gatewayPort = '8080';

  const queryString = new URLSearchParams(params).toString();
  const url = `http://${gatewayHost}:${gatewayPort}${endpoint}${queryString ? `?${queryString}` : ''}`;

  console.log(`[API Client] Gateway 요청: ${url}`);

  // JWT 토큰 가져오기
  const accessToken = getAccessToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json; charset=UTF-8', // 한글 인코딩 명시
    'Accept': 'application/json; charset=UTF-8',
    'Accept-Encoding': 'gzip, deflate, br', // 압축 지원
  };

  // JWT 토큰이 있으면 Authorization 헤더에 추가
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  return fetchWithRetry(url, {
    method: 'GET',
    cache: 'no-store', // Next.js에서 fetch 캐싱 비활성화
    ...options,
    // options에 이미 headers가 있으면 병합 (JWT 토큰 우선)
    headers: {
      ...headers,
      ...options.headers,
    },
  });
}

/**
 * Gateway를 통한 JSON 응답 호출 (최적화된 버전)
 * 
 * @param endpoint - API 엔드포인트
 * @param params - 쿼리 파라미터
 * @param options - 추가 fetch 옵션
 * @returns Promise<JSONResponse<T>>
 */
export async function fetchJSONFromGateway<T = any>(
  endpoint: string,
  params: Record<string, string> = {},
  options: FetchOptions = {}
): Promise<JSONResponse<T>> {
  const response = await fetchFromGateway(endpoint, params, options);
  return parseJSONResponse<T>(response);
}

/**
 * AI 서버 게이트웨이를 통한 API 호출
 * 
 * @param endpoint - API 엔드포인트 (예: "/api/agent1")
 * @param params - 쿼리 파라미터
 * @param options - 추가 fetch 옵션
 * @returns Promise<Response>
 */
export async function fetchFromAIGateway(
  endpoint: string,
  params: Record<string, string> = {},
  options: FetchOptions = {}
): Promise<Response> {
  // AI 서버 게이트웨이 설정 사용
  const queryString = new URLSearchParams(params).toString();
  const url = `${AI_GATEWAY_CONFIG.BASE_URL}${endpoint}${queryString ? `?${queryString}` : ''}`;

  console.log(`[API Client] AI Gateway 요청: ${url} (${AI_GATEWAY_CONFIG.HOST}:${AI_GATEWAY_CONFIG.PORT})`);

  // JWT 토큰 가져오기
  const accessToken = getAccessToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json; charset=UTF-8',
    'Accept': 'application/json; charset=UTF-8',
    'Accept-Encoding': 'gzip, deflate, br',
  };

  // JWT 토큰이 있으면 Authorization 헤더에 추가
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  return fetchWithRetry(url, {
    method: options.method || 'GET',
    cache: 'no-store',
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  });
}

/**
 * AI 서버 게이트웨이를 통한 JSON 응답 호출
 * 
 * @param endpoint - API 엔드포인트
 * @param params - 쿼리 파라미터
 * @param options - 추가 fetch 옵션
 * @returns Promise<JSONResponse<T>>
 */
export async function fetchJSONFromAIGateway<T = any>(
  endpoint: string,
  params: Record<string, string> = {},
  options: FetchOptions = {}
): Promise<JSONResponse<T>> {
  try {
    const response = await fetchFromAIGateway(endpoint, params, options);
    return parseJSONResponse<T>(response);
  } catch (error) {
    // 네트워크 에러 (연결 실패 등) 처리
    console.error('[fetchJSONFromAIGateway] 요청 실패:', error);
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
    
    // 연결 실패 에러 감지
    if (errorMessage.includes('Failed to fetch') || 
        errorMessage.includes('CONNECTION_REFUSED') ||
        errorMessage.includes('ERR_CONNECTION_REFUSED') ||
        errorMessage.includes('NetworkError')) {
      return {
        data: null as any,
        error: `서버에 연결할 수 없습니다. AI 서버(9000 포트)가 실행 중인지 확인해주세요. (${errorMessage})`,
        status: 0,
      };
    }
    
    return {
      data: null as any,
      error: errorMessage,
      status: 0,
    };
  }
}

