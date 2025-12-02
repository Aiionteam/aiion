"use client";

import { useState, useEffect } from "react";
import { LandingPage } from "./pages/LandingPage";
import { HomePage } from "./pages/HomePage";
import { useStore } from "../store";

export default function Home() {
  const isLoggedIn = useStore((state) => state.user?.isLoggedIn);
  const [showLanding, setShowLanding] = useState(!isLoggedIn);
  const login = useStore((state) => state.user?.login);

  // 페이지 로드 시 localStorage에 토큰이 있으면 로그인 상태 복원
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('access_token');
      
      // 토큰이 없으면 무조건 로그인 화면 표시
      if (!token) {
        console.log('[page.tsx] 토큰 없음 - 로그인 화면 표시');
        setShowLanding(true);
        return;
      }
      
      // 토큰이 있고 아직 로그인되지 않은 경우에만 복원 시도
      if (!isLoggedIn && login) {
        try {
          // JWT 토큰에서 사용자 정보 추출
          const tokenParts = token.split('.');
          if (tokenParts.length === 3) {
            const payload = JSON.parse(atob(tokenParts[1]));
            const userId = payload.sub || payload.userId;
            const email = payload.email;
            const nickname = payload.nickname || payload.name || '사용자';
            
            login({
              id: userId ? parseInt(userId) : undefined,
              name: nickname,
              email: email || 'user@example.com',
            });
            setShowLanding(false);
            console.log('[page.tsx] 토큰으로부터 로그인 상태 복원');
          }
        } catch (error) {
          console.error('[page.tsx] 토큰 파싱 실패:', error);
          // 토큰 파싱 실패 시 토큰 삭제
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('auth_provider');
          localStorage.removeItem('app-storage');
          // 로그인 화면 표시
          setShowLanding(true);
        }
      }
    }
  }, []); // 최초 1회만 실행

  // isLoggedIn 상태가 변경되면 showLanding도 업데이트
  useEffect(() => {
    console.log('[page.tsx] isLoggedIn 상태 변경:', isLoggedIn);
    // 토큰도 함께 확인하여 확실하게 처리
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    if (!isLoggedIn || !token) {
      setShowLanding(true);
    } else {
      setShowLanding(false);
    }
  }, [isLoggedIn]);

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

  if (showLanding) {
    return <LandingPage onLogin={handleLogin} />;
  }

  return <HomePage />;
}
