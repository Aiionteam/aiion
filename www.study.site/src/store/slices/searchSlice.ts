import { create } from "zustand";

interface SearchState {
  query: string;
  count: number;
  setQuery: (query: string) => void;
  handleAdd: () => void;
  handleMic: () => void;
  reset: () => void;
}

const initialState = {
  query: "",
  count: 68,
};

export const useSearchStore = create<SearchState>((set) => ({
  ...initialState,
  setQuery: (query: string) => set({ query }),
  handleAdd: () => {
    console.log("Add clicked");
    // 추가 로직
  },
  handleMic: () => {
    console.log("Mic clicked");
    // 마이크 로직
  },
  reset: () => set(initialState),
}));

