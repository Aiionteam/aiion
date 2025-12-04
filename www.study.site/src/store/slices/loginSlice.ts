import { create } from "zustand";
import * as authAPI from "@/lib/api/auth";

type LoadingType = "login" | "google" | "kakao" | "naver" | "logout" | null;

interface LoginState {
  // 상태
  username: string;
  password: string;
  rememberMe: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  loadingType: LoadingType;
  error: string | null;
  
  // 동기 액션
  setUsername: (username: string) => void;
  setPassword: (password: string) => void;
  setRememberMe: (rememberMe: boolean) => void;
  setAuthenticated: (isAuthenticated: boolean) => void;
  setLoadingType: (loadingType: LoadingType) => void;
  clearError: () => void;
  reset: () => void;
  restoreAuthState: () => void;
  
  // 비동기 액션
  handleLogin: () => Promise<void>;
  handleGoogleLogin: () => Promise<void>;
  handleKakaoLogin: () => Promise<void>;
  handleNaverLogin: () => Promise<void>;
  logout: () => Promise<void>;
}

// 초기 상태는 서버와 클라이언트에서 동일하게 설정 (hydration mismatch 방지)
const initialState = {
  username: "",
  password: "",
  rememberMe: false,
  isAuthenticated: false, // 항상 false로 시작 (클라이언트에서 복원)
  isLoading: false,
  loadingType: null as LoadingType, // 항상 null로 시작 (클라이언트에서 복원)
  error: null,
};

export const useLoginStore = create<LoginState>((set, get) => ({
  ...initialState,
  
  // 동기 액션
  setUsername: (username: string) => set({ username, error: null }),
  setPassword: (password: string) => set({ password, error: null }),
  setRememberMe: (rememberMe: boolean) => set({ rememberMe }),
  setAuthenticated: (isAuthenticated: boolean) => set({ isAuthenticated }),
  setLoadingType: (loadingType: LoadingType) => set({ loadingType }),
  clearError: () => set({ error: null }),
  reset: () => set(initialState),
  
  // 클라이언트에서 인증 상태 복원 (hydration 후 실행)
  restoreAuthState: () => {
    if (typeof window !== "undefined") {
      // localStorage에 토큰이 있으면 로그인 상태로 복원
      const token = localStorage.getItem("token");
      const storedLoadingType = sessionStorage.getItem("loadingType");
      const stored = sessionStorage.getItem("isAuthenticated");
      
      // 토큰이 있거나 sessionStorage에 로그인 상태가 있으면 복원
      if (token || stored === "true") {
        const loadingTypeValue = storedLoadingType && 
          (storedLoadingType === "login" || storedLoadingType === "google" || 
           storedLoadingType === "kakao" || storedLoadingType === "naver") 
          ? storedLoadingType as LoadingType 
          : null;
        
        set({ 
          isAuthenticated: true, 
          loadingType: loadingTypeValue 
        });
      }
    }
  },
  
  // 비동기 액션 - Flux 패턴: 상태 업데이트는 set()을 통해서만
  handleLogin: async () => {
    const state = get();
    
    // 이미 로딩 중이면 중복 요청 방지
    if (state.isLoading) return;
    
    // 로딩 시작
    set({ isLoading: true, loadingType: "login", error: null });
    
    try {
      const response = await authAPI.login({
        username: state.username,
        password: state.password,
      });
      
      // 토큰 저장
      if (response.token) {
        authAPI.saveToken(response.token);
      }
      
      // 로그인 성공 - 상태 업데이트
      set({ 
        isAuthenticated: true, 
        isLoading: false, 
        loadingType: null,
        error: null 
      });
      
      // 페이지 이동
      if (typeof window !== "undefined") {
        window.location.href = "/home";
      }
    } catch (error: any) {
      console.error("Login error:", error);
      
      let errorMessage = "로그인에 실패했습니다.";
      
      // 503 에러 또는 연결 실패
      if (error.response?.status === 503 || error.code === "ECONNREFUSED" || error.userMessage) {
        errorMessage = error.userMessage || "백엔드 서버에 연결할 수 없습니다.\n\n백엔드 서버(localhost:8080)가 실행 중인지 확인해주세요.";
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      // 에러 상태 업데이트
      set({ 
        isLoading: false, 
        loadingType: null, 
        error: errorMessage 
      });
      
      alert(errorMessage);
    }
  },
  handleGoogleLogin: async () => {
    const state = get();
    
    // 이미 로딩 중이면 중복 요청 방지
    if (state.isLoading) return;
    
    // 로딩 시작
    set({ isLoading: true, loadingType: "google", error: null });
    
    try {
      // 백엔드에서 구글 OAuth2 인증 URL 가져오기
      const { getGoogleAuthUrlService } = await import("@/service");
      const googleAuthUrl = await getGoogleAuthUrlService();
      
      if (typeof window === "undefined") return;
      
      // 팝업 창 열기
      const width = 500;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      
      const popup = window.open(
        googleAuthUrl,
        "google-login",
        `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
      );
      
      if (!popup) {
        set({ isLoading: false, loadingType: null, error: "팝업이 차단되었습니다. 팝업 차단을 해제해주세요." });
        alert("팝업이 차단되었습니다. 팝업 차단을 해제해주세요.");
        return;
      }
      
      // Callback 페이지에서 메시지 수신 대기
      const messageListener = async (event: MessageEvent) => {
        // 보안: 같은 origin에서 온 메시지만 처리
        if (event.origin !== window.location.origin) {
          return;
        }
        
        if (event.data.type === "OAUTH_LOGIN_SUCCESS") {
          const { token, refresh_token, provider } = event.data;
          
          try {
            // JWT 토큰 저장
            if (token) {
              const { saveTokens } = await import("@/lib/api/auth");
              saveTokens(token, refresh_token);
            }
            
            // 로그인 상태 업데이트
            set({
              isAuthenticated: true,
              isLoading: false,
              loadingType: provider || "google",
              error: null,
            });
            
            // sessionStorage에 로그인 상태 저장
            if (typeof window !== "undefined") {
              sessionStorage.setItem("isAuthenticated", "true");
              sessionStorage.setItem("loadingType", provider || "google");
            }
            
            // 팝업 닫기 (아직 열려있으면)
            if (popup && !popup.closed) {
              popup.close();
            }
            window.removeEventListener("message", messageListener);
            
            // 블로그로 이동
            if (typeof window !== "undefined") {
              window.location.href = "/home";
            }
          } catch (tokenError: any) {
            console.error("[구글 로그인] 토큰 처리 실패:", tokenError);
            let errorMsg = "토큰 처리에 실패했습니다.";
            
            if (tokenError.userMessage) {
              errorMsg = tokenError.userMessage;
            } else if (tokenError.response?.data?.message) {
              errorMsg = tokenError.response.data.message;
            } else if (tokenError.message) {
              errorMsg = tokenError.message;
            }
            
            set({
              isLoading: false,
              loadingType: null,
              error: errorMsg,
            });
            
            alert("로그인 실패: " + errorMsg);
            if (popup && !popup.closed) {
              popup.close();
            }
            window.removeEventListener("message", messageListener);
          }
        }
        
        if (event.data.type === "OAUTH_LOGIN_ERROR") {
          const errorMsg = event.data.error || "구글 로그인에 실패했습니다.";
          set({
            isLoading: false,
            loadingType: null,
            error: errorMsg,
          });
          alert("로그인 실패: " + errorMsg);
          if (popup && !popup.closed) {
            popup.close();
          }
          window.removeEventListener("message", messageListener);
        }
      };
      
      window.addEventListener("message", messageListener);
      
      // 팝업이 닫혔는지 확인
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          window.removeEventListener("message", messageListener);
          set({ isLoading: false, loadingType: null });
        }
      }, 1000);
      
    } catch (error: any) {
      console.error("Google login error:", error);
      
      let errorMessage = "구글 로그인에 실패했습니다.";
      
      if (error.message) {
        errorMessage = error.message;
      }
      
      set({ 
        isLoading: false, 
        loadingType: null, 
        error: errorMessage 
      });
      
      alert(errorMessage);
    }
  },
  handleKakaoLogin: async () => {
    const state = get();
    
    // 이미 로딩 중이면 중복 요청 방지
    if (state.isLoading) return;
    
    // 로딩 시작
    set({ isLoading: true, loadingType: "kakao", error: null });
    
    try {
      // 백엔드에서 카카오 OAuth2 인증 URL 가져오기
      const { getKakaoAuthUrlService } = await import("@/service");
      const kakaoAuthUrl = await getKakaoAuthUrlService();
      
      if (typeof window === "undefined") return;
      
      // 팝업 창 열기
      const width = 500;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      
      const popup = window.open(
        kakaoAuthUrl,
        "kakao-login",
        `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
      );
      
      if (!popup) {
        set({ isLoading: false, loadingType: null, error: "팝업이 차단되었습니다. 팝업 차단을 해제해주세요." });
        alert("팝업이 차단되었습니다. 팝업 차단을 해제해주세요.");
        return;
      }
      
      // Callback 페이지에서 메시지 수신 대기
      const messageListener = async (event: MessageEvent) => {
        // 보안: 같은 origin에서 온 메시지만 처리
        if (event.origin !== window.location.origin) {
          return;
        }
        
        if (event.data.type === "OAUTH_LOGIN_SUCCESS") {
          const { token, refresh_token, provider } = event.data;
          
          try {
            // JWT 토큰 저장
            if (token) {
              const { saveTokens } = await import("@/lib/api/auth");
              saveTokens(token, refresh_token);
            }
            
            // 로그인 상태 업데이트
            set({
              isAuthenticated: true,
              isLoading: false,
              loadingType: provider || "kakao",
              error: null,
            });
            
            // sessionStorage에 로그인 상태 저장
            if (typeof window !== "undefined") {
              sessionStorage.setItem("isAuthenticated", "true");
              sessionStorage.setItem("loadingType", provider || "kakao");
            }
            
            // 팝업 닫기 (아직 열려있으면)
            if (popup && !popup.closed) {
              popup.close();
            }
            window.removeEventListener("message", messageListener);
            
            // 블로그로 이동
            if (typeof window !== "undefined") {
              window.location.href = "/home";
            }
          } catch (tokenError: any) {
            console.error("[카카오 로그인] 토큰 처리 실패:", tokenError);
            let errorMsg = "토큰 처리에 실패했습니다.";
            
            if (tokenError.userMessage) {
              errorMsg = tokenError.userMessage;
            } else if (tokenError.response?.data?.message) {
              errorMsg = tokenError.response.data.message;
            } else if (tokenError.message) {
              errorMsg = tokenError.message;
            }
            
            set({
              isLoading: false,
              loadingType: null,
              error: errorMsg,
            });
            
            alert("로그인 실패: " + errorMsg);
            if (popup && !popup.closed) {
              popup.close();
            }
            window.removeEventListener("message", messageListener);
          }
        }
        
        if (event.data.type === "OAUTH_LOGIN_ERROR") {
          const errorMsg = event.data.error || "카카오 로그인에 실패했습니다.";
          set({
            isLoading: false,
            loadingType: null,
            error: errorMsg,
          });
          alert("로그인 실패: " + errorMsg);
          if (popup && !popup.closed) {
            popup.close();
          }
          window.removeEventListener("message", messageListener);
        }
      };
      
      window.addEventListener("message", messageListener);
      
      // 팝업이 닫혔는지 확인
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          window.removeEventListener("message", messageListener);
          set({ isLoading: false, loadingType: null });
        }
      }, 1000);
      
    } catch (error: any) {
      console.error("Kakao login error:", error);
      
      let errorMessage = "카카오 로그인에 실패했습니다.";
      
      if (error.message) {
        errorMessage = error.message;
      }
      
      set({ 
        isLoading: false, 
        loadingType: null, 
        error: errorMessage 
      });
      
      alert(errorMessage);
    }
  },
  handleNaverLogin: async () => {
    const state = get();
    
    // 이미 로딩 중이면 중복 요청 방지
    if (state.isLoading) return;
    
    // 로딩 시작
    set({ isLoading: true, loadingType: "naver", error: null });
    
    try {
      // 백엔드에서 네이버 OAuth2 인증 URL 가져오기
      const { getNaverAuthUrlService } = await import("@/service");
      const naverAuthUrl = await getNaverAuthUrlService();
      
      if (typeof window === "undefined") return;
      
      // 팝업 창 열기
      const width = 500;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      
      const popup = window.open(
        naverAuthUrl,
        "naver-login",
        `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
      );
      
      if (!popup) {
        set({ isLoading: false, loadingType: null, error: "팝업이 차단되었습니다. 팝업 차단을 해제해주세요." });
        alert("팝업이 차단되었습니다. 팝업 차단을 해제해주세요.");
        return;
      }
      
      // Callback 페이지에서 메시지 수신 대기
      const messageListener = async (event: MessageEvent) => {
        // 보안: 같은 origin에서 온 메시지만 처리
        if (event.origin !== window.location.origin) {
          return;
        }
        
        if (event.data.type === "OAUTH_LOGIN_SUCCESS") {
          const { token, refresh_token, provider } = event.data;
          
          try {
            // JWT 토큰 저장
            if (token) {
              const { saveTokens } = await import("@/lib/api/auth");
              saveTokens(token, refresh_token);
            }
            
            // 로그인 상태 업데이트
            set({
              isAuthenticated: true,
              isLoading: false,
              loadingType: provider || "naver",
              error: null,
            });
            
            // sessionStorage에 로그인 상태 저장
            if (typeof window !== "undefined") {
              sessionStorage.setItem("isAuthenticated", "true");
              sessionStorage.setItem("loadingType", provider || "naver");
            }
            
            // 팝업 닫기 (아직 열려있으면)
            if (popup && !popup.closed) {
              popup.close();
            }
            window.removeEventListener("message", messageListener);
            
            // 블로그로 이동
            if (typeof window !== "undefined") {
              window.location.href = "/home";
            }
          } catch (tokenError: any) {
            console.error("[네이버 로그인] 토큰 처리 실패:", tokenError);
            let errorMsg = "토큰 처리에 실패했습니다.";
            
            if (tokenError.userMessage) {
              errorMsg = tokenError.userMessage;
            } else if (tokenError.response?.data?.message) {
              errorMsg = tokenError.response.data.message;
            } else if (tokenError.message) {
              errorMsg = tokenError.message;
            }
            
            set({
              isLoading: false,
              loadingType: null,
              error: errorMsg,
            });
            
            alert("로그인 실패: " + errorMsg);
            if (popup && !popup.closed) {
              popup.close();
            }
            window.removeEventListener("message", messageListener);
          }
        }
        
        if (event.data.type === "OAUTH_LOGIN_ERROR") {
          const errorMsg = event.data.error || "네이버 로그인에 실패했습니다.";
          set({
            isLoading: false,
            loadingType: null,
            error: errorMsg,
          });
          alert("로그인 실패: " + errorMsg);
          if (popup && !popup.closed) {
            popup.close();
          }
          window.removeEventListener("message", messageListener);
        }
      };
      
      window.addEventListener("message", messageListener);
      
      // 팝업이 닫혔는지 확인
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          window.removeEventListener("message", messageListener);
          set({ isLoading: false, loadingType: null });
        }
      }, 1000);
      
    } catch (error: any) {
      console.error("Naver login error:", error);
      
      let errorMessage = "네이버 로그인에 실패했습니다.";
      
      if (error.message) {
        errorMessage = error.message;
      }
      
      set({ 
        isLoading: false, 
        loadingType: null, 
        error: errorMessage 
      });
      
      alert(errorMessage);
    }
  },
  
  logout: async () => {
    const state = get();
    
    // 이미 로딩 중이면 중복 요청 방지
    if (state.isLoading) return;
    
    // 로딩 시작
    set({ isLoading: true, loadingType: "logout", error: null });
    
    try {
      // 백엔드에 로그아웃 요청
      await authAPI.logout();
      
      // 로그아웃 성공 - 상태 초기화
      set({ 
        ...initialState,
        isAuthenticated: false,
        isLoading: false,
        loadingType: null 
      });
      
      // 모든 저장소에서 인증 정보 제거
      if (typeof window !== "undefined") {
        // localStorage에서 토큰 제거
        localStorage.removeItem("token");
        localStorage.removeItem("refresh_token");
        // sessionStorage에서 로그인 상태 제거
        sessionStorage.removeItem("isAuthenticated");
        sessionStorage.removeItem("loadingType");
      }
      
      // 로그인 페이지로 이동
      if (typeof window !== "undefined") {
        window.location.href = "/";
      }
    } catch (error: any) {
      console.error("Logout error:", error);
      
      // 에러가 발생해도 로컬 상태는 정리 (백엔드 연결 실패 시에도 로그아웃 처리)
      set({ 
        ...initialState,
        isAuthenticated: false,
        isLoading: false,
        loadingType: null 
      });
      
      // 모든 저장소에서 인증 정보 제거
      if (typeof window !== "undefined") {
        localStorage.removeItem("token");
        sessionStorage.removeItem("isAuthenticated");
        sessionStorage.removeItem("loadingType");
      }
      
      // 로그인 페이지로 이동
      if (typeof window !== "undefined") {
        window.location.href = "/";
      }
    }
  },
}));

