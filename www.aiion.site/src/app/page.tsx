"use client";

import { useState, useEffect } from "react";
import { LandingPage } from "./pages/LandingPage";
import { HomePage } from "./pages/HomePage";
import { useStore } from "../store";

export default function Home() {
  const isLoggedIn = useStore((state) => state.user?.isLoggedIn ?? false);
  const [showLanding, setShowLanding] = useState(!isLoggedIn);
  const [isLoading, setIsLoading] = useState(true);
  const login = useStore((state) => state.user?.login);

  // JWT 토큰 디코딩 함수
  const decodeJWT = (token: string) => {
    try {
      const tokenParts = token.split('.');
      if (tokenParts.length === 3) {
        const base64Url = tokenParts[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
          atob(base64)
            .split('')
            .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
        );
        return JSON.parse(jsonPayload);
      }
    } catch (error) {
      console.error('[page.tsx] JWT 디코딩 실패:', error);
    }
    return null;
  };

  // isLoggedIn 상태와 토큰을 확인하여 showLanding 업데이트
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const token = localStorage.getItem('access_token');
    const currentIsLoggedIn = useStore.getState().user?.isLoggedIn ?? false;
    console.log('[page.tsx] 상태 확인:', { isLoggedIn, currentIsLoggedIn, hasToken: !!token });
    
    // 토큰이 있고 로그인 상태가 true이면 홈페이지 표시
    if (currentIsLoggedIn && token) {
      console.log('[page.tsx] 로그인 상태 확인 - 홈페이지 표시');
      setShowLanding(false);
      setIsLoading(false);
      return;
    }
    
    // 토큰이 없으면 로그인 화면 표시
    if (!token) {
      console.log('[page.tsx] 토큰 없음 - 로그인 화면 표시');
      setShowLanding(true);
      setIsLoading(false);
      return;
    }
    
    // 토큰은 있지만 로그인 상태가 false인 경우 - 직접 복원 시도
    if (token && !currentIsLoggedIn && login) {
      console.log('[page.tsx] 토큰 있음, 로그인 상태 직접 복원 시도...');
      try {
        const payload = decodeJWT(token);
        if (payload) {
          const userId = payload.sub || payload.userId;
          const email = payload.email;
          const nickname = payload.nickname || payload.name || '사용자';
          
          console.log('[page.tsx] JWT 페이로드:', payload);
          login({
            id: userId ? parseInt(userId) : undefined,
            name: nickname,
            email: email || '',
          });
          console.log('[page.tsx] 로그인 상태 복원 완료 - 홈페이지 표시');
          setShowLanding(false);
        } else {
          console.log('[page.tsx] JWT 디코딩 실패 - 로그인 화면 표시');
          setShowLanding(true);
        }
      } catch (error) {
        console.error('[page.tsx] 로그인 상태 복원 중 에러:', error);
        setShowLanding(true);
      }
    }
    
    setIsLoading(false);
  }, [isLoggedIn, login]);

  const handleLogin = () => {
    console.log('[page.tsx] handleLogin 호출됨, isLoggedIn:', isLoggedIn);
    // 강제로 메인 화면으로 이동
    setShowLanding(false);
    
    // 로그인 상태가 아직 설정되지 않았다면 설정
    if (!isLoggedIn && login) {
      console.log('[page.tsx] 로그인 상태가 없어서 설정');
      login({
        name: 'Guest',
        email: 'guest@aiion.com',
      });
    }
  };

  // 로딩 중일 때 로딩 UI 표시
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-700 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white font-medium">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (showLanding) {
    return <LandingPage onLogin={handleLogin} />;
  }

  return <HomePage />;
}
