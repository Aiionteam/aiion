// AI 챗봇 API Base URL - 환경 변수 또는 기본값 (게이트웨이를 통해 접근)
const CHAT_API_BASE_URL =
  process.env.NEXT_PUBLIC_CHAT_API_URL || "http://localhost:8080";

// API Base URL 확인 로그 (개발 환경에서만)
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  console.log(`[Chat API Client] Base URL: ${CHAT_API_BASE_URL}`);
  console.log(`[Chat API Client] NEXT_PUBLIC_CHAT_API_URL: ${process.env.NEXT_PUBLIC_CHAT_API_URL || "(not set, using default)"}`);
}

// Request Options 타입
interface RequestOptions extends RequestInit {
  timeout?: number;
  [key: string]: any; // 추가 옵션 허용
}

// Fetch API를 사용한 HTTP 클라이언트 (AI 챗봇용)
class ChatApiClient {
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
    timeout: number = 30000 // 챗봇은 응답이 길 수 있으므로 30초로 설정
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
      // AbortError는 타임아웃
      if (error.name === "AbortError") {
        const timeoutError: any = new Error("요청 시간이 초과되었습니다.");
        timeoutError.name = "AbortError";
        throw timeoutError;
      }
      // 그 외의 에러는 그대로 전달 (POST 메서드에서 처리)
      throw error;
    }
  }

  // 에러 처리
  private async handleErrorResponse(response: Response, requestedUrl?: string): Promise<never> {
    let errorData: any = null;
    try {
      errorData = await response.json();
    } catch {
      // JSON 파싱 실패 시 무시
    }

    // 404 Not Found
    if (response.status === 404) {
      const url = requestedUrl || response.url || "unknown";
      const enhancedError: any = new Error("요청한 엔드포인트를 찾을 수 없습니다. 챗봇 서버 설정을 확인해주세요.");
      enhancedError.response = {
        status: response.status,
        statusText: response.statusText,
        url: url,
        data: errorData,
      };
      enhancedError.userMessage = `404 에러: 요청한 API 엔드포인트를 찾을 수 없습니다.\n\n요청 URL: ${url}\n\n챗봇 서버(localhost:9000)가 실행 중이고, 해당 엔드포인트가 올바르게 설정되어 있는지 확인해주세요.`;
      throw enhancedError;
    }

    // 503 Service Unavailable
    if (response.status === 503) {
      const enhancedError: any = new Error("챗봇 서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.");
      enhancedError.response = {
        status: response.status,
        statusText: response.statusText,
        data: errorData,
      };
      enhancedError.userMessage = enhancedError.message;
      throw enhancedError;
    }

    // OpenAI API 에러 처리 (500 또는 기타 에러)
    if (errorData?.detail) {
      const detail = errorData.detail;
      
      // OpenAI API 할당량 초과 에러
      if (typeof detail === 'string' && detail.includes('insufficient_quota') || 
          detail.includes('quota') || 
          detail.includes('exceeded your current quota')) {
        const quotaError: any = new Error("OpenAI API 할당량이 초과되었습니다.");
        quotaError.userMessage = "OpenAI API 사용 할당량이 초과되었습니다.\n\n관리자에게 문의하여 API 할당량을 확인하거나 결제 정보를 업데이트해주세요.\n\n자세한 정보: https://platform.openai.com/account/billing";
        quotaError.code = "OPENAI_QUOTA_EXCEEDED";
        quotaError.response = {
          status: response.status,
          statusText: response.statusText,
          data: errorData,
        };
        throw quotaError;
      }

      // OpenAI API 키 에러
      if (typeof detail === 'string' && detail.includes('API key') || 
          detail.includes('OpenAI API key not configured')) {
        const apiKeyError: any = new Error("OpenAI API 키가 설정되지 않았습니다.");
        apiKeyError.userMessage = "OpenAI API 키가 설정되지 않았습니다.\n\n관리자에게 문의하여 API 키 설정을 확인해주세요.";
        apiKeyError.code = "OPENAI_API_KEY_MISSING";
        apiKeyError.response = {
          status: response.status,
          statusText: response.statusText,
          data: errorData,
        };
        throw apiKeyError;
      }

      // 기타 OpenAI 에러
      if (typeof detail === 'string' && detail.includes('OpenAI')) {
        const openaiError: any = new Error("OpenAI API 오류가 발생했습니다.");
        openaiError.userMessage = `OpenAI API 오류가 발생했습니다.\n\n${detail}\n\n잠시 후 다시 시도해주세요.`;
        openaiError.code = "OPENAI_ERROR";
        openaiError.response = {
          status: response.status,
          statusText: response.statusText,
          data: errorData,
        };
        throw openaiError;
      }

      // 일반 에러 (detail이 문자열인 경우)
      if (typeof detail === 'string') {
        const enhancedError: any = new Error(detail);
        enhancedError.userMessage = detail;
        enhancedError.response = {
          status: response.status,
          statusText: response.statusText,
          data: errorData,
        };
        throw enhancedError;
      }
    }

    // 일반 에러
    const enhancedError: any = new Error(`HTTP ${response.status} ${response.statusText}`);
    enhancedError.response = {
      status: response.status,
      statusText: response.statusText,
      data: errorData,
    };
    enhancedError.userMessage = `서버 오류가 발생했습니다. (${response.status})\n\n잠시 후 다시 시도해주세요.`;
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
          credentials: "include",
          ...options,
        },
        options.timeout || 30000
      );

      // health check는 404도 정상으로 처리 (엔드포인트가 없을 수 있음)
      const isHealthCheck = endpoint.includes("/health") || endpoint === "/chatbot/chat";
      
      if (!response.ok) {
        // health check가 아니면 에러 처리
        if (!isHealthCheck) {
          await this.handleErrorResponse(response);
        } else {
          // health check는 실패해도 에러를 던지지 않음
          throw new Error("Health check failed");
        }
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
      // health check는 조용히 실패 처리
      const isHealthCheck = endpoint.includes("/health") || endpoint === "/chatbot/chat";
      if (isHealthCheck) {
        // health check 실패는 false를 반환하도록 에러를 다시 던짐
        throw error;
      }
      
      if (error.response) {
        throw error;
      }
      const enhancedError: any = new Error("네트워크 연결을 확인해주세요. 챗봇 서버(localhost:9000)가 실행 중인지 확인해주세요.");
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
    const url = `${this.baseURL}${endpoint}`;
    
    // 개발 환경에서 요청 정보 로그
    if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
      console.log(`[Chat API Client] POST Request:`, {
        url,
        baseURL: this.baseURL,
        endpoint,
        body,
      });
    }
    
    try {
      const response = await this.fetchWithTimeout(
        url,
        {
          method: "POST",
          headers: this.getHeaders(),
          credentials: "include",
          body: body ? JSON.stringify(body) : undefined,
          ...options,
        },
        options.timeout || 30000
      );

      if (!response.ok) {
        await this.handleErrorResponse(response, url);
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
      // 상세한 에러 로그
      console.error(`[Chat API Client] POST Error:`, {
        url,
        baseURL: this.baseURL,
        endpoint,
        error: error.message || error,
        errorName: error.name,
        errorType: error.constructor.name,
      });
      
      // 이미 handleErrorResponse에서 처리된 에러 (서버 응답이 있음)
      if (error.response) {
        throw error;
      }
      
      // AbortError는 타임아웃
      if (error.name === "AbortError") {
        const timeoutError: any = new Error("요청 시간이 초과되었습니다. (30초)");
        timeoutError.userMessage = "응답 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.";
        timeoutError.code = "TIMEOUT";
        timeoutError.url = url;
        throw timeoutError;
      }
      
      // TypeError는 일반적으로 네트워크 연결 실패 또는 CORS 에러
      if (error instanceof TypeError) {
        // "Failed to fetch"는 일반적으로 서버가 실행되지 않았거나 CORS 문제
        if (error.message.includes("Failed to fetch") || error.message.includes("NetworkError")) {
          // 서버 연결 확인을 위한 더 구체적인 메시지
          const networkError: any = new Error("서버에 연결할 수 없습니다.");
          networkError.userMessage = `챗봇 서버에 연결할 수 없습니다.\n\n확인 사항:\n1. 챗봇 서버가 http://localhost:9000 에서 실행 중인지 확인\n2. 브라우저 콘솔에서 CORS 에러가 있는지 확인\n3. 네트워크 연결을 확인해주세요\n\n요청 URL: ${url}`;
          networkError.code = "ECONNREFUSED";
          networkError.url = url;
          networkError.originalError = error.message;
          throw networkError;
        }
        
        // CORS 에러
        if (error.message.includes("CORS")) {
          const corsError: any = new Error("CORS 오류가 발생했습니다.");
          corsError.userMessage = `CORS 오류가 발생했습니다.\n\n백엔드 챗봇 서버에서 다음 origin을 허용하도록 설정해주세요:\n- http://localhost:3000\n\n요청 URL: ${url}`;
          corsError.code = "CORS_ERROR";
          corsError.url = url;
          throw corsError;
        }
        
        // 기타 네트워크 에러
        const networkError: any = new Error("네트워크 연결을 확인해주세요.");
        networkError.userMessage = `네트워크 연결을 확인해주세요. 챗봇 서버(localhost:9000)가 실행 중인지 확인해주세요.\n\n요청 URL: ${url}`;
        networkError.code = "ECONNREFUSED";
        networkError.url = url;
        throw networkError;
      }
      
      // 기타 에러는 원본 메시지 사용
      const enhancedError: any = error;
      enhancedError.userMessage = error.userMessage || error.message || "알 수 없는 오류가 발생했습니다.";
      enhancedError.url = url;
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
        options.timeout || 30000
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
      const enhancedError: any = new Error("네트워크 연결을 확인해주세요. 챗봇 서버(localhost:9000)가 실행 중인지 확인해주세요.");
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
        options.timeout || 30000
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
      const enhancedError: any = new Error("네트워크 연결을 확인해주세요. 챗봇 서버(localhost:9000)가 실행 중인지 확인해주세요.");
      enhancedError.userMessage = enhancedError.message;
      enhancedError.code = "ECONNREFUSED";
      throw enhancedError;
    }
  }
}

// AI 챗봇 API 클라이언트 인스턴스 생성
export const chatApiClient = new ChatApiClient(CHAT_API_BASE_URL);

export default chatApiClient;

