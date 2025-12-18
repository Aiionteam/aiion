/**
 * Zustand 단일 Store
 * 
 * 모든 슬라이스를 combine하여 하나의 Store로 관리합니다.
 * - devtools: Redux DevTools 지원
 * - persist: localStorage에 상태 저장
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { AppStore } from './types';
import { createUiSlice } from './slices/uiSlice';
import { createSoccerSlice } from './slices/soccerSlice';
import { createDiarySlice } from './slices/diarySlice';
import { createCalendarSlice } from './slices/calendarSlice';
import { createAccountSlice } from './slices/accountSlice';
import { createCultureSlice } from './slices/cultureSlice';
import { createHealthSlice } from './slices/healthSlice';
import { createPathSlice } from './slices/pathSlice';
import { createInteractionSlice } from './slices/interactionSlice';
import { createAvatarSlice } from './slices/avatarSlice';
import { createUserSlice } from './slices/userSlice';
import { createSettingsSlice } from './slices/settingsSlice';

export const useStore = create<AppStore>()(
  devtools(
    persist(
      (...a) => ({
        // 공통 UI 상태 슬라이스
        ui: createUiSlice(...a),
        
        // 사용자 정보 슬라이스
        user: createUserSlice(...a),
        
        // 인터랙션 & 프롬프트 슬라이스
        interaction: createInteractionSlice(...a),
        
        // 아바타 모드 슬라이스
        avatar: createAvatarSlice(...a),
        
        // 카테고리별 슬라이스
        diary: createDiarySlice(...a),
        calendar: createCalendarSlice(...a),
        account: createAccountSlice(...a),
        culture: createCultureSlice(...a),
        health: createHealthSlice(...a),
        path: createPathSlice(...a),
        settings: createSettingsSlice(...a),
        
        // 서비스 슬라이스
        soccer: createSoccerSlice(...a),
        
        // === Common Actions ===
        /**
         * 전체 스토어 초기화
         * 모든 상태를 기본값으로 리셋합니다.
         */
        resetStore: () => {
          const set = a[0];
          const get = a[1];
          
          // 각 슬라이스의 reset 함수 호출
          const state = get();
          state.diary.resetDiaryView();
          state.calendar.resetCalendar();
          state.account.resetAccountView();
          state.culture.resetCultureView();
          state.health.resetHealthView();
          state.path.resetPathfinderView();
          state.interaction.resetCategory();
          state.interaction.clearInteractions();
          state.avatar.resetAvatar();
          state.soccer.clearResults();
          
          // UI 상태 초기화
          set(
            (currentState) => ({
              ui: {
                ...currentState.ui,
                sidebarOpen: true,
                darkMode: false,
                isDragging: false,
              },
              interaction: {
                ...currentState.interaction,
                inputText: '',
                loading: false,
              },
            }),
            false,
            'resetStore'
          );
        },
      }),
      {
        name: 'app-storage', // localStorage key
        partialize: (state) => ({
          // persist할 상태만 선택 (민감한 정보 제외, 큰 데이터 제외)
          ui: {
            sidebarOpen: state.ui.sidebarOpen,
            darkMode: state.ui.darkMode,
            // isDragging은 제외 (임시 상태)
          },
          user: {
            user: state.user?.user || null,
            isLoggedIn: state.user?.isLoggedIn || false,
          },
          interaction: {
            currentCategory: state.interaction.currentCategory,
            // inputText, loading, interactions는 제외 (임시 상태 또는 너무 클 수 있음)
          },
          diary: {
            diaryView: state.diary.diaryView,
          },
          // calendar는 제외 (Date 객체와 큰 데이터 포함)
          account: {
            accountView: state.account.accountView,
          },
          culture: {
            cultureView: state.culture.cultureView,
          },
          health: {
            healthView: state.health.healthView,
          },
          path: {
            pathfinderView: state.path.pathfinderView,
          },
          // avatar, soccer는 제외 (임시 상태)
        }),
      }
    ),
    { name: 'AppStore' } // Redux DevTools 이름
  )
);

// 기존 useAppStore와의 호환성을 위한 export
export const useAppStore = useStore;

