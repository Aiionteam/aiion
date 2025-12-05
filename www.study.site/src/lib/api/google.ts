import apiClient from "./client";

export interface GoogleLoginResponse {
  success: boolean;
  message: string;
  token?: string;
  code?: string;
  access_token?: string;
  refresh_token?: string;
  user_info?: any;
}

export interface GoogleUserInfo {
  id: string;
  name: string;
  email: string;
  picture?: string;
}

export interface GoogleUserResponse {
  success: boolean;
  message: string;
  user?: GoogleUserInfo;
}

/**
 * 구글 로그인 API 함수들
 * 백엔드 GoogleController와 연동
 */

export interface GoogleLoginRequest {
  code?: string;
  accessToken?: string;
  [key: string]: any; // 추가 필드 허용
}

/**
 * 구글 OAuth2 인증 URL 가져오기
 * 백엔드에서 안전하게 구글 OAuth URL을 생성하여 반환
 * 보안: Client ID를 프론트엔드에 노출하지 않음
 */
export const getGoogleAuthUrl = async (): Promise<string> => {
  try {
    // 백엔드에서 구글 OAuth URL 가져오기
    const response = await apiClient.get<{ success?: boolean; auth_url?: string; message?: string }>("/api/google/auth-url");
    
    if (response.data.success === false) {
      throw new Error(response.data.message || "구글 로그인 URL을 가져오는데 실패했습니다.");
    }
    
    if (!response.data.auth_url) {
      throw new Error("구글 로그인 URL을 받지 못했습니다.");
    }
    
    return response.data.auth_url;
  } catch (error: any) {
    console.error("[구글 OAuth] URL 가져오기 실패:", error);
    
    if (error.message) {
      throw error;
    }
    
    throw new Error("구글 로그인 URL을 가져오는데 실패했습니다.");
  }
};

// 구글 로그인 (더 이상 사용하지 않음 - getGoogleAuthUrl 사용)
// 백엔드 GoogleController는 request body를 optional로 받으므로
// 빈 객체 또는 code, accessToken 등을 전달 가능
export const googleLogin = async (
  request?: GoogleLoginRequest
): Promise<GoogleLoginResponse> => {
  const response = await apiClient.post<GoogleLoginResponse>(
    "/api/google/login",
    request || {}
  );
  return response.data;
};

// 구글 콜백 처리
export const googleCallback = async (
  code?: string,
  error?: string,
  errorDescription?: string
): Promise<GoogleLoginResponse> => {
  const params = new URLSearchParams();
  if (code) params.append("code", code);
  if (error) params.append("error", error);
  if (errorDescription) params.append("error_description", errorDescription);

  const response = await apiClient.get<GoogleLoginResponse>(
    `/api/google/callback?${params.toString()}`
  );
  return response.data;
};

// 구글 토큰 교환
// Authorization Code로 JWT 토큰 교환
export const googleToken = async (
  code: string
): Promise<GoogleLoginResponse> => {
  const response = await apiClient.post<GoogleLoginResponse>(
    "/api/google/token",
    { code }
  );
  return response.data;
};

// 구글 사용자 정보 조회
export const googleUserInfo = async (): Promise<GoogleUserResponse> => {
  const response = await apiClient.get<GoogleUserResponse>("/api/google/user");
  return response.data;
};

