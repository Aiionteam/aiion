// 이메일/비밀번호 로그인 핸들러

export const createLoginHandlers = () => {
    const gatewayUrl = process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:8080';

    // 이메일/비밀번호 로그인 처리 로직
    async function handleEmailPasswordLogin(
        email: string,
        password: string,
        setIsLoading: (loading: boolean) => void,
        setError: (error: string) => void,
        onSuccess: () => void
    ) {
        try {
            setIsLoading(true);
            setError('');

            const response = await fetch(`${gatewayUrl}/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ email, password }),
            });

            if (response.ok) {
                const data = await response.json();
                // 토큰이 응답에 포함되어 있으면 저장
                if (data.token || data.access_token) {
                    localStorage.setItem('access_token', data.token || data.access_token);
                }
                onSuccess();
            } else {
                const data = await response.json();
                setError(data.message || '로그인에 실패했습니다.');
            }
        } catch (err) {
            setError('서버 연결에 실패했습니다.');
        } finally {
            setIsLoading(false);
        }
    }

    // 로그아웃 처리 로직
    async function handleLogout(
        onSuccess: () => void
    ) {
        try {
            const token = localStorage.getItem('access_token');
            if (token) {
                const gatewayUrl = process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:8080';
                try {
                    await fetch(`${gatewayUrl}/api/auth/logout`, {
                        method: 'POST',
                        credentials: 'include',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json',
                        },
                    });
                } catch (err) {
                    // 로그아웃 API 호출 실패해도 로컬 토큰은 제거
                    console.warn('로그아웃 API 호출 실패:', err);
                }
            }
            localStorage.removeItem('access_token');
            onSuccess();
        } catch (err) {
            console.warn('로그아웃 처리 중 오류:', err);
            localStorage.removeItem('access_token');
            onSuccess();
        }
    }

    return {
        handleEmailPasswordLogin,
        handleLogout,
    };
};
