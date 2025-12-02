/**
 * API 엔드포인트 상수
 * 
 * 12개 서비스 (AI 에이전트 5개 + MS 7개)를 위한 엔드포인트 정의
 */

// TODO: AI 에이전트 엔드포인트 (5개)
export const AGENT_ENDPOINTS = {
  // agent1: '/api/agent1',
  // agent2: '/api/agent2',
  // agent3: '/api/agent3',
  // agent4: '/api/agent4',
  // agent5: '/api/agent5',
} as const;

// TODO: 마이크로서비스 엔드포인트 (7개)
export const SERVICE_ENDPOINTS = {
  SOCCER: '/soccer/findByWord',
  CALENDAR: '/calendar',
  DIARY: '/diary',
  COMMON: '/common',
  // service4: '/api/service4',
  // service5: '/api/service5',
  // service6: '/api/service6',
} as const;

// Gateway 설정 (일반 마이크로서비스용)
// 브라우저에서 실행되므로 localhost 사용 (Docker 컨테이너 이름은 사용 불가)
// Next.js 환경 변수는 NEXT_PUBLIC_ 접두사 필요
export const GATEWAY_CONFIG = {
  HOST: process.env.NEXT_PUBLIC_GATEWAY_HOST || process.env.GATEWAY_HOST || 'localhost',
  PORT: process.env.NEXT_PUBLIC_GATEWAY_PORT || process.env.GATEWAY_PORT || '8080',
  BASE_URL: `http://${process.env.NEXT_PUBLIC_GATEWAY_HOST || process.env.GATEWAY_HOST || 'localhost'}:${process.env.NEXT_PUBLIC_GATEWAY_PORT || process.env.GATEWAY_PORT || '8080'}`,
} as const;

// AI 서버 게이트웨이 설정
// AI 로직 서버의 게이트웨이 포트: 9000
export const AI_GATEWAY_CONFIG = {
  HOST: process.env.NEXT_PUBLIC_AI_GATEWAY_HOST || process.env.AI_GATEWAY_HOST || 'localhost',
  PORT: process.env.NEXT_PUBLIC_AI_GATEWAY_PORT || process.env.AI_GATEWAY_PORT || '9000',
  BASE_URL: `http://${process.env.NEXT_PUBLIC_AI_GATEWAY_HOST || process.env.AI_GATEWAY_HOST || 'localhost'}:${process.env.NEXT_PUBLIC_AI_GATEWAY_PORT || process.env.AI_GATEWAY_PORT || '9000'}`,
} as const;

