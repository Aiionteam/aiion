import { StateCreator } from "zustand";
import { AppStore } from "../types";
import { Interaction } from "../../components/types";

/**
 * Interaction (인터랙션) 슬라이스
 * 프롬프트 입력, 대화 기록 등 관련 상태 관리
 */
export interface InteractionState {
  inputText: string;
  loading: boolean;
  interactions: Interaction[];
}

export interface InteractionActions {
  setInputText: (text: string) => void;
  setLoading: (loading: boolean) => void;
  addInteraction: (interaction: Interaction) => void;
  clearInteractions: () => void;
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

  // 액션
  setInputText: (text) => set((state) => ({
    interaction: { ...state.interaction, inputText: text }
  })),

  setLoading: (loading) => set((state) => ({
    interaction: { ...state.interaction, loading }
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
});

