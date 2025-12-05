/**
 * 인증 상태에 따른 리다이렉트 처리 훅
 * 로그인된 사용자를 블로그로, 미로그인 사용자를 로그인 페이지로 리다이렉트
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLoginStore } from "@/store";

export const useAuthRedirect = (
  isHydrated: boolean,
  isAuthenticated: boolean,
  isProcessingOAuth: boolean,
  redirectTo: string = "/home"
) => {
  const router = useRouter();

  useEffect(() => {
    // hydration이 완료된 후에만 체크
    if (!isHydrated) return;
    if (isProcessingOAuth) return; // OAuth 처리 중이면 리다이렉트하지 않음

    // 이미 로그인된 경우 블로그로 리다이렉트
    if (isAuthenticated) {
      router.push(redirectTo);
      return;
    }
  }, [isAuthenticated, router, isHydrated, isProcessingOAuth, redirectTo]);
};

