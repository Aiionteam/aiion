/**
 * 재고 관리 Container
 * 
 * 비즈니스 로직과 상태 관리를 담당
 */

'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '@/store';
import { 
  getInventoryItems, 
  deleteInventoryItem,
  createInventoryItem,
  updateInventoryItem,
  getInventoryStatistics,
  type InventoryItem 
} from '@/service/inventoryService';
import { useInventoryHandler } from '@/handlers/inventoryHandler';
import { InventoryView } from './InventoryView';

export function InventoryContainer() {
  const queryClient = useQueryClient();
  const store = useAppStore();
  const handler = useInventoryHandler();
  
  // 페이징 상태
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(100);
  
  // 필터 상태
  const [filter, setFilter] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all');
  
  // 검색 상태
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'all' | 'name' | 'category'>('all');
  
  // 정렬 상태
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('asc'); // asc: 오름차순(기본값), desc: 내림차순(최신순)

  // React Query: 재고 목록 조회 (페이징 + 필터 + 검색 + 정렬)
  const { data: inventoryData, isLoading, error } = useQuery({
    queryKey: ['inventory', 'items', currentPage, pageSize, filter, searchQuery, searchType, sortOrder],
    queryFn: async () => {
      const skip = (currentPage - 1) * pageSize;
      let params: any = { skip, limit: pageSize };
      
      // 검색 파라미터 추가
      if (searchQuery.trim()) {
        if (searchType === 'name' || searchType === 'all') {
          params.name = searchQuery.trim();
        }
        if (searchType === 'category' || searchType === 'all') {
          params.category = searchQuery.trim();
        }
      }
      
      // 필터에 따라 수량 범위 설정
      if (filter === 'in_stock') {
        params.quantity_min = 20;
      } else if (filter === 'low_stock') {
        params.quantity_min = 1;
        params.quantity_max = 19;
      } else if (filter === 'out_of_stock') {
        params.quantity_min = 0;
        params.quantity_max = 0;
      }
      
      // 정렬 파라미터 추가
      params.order_by = sortOrder;
      
      const result = await getInventoryItems(params);
      store.inventory.setItems(result.items);
      return result;
    },
    staleTime: 60 * 1000, // 1분
  });

  const items = inventoryData?.items || [];
  const totalItems = inventoryData?.total || 0;
  const totalPages = Math.ceil(totalItems / pageSize);

  // React Query: 재고 통계 조회
  const { data: statistics, isLoading: isStatisticsLoading } = useQuery({
    queryKey: ['inventory', 'statistics'],
    queryFn: async () => {
      return await getInventoryStatistics();
    },
    staleTime: 30 * 1000, // 30초
  });

  // React Query: 재고 삭제 Mutation
  const deleteMutation = useMutation({
    mutationFn: deleteInventoryItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory', 'items'] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'statistics'] });
      // 현재 페이지가 마지막 페이지이고 마지막 항목을 삭제한 경우 이전 페이지로 이동
      if (items.length === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      }
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
    onSuccess: async (newItem) => {
      // 모든 재고 관련 쿼리 무효화 (페이징, 필터 포함)
      queryClient.invalidateQueries({ queryKey: ['inventory', 'items'] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'statistics'] });
      
      // Zustand store에 안전하게 추가 (items가 배열인지 확인)
      try {
        if (newItem && typeof newItem === 'object') {
          store.inventory.addItem(newItem);
        }
      } catch (error) {
        console.warn('Store에 항목 추가 실패:', error);
        // 에러가 발생해도 계속 진행 (React Query가 데이터를 관리하므로)
      }
      
      // 새 항목이 추가되면 첫 페이지로 이동하고 필터 초기화
      setCurrentPage(1);
      setFilter('all');
      
      // 첫 페이지 데이터 강제 리패치하여 새로고침
      await queryClient.refetchQueries({ 
        queryKey: ['inventory', 'items'],
        exact: false 
      });
      await queryClient.refetchQueries({ queryKey: ['inventory', 'statistics'] });
      
      // 성공 메시지
      alert(`재고 "${newItem?.name || '항목'}"이(가) 성공적으로 추가되었습니다.`);
    },
    onError: (error: any) => {
      console.error('재고 추가 실패:', error);
      const errorMessage = error?.message || '재고 추가에 실패했습니다.';
      alert(errorMessage);
    },
  });

  // React Query: 재고 수정 Mutation
  const updateMutation = useMutation({
    mutationFn: ({ itemId, item }: { itemId: string | number; item: Partial<InventoryItem> }) =>
      updateInventoryItem(itemId, item),
    onSuccess: async (updatedItem) => {
      // 모든 재고 관련 쿼리 무효화
      queryClient.invalidateQueries({ queryKey: ['inventory', 'items'] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'statistics'] });
      
      // Zustand store에 안전하게 업데이트
      try {
        if (updatedItem && typeof updatedItem === 'object') {
          store.inventory.updateItem(updatedItem);
        }
      } catch (error) {
        console.warn('Store에 항목 업데이트 실패:', error);
      }
      
      // 현재 페이지 데이터 강제 리패치하여 새로고침
      await queryClient.refetchQueries({ 
        queryKey: ['inventory', 'items', currentPage, pageSize, filter],
        exact: false 
      });
      await queryClient.refetchQueries({ queryKey: ['inventory', 'statistics'] });
      
      // 성공 메시지
      alert(`재고 "${updatedItem?.name || '항목'}"이(가) 성공적으로 수정되었습니다.`);
    },
    onError: (error: any) => {
      console.error('재고 수정 실패:', error);
      const errorMessage = error?.message || '재고 수정에 실패했습니다.';
      alert(errorMessage);
    },
  });

  // 초기 데이터 로드
  useEffect(() => {
    if (items.length === 0 && !isLoading) {
      handler.handleFetchItems();
    }
  }, [items.length, isLoading]);

  // 백엔드에서 받은 통계 데이터 사용 (없으면 기본값)
  const totalQuantity = statistics?.total_quantity ?? 0;
  const inStockCount = statistics?.in_stock_count ?? 0;
  const lowStockCount = statistics?.low_stock_count ?? 0;
  const outOfStockCount = statistics?.out_of_stock_count ?? 0;

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

  // 필터 변경 핸들러
  const handleFilterChange = (newFilter: 'all' | 'in_stock' | 'low_stock' | 'out_of_stock') => {
    setFilter(newFilter);
    setCurrentPage(1); // 필터 변경 시 첫 페이지로 이동
  };

  // 검색 핸들러
  const handleSearchQueryChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1); // 검색 시 첫 페이지로 이동
  };

  const handleSearchTypeChange = (type: 'all' | 'name' | 'category') => {
    setSearchType(type);
    setCurrentPage(1); // 검색 타입 변경 시 첫 페이지로 이동
  };

  // 정렬 핸들러
  const handleSortOrderChange = () => {
    setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
    setCurrentPage(1); // 정렬 변경 시 첫 페이지로 이동
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
      currentPage={currentPage}
      totalPages={totalPages}
      totalItems={totalItems}
      pageSize={pageSize}
      currentFilter={filter}
      onPageChange={setCurrentPage}
      onFilterChange={handleFilterChange}
      onDelete={handleDelete}
      onCreate={handleCreate}
      onUpdate={handleUpdate}
      onSelect={handler.handleSelectItem}
      onRefresh={() => {
        queryClient.invalidateQueries({ queryKey: ['inventory', 'items'] });
        handler.handleFetchItems();
      }}
      searchQuery={searchQuery}
      searchType={searchType}
      onSearchQueryChange={handleSearchQueryChange}
      onSearchTypeChange={handleSearchTypeChange}
      sortOrder={sortOrder}
      onSortOrderChange={handleSortOrderChange}
    />
  );
}

