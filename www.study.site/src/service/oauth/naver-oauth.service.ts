/**
 * 네이버 OAuth 서비스
 * 네이버 로그인 관련 비즈니스 로직 (클로저 패턴)
 */

import { getNaverAuthUrl } from "@/lib/api/naver";
import {
  OAuthProvider,
  OAuthCallbackParams,
  OAuthCallbackResult,
  OAuthCallbackHandlers,
  OAuthBaseHandler,
} from "./oauth-base.service";

/**
 * 네이버 OAuth 핸들러 (IIFE 패턴)
 * 즉시 실행되어 싱글톤 인스턴스를 반환
 */
export const NaverOAuthHandler = (() => {
  // Base 핸들러 참조 (Private)
  const baseHandler = OAuthBaseHandler;

  /**
   * 네이버 OAuth 인증 URL 가져오기 (Private 함수)
   */
  const getAuthUrl = async (): Promise<string> => {
    try {
      return await getNaverAuthUrl();
    } catch (error: any) {
      console.error("[네이버 OAuth] 인증 URL 가져오기 실패:", error);
      throw new Error(error.message || "네이버 로그인 URL을 가져오는데 실패했습니다.");
    }
  };

  /**
   * 네이버 OAuth 콜백 처리 (Private 함수)
   */
  const handleCallback = (
    params: OAuthCallbackParams,
    callbacks: OAuthCallbackHandlers
  ): OAuthCallbackResult => {
    // Base 핸들러의 handleOAuthCallbackBase를 클로저로 접근
    return baseHandler.handleOAuthCallbackBase(params, callbacks, "naver");
  };

  /**
   * URL에서 네이버 OAuth 파라미터 추출 (Private 함수)
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
export const createNaverOAuthHandler = () => NaverOAuthHandler;

// 개별 함수 export (기존 호환성 유지)
export const getNaverAuthUrlService = NaverOAuthHandler.getAuthUrl;
export const handleNaverCallback = NaverOAuthHandler.handleCallback;
export const extractNaverParams = NaverOAuthHandler.extractParams;

// 클래스 형태도 유지 (기존 호환성)
export class NaverOAuthService {
  static async getAuthUrl(): Promise<string> {
    return NaverOAuthHandler.getAuthUrl();
  }

  static handleCallback(
    params: OAuthCallbackParams,
    callbacks: OAuthCallbackHandlers
  ): OAuthCallbackResult {
    return NaverOAuthHandler.handleCallback(params, callbacks);
  }

  static extractParams(searchParams: URLSearchParams): OAuthCallbackParams {
    return NaverOAuthHandler.extractParams(searchParams);
  }
}
