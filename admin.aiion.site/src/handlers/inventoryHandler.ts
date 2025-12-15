/**
 * 재고 관리 이벤트 핸들러
 * 
 * UI 이벤트 처리 및 비즈니스 로직 호출
 */

import { 
  getInventoryItems, 
  deleteInventoryItem,
  createInventoryItem,
  updateInventoryItem,
  type InventoryItem 
} from '@/service/inventoryService';
import { useAppStore } from '@/store';

export const useInventoryHandler = () => {
  const store = useAppStore();

  /**
   * 재고 목록 조회
   */
  const handleFetchItems = async () => {
    try {
      store.inventory.setLoading(true);
      store.inventory.setError(null);
      
      const items = await getInventoryItems();
      store.inventory.setItems(items);
    } catch (error) {
      console.error('재고 목록 조회 실패:', error);
      store.inventory.setError('재고 목록을 불러오는데 실패했습니다.');
    } finally {
      store.inventory.setLoading(false);
    }
  };

  /**
   * 재고 삭제
   */
  const handleDeleteItem = async (itemId: string | number) => {
    if (!confirm('정말 삭제하시겠습니까?')) {
      return;
    }

    try {
      await deleteInventoryItem(itemId);
      // 삭제 후 목록 새로고침
      await handleFetchItems();
    } catch (error) {
      console.error('재고 삭제 실패:', error);
      alert('재고 삭제에 실패했습니다.');
    }
  };

  /**
   * 재고 추가
   */
  const handleCreateItem = async (item: Omit<InventoryItem, 'id'>) => {
    try {
      const newItem = await createInventoryItem(item);
      store.inventory.addItem(newItem);
      return newItem;
    } catch (error) {
      console.error('재고 추가 실패:', error);
      throw error;
    }
  };

  /**
   * 재고 수정
   */
  const handleUpdateItem = async (itemId: string | number, item: Partial<InventoryItem>) => {
    try {
      const updatedItem = await updateInventoryItem(itemId, item);
      store.inventory.updateItem(updatedItem);
      return updatedItem;
    } catch (error) {
      console.error('재고 수정 실패:', error);
      throw error;
    }
  };

  /**
   * 재고 선택
   */
  const handleSelectItem = (item: InventoryItem | null) => {
    store.inventory.setSelectedItem(item);
  };

  return {
    handleFetchItems,
    handleDeleteItem,
    handleCreateItem,
    handleUpdateItem,
    handleSelectItem,
  };
};

