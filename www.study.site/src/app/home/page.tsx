"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChatInterface } from "@/components/organisms/ChatInterface";
import { Button } from "@/components/atoms/Button";
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

  return (
    <div className="relative min-h-screen">
      {/* 지도 및 기능 버튼들 - 상단 고정 */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
        <Link href="/map">
          <Button 
            variant="primary" 
            className="w-auto px-6 py-3 shadow-lg hover:shadow-xl transition-shadow"
          >
            🗺️ 카카오 지도
          </Button>
        </Link>
        <Link href="/seoul-crime">
          <Button 
            variant="primary" 
            className="w-auto px-6 py-3 shadow-lg hover:shadow-xl transition-shadow bg-red-500 hover:bg-red-600"
          >
            📊 범죄율 지도
          </Button>
        </Link>
        <Link href="/yolo">
          <Button 
            variant="primary" 
            className="w-auto px-6 py-3 shadow-lg hover:shadow-xl transition-shadow bg-purple-500 hover:bg-purple-600"
          >
            📷 YOLO 업로드
          </Button>
        </Link>
      </div>
      <ChatInterface />
    </div>
  );
}

