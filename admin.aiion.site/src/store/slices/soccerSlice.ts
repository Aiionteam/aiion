import { StateCreator } from "zustand";
import { AppStore } from "../types";

/**
 * Soccer Service 슬라이스
 * 축구 검색 관련 상태 관리
 */
export interface SoccerState {
  searchResults: unknown | null;
  isLoading: boolean;
  error: string | null;
  lastSearchKeyword: string | null;
}

export interface SoccerActions {
  searchSoccer: (keyword: string) => Promise<void>;
  clearResults: () => void;
  setError: (error: string | null) => void;
}

export interface SoccerSlice extends SoccerState, SoccerActions {}

export const createSoccerSlice: StateCreator<
  AppStore,
  [],
  [],
  SoccerSlice
> = (set, get) => ({
  // 초기 상태
  searchResults: null,
  isLoading: false,
  error: null,
  lastSearchKeyword: null,

  // 액션: 축구 검색
  searchSoccer: async (keyword: string) => {
    set({ soccer: { ...get().soccer, isLoading: true, error: null } });
    
    try {
      const gatewayUrl = process.env.NEXT_PUBLIC_API_GATEWAY_URL || 
                        process.env.NEXT_PUBLIC_API_BASE_URL || 
                        'http://localhost:8080';
      
      // Gateway 라우팅: /soccer/** → soccer-service:8085
      const apiUrl = `${gatewayUrl}/soccer/soccer/findByWord?keyword=${encodeURIComponent(keyword)}`;
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        mode: 'cors',
      });

      if (response.ok) {
        const result = await response.json();
        set({ 
          soccer: { 
            ...get().soccer, 
            searchResults: result, 
            isLoading: false,
            lastSearchKeyword: keyword,
            error: null
          } 
        });
      } else {
        set({ 
          soccer: { 
            ...get().soccer, 
            isLoading: false, 
            error: `API 호출 실패: ${response.status}` 
          } 
        });
      }
    } catch (error) {
      set({ 
        soccer: { 
          ...get().soccer, 
          isLoading: false, 
          error: error instanceof Error ? error.message : '알 수 없는 오류' 
        } 
      });
    }
  },

  // 결과 초기화
  clearResults: () => set({ 
    soccer: { 
      ...get().soccer, 
      searchResults: null, 
      lastSearchKeyword: null,
      error: null 
    } 
  }),

  // 에러 설정
  setError: (error) => set({ 
    soccer: { ...get().soccer, error } 
  }),
});

