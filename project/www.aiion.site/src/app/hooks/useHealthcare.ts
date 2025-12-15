'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchJSONFromGateway } from '../../lib/api/client';
import { getAccessToken } from '../../lib/api/client';

export interface HealthcareRecord {
  id: number;
  userId: number;
  type: string;
  recordDate: string;
  sleepHours?: number;
  nutrition?: string;
  steps?: number;
  weight?: number;
  bloodPressure?: string;
  condition?: string;
  weeklySummary?: string;
  recommendedRoutine?: string;
}

interface Messenger {
  code: number;
  message: string;
  data: HealthcareRecord[] | HealthcareRecord | null;
}

export const healthcareKeys = {
  all: ['healthcare'] as const,
  lists: () => [...healthcareKeys.all, 'list'] as const,
  list: (userId?: number | string) => [...healthcareKeys.lists(), userId] as const,
  details: () => [...healthcareKeys.all, 'detail'] as const,
  detail: (id: number) => [...healthcareKeys.details(), id] as const,
  analysis: () => [...healthcareKeys.all, 'analysis'] as const,
  analysisByUser: (userId?: number | string) => [...healthcareKeys.analysis(), userId] as const,
};

export interface HealthcareAnalysis {
  summary: {
    total_records: number;
    total_months: number;
    earliest_date: string | null;
    latest_date: string | null;
    avg_steps: number | null;
    avg_weight: number | null;
    avg_sleep_hours: number | null;
    records_with_steps: number;
    records_with_weight: number;
    records_with_sleep: number;
  };
  type_distribution: Array<{
    type: string;
    count: number;
    avg_steps: number | null;
    avg_weight: number | null;
    avg_sleep_hours: number | null;
  }>;
  condition_distribution: Array<{
    condition: string;
    count: number;
  }>;
  monthly_steps: Array<{
    month: string | null;
    avg_steps: number | null;
    max_steps: number | null;
    min_steps: number | null;
    record_count: number;
  }>;
  recent_activity: {
    recent_records: number;
    recent_avg_steps: number | null;
    recent_avg_weight: number | null;
  };
}

/**
 * JWT 토큰 기반 건강 기록 조회
 */
export function useHealthcareRecords() {
  const query = useQuery({
    queryKey: healthcareKeys.list('token'),
    queryFn: async () => {
      console.log('[useHealthcareRecords] API 호출 시작 (JWT 토큰 기반)');
      try {
        const token = getAccessToken();
        if (!token) {
          console.warn('[useHealthcareRecords] 토큰이 없음');
          return [];
        }

        const response = await fetchJSONFromGateway<Messenger>(
          '/healthcare/user',
          {},
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          }
        );

        console.log('[useHealthcareRecords] 응답 상태:', response.status);
        console.log('[useHealthcareRecords] 응답 데이터:', response.data);
        console.log('[useHealthcareRecords] 응답 에러:', response.error);

        // 404 에러 처리
        if (response.status === 404) {
          console.warn('[useHealthcareRecords] 404 에러: 엔드포인트를 찾을 수 없습니다.');
          // 404 응답도 JSON 형식일 수 있으므로 확인
          if (response.data && typeof response.data === 'object') {
            const messenger = response.data as Messenger;
            if (messenger.code) {
              console.warn('[useHealthcareRecords] Messenger 응답 코드:', messenger.code, messenger.message);
            }
          }
          return [];
        }

        if (response.error) {
          console.error('[useHealthcareRecords] 응답 에러:', response.error);
          return [];
        }

        if (!response.data) {
          console.warn('[useHealthcareRecords] 응답 데이터가 없음');
          return [];
        }

        // response.data가 Messenger 형식인지 확인
        const messenger = response.data as Messenger;
        
        // code 필드가 없으면 일반 객체일 수 있음
        if (typeof messenger.code === 'undefined') {
          console.warn('[useHealthcareRecords] code 필드가 없음, 응답 데이터:', response.data);
          // 배열인 경우 직접 반환
          if (Array.isArray(response.data)) {
            return response.data as HealthcareRecord[];
          }
          return [];
        }

        const responseCode = messenger.code;

        if (responseCode !== 200) {
          console.warn('[useHealthcareRecords] 응답 코드가 200이 아님:', responseCode, messenger.message);
          return [];
        }

        if (Array.isArray(messenger.data)) {
          console.log('[useHealthcareRecords] 건강 기록 조회 성공:', messenger.data.length, '개');
          return messenger.data;
        }

        if (messenger.data) {
          return [messenger.data];
        }

        return [];
      } catch (error) {
        console.error('[useHealthcareRecords] API 호출 중 에러:', error);
        return [];
      }
    },
    enabled: true,
    staleTime: 1000 * 30, // 30초
    refetchOnWindowFocus: true,
    retry: 1,
    retryDelay: 1000,
  });

  return query;
}

/**
 * JWT 토큰 기반 종합건강분석 조회
 */
export function useHealthcareAnalysis() {
  const query = useQuery({
    queryKey: healthcareKeys.analysisByUser('token'),
    queryFn: async () => {
      console.log('[useHealthcareAnalysis] API 호출 시작 (JWT 토큰 기반)');
      try {
        const token = getAccessToken();
        if (!token) {
          console.warn('[useHealthcareAnalysis] 토큰이 없음');
          return null;
        }

        const response = await fetchJSONFromGateway<Messenger>(
          '/healthcare/analysis',
          {},
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          }
        );

        console.log('[useHealthcareAnalysis] 응답 상태:', response.status);
        console.log('[useHealthcareAnalysis] 응답 데이터:', response.data);
        console.log('[useHealthcareAnalysis] 응답 에러:', response.error);

        if (response.status === 404) {
          console.warn('[useHealthcareAnalysis] 404 에러: 종합건강분석 데이터를 찾을 수 없습니다.');
          return null;
        }

        if (response.error) {
          console.error('[useHealthcareAnalysis] 응답 에러:', response.error);
          return null;
        }

        if (!response.data) {
          console.warn('[useHealthcareAnalysis] 응답 데이터가 없음');
          return null;
        }

        const messenger = response.data as Messenger;
        
        if (typeof messenger.code === 'undefined') {
          console.warn('[useHealthcareAnalysis] code 필드가 없음, 응답 데이터:', response.data);
          // JSON 문자열인 경우 파싱
          if (typeof response.data === 'string') {
            try {
              return JSON.parse(response.data) as HealthcareAnalysis;
            } catch (e) {
              console.error('[useHealthcareAnalysis] JSON 파싱 실패:', e);
              return null;
            }
          }
          return response.data as HealthcareAnalysis;
        }

        const responseCode = messenger.code;

        if (responseCode !== 200) {
          console.warn('[useHealthcareAnalysis] 응답 코드가 200이 아님:', responseCode, messenger.message);
          return null;
        }

        // data가 JSON 문자열인 경우 파싱
        if (typeof messenger.data === 'string') {
          try {
            const analysis = JSON.parse(messenger.data) as HealthcareAnalysis;
            console.log('[useHealthcareAnalysis] 종합건강분석 조회 성공');
            return analysis;
          } catch (e) {
            console.error('[useHealthcareAnalysis] JSON 파싱 실패:', e);
            return null;
          }
        }

        // data가 이미 객체인 경우
        if (messenger.data) {
          console.log('[useHealthcareAnalysis] 종합건강분석 조회 성공');
          return messenger.data as HealthcareAnalysis;
        }

        return null;
      } catch (error) {
        console.error('[useHealthcareAnalysis] API 호출 중 에러:', error);
        return null;
      }
    },
    enabled: true,
    staleTime: 1000 * 60 * 5, // 5분
    refetchOnWindowFocus: false,
    retry: 1,
    retryDelay: 1000,
  });

  return query;
}

