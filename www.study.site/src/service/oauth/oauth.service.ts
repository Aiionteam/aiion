/**
 * 통합 OAuth 서비스
 * 모든 OAuth Provider를 통합 관리하는 서비스 (클로저 패턴)
 */

import {
  OAuthProvider,
  OAuthCallbackParams,
  OAuthCallbackResult,
  OAuthCallbackHandlers,
  OAuthBaseHandler,
} from "./oauth-base.service";
import { KakaoOAuthHandler } from "./kakao-oauth.service";
import { NaverOAuthHandler } from "./naver-oauth.service";
import { GoogleOAuthHandler } from "./google-oauth.service";

/**
 * 통합 OAuth 핸들러 (IIFE 패턴)
 * 즉시 실행되어 싱글톤 인스턴스를 반환
 */
export const OAuthHandler = (() => {
  // Base 핸들러 참조 (Private)
  const baseHandler = OAuthBaseHandler;
  
  // Provider별 핸들러 참조 (Private)
  const kakaoHandler = KakaoOAuthHandler;
  const naverHandler = NaverOAuthHandler;
  const googleHandler = GoogleOAuthHandler;

  /**
   * Provider별 OAuth 인증 URL 가져오기 (Private 함수)
   */
  const getAuthUrl = async (provider: OAuthProvider): Promise<string> => {
    switch (provider) {
      case "kakao":
        return kakaoHandler.getAuthUrl();
      case "naver":
        return naverHandler.getAuthUrl();
      case "google":
        return googleHandler.getAuthUrl();
      default:
        throw new Error(`지원하지 않는 OAuth Provider: ${provider}`);
    }
  };

  /**
   * Provider별 OAuth 콜백 처리 (Private 함수)
   */
  const handleCallback = (
    params: OAuthCallbackParams,
    callbacks: OAuthCallbackHandlers,
    provider?: OAuthProvider
  ): OAuthCallbackResult => {
    // Provider가 지정되지 않은 경우 토큰에서 추출
    let targetProvider: OAuthProvider = provider || "google";
    
    if (params.token && !provider) {
      // Base 핸들러의 extractProviderFromToken을 클로저로 접근
      targetProvider = baseHandler.extractProviderFromToken(params.token);
    }

    // Provider별로 처리
    switch (targetProvider) {
      case "kakao":
        return kakaoHandler.handleCallback(params, callbacks);
      case "naver":
        return naverHandler.handleCallback(params, callbacks);
      case "google":
        return googleHandler.handleCallback(params, callbacks);
      default:
        return baseHandler.handleOAuthCallbackBase(params, callbacks, targetProvider);
    }
  };

  /**
   * URL에서 OAuth 파라미터 추출 (Private 함수)
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
export const createOAuthHandler = () => OAuthHandler;

// 개별 함수 export (기존 호환성 유지)
export const handleOAuthCallback = OAuthHandler.handleCallback;
export const extractOAuthParams = OAuthHandler.extractParams;

// 클래스 형태도 유지 (기존 호환성)
export class OAuthService {
  static async getAuthUrl(provider: OAuthProvider): Promise<string> {
    return OAuthHandler.getAuthUrl(provider);
  }

  static handleCallback(
    params: OAuthCallbackParams,
    callbacks: OAuthCallbackHandlers,
    provider?: OAuthProvider
  ): OAuthCallbackResult {
    return OAuthHandler.handleCallback(params, callbacks, provider);
  }

  static extractParams(searchParams: URLSearchParams): OAuthCallbackParams {
    return OAuthHandler.extractParams(searchParams);
  }
}
