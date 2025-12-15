// 재고 관리 서비스 API 호출 함수

export interface InventoryItem {
  id?: number | string;
  name: string;
  category: string;
  quantity: number;
  unitPrice: number;
  status?: string;
  location?: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface InventoryResponse {
  items: InventoryItem[];
  total?: number;
  message?: string;
}

export interface InventoryStatistics {
  total_quantity: number;
  in_stock_count: number;
  low_stock_count: number;
  out_of_stock_count: number;
  total_items: number;
}

// 백엔드 응답 형식 (snake_case)
interface BackendInventoryItem {
  id: number;
  name: string;
  category: string;
  quantity: number;
  unit_price: number | string;
  status?: string;
  location?: string | null;
  description?: string | null;
  created_at?: string;
  updated_at?: string;
}

interface BackendInventoryResponse {
  items: BackendInventoryItem[];
  total: number;
  message?: string;
}

export interface InventoryListParams {
  skip?: number;
  limit?: number;
  name?: string;
  category?: string;
  status?: string;
  location?: string;
  quantity_min?: number;
  quantity_max?: number;
  order_by?: string; // 'desc' 또는 'asc'
}

// 백엔드 형식을 프론트엔드 형식으로 변환
function transformBackendToFrontend(backendItem: BackendInventoryItem): InventoryItem {
  return {
    id: backendItem.id,
    name: backendItem.name,
    category: backendItem.category,
    quantity: backendItem.quantity,
    unitPrice: typeof backendItem.unit_price === 'string' 
      ? parseFloat(backendItem.unit_price) 
      : backendItem.unit_price,
    status: backendItem.status || 'available',
    location: backendItem.location || undefined,
    description: backendItem.description || undefined,
    createdAt: backendItem.created_at,
    updatedAt: backendItem.updated_at,
  };
}

// 프론트엔드 형식을 백엔드 형식으로 변환
function transformFrontendToBackend(item: Partial<InventoryItem>): any {
  const backendItem: any = {};
  
  if (item.name !== undefined) backendItem.name = item.name;
  if (item.category !== undefined) backendItem.category = item.category;
  if (item.quantity !== undefined) backendItem.quantity = item.quantity;
  if (item.unitPrice !== undefined) backendItem.unit_price = item.unitPrice;
  if (item.status !== undefined) backendItem.status = item.status;
  if (item.location !== undefined) backendItem.location = item.location || null;
  if (item.description !== undefined) backendItem.description = item.description || null;
  
  return backendItem;
}

// API Gateway URL 가져오기
const getGatewayUrl = () => {
  return process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:8080';
};

// 인증 토큰 가져오기
const getAuthToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('access_token');
  }
  return null;
};

// API 요청 헤더 생성
const getHeaders = (): HeadersInit => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
};

/**
 * 재고 목록 조회 (페이징 지원)
 */
export async function getInventoryItems(params?: InventoryListParams): Promise<{ items: InventoryItem[]; total: number }> {
  try {
    const gatewayUrl = getGatewayUrl();
    const queryParams = new URLSearchParams();
    
    if (params?.skip !== undefined) {
      queryParams.append('skip', params.skip.toString());
    }
    if (params?.limit !== undefined) {
      queryParams.append('limit', params.limit.toString());
    }
    if (params?.name) {
      queryParams.append('name', params.name);
    }
    if (params?.category) {
      queryParams.append('category', params.category);
    }
    if (params?.status) {
      queryParams.append('status', params.status);
    }
    if (params?.location) {
      queryParams.append('location', params.location);
    }
    if (params?.quantity_min !== undefined) {
      queryParams.append('quantity_min', params.quantity_min.toString());
    }
    if (params?.quantity_max !== undefined) {
      queryParams.append('quantity_max', params.quantity_max.toString());
    }
    if (params?.order_by) {
      queryParams.append('order_by', params.order_by);
    }
    
    const queryString = queryParams.toString();
    const url = `${gatewayUrl}/inventory/items${queryString ? `?${queryString}` : ''}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: getHeaders(),
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`재고 목록 조회 실패: ${response.statusText}`);
    }

    const data: BackendInventoryResponse = await response.json();
    return {
      items: (data.items || []).map(transformBackendToFrontend),
      total: data.total || 0,
    };
  } catch (error) {
    console.error('재고 목록 조회 오류:', error);
    throw error;
  }
}

/**
 * 특정 재고 조회
 */
export async function getInventoryItem(itemId: string | number): Promise<InventoryItem> {
  try {
    const gatewayUrl = getGatewayUrl();
    const response = await fetch(`${gatewayUrl}/inventory/items/${itemId}`, {
      method: 'GET',
      headers: getHeaders(),
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`재고 조회 실패: ${response.statusText}`);
    }

    const data: BackendInventoryItem = await response.json();
    return transformBackendToFrontend(data);
  } catch (error) {
    console.error('재고 조회 오류:', error);
    throw error;
  }
}

/**
 * 재고 추가
 */
export async function createInventoryItem(item: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<InventoryItem> {
  try {
    const gatewayUrl = getGatewayUrl();
    const backendItem = transformFrontendToBackend(item);
    
    const response = await fetch(`${gatewayUrl}/inventory/items`, {
      method: 'POST',
      headers: getHeaders(),
      credentials: 'include',
      body: JSON.stringify(backendItem),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`재고 추가 실패: ${response.statusText} - ${errorText}`);
    }

    const data: BackendInventoryItem = await response.json();
    return transformBackendToFrontend(data);
  } catch (error) {
    console.error('재고 추가 오류:', error);
    throw error;
  }
}

/**
 * 재고 수정
 */
export async function updateInventoryItem(
  itemId: string | number,
  item: Partial<InventoryItem>
): Promise<InventoryItem> {
  try {
    const gatewayUrl = getGatewayUrl();
    const backendItem = transformFrontendToBackend(item);
    
    const response = await fetch(`${gatewayUrl}/inventory/items/${itemId}`, {
      method: 'PUT',
      headers: getHeaders(),
      credentials: 'include',
      body: JSON.stringify(backendItem),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`재고 수정 실패: ${response.statusText} - ${errorText}`);
    }

    const data: BackendInventoryItem = await response.json();
    return transformBackendToFrontend(data);
  } catch (error) {
    console.error('재고 수정 오류:', error);
    throw error;
  }
}

/**
 * 재고 삭제
 */
export async function deleteInventoryItem(itemId: string | number): Promise<void> {
  try {
    const gatewayUrl = getGatewayUrl();
    const response = await fetch(`${gatewayUrl}/inventory/items/${itemId}`, {
      method: 'DELETE',
      headers: getHeaders(),
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`재고 삭제 실패: ${response.statusText}`);
    }
  } catch (error) {
    console.error('재고 삭제 오류:', error);
    throw error;
  }
}

/**
 * 재고 통계 조회
 */
export async function getInventoryStatistics(): Promise<InventoryStatistics> {
  try {
    const gatewayUrl = getGatewayUrl();
    const response = await fetch(`${gatewayUrl}/inventory/statistics`, {
      method: 'GET',
      headers: getHeaders(),
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`재고 통계 조회 실패: ${response.statusText}`);
    }

    const data: InventoryStatistics = await response.json();
    return data;
  } catch (error) {
    console.error('재고 통계 조회 오류:', error);
    throw error;
  }
}

