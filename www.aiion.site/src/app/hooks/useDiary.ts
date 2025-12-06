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
  // JWT 토큰 기반 조회로 변경: userId 파라미터는 선택적 (하위 호환성 유지)
  // 토큰이 있으면 백엔드에서 자동으로 userId 추출

  console.log('[useDiaries] userId 확인:', { 
    userId, 
    currentUserId, 
    userState,
    userStateUser: userState?.user,
    willUseToken: true // 항상 토큰 기반 조회 사용
  });

  // JWT 토큰 기반 조회를 위한 쿼리 키 (항상 'token' 사용)
  const queryKey = diaryKeys.list('token');
  
  const query = useQuery({
    queryKey: queryKey, // 항상 'token' 키 사용 (JWT 토큰에서 userId 자동 추출)
    queryFn: async () => {
      console.log('[useDiaries] API 호출 시작 (JWT 토큰 기반)');
      try {
        // userId를 전달하지 않으면 백엔드에서 토큰에서 자동 추출
        const result = await fetchDiariesByUserId(undefined);
        console.log('[useDiaries] API 호출 결과:', result?.length, '개');
        return result || [];
      } catch (error) {
        console.error('[useDiaries] API 호출 중 에러:', error);
        // 에러가 발생해도 빈 배열 반환
        return [];
      }
    },
    enabled: true, // 항상 실행 (토큰이 있으면 자동으로 처리)
    staleTime: 1000 * 30, // 30초 (더 자주 갱신)
    refetchOnWindowFocus: true, // 포커스 시 다시 가져오기
    retry: 1, // 재시도 1회
    retryDelay: 1000, // 1초 후 재시도
  });

  // React Query v5에서는 onSuccess/onError 대신 useEffect 사용
  useEffect(() => {
    if (query.isSuccess && query.data) {
      console.log('[useDiaries] API 호출 성공:', query.data?.length, '개의 일기', query.data);
    }
  }, [query.isSuccess, query.data]);

  useEffect(() => {
    if (query.isError) {
      console.error('[useDiaries] API 호출 실패:', query.error);
    }
  }, [query.isError, query.error]);
  
  useEffect(() => {
    console.log('[useDiaries] 상태 변경:', {
      isLoading: query.isLoading,
      isSuccess: query.isSuccess,
      isError: query.isError,
      dataLength: query.data?.length,
      error: query.error
    });
  }, [query.isLoading, query.isSuccess, query.isError, query.data, query.error]);

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

