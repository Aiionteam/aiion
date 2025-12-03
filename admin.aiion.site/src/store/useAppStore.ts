/**
 * Zustand 단일 Store
 * 
 * 모든 슬라이스를 combine하여 하나의 Store로 관리합니다.
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { AppStore } from './types';
import { createUiSlice } from './slices/uiSlice';
import { createUserSlice } from './slices/userSlice';
import { createInventorySlice } from './slices/inventorySlice';

export const useAppStore = create<AppStore>()(
  devtools(
    persist(
      (...a) => ({
        // 공통 UI 상태 슬라이스
        ui: createUiSlice(...a),
        
        // 사용자 정보 슬라이스
        user: createUserSlice(...a),
        
        // 재고 관리 슬라이스
        inventory: createInventorySlice(...a),
        
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
          state.inventory.resetInventory();
          state.user.clearUser();
          
          // UI 상태 초기화
          set(
            (currentState) => ({
              ui: {
                ...currentState.ui,
                sidebarOpen: true,
                darkMode: false,
                isDragging: false,
              },
            }),
            false,
            'resetStore'
          );
        },
      })),
      {
        name: 'admin-storage', // localStorage key
        partialize: (state) => ({
          // persist할 상태만 선택 (민감한 정보 제외, 큰 데이터 제외)
          ui: {
            sidebarOpen: state.ui.sidebarOpen,
            darkMode: state.ui.darkMode,
          },
          user: {
            user: state.user?.user || null,
            isLoggedIn: state.user?.isLoggedIn || false,
          },
          // inventory는 제외 (너무 클 수 있음)
        }),
      }
    ),
    { name: 'AdminStore' } // Redux DevTools 이름
  )
);
