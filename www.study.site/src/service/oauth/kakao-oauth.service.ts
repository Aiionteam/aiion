/**
 * 카카오 OAuth 서비스
 * 카카오 로그인 관련 비즈니스 로직 (클로저 패턴)
 */

import { getKakaoAuthUrl } from "@/lib/api/kakao";
import {
  OAuthProvider,
  OAuthCallbackParams,
  OAuthCallbackResult,
  OAuthCallbackHandlers,
  OAuthBaseHandler,
} from "./oauth-base.service";

/**
 * 카카오 OAuth 핸들러 (IIFE 패턴)
 * 즉시 실행되어 싱글톤 인스턴스를 반환
 */
export const KakaoOAuthHandler = (() => {
  // Base 핸들러 참조 (Private)
  const baseHandler = OAuthBaseHandler;

  /**
   * 카카오 OAuth 인증 URL 가져오기 (Private 함수)
   */
  const getAuthUrl = async (): Promise<string> => {
    try {
      return await getKakaoAuthUrl();
    } catch (error: any) {
      console.error("[카카오 OAuth] 인증 URL 가져오기 실패:", error);
      throw new Error(error.message || "카카오 로그인 URL을 가져오는데 실패했습니다.");
    }
  };

  /**
   * 카카오 OAuth 콜백 처리 (Private 함수)
   */
  const handleCallback = (
    params: OAuthCallbackParams,
    callbacks: OAuthCallbackHandlers
  ): OAuthCallbackResult => {
    // Base 핸들러의 handleOAuthCallbackBase를 클로저로 접근
    return baseHandler.handleOAuthCallbackBase(params, callbacks, "kakao");
  };

  /**
   * URL에서 카카오 OAuth 파라미터 추출 (Private 함수)
   */
  const extractParams = (searchParams: URLSearchParams): OAuthCallbackParams => {
    // Base 핸들러의 extractOAuthParams 접근
    return baseHandler.extractOAuthParams(searchParams);
  };

  // Public API 반환
  return {
    getAuthUrl,
    handleCallback,
    extractParams,
  };
})();

// 팩토리 함수 (기존 호환성 유지)
export const createKakaoOAuthHandler = () => KakaoOAuthHandler;

// 개별 함수 export (기존 호환성 유지)
export const getKakaoAuthUrlService = KakaoOAuthHandler.getAuthUrl;
export const handleKakaoCallback = KakaoOAuthHandler.handleCallback;
export const extractKakaoParams = KakaoOAuthHandler.extractParams;

// 클래스 형태도 유지 (기존 호환성)
export class KakaoOAuthService {
  static async getAuthUrl(): Promise<string> {
    return KakaoOAuthHandler.getAuthUrl();
  }

  static handleCallback(
    params: OAuthCallbackParams,
    callbacks: OAuthCallbackHandlers
  ): OAuthCallbackResult {
    return KakaoOAuthHandler.handleCallback(params, callbacks);
  }

  static extractParams(searchParams: URLSearchParams): OAuthCallbackParams {
    return KakaoOAuthHandler.extractParams(searchParams);
  }
}
