/**
 * 사용자 정보 관리 슬라이스
 */

import { StateCreator } from 'zustand';
import { AppStore } from '../types';

export interface UserInfo {
  id?: number;
  name: string;
  email: string;
}

export interface UserState {
  user: UserInfo | null;
  isLoggedIn: boolean;
}

export interface UserActions {
  setUser: (user: UserInfo) => void;
  clearUser: () => void;
  login: (user: UserInfo) => void;
  logout: () => void;
}

export type UserSlice = UserState & UserActions;

export const createUserSlice: StateCreator<
  AppStore,
  [],
  [],
  UserSlice
> = (set) => ({
  // State
  user: null,
  isLoggedIn: false,

  // Actions
  setUser: (user) => set((state) => ({ 
    user: { 
      ...state.user,
      user: user, 
      isLoggedIn: true 
    } 
  })),
  
  clearUser: () => set((state) => ({ 
    user: { 
      ...state.user,
      user: null, 
      isLoggedIn: false 
    } 
  })),
  
  login: (userInfo) => {
    set((state) => ({ 
      user: { 
        ...state.user,
        user: userInfo, 
        isLoggedIn: true 
      } 
    }));
  },
  
  logout: () => {
    set((state) => ({ 
      user: { ...state.user, user: null, isLoggedIn: false } 
    }));
    
    // 이 함수는 mainservice.ts의 handleLogout에서 모든 스토리지를 정리하므로
    // 여기서는 스토어 상태만 초기화
  },
});
