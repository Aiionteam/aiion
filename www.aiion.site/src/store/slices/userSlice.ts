/**
 * 사용자 정보 관리 슬라이스
 */

import { StateCreator } from 'zustand';
import { AppStore } from '../types';

export interface UserInfo {
  id?: number; // user_id는 선택적 (구글 로그인 시 없을 수 있음)
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
  logout: () => Promise<void>;
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
  setUser: (userInfo) => {
    console.log('[userSlice] setUser 호출됨:', userInfo);
    set((state) => ({ 
      user: {
        ...state.user,
        user: userInfo, 
        isLoggedIn: true 
      }
    }));
  },
  
  clearUser: () => {
    console.log('[userSlice] clearUser 호출됨');
    set((state) => ({ 
      user: {
        ...state.user,
        user: null, 
        isLoggedIn: false 
      }
    }));
  },
  
  login: (userInfo) => {
    console.log('[userSlice] login 호출됨:', userInfo);
    set((state) => ({ 
      user: {
        ...state.user,
        user: userInfo, 
        isLoggedIn: true 
      }
    }));
    console.log('[userSlice] login 완료 - isLoggedIn: true, user:', userInfo);
  },
  
  logout: async () => {
    console.log('[userSlice] logout 호출됨');
    
    /**
     * 로그아웃 처리
     * 
     * 중요: 이 함수는 클라이언트 측 인증 상태만 초기화합니다.
     * 데이터베이스의 users 테이블 데이터는 전혀 삭제되지 않으며,
     * 사용자 정보(이메일, 닉네임, 일기 등)는 모두 그대로 유지됩니다.
     * 
     * 로그아웃 후에도 동일한 계정으로 다시 로그인하면
     * 기존 데이터를 그대로 사용할 수 있습니다.
     */
    
    // 먼저 Zustand 상태 초기화 (백엔드 users 테이블에는 영향 없음)
    set((state) => ({ 
      user: {
        ...state.user,
        user: null, 
        isLoggedIn: false 
      }
    }));
    console.log('[userSlice] Zustand 상태 초기화 완료');
    
    // 모든 캐시와 스토리지 삭제 (클라이언트 측만 정리)
    if (typeof window !== 'undefined') {
      console.log('[userSlice] 모든 캐시와 스토리지 삭제 시작...');
      
      // 1. localStorage 전체 삭제
      try {
        localStorage.clear();
        console.log('[userSlice] localStorage 전체 삭제 완료');
      } catch (error) {
        console.error('[userSlice] localStorage 삭제 실패:', error);
        // 개별 항목 삭제 시도
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('auth_provider');
        localStorage.removeItem('app-storage');
      }
      
      // 2. sessionStorage 전체 삭제
      try {
        sessionStorage.clear();
        console.log('[userSlice] sessionStorage 전체 삭제 완료');
      } catch (error) {
        console.error('[userSlice] sessionStorage 삭제 실패:', error);
      }
      
      // 3. 모든 쿠키 삭제
      try {
        const cookies = document.cookie.split(';');
        cookies.forEach(cookie => {
          const eqPos = cookie.indexOf('=');
          const name = eqPos > -1 ? cookie.substring(0, eqPos).trim() : cookie.trim();
          if (name) {
            // 모든 경로와 도메인에서 쿠키 삭제 시도
            document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
            document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`;
            document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.${window.location.hostname}`;
            document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=localhost`;
          }
        });
        console.log('[userSlice] 모든 쿠키 삭제 완료');
      } catch (error) {
        console.error('[userSlice] 쿠키 삭제 실패:', error);
      }
      
      // 4. IndexedDB 삭제 (있는 경우)
      try {
        if ('indexedDB' in window) {
          const databases = await indexedDB.databases();
          await Promise.all(
            databases.map(db => {
              return new Promise<void>((resolve, reject) => {
                const deleteReq = indexedDB.deleteDatabase(db.name);
                deleteReq.onsuccess = () => {
                  console.log(`[userSlice] IndexedDB 삭제 완료: ${db.name}`);
                  resolve();
                };
                deleteReq.onerror = () => {
                  console.error(`[userSlice] IndexedDB 삭제 실패: ${db.name}`);
                  reject(deleteReq.error);
                };
                deleteReq.onblocked = () => {
                  console.warn(`[userSlice] IndexedDB 삭제 차단됨: ${db.name}`);
                  resolve(); // 차단되어도 계속 진행
                };
              });
            })
          );
          console.log('[userSlice] 모든 IndexedDB 삭제 완료');
        }
      } catch (error) {
        console.error('[userSlice] IndexedDB 삭제 실패:', error);
      }
      
      // 5. Service Worker 캐시 삭제 (있는 경우)
      try {
        if ('caches' in window) {
          const cacheNames = await caches.keys();
          await Promise.all(
            cacheNames.map(cacheName => {
              console.log(`[userSlice] 캐시 삭제 중: ${cacheName}`);
              return caches.delete(cacheName);
            })
          );
          console.log('[userSlice] 모든 Service Worker 캐시 삭제 완료');
        }
      } catch (error) {
        console.error('[userSlice] Service Worker 캐시 삭제 실패:', error);
      }
      
      // 6. Service Worker 등록 해제 (있는 경우)
      try {
        if ('serviceWorker' in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations();
          await Promise.all(
            registrations.map(registration => {
              console.log('[userSlice] Service Worker 등록 해제 중...');
              return registration.unregister();
            })
          );
          console.log('[userSlice] 모든 Service Worker 등록 해제 완료');
        }
      } catch (error) {
        console.error('[userSlice] Service Worker 등록 해제 실패:', error);
      }
      
      console.log('[userSlice] 모든 캐시와 스토리지 삭제 완료 (DB 데이터는 유지됨)');
      console.log('[userSlice] 로그아웃 완료 - 랜딩 페이지로 이동');
      
      // 랜딩 페이지로 강제 이동 (다른 계정으로 로그인할 수 있도록)
      // window.location.replace를 사용하여 히스토리에 남기지 않음
      // 약간의 지연 후 이동하여 모든 정리 작업이 완료되도록 함
      setTimeout(() => {
        console.log('[userSlice] 페이지 리다이렉트 실행');
        window.location.replace('/');
      }, 300);
    }
  },
});

