"use client";

import React, { useEffect } from "react";
import { LoginContainer } from "@/components/organisms/LoginContainer";
import { LoginBackground } from "@/components/organisms/LoginBackground";
import { OAuthProcessing } from "@/components/organisms/OAuthProcessing";
import { useLoginStore } from "@/store";
import { useHydration } from "@/hooks/useHydration";
import { useOAuthCallback } from "@/hooks/useOAuthCallback";
import { useAuthRedirect } from "@/hooks/useAuthRedirect";

export default function Home() {
  const { isAuthenticated, restoreAuthState } = useLoginStore();
  const isHydrated = useHydration();
  const isProcessingOAuth = useOAuthCallback(isHydrated, isAuthenticated);

  // 인증 상태 복원
  useEffect(() => {
    if (isHydrated) {
      restoreAuthState();
    }
  }, [isHydrated, restoreAuthState]);

  // 인증 상태에 따른 리다이렉트
  useAuthRedirect(isHydrated, isAuthenticated, isProcessingOAuth);

  // hydration 완료 전까지는 로딩 상태 표시
  if (!isHydrated) {
    return null;
  }

  // OAuth 처리 중이면 로딩 표시
  if (isProcessingOAuth) {
    return <OAuthProcessing />;
  }

  // 로그인된 상태면 아무것도 렌더링하지 않음 (리다이렉트 중)
  if (isAuthenticated) {
    return null;
  }

  return (
    <LoginBackground>
      <LoginContainer />
    </LoginBackground>
  );
}
