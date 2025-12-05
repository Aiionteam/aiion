/**
 * Service Layer Export
 * 모든 서비스를 한 곳에서 export
 */

// OAuth 서비스 (기존 호환성 유지)
export {
  handleOAuthCallback,
  extractOAuthParams,
  type OAuthProvider,
  type OAuthCallbackParams,
  type OAuthCallbackResult,
  type OAuthCallbackHandlers,
} from "./oauth";

// OAuth Provider별 서비스
export {
  KakaoOAuthService,
  getKakaoAuthUrlService,
  handleKakaoCallback,
  extractKakaoParams,
} from "./oauth/kakao-oauth.service";

export {
  NaverOAuthService,
  getNaverAuthUrlService,
  handleNaverCallback,
  extractNaverParams,
} from "./oauth/naver-oauth.service";

export {
  GoogleOAuthService,
  getGoogleAuthUrlService,
  handleGoogleCallback,
  extractGoogleParams,
} from "./oauth/google-oauth.service";

// 통합 OAuth 서비스
export { OAuthService } from "./oauth/oauth.service";

