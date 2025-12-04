/**
 * 재고 관리 Container
 * 
 * 비즈니스 로직과 상태 관리를 담당
 */

'use client';

import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '@/store';
import { 
  getInventoryItems, 
  deleteInventoryItem,
  createInventoryItem,
  updateInventoryItem,
  type InventoryItem 
} from '@/service/inventoryService';
import { useInventoryHandler } from '@/handlers/inventoryHandler';
import { InventoryView } from './InventoryView';

export function InventoryContainer() {
  const queryClient = useQueryClient();
  const store = useAppStore();
  const handler = useInventoryHandler();

  // React Query: 재고 목록 조회
  const { data: items = [], isLoading, error } = useQuery({
    queryKey: ['inventory', 'items'],
    queryFn: async () => {
      const items = await getInventoryItems();
      store.inventory.setItems(items);
      return items;
    },
    staleTime: 60 * 1000, // 1분
  });

  // React Query: 재고 삭제 Mutation
  const deleteMutation = useMutation({
    mutationFn: deleteInventoryItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory', 'items'] });
      handler.handleFetchItems();
    },
    onError: (error) => {
      console.error('재고 삭제 실패:', error);
      alert('재고 삭제에 실패했습니다.');
    },
  });

  // React Query: 재고 추가 Mutation
  const createMutation = useMutation({
    mutationFn: createInventoryItem,
    onSuccess: (newItem) => {
      queryClient.invalidateQueries({ queryKey: ['inventory', 'items'] });
      store.inventory.addItem(newItem);
    },
    onError: (error) => {
      console.error('재고 추가 실패:', error);
      alert('재고 추가에 실패했습니다.');
    },
  });

  // React Query: 재고 수정 Mutation
  const updateMutation = useMutation({
    mutationFn: ({ itemId, item }: { itemId: string | number; item: Partial<InventoryItem> }) =>
      updateInventoryItem(itemId, item),
    onSuccess: (updatedItem) => {
      queryClient.invalidateQueries({ queryKey: ['inventory', 'items'] });
      store.inventory.updateItem(updatedItem);
    },
    onError: (error) => {
      console.error('재고 수정 실패:', error);
      alert('재고 수정에 실패했습니다.');
    },
  });

  // 초기 데이터 로드
  useEffect(() => {
    if (items.length === 0 && !isLoading) {
      handler.handleFetchItems();
    }
  }, [items.length, isLoading]);

  // 통계 계산
  const calculateStatus = (quantity: number): string => {
    if (quantity === 0) return '품절';
    if (quantity < 20) return '재고 부족';
    return '재고 있음';
  };

  // 전체 재고: 실제 수량의 합계
  const totalQuantity = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
  // 재고 있음: 수량이 20 이상인 항목 개수
  const inStockCount = items.filter(item => {
    const qty = item.quantity || 0;
    return qty >= 20;
  }).length;
  // 재고 부족: 수량이 1 이상 20 미만인 항목 개수
  const lowStockCount = items.filter(item => {
    const qty = item.quantity || 0;
    return qty > 0 && qty < 20;
  }).length;
  // 품절: 수량이 0인 항목 개수
  const outOfStockCount = items.filter(item => {
    const qty = item.quantity || 0;
    return qty === 0;
  }).length;

  // 핸들러 래핑
  const handleDelete = async (itemId: string | number) => {
    if (!confirm('정말 삭제하시겠습니까?')) {
      return;
    }
    deleteMutation.mutate(itemId);
  };

  const handleCreate = async (item: Omit<InventoryItem, 'id'>) => {
    await createMutation.mutateAsync(item);
  };

  const handleUpdate = async (itemId: string | number, item: Partial<InventoryItem>) => {
    await updateMutation.mutateAsync({ itemId, item });
  };

  return (
    <InventoryView
      items={items}
      isLoading={isLoading}
      error={error?.message || null}
      totalQuantity={totalQuantity}
      inStockCount={inStockCount}
      lowStockCount={lowStockCount}
      outOfStockCount={outOfStockCount}
      onDelete={handleDelete}
      onCreate={handleCreate}
      onUpdate={handleUpdate}
      onSelect={handler.handleSelectItem}
      onRefresh={handler.handleFetchItems}
    />
  );
}

