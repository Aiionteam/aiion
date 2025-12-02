import { StateCreator } from "zustand";
import { AppStore } from "../types";
import { HealthView } from "../../components/types";

/**
 * Health (건강) 슬라이스
 * 헬스케어 관련 상태 관리
 */
export interface HealthState {
  healthView: HealthView;
}

export interface HealthActions {
  setHealthView: (view: HealthView) => void;
  resetHealthView: () => void;
}

export interface HealthSlice extends HealthState, HealthActions {}

export const createHealthSlice: StateCreator<
  AppStore,
  [],
  [],
  HealthSlice
> = (set) => ({
  // 초기 상태
  healthView: 'home',

  // 액션
  setHealthView: (view) => set((state) => ({
    health: { ...state.health, healthView: view }
  })),
  
  resetHealthView: () => set((state) => ({
    health: { ...state.health, healthView: 'home' }
  })),
});

