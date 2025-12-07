/**
 * OAuth 서비스 통합 Export
 */

// Base 서비스 (공통 유틸리티)
export * from "./oauth-base.service";

// Provider별 서비스
export * from "./kakao-oauth.service";
export * from "./naver-oauth.service";
export * from "./google-oauth.service";

// 통합 OAuth 서비스
export * from "./oauth.service";

// 편의 함수 (기존 호환성 유지)
export {
  handleOAuthCallback,
  extractOAuthParams,
} from "./oauth.service";
