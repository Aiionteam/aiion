'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchJSONFromGateway } from '../../lib/api/client';
import { getAccessToken } from '../../lib/api/client';

export interface ExerciseLog {
  logId: number;
  userId: number;
  date: string;
  exerciseType: string;
  durationMinutes: number;
  intensity: string;
  mood: string;
  notes: string;
}

interface Messenger {
  code: number;
  message: string;
  data: ExerciseLog[] | ExerciseLog | null;
}

export const exerciseLogKeys = {
  all: ['exerciseLogs'] as const,
  lists: () => [...exerciseLogKeys.all, 'list'] as const,
  list: (userId?: number | string) => [...exerciseLogKeys.lists(), userId] as const,
  details: () => [...exerciseLogKeys.all, 'detail'] as const,
  detail: (id: number) => [...exerciseLogKeys.details(), id] as const,
};

/**
 * JWT 토큰 기반 운동 기록 조회
 */
export function useExerciseLogs() {
  const query = useQuery({
    queryKey: exerciseLogKeys.list('token'),
    queryFn: async () => {
      console.log('[useExerciseLogs] API 호출 시작');
      try {
        const token = getAccessToken();
        if (!token) {
          console.warn('[useExerciseLogs] 토큰이 없음');
          return [];
        }

        const response = await fetchJSONFromGateway<Messenger>(
          '/exercise-logs/user', // JWT 토큰 기반 조회
          {},
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          }
        );

        if (response.error || !response.data) {
          console.error('[useExerciseLogs] 응답 에러:', response.error);
          return [];
        }

        const messenger = response.data as Messenger;
        
        if (messenger.code !== 200) {
          console.warn('[useExerciseLogs] 응답 코드가 200이 아님:', messenger.code);
          return [];
        }

        if (Array.isArray(messenger.data)) {
          return messenger.data;
        }

        return [];
      } catch (error) {
        console.error('[useExerciseLogs] API 호출 중 에러:', error);
        return [];
      }
    },
    enabled: true,
    staleTime: 1000 * 30,
    refetchOnWindowFocus: true,
  });

  return query;
}

