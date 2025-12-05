'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchJSONFromGateway } from '../../lib/api/client';
import { getAccessToken } from '../../lib/api/client';

export interface ScanDocument {
  docId: number;
  userId: number;
  docType: string;
  uploadedAt: string;
  parsedData: string; // JSON 문자열
  hospitalSuggestion: string;
}

interface Messenger {
  code: number;
  message: string;
  data: ScanDocument[] | ScanDocument | null;
}

export const scanDocumentKeys = {
  all: ['scanDocuments'] as const,
  lists: () => [...scanDocumentKeys.all, 'list'] as const,
  list: (userId?: number | string) => [...scanDocumentKeys.lists(), userId] as const,
  details: () => [...scanDocumentKeys.all, 'detail'] as const,
  detail: (id: number) => [...scanDocumentKeys.details(), id] as const,
};

/**
 * JWT 토큰 기반 스캔 문서 조회
 */
export function useScanDocuments() {
  const query = useQuery({
    queryKey: scanDocumentKeys.list('token'),
    queryFn: async () => {
      console.log('[useScanDocuments] API 호출 시작');
      try {
        const token = getAccessToken();
        if (!token) {
          console.warn('[useScanDocuments] 토큰이 없음');
          return [];
        }

        const response = await fetchJSONFromGateway<Messenger>(
          '/scan-documents/user', // JWT 토큰 기반 조회
          {},
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          }
        );

        if (response.error || !response.data) {
          console.error('[useScanDocuments] 응답 에러:', response.error);
          return [];
        }

        const messenger = response.data as Messenger;
        
        if (messenger.code !== 200) {
          console.warn('[useScanDocuments] 응답 코드가 200이 아님:', messenger.code);
          return [];
        }

        if (Array.isArray(messenger.data)) {
          return messenger.data;
        }

        return [];
      } catch (error) {
        console.error('[useScanDocuments] API 호출 중 에러:', error);
        return [];
      }
    },
    enabled: true,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });

  return query;
}

