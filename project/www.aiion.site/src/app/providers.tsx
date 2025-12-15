"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useAppStore } from "../store/useAppStore";
import { getAccessToken } from "../lib/api/client";

/**
 * JWT 토큰에서 사용자 정보 추출 (UTF-8 안전 디코딩)
 */
function decodeJWT(token: string) {
  try {
    const tokenParts = token.split('.');
    if (tokenParts.length === 3) {
      // base64 디코딩 후 UTF-8 디코딩
      const base64Url = tokenParts[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      const payload = JSON.parse(jsonPayload);
      return {
        userId: payload.sub || payload.userId,
        email: payload.email,
        name: payload.name || payload.nickname || '사용자',
        nickname: payload.nickname || payload.name || '사용자',
      };
    }
  } catch (error) {
    console.error('[Providers] JWT 디코딩 실패:', error);
  }
  return null;
}

/**
 * 새로고침 시 토큰 확인 및 로그인 상태 복원
 */
function useRestoreAuth() {
  const login = useAppStore((state) => state.user?.login);
  const isLoggedIn = useAppStore((state) => state.user?.isLoggedIn ?? false);

  useEffect(() => {
    // 이미 로그인되어 있으면 스킵
    if (isLoggedIn) {
      console.log('[Providers] 이미 로그인됨 - 스킵');
      return;
    }

    // localStorage에서 토큰 확인
    const token = getAccessToken();
    if (!token) {
      console.log('[Providers] 토큰 없음 - 스킵');
      return;
    }

    // JWT 토큰에서 사용자 정보 추출
    const userInfo = decodeJWT(token);
    if (userInfo && login) {
      console.log('[Providers] 새로고침 시 로그인 상태 복원:', userInfo);
      login({
        id: userInfo.userId ? parseInt(userInfo.userId) : undefined,
        name: userInfo.nickname || userInfo.name,
        email: userInfo.email || '',
      });
      console.log('[Providers] 로그인 상태 복원 완료');
    } else {
      console.log('[Providers] 사용자 정보 추출 실패 또는 login 함수 없음');
    }
  }, [login, isLoggedIn]);
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1분
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  // 새로고침 시 로그인 상태 복원
  useRestoreAuth();

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

