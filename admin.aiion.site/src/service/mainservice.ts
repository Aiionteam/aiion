// 이메일/비밀번호 로그인 핸들러

import { login as authLogin, getCurrentUser, logout as authLogout } from './authService';
import { useAppStore } from '@/store';

export const createLoginHandlers = () => {
    const gatewayUrl = process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:8080';

    // 사용자명/이메일/비밀번호 로그인 처리 로직
    async function handleEmailPasswordLogin(
        usernameOrEmail: string,
        password: string,
        setIsLoading: (loading: boolean) => void,
        setError: (error: string) => void,
        onSuccess: () => void
    ) {
        try {
            setIsLoading(true);
            setError('');

            // auth-service를 통한 로그인
            const tokenResponse = await authLogin({
                username: usernameOrEmail,
                password: password,
            });

            // 토큰 저장
            localStorage.setItem('access_token', tokenResponse.access_token);
            if (tokenResponse.refresh_token) {
                localStorage.setItem('refresh_token', tokenResponse.refresh_token);
            }

            // 사용자 정보 조회
            try {
                const userInfo = await getCurrentUser();
                
                // Zustand 스토어에 사용자 정보 저장
                const store = useAppStore.getState();
                // 함수가 있으면 사용, 없으면 set으로 직접 초기화
                if (store.user && typeof store.user.login === 'function') {
                    store.user.login({
                        id: userInfo.id,
                        name: userInfo.full_name || userInfo.username,
                        email: userInfo.email,
                    });
                } else if (store.user && typeof store.user.setUser === 'function') {
                    store.user.setUser({
                        id: userInfo.id,
                        name: userInfo.full_name || userInfo.username,
                        email: userInfo.email,
                    });
                } else {
                    // 함수가 없으면 set으로 직접 초기화
                    useAppStore.setState((state) => ({
                        user: {
                            ...state.user,
                            user: {
                                id: userInfo.id,
                                name: userInfo.full_name || userInfo.username,
                                email: userInfo.email,
                            },
                            isLoggedIn: true,
                        },
                    }));
                }
            } catch (userError) {
                console.warn('사용자 정보 조회 실패:', userError);
                // 사용자 정보 조회 실패해도 로그인은 성공으로 처리
            }

            onSuccess();
        } catch (err: any) {
            const errorMessage = err?.message || '로그인에 실패했습니다.';
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    }

    // 모든 쿠키 삭제 함수
    function clearAllCookies() {
        if (typeof document === 'undefined') return;
        
        // 현재 도메인의 모든 쿠키 가져오기
        const cookies = document.cookie.split(';');
        
        // 각 쿠키 삭제
        cookies.forEach(cookie => {
            const eqPos = cookie.indexOf('=');
            const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
            
            // 쿠키 삭제 (과거 날짜로 설정)
            document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
            document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`;
            document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.${window.location.hostname}`;
        });
    }

    // 로그아웃 처리 로직
    async function handleLogout(
        onSuccess: () => void
    ) {
        try {
            // Zustand 스토어에서 사용자 정보 제거
            const store = useAppStore.getState();
            // 함수가 있으면 사용, 없으면 set으로 직접 초기화
            if (store.user && typeof store.user.logout === 'function') {
                store.user.logout();
            } else {
                // 함수가 없으면 set으로 직접 초기화
                useAppStore.setState((state) => ({
                    user: {
                        ...state.user,
                        user: null,
                        isLoggedIn: false,
                    },
                }));
            }

            // auth-service를 통한 로그아웃
            try {
                await authLogout();
            } catch (err) {
                // 로그아웃 API 호출 실패해도 로컬 토큰은 제거
                console.warn('로그아웃 API 호출 실패:', err);
            }

            // 모든 쿠키 삭제
            clearAllCookies();

            // 모든 localStorage 항목 삭제 (persist 스토리지 포함)
            if (typeof window !== 'undefined') {
                localStorage.clear();
            }

            // 모든 sessionStorage 항목 삭제
            if (typeof window !== 'undefined') {
                sessionStorage.clear();
            }

            // Zustand 스토어 상태도 완전히 초기화
            if (typeof window !== 'undefined') {
                const store = useAppStore.getState();
                store.resetStore();
            }
            
            onSuccess();
        } catch (err) {
            console.warn('로그아웃 처리 중 오류:', err);
            // 에러가 발생해도 모든 스토리지와 쿠키는 제거
            clearAllCookies();
            if (typeof window !== 'undefined') {
                localStorage.clear();
                sessionStorage.clear();
                const store = useAppStore.getState();
                store.resetStore();
            }
            onSuccess();
        }
    }

        return {
            handleEmailPasswordLogin,
        handleLogout,
        };
    };
