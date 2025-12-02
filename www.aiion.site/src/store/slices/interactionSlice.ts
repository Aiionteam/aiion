import { StateCreator } from "zustand";
import { AppStore } from "../types";
import { Interaction, Category } from "../../components/types";

/**
 * Interaction (인터랙션) 슬라이스
 * 프롬프트 입력, 대화 기록 등 관련 상태 관리
 */
export interface InteractionState {
  inputText: string;
  loading: boolean;
  interactions: Interaction[];
  currentCategory: Category;
}

export interface InteractionActions {
  setInputText: (text: string) => void;
  setLoading: (loading: boolean) => void;
  setCurrentCategory: (category: Category) => void;
  addInteraction: (interaction: Interaction) => void;
  clearInteractions: () => void;
  resetCategory: () => void;
}

export interface InteractionSlice extends InteractionState, InteractionActions {}

export const createInteractionSlice: StateCreator<
  AppStore,
  [],
  [],
  InteractionSlice
> = (set) => ({
  // 초기 상태
  inputText: '',
  loading: false,
  interactions: [],
  currentCategory: 'home',

  // 액션
  setInputText: (text) => set((state) => ({
    interaction: { ...state.interaction, inputText: text }
  })),

  setLoading: (loading) => set((state) => ({
    interaction: { ...state.interaction, loading }
  })),

  setCurrentCategory: (category) => set((state) => ({
    interaction: { ...state.interaction, currentCategory: category }
  })),

  addInteraction: (interaction) => set((state) => ({
    interaction: {
      ...state.interaction,
      interactions: [...state.interaction.interactions, interaction]
    }
  })),

  clearInteractions: () => set((state) => ({
    interaction: { ...state.interaction, interactions: [] }
  })),

  resetCategory: () => set((state) => ({
    interaction: { ...state.interaction, currentCategory: 'home' }
  })),
});

