// API Base URL - 환경 변수 또는 기본값
// Spring Gateway는 보통 /api 경로를 사용하므로 기본값에 포함
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

// API Base URL 확인 로그 (개발 환경에서만)
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  console.log(`[API Client] Base URL: ${API_BASE_URL}`);
  console.log(`[API Client] NEXT_PUBLIC_API_URL: ${process.env.NEXT_PUBLIC_API_URL || "(not set, using default)"}`);
}

// Request Options 타입
interface RequestOptions extends RequestInit {
  timeout?: number;
}

// Fetch API를 사용한 HTTP 클라이언트
class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  // 기본 헤더 생성
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      "Accept": "application/json",
    };

    // 토큰이 있다면 헤더에 추가
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token");
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
    }

    return headers;
  }

  // 타임아웃 처리
  private async fetchWithTimeout(
    url: string,
    options: RequestOptions,
    timeout: number = 10000
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === "AbortError") {
        throw new Error("요청 시간이 초과되었습니다.");
      }
      throw error;
    }
  }

  // 에러 처리
  private async handleErrorResponse(response: Response, requestedUrl?: string): Promise<never> {
    // 401 Unauthorized - 토큰 만료 시 로그아웃
    // 테스트 중: 자동 로그아웃 비활성화
    // if (response.status === 401) {
    //   if (typeof window !== "undefined") {
    //     localStorage.removeItem("token");
    //     window.location.href = "/";
    //   }
    // }

    // 404 Not Found - 엔드포인트를 찾을 수 없음
    if (response.status === 404) {
      // 요청한 URL 정보를 에러에 포함
      const url = requestedUrl || response.url || "unknown";
      const enhancedError: any = new Error("요청한 엔드포인트를 찾을 수 없습니다. 백엔드 서버 설정을 확인해주세요.");
      enhancedError.response = {
        status: response.status,
        statusText: response.statusText,
        url: url,
        data: await response.json().catch(() => null),
      };
      enhancedError.userMessage = `404 에러: 요청한 API 엔드포인트를 찾을 수 없습니다.\n\n요청 URL: ${url}\n\n백엔드 서버(localhost:8080)가 실행 중이고, 해당 엔드포인트가 올바르게 설정되어 있는지 확인해주세요.`;
      // health check용 엔드포인트는 콘솔에 에러를 출력하지 않음
      if (url && !url.includes("/health") && !url.includes("/actuator")) {
        console.error("[API Client] 404 Error - Requested URL:", url);
      }
      throw enhancedError;
    }

    // 503 Service Unavailable - 백엔드 서버가 실행되지 않음
    if (response.status === 503) {
      const enhancedError: any = new Error("백엔드 서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.");
      enhancedError.response = {
        status: response.status,
        statusText: response.statusText,
        data: await response.json().catch(() => null),
      };
      enhancedError.userMessage = enhancedError.message;
      throw enhancedError;
    }

    // 일반 에러
    const enhancedError: any = new Error(`HTTP ${response.status} ${response.statusText}`);
    enhancedError.response = {
      status: response.status,
      statusText: response.statusText,
      data: await response.json().catch(() => null),
    };
    throw enhancedError;
  }

  // GET 요청
  async get<T = any>(endpoint: string, options: RequestOptions = {}): Promise<{ data: T }> {
    try {
      const url = `${this.baseURL}${endpoint}`;
      const response = await this.fetchWithTimeout(
        url,
        {
          method: "GET",
          headers: this.getHeaders(),
          credentials: "include", // 쿠키 포함 (Spring Gateway 세션 관리용)
          ...options,
        },
        options.timeout || 10000
      );

      if (!response.ok) {
        await this.handleErrorResponse(response);
      }

      const contentType = response.headers.get("content-type");
      let data: T;
      
      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        data = (await response.text()) as unknown as T;
      }

      return { data };
    } catch (error: any) {
      if (error.response) {
        throw error;
      }
      // 네트워크 에러
      const enhancedError: any = new Error("네트워크 연결을 확인해주세요. 백엔드 서버(localhost:8080)가 실행 중인지 확인해주세요.");
      enhancedError.userMessage = enhancedError.message;
      enhancedError.code = "ECONNREFUSED";
      throw enhancedError;
    }
  }

  // POST 요청
  async post<T = any>(
    endpoint: string,
    body?: any,
    options: RequestOptions = {}
  ): Promise<{ data: T }> {
    try {
      const url = `${this.baseURL}${endpoint}`;
      console.log(`[API Client] POST Request: ${url}`, { body, baseURL: this.baseURL, endpoint });
      const response = await this.fetchWithTimeout(
        url,
        {
          method: "POST",
          headers: this.getHeaders(),
          credentials: "include", // 쿠키 포함
          body: body ? JSON.stringify(body) : undefined,
          ...options,
        },
        options.timeout || 10000
      );

      if (!response.ok) {
        await this.handleErrorResponse(response, url);
      }

      // 응답이 비어있을 수 있음
      const contentType = response.headers.get("content-type");
      let data: T;
      
      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        const text = await response.text();
        data = (text || null) as unknown as T;
      }

      return { data };
    } catch (error: any) {
      console.error(`[API Client] POST Error: ${this.baseURL}${endpoint}`, error);
      
      // 이미 handleErrorResponse에서 처리된 에러 (서버 응답이 있음)
      if (error.response) {
        throw error;
      }
      
      // AbortError는 타임아웃
      if (error.name === "AbortError") {
        const timeoutError: any = new Error("요청 시간이 초과되었습니다.");
        timeoutError.userMessage = timeoutError.message;
        timeoutError.code = "TIMEOUT";
        throw timeoutError;
      }
      
      // TypeError는 일반적으로 네트워크 연결 실패 또는 CORS 에러
      if (error instanceof TypeError) {
        // CORS 에러인지 확인
        if (error.message.includes("CORS") || error.message.includes("Failed to fetch")) {
          const corsError: any = new Error("CORS 오류가 발생했습니다. 백엔드 CORS 설정을 확인해주세요.");
          corsError.userMessage = corsError.message;
          corsError.code = "CORS_ERROR";
          throw corsError;
        }
        
        // 네트워크 연결 실패
        const networkError: any = new Error("네트워크 연결을 확인해주세요. 백엔드 서버(localhost:8080)가 실행 중인지 확인해주세요.");
        networkError.userMessage = networkError.message;
        networkError.code = "ECONNREFUSED";
        throw networkError;
      }
      
      // 기타 에러는 원본 메시지 사용
      const enhancedError: any = error;
      enhancedError.userMessage = error.message || "알 수 없는 오류가 발생했습니다.";
      throw enhancedError;
    }
  }

  // PUT 요청
  async put<T = any>(
    endpoint: string,
    body?: any,
    options: RequestOptions = {}
  ): Promise<{ data: T }> {
    try {
      const url = `${this.baseURL}${endpoint}`;
      const response = await this.fetchWithTimeout(
        url,
        {
          method: "PUT",
          headers: this.getHeaders(),
          credentials: "include",
          body: body ? JSON.stringify(body) : undefined,
          ...options,
        },
        options.timeout || 10000
      );

      if (!response.ok) {
        await this.handleErrorResponse(response);
      }

      const contentType = response.headers.get("content-type");
      let data: T;
      
      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        const text = await response.text();
        data = (text || null) as unknown as T;
      }

      return { data };
    } catch (error: any) {
      if (error.response) {
        throw error;
      }
      const enhancedError: any = new Error("네트워크 연결을 확인해주세요. 백엔드 서버(localhost:8080)가 실행 중인지 확인해주세요.");
      enhancedError.userMessage = enhancedError.message;
      enhancedError.code = "ECONNREFUSED";
      throw enhancedError;
    }
  }

  // DELETE 요청
  async delete<T = any>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<{ data: T }> {
    try {
      const url = `${this.baseURL}${endpoint}`;
      const response = await this.fetchWithTimeout(
        url,
        {
          method: "DELETE",
          headers: this.getHeaders(),
          credentials: "include",
          ...options,
        },
        options.timeout || 10000
      );

      if (!response.ok) {
        await this.handleErrorResponse(response);
      }

      const contentType = response.headers.get("content-type");
      let data: T;
      
      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        const text = await response.text();
        data = (text || null) as unknown as T;
      }

      return { data };
    } catch (error: any) {
      if (error.response) {
        throw error;
      }
      const enhancedError: any = new Error("네트워크 연결을 확인해주세요. 백엔드 서버(localhost:8080)가 실행 중인지 확인해주세요.");
      enhancedError.userMessage = enhancedError.message;
      enhancedError.code = "ECONNREFUSED";
      throw enhancedError;
    }
  }
}

// API 클라이언트 인스턴스 생성
export const apiClient = new ApiClient(API_BASE_URL);

export default apiClient;

