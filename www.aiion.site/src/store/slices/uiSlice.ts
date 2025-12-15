import { StateCreator } from "zustand";
import { AppStore } from "../types";

/**
 * UI 상태 슬라이스
 * 사이드바, 다크모드 등 UI 관련 상태 관리
 */
export interface UiState {
  sidebarOpen: boolean;
  darkMode: boolean;
  isDragging: boolean;
}

export interface UiActions {
  setSidebarOpen: (open: boolean) => void;
  setDarkMode: (dark: boolean) => void;
  setIsDragging: (dragging: boolean) => void;
  toggleSidebar: () => void;
  toggleDarkMode: () => void;
}

export interface UiSlice extends UiState, UiActions {}

export const createUiSlice: StateCreator<
  AppStore,
  [],
  [],
  UiSlice
> = (set) => ({
  // 초기 상태
  sidebarOpen: true,
  darkMode: false,
  isDragging: false,

  // 액션
  setSidebarOpen: (open) => set((state) => ({ 
    ui: { ...state.ui, sidebarOpen: open } 
  })),
  setDarkMode: (dark) => set((state) => ({ 
    ui: { ...state.ui, darkMode: dark } 
  })),
  setIsDragging: (dragging) => set((state) => ({ 
    ui: { ...state.ui, isDragging: dragging } 
  })),
  toggleSidebar: () => set((state) => ({ 
    ui: { ...state.ui, sidebarOpen: !state.ui.sidebarOpen } 
  })),
  toggleDarkMode: () => set((state) => ({ 
    ui: { ...state.ui, darkMode: !state.ui.darkMode } 
  })),
});

