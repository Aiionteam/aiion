import { StateCreator } from "zustand";
import { AppStore } from "../types";
import { SettingsView } from "../../components/types";

/**
 * Settings (설정) 슬라이스
 * 설정 관련 상태 관리
 */
export interface SettingsState {
  settingsView: SettingsView;
}

export interface SettingsActions {
  setSettingsView: (view: SettingsView) => void;
  resetSettingsView: () => void;
}

export interface SettingsSlice extends SettingsState, SettingsActions {}

export const createSettingsSlice: StateCreator<
  AppStore,
  [],
  [],
  SettingsSlice
> = (set) => ({
  // 초기 상태
  settingsView: 'home',

  // 액션
  setSettingsView: (view) => set((state) => ({
    settings: { ...state.settings, settingsView: view }
  })),
  
  resetSettingsView: () => set((state) => ({
    settings: { ...state.settings, settingsView: 'home' }
  })),
});

