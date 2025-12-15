import { StateCreator } from "zustand";
import { AppStore } from "../types";
import { PathfinderView } from "../../components/types";

/**
 * Path Finder (자기개발) 슬라이스
 * Path Finder 관련 상태 관리
 */
export interface PathState {
  pathfinderView: PathfinderView;
}

export interface PathActions {
  setPathfinderView: (view: PathfinderView) => void;
  resetPathfinderView: () => void;
}

export interface PathSlice extends PathState, PathActions {}

export const createPathSlice: StateCreator<
  AppStore,
  [],
  [],
  PathSlice
> = (set) => ({
  // 초기 상태
  pathfinderView: 'home',

  // 액션
  setPathfinderView: (view) => set((state) => ({
    path: { ...state.path, pathfinderView: view }
  })),
  
  resetPathfinderView: () => set((state) => ({
    path: { ...state.path, pathfinderView: 'home' }
  })),
});

