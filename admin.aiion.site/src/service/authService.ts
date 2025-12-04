// 인증 서비스 API 호출 함수

export interface LoginRequest {
  username: string; // 사용자명 또는 이메일
  password: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in: number;
}

export interface UserResponse {
  id: number;
  username: string;
  email: string;
  full_name?: string;
  is_active: boolean;
  is_superuser: boolean;
  created_at: string;
  updated_at: string;
}

// API Gateway URL 가져오기
const getGatewayUrl = () => {
  return process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:8080';
};

// 인증 토큰 가져오기
const getAuthToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('access_token');
  }
  return null;
};

// API 요청 헤더 생성
const getHeaders = (): HeadersInit => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
};

/**
 * 로그인
 */
export async function login(credentials: LoginRequest): Promise<TokenResponse> {
  try {
    const gatewayUrl = getGatewayUrl();
    
    // OAuth2PasswordRequestForm 형식으로 변환 (FormData)
    const formData = new FormData();
    formData.append('username', credentials.username);
    formData.append('password', credentials.password);
    
    const response = await fetch(`${gatewayUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        // FormData를 사용할 때는 Content-Type을 설정하지 않음 (브라우저가 자동 설정)
      },
      credentials: 'include',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = '로그인에 실패했습니다.';
      
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.detail || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }
      
      throw new Error(errorMessage);
    }

    const data: TokenResponse = await response.json();
    return data;
  } catch (error) {
    console.error('로그인 오류:', error);
    throw error;
  }
}

/**
 * 현재 사용자 정보 조회
 */
export async function getCurrentUser(): Promise<UserResponse> {
  try {
    const gatewayUrl = getGatewayUrl();
    const response = await fetch(`${gatewayUrl}/api/auth/me`, {
      method: 'GET',
      headers: getHeaders(),
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`사용자 정보 조회 실패: ${response.statusText}`);
    }

    const data: UserResponse = await response.json();
    return data;
  } catch (error) {
    console.error('사용자 정보 조회 오류:', error);
    throw error;
  }
}

/**
 * 로그아웃
 */
export async function logout(): Promise<void> {
  try {
    const gatewayUrl = getGatewayUrl();
    const response = await fetch(`${gatewayUrl}/api/auth/logout`, {
      method: 'POST',
      headers: getHeaders(),
      credentials: 'include',
    });

    // 204 No Content는 정상 응답
    if (!response.ok && response.status !== 204) {
      throw new Error(`로그아웃 실패: ${response.statusText}`);
    }
  } catch (error) {
    console.error('로그아웃 오류:', error);
    // 로그아웃 실패해도 로컬 토큰은 제거
    throw error;
  }
}

/**
 * 회원가입
 */
export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  full_name?: string;
}

export async function register(userData: RegisterRequest): Promise<UserResponse> {
  try {
    const gatewayUrl = getGatewayUrl();
    const response = await fetch(`${gatewayUrl}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = '회원가입에 실패했습니다.';
      
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.detail || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }
      
      throw new Error(errorMessage);
    }

    const data: UserResponse = await response.json();
    return data;
  } catch (error) {
    console.error('회원가입 오류:', error);
    throw error;
  }
}

