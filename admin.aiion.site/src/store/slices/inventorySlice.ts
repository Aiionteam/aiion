/**
 * 재고 관리 슬라이스
 */

import { StateCreator } from 'zustand';
import { AppStore } from '../types';

export interface InventoryItem {
  id?: string;
  name: string;
  category: string;
  quantity: number;
  unitPrice: number;
  status?: string;
  location?: string;
}

export interface InventoryState {
  items: InventoryItem[];
  selectedItem: InventoryItem | null;
  isLoading: boolean;
  error: string | null;
}

export interface InventoryActions {
  setItems: (items: InventoryItem[]) => void;
  setSelectedItem: (item: InventoryItem | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  addItem: (item: InventoryItem) => void;
  updateItem: (item: InventoryItem) => void;
  removeItem: (itemId: string) => void;
  resetInventory: () => void;
}

export type InventorySlice = InventoryState & InventoryActions;

export const createInventorySlice: StateCreator<
  AppStore,
  [],
  [],
  InventorySlice
> = (set) => ({
  // State
  items: [],
  selectedItem: null,
  isLoading: false,
  error: null,

  // Actions
  setItems: (items) => set((state) => ({ 
    inventory: { 
      ...state.inventory, 
      items: Array.isArray(items) ? items : [] 
    } 
  })),
  
  setSelectedItem: (item) => set((state) => ({ 
    inventory: { ...state.inventory, selectedItem: item } 
  })),
  
  setLoading: (loading) => set((state) => ({ 
    inventory: { ...state.inventory, isLoading: loading } 
  })),
  
  setError: (error) => set((state) => ({ 
    inventory: { ...state.inventory, error } 
  })),
  
  addItem: (item) => set((state) => {
    const currentItems = Array.isArray(state.inventory?.items) ? state.inventory.items : [];
    return {
      inventory: { 
        ...state.inventory, 
        items: [...currentItems, item] 
      } 
    };
  }),
  
  updateItem: (item) => set((state) => {
    const currentItems = Array.isArray(state.inventory?.items) ? state.inventory.items : [];
    return {
      inventory: { 
        ...state.inventory, 
        items: currentItems.map(i => 
          i.id === item.id ? item : i
        ) 
      } 
    };
  }),
  
  removeItem: (itemId) => set((state) => {
    const currentItems = Array.isArray(state.inventory?.items) ? state.inventory.items : [];
    return {
      inventory: { 
        ...state.inventory, 
        items: currentItems.filter(i => i.id !== itemId) 
      } 
    };
  }),
  
  resetInventory: () => set((state) => ({ 
    inventory: { 
      ...state.inventory,
      items: [],
      selectedItem: null,
      isLoading: false,
      error: null,
    } 
  })),
});

