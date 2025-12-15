/**
 * 전체 스토어 타입 정의
 * 
 * ERP 시스템을 위한 확장 가능한 타입 구조
 */

// 공통 설정 타입
export interface AppConfig {
  // 공통 설정이 필요하면 여기에 추가
}

// 슬라이스 타입 import
import { UiSlice } from "./slices/uiSlice";
import { UserSlice } from "./slices/userSlice";
import { InventorySlice } from "./slices/inventorySlice";

// 전체 스토어 타입 (모든 슬라이스 통합)
export interface AppStore extends AppConfig {
  // 공통 UI 상태 슬라이스
  ui: UiSlice;
  
  // 사용자 정보 슬라이스
  user: UserSlice;
  
  // 재고 관리 슬라이스
  inventory: InventorySlice;
  
  // === Common Actions ===
  /**
   * 전체 스토어 초기화
   * 모든 상태를 기본값으로 리셋합니다.
   */
  resetStore: () => void;
}
