/**
 * 전체 스토어 타입 정의
 * 
 * 12개 서비스 (AI 에이전트 5개 + MS 7개)를 위한 확장 가능한 타입 구조
 * 
 * 구조:
 * - 각 서비스별로 독립적인 슬라이스
 * - 도메인별 그룹핑 가능
 * - 타입 안정성 보장
 */

// 공통 설정 타입 (빈 인터페이스 - 필요시 확장 가능)
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface AppConfig {
  // 공통 설정이 필요하면 여기에 추가
}

// 슬라이스 타입 import
import { UiSlice } from "./slices/uiSlice";
import { UserSlice } from "./slices/userSlice";
import { SoccerSlice } from "./slices/soccerSlice";
import { InteractionSlice } from "./slices/interactionSlice";
import { AvatarSlice } from "./slices/avatarSlice";
// 카테고리별 슬라이스 제거됨 (어드민 프론트엔드)

// 전체 스토어 타입 (모든 슬라이스 통합)
export interface AppStore extends AppConfig {
  // 공통 UI 상태 슬라이스
  ui: UiSlice;
  
  // 사용자 정보 슬라이스
  user: UserSlice;
  
  // 인터랙션 & 프롬프트 슬라이스
  interaction: InteractionSlice;
  
  // 아바타 모드 슬라이스
  avatar: AvatarSlice;
  
  // 카테고리별 슬라이스 제거됨 (어드민 프론트엔드)
  
  // 서비스 슬라이스
  soccer: SoccerSlice;
  
  // === Common Actions ===
  /**
   * 전체 스토어 초기화
   * 모든 상태를 기본값으로 리셋합니다.
   */
  resetStore: () => void;
  
  // TODO: AI 에이전트 슬라이스들 (5개)
  // agent1: Agent1Slice;
  // agent2: Agent2Slice;
  // agent3: Agent3Slice;
  // agent4: Agent4Slice;
  // agent5: Agent5Slice;
  
  // TODO: 마이크로서비스 슬라이스들 (나머지 6개)
  // service1: Service1Slice;
  // service2: Service2Slice;
  // service3: Service3Slice;
  // service4: Service4Slice;
  // service5: Service5Slice;
  // service6: Service6Slice;
}
