/**
 * 일기 React Query Hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { fetchDiariesByUserId, fetchDiaries, createDiary, updateDiary, deleteDiary } from './useDiaryApi';
import { Diary } from '../../components/types';
import { useStore } from '../../store';

// Query Keys
export const diaryKeys = {
  all: ['diaries'] as const,
  lists: () => [...diaryKeys.all, 'list'] as const,
  list: (userId: number | string) => [...diaryKeys.lists(), userId] as const, // JWT 토큰 기반 조회를 위해 string도 허용
  allList: () => [...diaryKeys.lists(), 'all'] as const,
  details: () => [...diaryKeys.all, 'detail'] as const,
  detail: (id: string) => [...diaryKeys.details(), id] as const,
};

/**
 * 사용자별 일기 목록 조회
 */
export function useDiaries(userId?: number) {
  const currentUserId = useStore((state) => state.user?.user?.id);
  const userState = useStore((state) => state.user);
  
  // userId가 명시적으로 전달되면 해당 userId 사용, 아니면 JWT 토큰 기반 조회
  const targetUserId = userId !== undefined ? userId : undefined;
  
  console.log('[useDiaries] userId 확인:', { 
    userId, 
    targetUserId,
    currentUserId, 
    userState,
    userStateUser: userState?.user,
    willUseToken: targetUserId === undefined, // userId가 없으면 토큰 기반 조회
    willUseExplicitUserId: targetUserId !== undefined // userId가 명시되면 해당 userId 사용
  });

  // 쿼리 키: userId가 명시되면 해당 userId 사용, 아니면 'token' 사용
  const queryKey = targetUserId !== undefined 
    ? diaryKeys.list(targetUserId) 
    : diaryKeys.list('token');
  
  const query = useQuery({
    queryKey: queryKey,
    queryFn: async () => {
      if (targetUserId !== undefined) {
        console.log('[useDiaries] API 호출 시작 (명시적 userId):', targetUserId);
      } else {
        console.log('[useDiaries] API 호출 시작 (JWT 토큰 기반)');
      }
      try {
        // userId가 명시되면 해당 userId 사용, 아니면 undefined 전달 (토큰에서 자동 추출)
        const result = await fetchDiariesByUserId(targetUserId);
        console.log('[useDiaries] API 호출 결과:', result?.length, '개');
        
        // 결과가 없어도 null이 아닌 빈 배열이면 정상 응답으로 처리
        return result || [];
      } catch (error) {
        console.error('[useDiaries] API 호출 중 에러:', error);
        // 에러를 throw하여 React Query가 retry 할 수 있도록 함
        throw error;
      }
    },
    enabled: true, // 항상 실행
    staleTime: 0, // 항상 최신 데이터 사용 (캐시 문제 방지)
    gcTime: 1000 * 60 * 5, // 5분 동안 캐시 유지 (React Query v5)
    refetchOnWindowFocus: true, // 포커스 시 다시 가져오기
    refetchOnMount: true, // 마운트 시 다시 가져오기
    refetchOnReconnect: true, // 재연결 시 다시 가져오기
    retry: 3, // 재시도 3회로 증가
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // 지수 백오프
  });

  // React Query v5에서는 onSuccess/onError 대신 useEffect 사용
  useEffect(() => {
    if (query.isSuccess && query.data) {
      console.log('[useDiaries] ✅ API 호출 성공:', query.data?.length, '개의 일기');
      if (query.data.length === 0) {
        console.warn('[useDiaries] ⚠️ 일기 데이터가 비어있습니다.');
      }
    }
  }, [query.isSuccess, query.data]);

  useEffect(() => {
    if (query.isError) {
      console.error('[useDiaries] ❌ API 호출 실패:', query.error);
      console.error('[useDiaries] 에러 상세:', {
        message: (query.error as Error)?.message,
        stack: (query.error as Error)?.stack,
      });
      // 401 에러인 경우 토큰 문제일 가능성 높음
      if ((query.error as any)?.status === 401) {
        console.error('[useDiaries] 🔑 인증 토큰 문제: 로그아웃 후 재로그인이 필요할 수 있습니다.');
      }
    }
  }, [query.isError, query.error]);
  
  useEffect(() => {
    console.log('[useDiaries] 📊 상태 변경:', {
      isLoading: query.isLoading,
      isSuccess: query.isSuccess,
      isError: query.isError,
      dataLength: query.data?.length,
      error: query.error ? (query.error as Error).message : null,
      isFetching: query.isFetching, // 백그라운드에서 데이터를 가져오는 중인지
      isRefetching: query.isRefetching, // 리페칭 중인지
    });
  }, [query.isLoading, query.isSuccess, query.isError, query.data, query.error, query.isFetching, query.isRefetching]);

  return query;
}

/**
 * 전체 일기 목록 조회
 */
export function useAllDiaries() {
  console.log('[useAllDiaries] 전체 일기 조회 시작');

  const query = useQuery({
    queryKey: diaryKeys.allList(),
    queryFn: async () => {
      console.log('[useAllDiaries] API 호출 시작');
      try {
        const result = await fetchDiaries();
        console.log('[useAllDiaries] API 호출 결과:', result?.length, '개');
        return result || [];
      } catch (error) {
        console.error('[useAllDiaries] API 호출 중 에러:', error);
        return [];
      }
    },
    enabled: true,
    staleTime: 1000 * 30, // 30초
    refetchOnWindowFocus: true,
    retry: 1,
    retryDelay: 1000,
  });

  useEffect(() => {
    if (query.isSuccess && query.data) {
      console.log('[useAllDiaries] API 호출 성공:', query.data?.length, '개의 일기');
    }
  }, [query.isSuccess, query.data]);

  useEffect(() => {
    if (query.isError) {
      console.error('[useAllDiaries] API 호출 실패:', query.error);
    }
  }, [query.isError, query.error]);

  return query;
}

/**
 * 일기 생성 Mutation
 */
export function useCreateDiary() {
  const queryClient = useQueryClient();
  const userId = useStore((state) => state.user?.user?.id);

  return useMutation({
    mutationFn: (diary: Diary) => {
      // 로그인한 사용자의 ID가 필수
      if (!userId) {
        console.error('[useCreateDiary] ❌ 로그인한 사용자 ID가 없습니다!');
        throw new Error('로그인이 필요합니다. 일기를 저장하려면 먼저 로그인해주세요.');
      }
      console.log('[useCreateDiary] 일기 저장 시작:', { diary, userId });
      return createDiary(diary, userId);
    },
    onSuccess: () => {
      console.log('[useCreateDiary] 일기 저장 성공, 리스트 갱신');
      // JWT 토큰 기반 조회 캐시 무효화
      queryClient.invalidateQueries({ queryKey: diaryKeys.list('token') });
      // 전체 일기 목록 캐시 무효화
      queryClient.invalidateQueries({ queryKey: diaryKeys.allList() });
      console.log('[useCreateDiary] 캐시 무효화 완료, 일기 리스트 자동 갱신 예정');
    },
    onError: (error) => {
      console.error('[useCreateDiary] 일기 저장 실패:', error);
    },
  });
}

/**
 * 일기 수정 Mutation
 */
export function useUpdateDiary() {
  const queryClient = useQueryClient();
  const userId = useStore((state) => state.user?.user?.id);

  return useMutation({
    mutationFn: (diary: Diary) => {
      // 로그인한 사용자의 ID가 필수
      if (!userId) {
        console.error('[useUpdateDiary] ❌ 로그인한 사용자 ID가 없습니다!');
        throw new Error('로그인이 필요합니다. 일기를 수정하려면 먼저 로그인해주세요.');
      }
      console.log('[useUpdateDiary] 일기 수정 시작:', { diary, userId });
      return updateDiary(diary, userId);
    },
    onSuccess: (updatedDiary) => {
      console.log('[useUpdateDiary] 일기 수정 성공, 리스트 갱신:', updatedDiary);
      // JWT 토큰 기반 조회 캐시 무효화
      queryClient.invalidateQueries({ queryKey: diaryKeys.list('token') });
      // 전체 일기 목록 캐시 무효화
      queryClient.invalidateQueries({ queryKey: diaryKeys.allList() });
      // 특정 일기 상세 캐시도 무효화
      if (updatedDiary?.id) {
        queryClient.invalidateQueries({ queryKey: diaryKeys.detail(updatedDiary.id) });
      }
      console.log('[useUpdateDiary] 캐시 무효화 완료, 일기 리스트 자동 갱신 예정');
    },
    onError: (error) => {
      console.error('[useUpdateDiary] 일기 수정 실패:', error);
    },
  });
}

/**
 * 일기 삭제 Mutation
 */
export function useDeleteDiary() {
  const queryClient = useQueryClient();
  const userId = useStore((state) => state.user?.user?.id);

  return useMutation({
    mutationFn: (diary: Diary) => {
      // 로그인한 사용자의 ID가 필수
      if (!userId) {
        console.error('[useDeleteDiary] ❌ 로그인한 사용자 ID가 없습니다!');
        throw new Error('로그인이 필요합니다. 일기를 삭제하려면 먼저 로그인해주세요.');
      }
      console.log('[useDeleteDiary] 일기 삭제 시작:', { diary, userId });
      return deleteDiary(diary, userId);
    },
    onSuccess: () => {
      console.log('[useDeleteDiary] 일기 삭제 성공, 리스트 갱신');
      // JWT 토큰 기반 조회 캐시 무효화
      queryClient.invalidateQueries({ queryKey: diaryKeys.list('token') });
      // 전체 일기 목록 캐시 무효화
      queryClient.invalidateQueries({ queryKey: diaryKeys.allList() });
      console.log('[useDeleteDiary] 캐시 무효화 완료, 일기 리스트 자동 갱신 예정');
    },
  });
}

