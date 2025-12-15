/**
 * OAuth 공통 유틸리티 함수
 * 모든 OAuth Provider에서 공통으로 사용되는 함수들
 * 
 * ⚠️ 클라이언트 전용: 이 파일은 클라이언트 컴포넌트에서만 사용해야 합니다.
 */

import { saveTokens } from "@/lib/api/auth";

export type OAuthProvider = "google" | "kakao" | "naver";

export interface OAuthCallbackParams {
  token: string | null;
  refreshToken: string | null;
  error: string | null;
  errorDescription: string | null;
}

export interface OAuthCallbackResult {
  success: boolean;
  provider?: OAuthProvider;
  error?: string;
}

export interface OAuthCallbackHandlers {
  onSuccess: (provider: OAuthProvider) => void;
  onError: (error: string) => void;
  onRedirect?: (path: string) => void;
}

/**
 * OAuth Base 핸들러 (IIFE 패턴)
 * 즉시 실행되어 싱글톤 인스턴스를 반환
 */
export const OAuthBaseHandler = (() => {
  // Private 변수 및 함수들
  
  /**
   * JWT 토큰에서 provider 추출 (Private 함수)
   */
  const extractProviderFromToken = (token: string): OAuthProvider => {
    if (typeof window === "undefined") {
      return "google";
    }
    
    try {
      const base64Url = token.split(".")[1];
      if (!base64Url) {
        return "google";
      }
      
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join("")
      );
      const payload = JSON.parse(jsonPayload);
      
      if (payload.provider && ["google", "kakao", "naver"].includes(payload.provider)) {
        return payload.provider as OAuthProvider;
      }
    } catch (e) {
      if (typeof window !== "undefined") {
        console.error("[OAuth Base] JWT 디코딩 실패:", e);
      }
    }
    return "google";
  };

  /**
   * 팝업 창인지 확인 (Private 함수)
   */
  const isPopupWindow = (): boolean => {
    return typeof window !== "undefined" && window.opener !== null;
  };

  /**
   * URL에서 토큰 파라미터 제거 (Private 함수)
   */
  const clearTokenFromUrl = (): void => {
    if (typeof window !== "undefined") {
      window.history.replaceState({}, "", window.location.pathname);
    }
  };

  /**
   * 팝업 창에 성공 메시지 전송 (Private 함수)
   */
  const sendSuccessToParent = (
    token: string,
    refreshToken: string | null,
    provider: OAuthProvider
  ): void => {
    if (typeof window === "undefined" || !window.opener) {
      return;
    }

    window.opener.postMessage(
      {
        type: "OAUTH_LOGIN_SUCCESS",
        token: token,
        refresh_token: refreshToken,
        provider: provider,
      },
      window.location.origin
    );
  };

  /**
   * 팝업 창에 에러 메시지 전송 (Private 함수)
   */
  const sendErrorToParent = (error: string): void => {
    if (typeof window === "undefined" || !window.opener) {
      return;
    }

    window.opener.postMessage(
      {
        type: "OAUTH_LOGIN_ERROR",
        error: error,
      },
      window.location.origin
    );
  };

  /**
   * 팝업 창 닫기 (Private 함수)
   */
  const closePopup = (): void => {
    if (typeof window !== "undefined" && window.opener) {
      window.close();
    }
  };

  /**
   * OAuth 콜백 파라미터 추출 (Private 함수)
   */
  const extractOAuthParams = (searchParams: URLSearchParams): OAuthCallbackParams => {
    return {
      token: searchParams.get("token"),
      refreshToken: searchParams.get("refresh_token"),
      error: searchParams.get("error"),
      errorDescription: searchParams.get("error_description"),
    };
  };

  /**
   * 공통 OAuth 콜백 처리 핸들러 (Private 함수)
   */
  const handleOAuthCallbackBase = (
    params: OAuthCallbackParams,
    callbacks: OAuthCallbackHandlers,
    defaultProvider: OAuthProvider = "google"
  ): OAuthCallbackResult => {
    const { token, refreshToken, error, errorDescription } = params;
    const isPopup = isPopupWindow();

    // 에러가 있는 경우
    if (error) {
      clearTokenFromUrl();
      
      const errorMsg = errorDescription 
        ? `인증 실패: ${error}\n${errorDescription}` 
        : `인증 실패: ${error}`;

      if (isPopup) {
        sendErrorToParent(errorMsg);
        closePopup();
        return { success: false, error: errorMsg };
      }

      callbacks.onError(errorMsg);
      return { success: false, error: errorMsg };
    }

    // 토큰이 있는 경우
    if (token) {
      clearTokenFromUrl();
      
      try {
        let provider: OAuthProvider;
        try {
          provider = extractProviderFromToken(token);
        } catch (e) {
          provider = defaultProvider;
        }

        // 팝업 창인 경우
        if (isPopup) {
          sendSuccessToParent(token, refreshToken, provider);
          closePopup();
          return { success: true, provider };
        }

        // 일반 탭인 경우: 토큰 저장 및 상태 업데이트
        saveTokens(token, refreshToken || undefined);
        callbacks.onSuccess(provider);

        // 리다이렉트
        if (callbacks.onRedirect) {
          callbacks.onRedirect("/home");
        }

        return { success: true, provider };
      } catch (error: any) {
        console.error("[OAuth Base] 토큰 처리 실패:", error);
        
        const errorMsg = "토큰 처리 중 오류가 발생했습니다.";

        if (isPopup) {
          sendErrorToParent(errorMsg);
          closePopup();
          return { success: false, error: errorMsg };
        }

        callbacks.onError(errorMsg);
        return { success: false, error: errorMsg };
      }
    }

    // 토큰도 에러도 없는 경우
    return { success: false, error: "인증 정보를 받지 못했습니다." };
  };

  // Public API 반환
  return {
    extractProviderFromToken,
    isPopupWindow,
    clearTokenFromUrl,
    sendSuccessToParent,
    sendErrorToParent,
    closePopup,
    extractOAuthParams,
    handleOAuthCallbackBase,
  };
})();

// 팩토리 함수 (기존 호환성 유지)
export const createOAuthBaseHandler = () => OAuthBaseHandler;

// 개별 함수 export (기존 호환성 유지)
export const extractProviderFromToken = OAuthBaseHandler.extractProviderFromToken;
export const isPopupWindow = OAuthBaseHandler.isPopupWindow;
export const clearTokenFromUrl = OAuthBaseHandler.clearTokenFromUrl;
export const sendSuccessToParent = OAuthBaseHandler.sendSuccessToParent;
export const sendErrorToParent = OAuthBaseHandler.sendErrorToParent;
export const closePopup = OAuthBaseHandler.closePopup;
export const extractOAuthParams = OAuthBaseHandler.extractOAuthParams;
export const handleOAuthCallbackBase = OAuthBaseHandler.handleOAuthCallbackBase;
