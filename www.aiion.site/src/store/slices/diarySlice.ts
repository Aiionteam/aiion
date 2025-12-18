import { StateCreator } from "zustand";
import { AppStore } from "../types";
import { DiaryView } from "../../components/types";

/**
 * Diary (일기) 슬라이스
 * 일기 관련 상태 관리
 */
export interface DiaryState {
  diaryView: DiaryView;
}

export interface DiaryActions {
  setDiaryView: (view: DiaryView) => void;
  resetDiaryView: () => void;
}

export interface DiarySlice extends DiaryState, DiaryActions {}

export const createDiarySlice: StateCreator<
  AppStore,
  [],
  [],
  DiarySlice
> = (set) => ({
  // 초기 상태
  diaryView: 'home',

  // 액션
  setDiaryView: (view) => set((state) => ({
    diary: { ...state.diary, diaryView: view }
  })),
  
  resetDiaryView: () => set((state) => ({
    diary: { ...state.diary, diaryView: 'home' }
  })),
});

