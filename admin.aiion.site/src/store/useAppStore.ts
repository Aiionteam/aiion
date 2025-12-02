import { create } from "zustand";
import { AppStore } from "./types";
import { createUiSlice } from "./slices/uiSlice";
import { createUserSlice } from "./slices/userSlice";
import { createSoccerSlice } from "./slices/soccerSlice";
import { createInteractionSlice } from "./slices/interactionSlice";
import { createAvatarSlice } from "./slices/avatarSlice";
// 카테고리별 슬라이스 제거됨 (어드민 프론트엔드)

/**
 * 단일 Zustand 스토어 (슬라이스 패턴 적용)
 * 
 * 카테고리별로 분리된 슬라이스 구조
 * 
 * 사용법:
 * - 각 카테고리별로 독립적인 슬라이스 생성
 * - 모든 슬라이스를 여기에 통합
 * - 컴포넌트에서 선택적 구독으로 사용
 * 
 * 예시:
 * // UI 상태
 * const darkMode = useAppStore((state) => state.ui.darkMode);
 * const toggleDarkMode = useAppStore((state) => state.ui.toggleDarkMode);
 * 
 * // 일기 카테고리
 * const diaryView = useAppStore((state) => state.diary.diaryView);
 * const setDiaryView = useAppStore((state) => state.diary.setDiaryView);
 * 
 * // 캘린더 카테고리
 * const events = useAppStore((state) => state.calendar.events);
 * const addEvent = useAppStore((state) => state.calendar.addEvent);
 * 
 * // 인터랙션
 * const inputText = useAppStore((state) => state.interaction.inputText);
 * const addInteraction = useAppStore((state) => state.interaction.addInteraction);
 */
export const useAppStore = create<AppStore>()((...a) => ({
  // 공통 UI 상태 슬라이스
  ui: createUiSlice(...a),
  
  // 사용자 정보 슬라이스
  user: createUserSlice(...a),
  
  // 인터랙션 & 프롬프트 슬라이스
  interaction: createInteractionSlice(...a),
  
  // 아바타 모드 슬라이스
  avatar: createAvatarSlice(...a),
  
  // 카테고리별 슬라이스 제거됨 (어드민 프론트엔드)
  
  // 서비스 슬라이스
  soccer: createSoccerSlice(...a),
  
  // 전체 스토어 초기화
  resetStore: () => {
    const state = useAppStore.getState();
    // 각 슬라이스의 reset 메서드 호출
    state.ui.setSidebarOpen(true);
    state.ui.setDarkMode(false);
    state.ui.setIsDragging(false);
    state.interaction.setInputText('');
    state.interaction.setLoading(false);
    state.interaction.clearInteractions();
    state.avatar.resetAvatar();
    state.soccer.clearResults();
  },
  
  // TODO: AI 에이전트 슬라이스들 (5개)
  // agent1: createAgent1Slice(...a),
  // agent2: createAgent2Slice(...a),
  // agent3: createAgent3Slice(...a),
  // agent4: createAgent4Slice(...a),
  // agent5: createAgent5Slice(...a),
  
  // TODO: 마이크로서비스 슬라이스들 (나머지 6개)
  // service1: createService1Slice(...a),
  // service2: createService2Slice(...a),
  // service3: createService3Slice(...a),
  // service4: createService4Slice(...a),
  // service5: createService5Slice(...a),
  // service6: createService6Slice(...a),
}));
