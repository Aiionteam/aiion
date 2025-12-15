/**
 * Pathfinder API 함수
 * 백엔드 pathfinder-service와 통신
 */

import { fetchJSONFromGateway } from '../../lib/api/client';
import { Diary } from '../../components/types';

// 백엔드 응답 형식
interface Messenger {
  code: number;
  message: string;
  data?: any;
}

// 학습 추천 관련 타입
export interface LearningRecommendation {
  id: string;
  title: string;
  emoji: string;
  category: string;
  frequency: number;
  reason: string;
  relatedDiary: string;
  quickLearn: string;
  videos: VideoInfo[];
}

export interface VideoInfo {
  id: string;
  title: string;
  duration: string;
  thumbnail: string;
}

export interface CategoryInfo {
  id: string;
  name: string;
  emoji: string;
  count: number;
}

export interface RecommendationStats {
  discovered: number;
  inProgress: number;
  completed: number;
}

export interface ComprehensiveRecommendation {
  recommendations: LearningRecommendation[];
  popularTopics: string[];
  categories: CategoryInfo[];
  stats: RecommendationStats;
}

/**
 * 학습 추천 조회 (종합)
 */
export async function fetchRecommendations(userId: number): Promise<ComprehensiveRecommendation | null> {
  const endpoint = `/pathfinder/pathfinders/recommendations/${userId}`;
  console.log('[fetchRecommendations] API 호출 시작:', endpoint);
  
  try {
    const response = await fetchJSONFromGateway<Messenger>(
      endpoint,
      {},
      {
        method: 'GET',
      }
    );

    console.log('[fetchRecommendations] 응답 상태:', response.status);
    console.log('[fetchRecommendations] 응답 데이터:', response.data);
    console.log('[fetchRecommendations] 응답 에러:', response.error);

    // 네트워크 에러나 파싱 에러가 있는 경우
    if (response.error) {
      console.error('[fetchRecommendations] 응답 에러:', response.error);
      return null;
    }

    // 응답 데이터가 없는 경우
    if (!response.data) {
      console.warn('[fetchRecommendations] 응답 데이터가 없음');
      return null;
    }

    const messenger = response.data as Messenger;
    const responseCode = messenger?.code;
    
    // 응답 코드가 200이 아니면 null 반환
    if (responseCode !== 200) {
      console.warn('[fetchRecommendations] 응답 코드가 200이 아님:', responseCode, messenger.message);
      return null;
    }

    // data가 ComprehensiveRecommendation 형식인 경우
    if (messenger.data) {
      const recommendation = messenger.data as ComprehensiveRecommendation;
      console.log('[fetchRecommendations] 추천 데이터:', {
        recommendationsCount: recommendation.recommendations?.length || 0,
        popularTopicsCount: recommendation.popularTopics?.length || 0,
        categoriesCount: recommendation.categories?.length || 0,
      });
      return recommendation;
    }

    return null;
  } catch (error) {
    console.error('[fetchRecommendations] 예외 발생:', error);
    return null;
  }
}

/**
 * 간단 학습 추천 조회
 */
export async function fetchSimpleRecommendations(userId: number): Promise<LearningRecommendation[]> {
  const endpoint = `/pathfinder/pathfinders/recommendations/${userId}/simple`;
  console.log('[fetchSimpleRecommendations] API 호출 시작:', endpoint);
  
  try {
    const response = await fetchJSONFromGateway<Messenger>(
      endpoint,
      {},
      {
        method: 'GET',
      }
    );

    if (response.error || !response.data) {
      console.error('[fetchSimpleRecommendations] 응답 에러:', response.error);
      return [];
    }

    const messenger = response.data as Messenger;
    const responseCode = messenger?.code;
    
    if (responseCode !== 200) {
      console.warn('[fetchSimpleRecommendations] 응답 코드가 200이 아님:', responseCode);
      return [];
    }

    if (Array.isArray(messenger.data)) {
      return messenger.data as LearningRecommendation[];
    }

    return [];
  } catch (error) {
    console.error('[fetchSimpleRecommendations] 예외 발생:', error);
    return [];
  }
}

