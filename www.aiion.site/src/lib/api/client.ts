/**
 * 공통 API 클라이언트
 * 
 * 12개 서비스 (AI 에이전트 5개 + MS 7개)를 위한 재사용 가능한 API 클라이언트
 * Lambda & JSON 최적화 포함
 */

import { AI_GATEWAY_CONFIG, GATEWAY_CONFIG } from '../constants/endpoints';

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
    // 외부 signal이 있으면 사용, 없으면 새로 생성
    let controller: AbortController | null = null;
    let timeoutId: NodeJS.Timeout | null = null;
    
    if (options.signal) {
      // 외부 signal이 있으면 타임아웃만 설정
      if (timeout > 0) {
        timeoutId = setTimeout(() => {
          // 외부 signal은 abort할 수 없으므로 로그만 출력
          console.warn(`[API Client] 타임아웃 발생 (${timeout}ms), 외부 signal 사용 중`);
        }, timeout);
      }
    } else {
      // 외부 signal이 없으면 새로 생성
      controller = new AbortController();
      if (timeout > 0) {
        timeoutId = setTimeout(() => controller!.abort(), timeout);
      }
    }

    const response = await fetch(url, {
      ...options,
      signal: controller?.signal || options.signal,
    });
    
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

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
  console.log('[Auth] 토큰 저장 완료');
}

/**
 * JWT 토큰 삭제
 */
export function clearTokens(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('auth_provider');
  console.log('[Auth] 토큰 삭제 완료');
}

/**
 * JWT 토큰 갱신 (Refresh Token 사용)
 * 401 에러 발생 시 자동으로 호출
 */
export async function refreshAccessToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    console.error('[Auth] Refresh Token이 없습니다.');
    return null;
  }

  try {
    console.log('[Auth] Access Token 갱신 시도...');
    // OAuth 서비스의 토큰 갱신 엔드포인트 호출
    const response = await fetch(`${GATEWAY_CONFIG.BASE_URL}/oauth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      console.error('[Auth] 토큰 갱신 실패:', response.status);
      // 갱신 실패 시 모든 토큰 삭제
      clearTokens();
      return null;
    }

    const data = await response.json();
    const newAccessToken = data.accessToken || data.access_token;
    
    if (newAccessToken) {
      // 새로운 토큰 저장
      setTokens(newAccessToken, data.refreshToken || refreshToken);
      console.log('[Auth] ✅ Access Token 갱신 성공');
      return newAccessToken;
    }

    return null;
  } catch (error) {
    console.error('[Auth] 토큰 갱신 중 에러:', error);
    clearTokens();
    return null;
  }
}

/**
 * Gateway를 통한 백엔드 API 호출
 * 
 * @param endpoint - API 엔드포인트 (예: "/auth/google/auth-url")
 * @param params - 쿼리 파라미터
 * @param options - 추가 fetch 옵션
 * @returns Promise<Response>
 */
export async function fetchFromGateway(
  endpoint: string,
  params: Record<string, string> = {},
  options: FetchOptions = {}
): Promise<Response> {
  // GATEWAY_CONFIG 사용 (환경 변수 또는 기본값: localhost:8080)
  // 브라우저에서 실행되므로 항상 localhost 사용 (Docker 컨테이너 이름은 사용 불가)
  // CORS를 통해 Gateway(8080)에 연결
  const gatewayUrl = GATEWAY_CONFIG.BASE_URL;

  const queryString = new URLSearchParams(params).toString();
  const url = `${gatewayUrl}${endpoint}${queryString ? `?${queryString}` : ''}`;

  console.log(`[API Client] Gateway 요청 (CORS): ${url}`);

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

  // options의 headers와 병합 (JWT 토큰은 항상 보존)
  const mergedHeaders: HeadersInit = {
    ...headers,
    ...options.headers,
  };
  
  // JWT 토큰이 있으면 항상 Authorization 헤더에 추가 (덮어쓰기 방지)
  if (accessToken) {
    mergedHeaders['Authorization'] = `Bearer ${accessToken}`;
  }

  return fetchWithRetry(url, {
    method: 'GET',
    cache: 'no-store', // Next.js에서 fetch 캐싱 비활성화
    ...options,
    headers: mergedHeaders,
  });
}

/**
 * Gateway를 통한 JSON 응답 호출 (최적화된 버전)
 * 401 에러 발생 시 자동으로 토큰 갱신 후 재시도
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
  try {
    let response = await fetchFromGateway(endpoint, params, options);

    // 401 에러 발생 시 토큰 갱신 후 재시도
    if (response.status === 401) {
      console.warn('[API] 401 인증 에러 발생, 토큰 갱신 시도...');
      const newToken = await refreshAccessToken();

      if (newToken) {
        console.log('[API] 토큰 갱신 성공, API 재시도...');
        // 토큰 갱신 성공 시 재시도
        response = await fetchFromGateway(endpoint, params, options);
      } else {
        console.error('[API] 토큰 갱신 실패, 로그인 필요');
        // 토큰 갱신 실패 시 에러 반환
        return {
          data: null as any,
          error: 'Authentication failed. Please login again.',
          status: 401,
        };
      }
    }

    return parseJSONResponse<T>(response);
  } catch (error) {
    // 네트워크 에러 (백엔드 미실행/연결 실패 등) 처리
    console.error('[fetchJSONFromGateway] 요청 실패:', error);
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';

    if (
      errorMessage.includes('Failed to fetch') ||
      errorMessage.includes('CONNECTION_REFUSED') ||
      errorMessage.includes('ERR_CONNECTION_REFUSED') ||
      errorMessage.includes('NetworkError')
    ) {
      return {
        data: null as any,
        error:
          `백엔드에 연결할 수 없습니다. (현재는 프론트 화면만 구성 중이면 무시해도 됩니다)\n` +
          `- 대상: ${GATEWAY_CONFIG.BASE_URL}${endpoint}\n` +
          `- 에러: ${errorMessage}`,
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
    console.log('[fetchJSONFromAIGateway] 요청 시작:', endpoint);
    const response = await fetchFromAIGateway(endpoint, params, options);
    
    console.log('[fetchJSONFromAIGateway] 응답 받음:', {
      status: response.status,
      statusText: response.statusText,
      contentType: response.headers.get('Content-Type'),
      ok: response.ok
    });
    
    const result = await parseJSONResponse<T>(response);
    
    console.log('[fetchJSONFromAIGateway] 파싱 완료:', {
      hasError: !!result.error,
      hasData: !!result.data,
      dataType: typeof result.data,
      status: result.status
    });
    
    return result;
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
        error: `서버에 연결할 수 없습니다. API Gateway(8080 포트)가 실행 중인지 확인해주세요. (${errorMessage})`,
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

