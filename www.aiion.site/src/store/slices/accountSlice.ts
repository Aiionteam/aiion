import { StateCreator } from "zustand";
import { AppStore } from "../types";
import { AccountView } from "../../components/types";

/**
 * Account (가계부) 슬라이스
 * 가계부 관련 상태 관리
 */
export interface AccountState {
  accountView: AccountView;
}

export interface AccountActions {
  setAccountView: (view: AccountView) => void;
  resetAccountView: () => void;
}

export interface AccountSlice extends AccountState, AccountActions {}

export const createAccountSlice: StateCreator<
  AppStore,
  [],
  [],
  AccountSlice
> = (set) => ({
  // 초기 상태
  accountView: 'home',

  // 액션
  setAccountView: (view) => set((state) => ({
    account: { ...state.account, accountView: view }
  })),
  
  resetAccountView: () => set((state) => ({
    account: { ...state.account, accountView: 'home' }
  })),
});

