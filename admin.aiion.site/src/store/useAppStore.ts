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
      (set, get, api) => ({
        // 공통 UI 상태 슬라이스
        ui: createUiSlice(set, get, api),
        
        // 사용자 정보 슬라이스
        user: createUserSlice(set, get, api),
        
        // 재고 관리 슬라이스
        inventory: createInventorySlice(set, get, api),
        
        // === Common Actions ===
        /**
         * 전체 스토어 초기화
         * 모든 상태를 기본값으로 리셋합니다.
         */
        resetStore: () => {
          // 각 슬라이스의 reset 함수 호출 (함수가 없으면 직접 초기화)
          const state = get();
          
          // inventory 초기화
          if (state.inventory && typeof state.inventory.resetInventory === 'function') {
            try {
              state.inventory.resetInventory();
            } catch (err) {
              // 함수 호출 실패 시 직접 초기화
              set((currentState) => ({
                inventory: {
                  ...currentState.inventory,
                  items: [],
                  selectedItem: null,
                  isLoading: false,
                  error: null,
                },
              }), false, 'resetStore-inventory');
            }
          } else {
            // 함수가 없으면 직접 초기화
            set((currentState) => ({
              inventory: {
                ...currentState.inventory,
                items: [],
                selectedItem: null,
                isLoading: false,
                error: null,
              },
            }), false, 'resetStore-inventory');
          }
          
          // user 초기화
          if (state.user && typeof state.user.clearUser === 'function') {
            try {
              state.user.clearUser();
            } catch (err) {
              // 함수 호출 실패 시 직접 초기화
              set((currentState) => ({
                user: {
                  ...currentState.user,
                  user: null,
                  isLoggedIn: false,
                },
              }), false, 'resetStore-user');
            }
          } else if (state.user && typeof state.user.logout === 'function') {
            try {
              state.user.logout();
            } catch (err) {
              // 함수 호출 실패 시 직접 초기화
              set((currentState) => ({
                user: {
                  ...currentState.user,
                  user: null,
                  isLoggedIn: false,
                },
              }), false, 'resetStore-user');
            }
          } else {
            // 함수가 없으면 직접 초기화
            set((currentState) => ({
              user: {
                ...currentState.user,
                user: null,
                isLoggedIn: false,
              },
            }), false, 'resetStore-user');
          }
          
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
            'resetStore-ui'
          );
        },
      }),
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
