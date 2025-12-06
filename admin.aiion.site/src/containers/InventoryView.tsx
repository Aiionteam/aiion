/**
 * 재고 관리 View (Presentation Component)
 * 
 * UI 렌더링만 담당
 */

'use client';

import { useState, useEffect } from 'react';
import { type InventoryItem } from '@/service/inventoryService';

interface InventoryViewProps {
  items: InventoryItem[];
  isLoading: boolean;
  error: string | null;
  totalQuantity: number;
  inStockCount: number;
  lowStockCount: number;
  outOfStockCount: number;
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  currentFilter: 'all' | 'in_stock' | 'low_stock' | 'out_of_stock';
  onPageChange: (page: number) => void;
  onFilterChange: (filter: 'all' | 'in_stock' | 'low_stock' | 'out_of_stock') => void;
  onDelete: (itemId: string | number) => void;
  onCreate: (item: Omit<InventoryItem, 'id'>) => Promise<void>;
  onUpdate: (itemId: string | number, item: Partial<InventoryItem>) => Promise<void>;
  onSelect: (item: InventoryItem | null) => void;
  onRefresh: () => void;
  searchQuery: string;
  searchType: 'all' | 'name' | 'category';
  onSearchQueryChange: (value: string) => void;
  onSearchTypeChange: (type: 'all' | 'name' | 'category') => void;
  sortOrder: 'desc' | 'asc';
  onSortOrderChange: () => void;
}

// 재고 추가/수정 폼 모달 컴포넌트
function InventoryFormModal({
  isOpen,
  onClose,
  item,
  onSubmit,
  isSubmitting,
}: {
  isOpen: boolean;
  onClose: () => void;
  item: InventoryItem | null;
  onSubmit: (formData: Omit<InventoryItem, 'id'> | Partial<InventoryItem>) => Promise<void>;
  isSubmitting: boolean;
}) {
  const [formData, setFormData] = useState<Partial<InventoryItem>>({
    name: item?.name || '',
    category: item?.category || '',
    quantity: item?.quantity || 0,
    unitPrice: item?.unitPrice || 0,
    status: item?.status || 'available',
    location: item?.location || '',
    description: item?.description || '',
  });

  // item이 변경될 때 formData 업데이트
  useEffect(() => {
    if (item) {
      setFormData({
        name: item.name || '',
        category: item.category || '',
        quantity: item.quantity || 0,
        unitPrice: item.unitPrice || 0,
        status: item.status || 'available',
        location: item.location || '',
        description: item.description || '',
      });
    } else {
      setFormData({
        name: '',
        category: '',
        quantity: 0,
        unitPrice: 0,
        status: 'available',
        location: '',
        description: '',
      });
    }
  }, [item]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 폼 검증
    if (!formData.name || formData.name.trim() === '') {
      alert('제품명을 입력해주세요.');
      return;
    }
    
    if (!formData.category || formData.category.trim() === '') {
      alert('카테고리를 입력해주세요.');
      return;
    }
    
    if (formData.quantity === undefined || formData.quantity < 0) {
      alert('수량은 0 이상이어야 합니다.');
      return;
    }
    
    if (formData.unitPrice === undefined || formData.unitPrice < 0) {
      alert('단가는 0 이상이어야 합니다.');
      return;
    }
    
    try {
      await onSubmit(formData);
      onClose();
      // 성공 메시지는 Container에서 처리하므로 여기서는 모달만 닫기
      if (!item) {
        // 새 항목 추가인 경우에만 폼 초기화
        setFormData({
          name: '',
          category: '',
          quantity: 0,
          unitPrice: 0,
          status: 'available',
          location: '',
          description: '',
        });
      }
    } catch (error: any) {
      console.error('제출 실패:', error);
      const errorMessage = error?.message || (item ? '재고 수정에 실패했습니다.' : '재고 추가에 실패했습니다.');
      alert(errorMessage);
    }
  };

  if (!isOpen) {
    console.log('모달이 닫혀있음');
    return null;
  }

  console.log('모달 렌더링 중...');

  return (
    <div className="fixed inset-0 z-[9999] overflow-y-auto" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div 
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" 
          onClick={onClose}
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9998 }}
        ></div>
        
        <div 
          className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full relative z-[10000]"
          style={{ position: 'relative', zIndex: 10000 }}
        >
          <form onSubmit={handleSubmit}>
            <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                {item ? '재고 수정' : '새 재고 추가'}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    제품명 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value.trim() })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-slate-500 focus:border-slate-500 dark:bg-gray-700 dark:text-white"
                    placeholder="제품명을 입력하세요"
                    maxLength={255}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    카테고리 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.category || ''}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value.trim() })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-slate-500 focus:border-slate-500 dark:bg-gray-700 dark:text-white"
                    placeholder="카테고리를 입력하세요"
                    maxLength={100}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      수량 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="1"
                      value={formData.quantity || 0}
                      onChange={(e) => {
                        const value = parseInt(e.target.value) || 0;
                        const newQuantity = value >= 0 ? value : 0;
                        // 수량에 따라 상태 자동 설정
                        let newStatus = formData.status || 'available';
                        if (newQuantity === 0) {
                          newStatus = 'out_of_stock';
                        } else if (newQuantity < 20) {
                          newStatus = 'low_stock';
                        } else {
                          newStatus = 'available';
                        }
                        setFormData({ ...formData, quantity: newQuantity, status: newStatus });
                      }}
                      onBlur={(e) => {
                        const value = parseInt(e.target.value) || 0;
                        if (value < 0) {
                          setFormData({ ...formData, quantity: 0, status: 'out_of_stock' });
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-slate-500 focus:border-slate-500 dark:bg-gray-700 dark:text-white"
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      단가 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={formData.unitPrice || 0}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value) || 0;
                        setFormData({ ...formData, unitPrice: value >= 0 ? value : 0 });
                      }}
                      onBlur={(e) => {
                        const value = parseFloat(e.target.value) || 0;
                        if (value < 0) {
                          setFormData({ ...formData, unitPrice: 0 });
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-slate-500 focus:border-slate-500 dark:bg-gray-700 dark:text-white"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    상태
                  </label>
                  <select
                    value={formData.status || 'available'}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-slate-500 focus:border-slate-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="available">재고 있음</option>
                    <option value="low_stock">재고 부족</option>
                    <option value="out_of_stock">품절</option>
                    <option value="on_order">주문 중</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    위치
                  </label>
                  <input
                    type="text"
                    value={formData.location || ''}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value.trim() })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-slate-500 focus:border-slate-500 dark:bg-gray-700 dark:text-white"
                    placeholder="위치를 입력하세요 (선택사항)"
                    maxLength={255}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    설명
                  </label>
                  <textarea
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-slate-500 focus:border-slate-500 dark:bg-gray-700 dark:text-white"
                    placeholder="설명을 입력하세요 (선택사항)"
                  />
                </div>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-slate-900 dark:bg-slate-100 text-base font-medium text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
              >
                {isSubmitting ? '처리 중...' : item ? '수정' : '추가'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
              >
                취소
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export function InventoryView({
  items,
  isLoading,
  error,
  totalQuantity,
  inStockCount,
  lowStockCount,
  outOfStockCount,
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  currentFilter,
  onPageChange,
  onFilterChange,
  onDelete,
  onCreate,
  onUpdate,
  onSelect,
  onRefresh,
  searchQuery,
  searchType,
  onSearchQueryChange,
  onSearchTypeChange,
  sortOrder,
  onSortOrderChange,
}: InventoryViewProps) {
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const getStatusColor = (status: string) => {
    switch (status) {
      case '재고 있음':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case '재고 부족':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case '품절':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const calculateStatus = (quantity: number): string => {
    if (quantity === 0) return '품절';
    if (quantity < 20) return '재고 부족';
    return '재고 있음';
  };

  const handleOpenCreateModal = () => {
    console.log('모달 열기 버튼 클릭됨');
    setSelectedItem(null);
    setIsFormModalOpen(true);
    console.log('isFormModalOpen:', true);
  };

  const handleOpenEditModal = (item: InventoryItem) => {
    setSelectedItem(item);
    setIsFormModalOpen(true);
    onSelect(item);
  };

  const handleCloseModal = () => {
    setIsFormModalOpen(false);
    setSelectedItem(null);
    onSelect(null);
  };

  const handleFormSubmit = async (formData: Omit<InventoryItem, 'id'> | Partial<InventoryItem>) => {
    setIsSubmitting(true);
    try {
      if (selectedItem && selectedItem.id) {
        await onUpdate(selectedItem.id, formData);
      } else {
        await onCreate(formData as Omit<InventoryItem, 'id'>);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // 로딩 상태
  if (isLoading) {
    return (
      <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin h-12 w-12 text-slate-900 dark:text-slate-100 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-gray-600 dark:text-gray-400">재고 목록을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  // 에러 상태
  if (error) {
    return (
      <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">재고 관리</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">재고 현황을 확인하고 관리하세요</p>
          </div>
        </div>
        <div className="px-6 py-6">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-800 dark:text-red-400">{error}</p>
            <button
              onClick={onRefresh}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              다시 시도
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
      {/* 헤더 */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">재고 관리</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">재고 현황을 확인하고 관리하세요</p>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <button
            onClick={() => onFilterChange('all')}
            className={`bg-white dark:bg-gray-800 rounded-lg border p-6 text-left transition-all hover:shadow-md ${
              currentFilter === 'all'
                ? 'border-blue-500 dark:border-blue-400 ring-2 ring-blue-500 dark:ring-blue-400'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">전체 재고</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{totalQuantity.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
            </div>
          </button>

          <button
            onClick={() => onFilterChange('in_stock')}
            className={`bg-white dark:bg-gray-800 rounded-lg border p-6 text-left transition-all hover:shadow-md ${
              currentFilter === 'in_stock'
                ? 'border-green-500 dark:border-green-400 ring-2 ring-green-500 dark:ring-green-400'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">재고 있음</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">{inStockCount}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </button>

          <button
            onClick={() => onFilterChange('low_stock')}
            className={`bg-white dark:bg-gray-800 rounded-lg border p-6 text-left transition-all hover:shadow-md ${
              currentFilter === 'low_stock'
                ? 'border-yellow-500 dark:border-yellow-400 ring-2 ring-yellow-500 dark:ring-yellow-400'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">재고 부족</p>
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400 mt-1">{lowStockCount}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>
          </button>

          <button
            onClick={() => onFilterChange('out_of_stock')}
            className={`bg-white dark:bg-gray-800 rounded-lg border p-6 text-left transition-all hover:shadow-md ${
              currentFilter === 'out_of_stock'
                ? 'border-red-500 dark:border-red-400 ring-2 ring-red-500 dark:ring-red-400'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">품절</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">{outOfStockCount}</p>
              </div>
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            </div>
          </button>
        </div>

        {/* 재고 목록 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">재고 목록</h2>
              <button 
                onClick={handleOpenCreateModal}
                className="px-4 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-sm font-medium rounded-lg hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors"
              >
                + 새 재고 추가
              </button>
            </div>
            {/* 검색창 */}
            <div className="flex gap-2 items-center">
              <div className="relative">
                <select
                  value={searchType}
                  onChange={(e) => onSearchTypeChange(e.target.value as 'all' | 'name' | 'category')}
                  className="px-4 py-2 pr-8 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 appearance-none cursor-pointer"
                >
                  <option value="all">전체</option>
                  <option value="name">제품명</option>
                  <option value="category">카테고리</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                  <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="검색어를 입력하세요..."
                  value={searchQuery}
                  onChange={(e) => onSearchQueryChange(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.currentTarget.blur();
                    }
                  }}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                />
              </div>
              <button
                onClick={() => {
                  // 검색 실행 (queryKey 변경으로 자동 실행됨)
                  onPageChange(1);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium whitespace-nowrap"
              >
                검색
              </button>
              <button
                onClick={onSortOrderChange}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors text-sm font-medium whitespace-nowrap flex items-center gap-1"
                title={sortOrder === 'desc' ? '내림차순 (최신순)' : '오름차순 (오래된순)'}
              >
                {sortOrder === 'desc' ? (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                    내림차순
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                    오름차순
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">제품 ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">제품명</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">카테고리</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">수량</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">단가</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">상태</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">위치</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">작업</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                      재고 항목이 없습니다.
                    </td>
                  </tr>
                ) : (
                  items.map((item) => {
                    const status = item.status || calculateStatus(item.quantity || 0);
                    return (
                      <tr key={item.id || `item-${item.name}`} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{item.id || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{item.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">{item.category}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{(item.quantity || 0).toLocaleString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">₩{(item.unitPrice || 0).toLocaleString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(status)}`}>
                            {status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">{item.location || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button 
                            onClick={() => handleOpenEditModal(item)}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-4"
                          >
                            수정
                          </button>
                          {item.id && (
                            <button 
                              onClick={() => onDelete(item.id!)}
                              className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                            >
                              삭제
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* 페이징 컨트롤 */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div className="text-sm text-gray-700 dark:text-gray-300">
                전체 <span className="font-medium">{totalItems.toLocaleString()}</span>개 중{' '}
                <span className="font-medium">
                  {((currentPage - 1) * pageSize + 1).toLocaleString()}
                </span>
                -{' '}
                <span className="font-medium">
                  {Math.min(currentPage * pageSize, totalItems).toLocaleString()}
                </span>
                개 표시
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => onPageChange(1)}
                  disabled={currentPage === 1}
                  className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  처음
                </button>
                <button
                  onClick={() => onPageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  이전
                </button>
                
                {/* 페이지 번호 표시 */}
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => onPageChange(pageNum)}
                        className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                          currentPage === pageNum
                            ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900'
                            : 'text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => onPageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  다음
                </button>
                <button
                  onClick={() => onPageChange(totalPages)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  마지막
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 재고 추가/수정 모달 */}
      <InventoryFormModal
        isOpen={isFormModalOpen}
        onClose={handleCloseModal}
        item={selectedItem}
        onSubmit={handleFormSubmit}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}

