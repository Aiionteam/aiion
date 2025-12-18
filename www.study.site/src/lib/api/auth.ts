import apiClient from "./client";

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  success?: boolean;
  token?: string;
  user?: {
    id: string;
    username: string;
    email?: string;
  };
  message?: string;
}

export interface SocialLoginRequest {
  code?: string;
  accessToken?: string;
}

// 일반 로그인
export const login = async (data: LoginRequest): Promise<LoginResponse> => {
  const response = await apiClient.post<LoginResponse>("/api/auth/login", data);
  return response.data;
};

// 카카오 로그인 (백엔드 KakaoController와 연동)
// request body는 optional이므로 빈 객체 또는 OAuth 코드/토큰 전달 가능
export const kakaoLogin = async (
  request?: { code?: string; accessToken?: string }
): Promise<LoginResponse> => {
  const response = await apiClient.post<LoginResponse>(
    "/api/kakao/login",
    request || {}
  );
  return response.data;
};

// 네이버 로그인 (백엔드 NaverController와 연동)
// request body는 optional이므로 빈 객체 또는 OAuth 코드/토큰 전달 가능
// 카카오와 동일한 패턴: /api/naver/login
export const naverLogin = async (
  request?: { code?: string; accessToken?: string }
): Promise<LoginResponse> => {
  const response = await apiClient.post<LoginResponse>(
    "/api/naver/login",
    request || {}
  );
  return response.data;
};

// 구글 로그인
export const googleLogin = async (
  data: SocialLoginRequest
): Promise<LoginResponse> => {
  const response = await apiClient.post<LoginResponse>(
    "/api/google/login",
    data
  );
  return response.data;
};

// 로그아웃
export const logout = async (): Promise<void> => {
  await apiClient.post("/api/auth/logout");
  if (typeof window !== "undefined") {
    localStorage.removeItem("token");
    localStorage.removeItem("refresh_token");
  }
};

// 토큰 저장
export const saveToken = (token: string): void => {
  if (typeof window !== "undefined") {
    localStorage.setItem("token", token);
  }
};

// 토큰 저장 (Access Token과 Refresh Token)
export const saveTokens = (accessToken: string, refreshToken?: string): void => {
  if (typeof window !== "undefined") {
    localStorage.setItem("token", accessToken);
    if (refreshToken) {
      localStorage.setItem("refresh_token", refreshToken);
    }
  }
};

// 토큰 가져오기
export const getToken = (): string | null => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("token");
  }
  return null;
};

// Refresh Token 가져오기
export const getRefreshToken = (): string | null => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("refresh_token");
  }
  return null;
};

// JWT 토큰에서 사용자 ID 추출
export const getUserIdFromToken = (): string | null => {
  if (typeof window === "undefined") return null;
  
  try {
    const token = getToken();
    if (!token) return null;
    
    // JWT 토큰은 .으로 구분된 3부분으로 구성: header.payload.signature
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    
    // payload 디코딩
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    
    const payload = JSON.parse(jsonPayload);
    
    // 사용자 ID 추출 (sub, userId, id 등 다양한 필드명 지원)
    return payload.sub || payload.userId || payload.id || payload.username || null;
  } catch (error) {
    console.error("[Auth] JWT 토큰 디코딩 실패:", error);
    return null;
  }
};

