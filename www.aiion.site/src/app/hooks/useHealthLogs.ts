'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchJSONFromGateway } from '../../lib/api/client';
import { getAccessToken } from '../../lib/api/client';

export interface HealthLog {
  logId: number;
  userId: number;
  date: string;
  healthType: string;
  value: string;
  recommendation: string;
  notes: string;
}

interface Messenger {
  code: number;
  message: string;
  data: HealthLog[] | HealthLog | null;
}

export const healthLogKeys = {
  all: ['healthLogs'] as const,
  lists: () => [...healthLogKeys.all, 'list'] as const,
  list: (userId?: number | string) => [...healthLogKeys.lists(), userId] as const,
  details: () => [...healthLogKeys.all, 'detail'] as const,
  detail: (id: number) => [...healthLogKeys.details(), id] as const,
};

/**
 * JWT 토큰 기반 건강 기록 조회
 */
export function useHealthLogs() {
  const query = useQuery({
    queryKey: healthLogKeys.list('token'),
    queryFn: async () => {
      console.log('[useHealthLogs] API 호출 시작');
      try {
        const token = getAccessToken();
        if (!token) {
          console.warn('[useHealthLogs] 토큰이 없음');
          return [];
        }

        const response = await fetchJSONFromGateway<Messenger>(
          '/health-logs/user', // JWT 토큰 기반 조회
          {},
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          }
        );

        if (response.error || !response.data) {
          console.error('[useHealthLogs] 응답 에러:', response.error);
          return [];
        }

        const messenger = response.data as Messenger;
        
        if (messenger.code !== 200) {
          console.warn('[useHealthLogs] 응답 코드가 200이 아님:', messenger.code);
          return [];
        }

        if (Array.isArray(messenger.data)) {
          return messenger.data;
        }

        return [];
      } catch (error) {
        console.error('[useHealthLogs] API 호출 중 에러:', error);
        return [];
      }
    },
    enabled: true,
    staleTime: 1000 * 30,
    refetchOnWindowFocus: true,
  });

  return query;
}

