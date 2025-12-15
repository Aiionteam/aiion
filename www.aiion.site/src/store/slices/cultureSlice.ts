import { StateCreator } from "zustand";
import { AppStore } from "../types";
import { CultureView } from "../../components/types";

/**
 * Culture (문화) 슬라이스
 * 문화 생활 관련 상태 관리
 */
export interface CultureState {
  cultureView: CultureView;
}

export interface CultureActions {
  setCultureView: (view: CultureView) => void;
  resetCultureView: () => void;
}

export interface CultureSlice extends CultureState, CultureActions {}

export const createCultureSlice: StateCreator<
  AppStore,
  [],
  [],
  CultureSlice
> = (set) => ({
  // 초기 상태
  cultureView: 'home',

  // 액션
  setCultureView: (view) => set((state) => ({
    culture: { ...state.culture, cultureView: view }
  })),
  
  resetCultureView: () => set((state) => ({
    culture: { ...state.culture, cultureView: 'home' }
  })),
});

