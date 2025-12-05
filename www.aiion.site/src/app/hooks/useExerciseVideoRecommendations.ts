'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchJSONFromGateway } from '../../lib/api/client';
import { getAccessToken } from '../../lib/api/client';

export interface ExerciseVideoRecommendation {
  recId: number;
  userId: number;
  exerciseType: string;
  youtubeQuery: string;
  videoId: string;
  recommendedAt: string;
}

interface Messenger {
  code: number;
  message: string;
  data: ExerciseVideoRecommendation[] | ExerciseVideoRecommendation | null;
}

export const exerciseVideoRecommendationKeys = {
  all: ['exerciseVideoRecommendations'] as const,
  lists: () => [...exerciseVideoRecommendationKeys.all, 'list'] as const,
  list: (userId?: number | string) => [...exerciseVideoRecommendationKeys.lists(), userId] as const,
  details: () => [...exerciseVideoRecommendationKeys.all, 'detail'] as const,
  detail: (id: number) => [...exerciseVideoRecommendationKeys.details(), id] as const,
};

/**
 * JWT 토큰 기반 운동 영상 추천 조회
 */
export function useExerciseVideoRecommendations() {
  const query = useQuery({
    queryKey: exerciseVideoRecommendationKeys.list('token'),
    queryFn: async () => {
      console.log('[useExerciseVideoRecommendations] API 호출 시작');
      try {
        const token = getAccessToken();
        if (!token) {
          console.warn('[useExerciseVideoRecommendations] 토큰이 없음');
          return [];
        }

        const response = await fetchJSONFromGateway<Messenger>(
          '/exercise-video-recommendations/user', // JWT 토큰 기반 조회
          {},
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          }
        );

        if (response.error || !response.data) {
          console.error('[useExerciseVideoRecommendations] 응답 에러:', response.error);
          return [];
        }

        const messenger = response.data as Messenger;
        
        if (messenger.code !== 200) {
          console.warn('[useExerciseVideoRecommendations] 응답 코드가 200이 아님:', messenger.code);
          return [];
        }

        if (Array.isArray(messenger.data)) {
          return messenger.data;
        }

        return [];
      } catch (error) {
        console.error('[useExerciseVideoRecommendations] API 호출 중 에러:', error);
        return [];
      }
    },
    enabled: true,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });

  return query;
}

