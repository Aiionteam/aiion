import apiClient from "./client";

export interface KakaoLoginResponse {
  success: boolean;
  message: string;
  token?: string;
  code?: string;
  access_token?: string;
  refresh_token?: string;
  user_info?: any;
}

export interface KakaoUserInfo {
  id: string;
  nickname: string;
  email: string;
}

export interface KakaoUserResponse {
  success: boolean;
  message: string;
  user?: KakaoUserInfo;
}

/**
 * 카카오 로그인 API 함수들
 * 백엔드 KakaoController와 연동
 */

export interface KakaoLoginRequest {
  code?: string;
  accessToken?: string;
  [key: string]: any; // 추가 필드 허용
}

/**
 * 카카오 OAuth2 인증 URL 가져오기
 * 백엔드에서 안전하게 카카오 OAuth URL을 생성하여 반환
 * 보안: REST API KEY를 프론트엔드에 노출하지 않음
 */
export const getKakaoAuthUrl = async (): Promise<string> => {
  try {
    // 백엔드에서 카카오 OAuth URL 가져오기
    const response = await apiClient.get<{ success?: boolean; auth_url?: string; message?: string }>("/api/kakao/auth-url");
    
    if (response.data.success === false) {
      throw new Error(response.data.message || "카카오 로그인 URL을 가져오는데 실패했습니다.");
    }
    
    if (!response.data.auth_url) {
      throw new Error("카카오 로그인 URL을 받지 못했습니다.");
    }
    
    return response.data.auth_url;
  } catch (error: any) {
    console.error("[카카오 OAuth] URL 가져오기 실패:", error);
    
    if (error.message) {
      throw error;
    }
    
    throw new Error("카카오 로그인 URL을 가져오는데 실패했습니다.");
  }
};

// 카카오 로그인 (더 이상 사용하지 않음 - getKakaoAuthUrl 사용)
// 백엔드 KakaoController는 request body를 optional로 받으므로
// 빈 객체 또는 code, accessToken 등을 전달 가능
export const kakaoLogin = async (
  request?: KakaoLoginRequest
): Promise<KakaoLoginResponse> => {
  const response = await apiClient.post<KakaoLoginResponse>(
    "/api/kakao/login",
    request || {}
  );
  return response.data;
};

// 카카오 콜백 처리
export const kakaoCallback = async (
  code?: string,
  error?: string,
  errorDescription?: string
): Promise<KakaoLoginResponse> => {
  const params = new URLSearchParams();
  if (code) params.append("code", code);
  if (error) params.append("error", error);
  if (errorDescription) params.append("error_description", errorDescription);

  const response = await apiClient.get<KakaoLoginResponse>(
    `/api/kakao/callback?${params.toString()}`
  );
  return response.data;
};

// 카카오 토큰 교환
// Authorization Code로 JWT 토큰 교환
export const kakaoToken = async (
  code: string
): Promise<KakaoLoginResponse> => {
  const response = await apiClient.post<KakaoLoginResponse>(
    "/api/kakao/token",
    { code }
  );
  return response.data;
};

// 카카오 사용자 정보 조회
export const kakaoUserInfo = async (): Promise<KakaoUserResponse> => {
  const response = await apiClient.get<KakaoUserResponse>("/api/kakao/user");
  return response.data;
};

