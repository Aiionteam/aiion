import { StateCreator } from "zustand";
import { AppStore } from "../types";

/**
 * Avatar (아바타 모드) 슬라이스
 * 음성 인식, 아바타 모드 관련 상태 관리
 */
export interface AvatarState {
  avatarMode: boolean;
  isListening: boolean;
  micAvailable: boolean;
}

export interface AvatarActions {
  setAvatarMode: (mode: boolean) => void;
  setIsListening: (listening: boolean) => void;
  setMicAvailable: (available: boolean) => void;
  toggleAvatarMode: () => void;
  resetAvatar: () => void;
}

export interface AvatarSlice extends AvatarState, AvatarActions {}

export const createAvatarSlice: StateCreator<
  AppStore,
  [],
  [],
  AvatarSlice
> = (set) => ({
  // 초기 상태
  avatarMode: false,
  isListening: false,
  micAvailable: false,

  // 액션
  setAvatarMode: (mode) => set((state) => ({
    avatar: { ...state.avatar, avatarMode: mode }
  })),

  setIsListening: (listening) => set((state) => ({
    avatar: { ...state.avatar, isListening: listening }
  })),

  setMicAvailable: (available) => set((state) => ({
    avatar: { ...state.avatar, micAvailable: available }
  })),

  toggleAvatarMode: () => set((state) => ({
    avatar: { ...state.avatar, avatarMode: !state.avatar.avatarMode }
  })),

  resetAvatar: () => set((state) => ({
    avatar: {
      ...state.avatar,
      avatarMode: false,
      isListening: false
    }
  })),
});

