/**
 * 백엔드 연결 상태 체크 API
 */
import apiClient from "./client";
import chatApiClient from "./chatClient";

export interface HealthCheckResult {
  name: string;
  url: string;
  status: "success" | "error" | "checking";
  message: string;
  responseTime?: number;
  error?: string;
}

/**
 * 게이트웨이 헬스체크
 */
export async function checkGatewayHealth(): Promise<HealthCheckResult> {
  const startTime = Date.now();
  const url = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"}/actuator/health`;
  
  try {
    const response = await fetch(url, {
      method: "GET",
      credentials: "include",
      signal: AbortSignal.timeout(5000), // 5초 타임아웃
    });
    
    const responseTime = Date.now() - startTime;
    
    if (response.ok) {
      const data = await response.json().catch(() => ({}));
      return {
        name: "API Gateway",
        url: url,
        status: "success",
        message: `연결 성공 (${responseTime}ms)`,
        responseTime,
      };
    } else {
      return {
        name: "API Gateway",
        url: url,
        status: "error",
        message: `HTTP ${response.status}: ${response.statusText}`,
        error: `Status ${response.status}`,
      };
    }
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    return {
      name: "API Gateway",
      url: url,
      status: "error",
      message: error.message || "연결 실패",
      error: error.message,
      responseTime,
    };
  }
}

/**
 * 게이트웨이 정보 확인
 */
export async function checkGatewayInfo(): Promise<HealthCheckResult> {
  const startTime = Date.now();
  const url = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"}/actuator/gateway/routes`;
  
  try {
    const response = await fetch(url, {
      method: "GET",
      credentials: "include",
      signal: AbortSignal.timeout(5000),
    });
    
    const responseTime = Date.now() - startTime;
    
    if (response.ok) {
      const data = await response.json().catch(() => ({}));
      const routes = Array.isArray(data) ? data : [];
      return {
        name: "Gateway Routes",
        url: url,
        status: "success",
        message: `${routes.length}개의 라우트 확인됨 (${responseTime}ms)`,
        responseTime,
      };
    } else {
      return {
        name: "Gateway Routes",
        url: url,
        status: "error",
        message: `HTTP ${response.status}: ${response.statusText}`,
        error: `Status ${response.status}`,
      };
    }
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    return {
      name: "Gateway Routes",
      url: url,
      status: "error",
      message: error.message || "연결 실패",
      error: error.message,
      responseTime,
    };
  }
}

/**
 * 챗봇 서비스 헬스체크 (비활성화됨 - 로그 방지)
 */
export async function checkChatbotHealth(): Promise<HealthCheckResult> {
  // 헬스체크 비활성화 - 항상 성공 반환 (로그 방지)
  return {
    name: "Chatbot Service",
    url: "",
    status: "success",
    message: "헬스체크 비활성화됨",
    responseTime: 0,
  };
  
  /* 비활성화된 코드
  const startTime = Date.now();
  const baseUrl = process.env.NEXT_PUBLIC_CHAT_API_URL || "http://localhost:8080";
  const url = `${baseUrl}/chatbot/health`;
  
  try {
    const response = await fetch(url, {
      method: "GET",
      credentials: "include",
      signal: AbortSignal.timeout(5000),
    });
    
    const responseTime = Date.now() - startTime;
    
    if (response.ok) {
      return {
        name: "Chatbot Service",
        url: url,
        status: "success",
        message: `연결 성공 (${responseTime}ms)`,
        responseTime,
      };
    } else {
      return {
        name: "Chatbot Service",
        url: url,
        status: "error",
        message: `HTTP ${response.status}: ${response.statusText}`,
        error: `Status ${response.status}`,
      };
    }
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    return {
      name: "Chatbot Service",
      url: url,
      status: "error",
      message: error.message || "연결 실패",
      error: error.message,
      responseTime,
    };
  }
  */
}

/**
 * 기상청 서비스 헬스체크
 */
export async function checkWeatherHealth(): Promise<HealthCheckResult> {
  const startTime = Date.now();
  
  try {
    const response = await chatApiClient.get("/weather/health");
    const responseTime = Date.now() - startTime;
    
    return {
      name: "Weather Service",
      url: `${process.env.NEXT_PUBLIC_CHAT_API_URL || "http://localhost:8080"}/weather/health`,
      status: "success",
      message: `연결 성공 (${responseTime}ms)`,
      responseTime,
    };
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    return {
      name: "Weather Service",
      url: `${process.env.NEXT_PUBLIC_CHAT_API_URL || "http://localhost:8080"}/weather/health`,
      status: "error",
      message: error.message || "연결 실패",
      error: error.message,
      responseTime,
    };
  }
}

/**
 * 모든 서비스 연결 상태 확인
 */
export async function checkAllServices(): Promise<HealthCheckResult[]> {
  const results = await Promise.all([
    checkGatewayHealth(),
    checkGatewayInfo(),
    checkChatbotHealth(),
    checkWeatherHealth(),
  ]);
  
  return results;
}

