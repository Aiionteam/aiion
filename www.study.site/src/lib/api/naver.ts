import apiClient from "./client";

export interface NaverLoginResponse {
  success: boolean;
  message: string;
  token?: string;
  code?: string;
  access_token?: string;
  refresh_token?: string;
  user_info?: any;
}

export interface NaverUserInfo {
  id: string;
  nickname: string;
  email: string;
}

export interface NaverUserResponse {
  success: boolean;
  message: string;
  user?: NaverUserInfo;
}

/**
 * 네이버 로그인 API 함수들
 * 백엔드 NaverController와 연동
 */

export interface NaverLoginRequest {
  code?: string;
  accessToken?: string;
  [key: string]: any; // 추가 필드 허용
}

/**
 * 네이버 OAuth2 인증 URL 가져오기
 * 백엔드에서 안전하게 네이버 OAuth URL을 생성하여 반환
 * 보안: Client ID를 프론트엔드에 노출하지 않음
 */
export const getNaverAuthUrl = async (): Promise<string> => {
  try {
    // 백엔드에서 네이버 OAuth URL 가져오기
    const response = await apiClient.get<{ success?: boolean; auth_url?: string; message?: string }>("/api/naver/auth-url");
    
    if (response.data.success === false) {
      throw new Error(response.data.message || "네이버 로그인 URL을 가져오는데 실패했습니다.");
    }
    
    if (!response.data.auth_url) {
      throw new Error("네이버 로그인 URL을 받지 못했습니다.");
    }
    
    return response.data.auth_url;
  } catch (error: any) {
    console.error("[네이버 OAuth] URL 가져오기 실패:", error);
    
    if (error.message) {
      throw error;
    }
    
    throw new Error("네이버 로그인 URL을 가져오는데 실패했습니다.");
  }
};

// 네이버 로그인 (더 이상 사용하지 않음 - getNaverAuthUrl 사용)
// 백엔드 NaverController는 request body를 optional로 받으므로
// 빈 객체 또는 code, accessToken 등을 전달 가능
// 카카오와 동일한 패턴 사용: /api/naver/login
export const naverLogin = async (
  request?: NaverLoginRequest
): Promise<NaverLoginResponse> => {
  const response = await apiClient.post<NaverLoginResponse>(
    "/api/naver/login",
    request || {}
  );
  return response.data;
};

// 네이버 콜백 처리
// 카카오와 동일한 패턴 사용: /api/naver/callback
export const naverCallback = async (
  code?: string,
  error?: string,
  errorDescription?: string
): Promise<NaverLoginResponse> => {
  const params = new URLSearchParams();
  if (code) params.append("code", code);
  if (error) params.append("error", error);
  if (errorDescription) params.append("error_description", errorDescription);

  const response = await apiClient.get<NaverLoginResponse>(
    `/api/naver/callback?${params.toString()}`
  );
  return response.data;
};

// 네이버 토큰 교환
// Authorization Code로 JWT 토큰 교환
export const naverToken = async (
  code: string
): Promise<NaverLoginResponse> => {
  const response = await apiClient.post<NaverLoginResponse>(
    "/api/naver/token",
    { code }
  );
  return response.data;
};

// 네이버 사용자 정보 조회
// 카카오와 동일한 패턴 사용: /api/naver/user
export const naverUserInfo = async (): Promise<NaverUserResponse> => {
  const response = await apiClient.get<NaverUserResponse>("/api/naver/user");
  return response.data;
};

