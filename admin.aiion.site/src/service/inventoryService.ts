// 재고 관리 서비스 API 호출 함수

export interface InventoryItem {
  id?: string;
  name: string;
  category: string;
  quantity: number;
  unitPrice: number;
  status?: string;
  location?: string;
}

export interface InventoryResponse {
  items: InventoryItem[];
  message?: string;
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
 * 재고 목록 조회
 */
export async function getInventoryItems(): Promise<InventoryItem[]> {
  try {
    const gatewayUrl = getGatewayUrl();
    const response = await fetch(`${gatewayUrl}/inventory/items`, {
      method: 'GET',
      headers: getHeaders(),
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`재고 목록 조회 실패: ${response.statusText}`);
    }

    const data: InventoryResponse = await response.json();
    return data.items || [];
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

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('재고 조회 오류:', error);
    throw error;
  }
}

/**
 * 재고 추가
 */
export async function createInventoryItem(item: Omit<InventoryItem, 'id'>): Promise<InventoryItem> {
  try {
    const gatewayUrl = getGatewayUrl();
    const response = await fetch(`${gatewayUrl}/inventory/items`, {
      method: 'POST',
      headers: getHeaders(),
      credentials: 'include',
      body: JSON.stringify(item),
    });

    if (!response.ok) {
      throw new Error(`재고 추가 실패: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
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
    const response = await fetch(`${gatewayUrl}/inventory/items/${itemId}`, {
      method: 'PUT',
      headers: getHeaders(),
      credentials: 'include',
      body: JSON.stringify(item),
    });

    if (!response.ok) {
      throw new Error(`재고 수정 실패: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
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

