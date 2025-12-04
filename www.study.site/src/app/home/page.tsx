"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChatInterface } from "@/components/organisms/ChatInterface";
import { useLoginStore } from "@/store";
import { getToken } from "@/lib/api/auth";

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, restoreAuthState } = useLoginStore();
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // 클라이언트에서만 실행 (hydration 후)
    setIsHydrated(true);
    // 인증 상태 복원 (localStorage 토큰 확인 포함)
    restoreAuthState();
  }, [restoreAuthState]);

  useEffect(() => {
    // hydration이 완료된 후에만 체크
    if (!isHydrated) return;

    // 토큰이 있는지 확인
    const token = getToken();
    
    // 토큰이 없거나 로그인하지 않은 경우 로그인 페이지로 리다이렉트
    if (!token || !isAuthenticated) {
      router.replace("/");
      return;
    }
  }, [isAuthenticated, router, isHydrated]);

  // hydration 완료 전까지는 로딩 상태 표시
  if (!isHydrated) {
    return null;
  }

  // 로그인하지 않은 경우 아무것도 렌더링하지 않음 (리다이렉트 중)
  if (!isAuthenticated) {
    return null;
  }

  return <ChatInterface />;
}

