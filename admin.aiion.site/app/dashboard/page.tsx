'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';

function DashboardContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isLoading, setIsLoading] = useState(true);
    const [userInfo, setUserInfo] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [loginSuccess, setLoginSuccess] = useState(false);

    // 토큰 처리 및 사용자 정보 조회
    useEffect(() => {
        const initialize = async () => {
            try {
                // 1. URL에서 토큰 확인 (소셜 로그인 후 리다이렉트된 경우)
                const tokenFromUrl = searchParams.get('token');
                const error = searchParams.get('error');

                if (error) {
                    console.error('❌ 로그인 실패:', error);
                    setError('로그인에 실패했습니다.');
                    setIsLoading(false);
                    router.push('/login');
                    return;
                }

                if (tokenFromUrl) {
                    // 토큰을 localStorage에 저장
                    localStorage.setItem('access_token', tokenFromUrl);
                    console.log('✅ 토큰 저장 성공:', tokenFromUrl.substring(0, 20) + '...');
                    console.log('✅ 소셜 로그인 성공! 토큰이 정상적으로 받아졌습니다.');

                    // 로그인 성공 상태 설정
                    setLoginSuccess(true);
                    setError(null);

                    // URL에서 토큰 파라미터 제거 (보안을 위해)
                    router.replace('/dashboard', { scroll: false });
                    return;
                }

                // 2. localStorage에서 토큰 가져오기
                const token = localStorage.getItem('access_token');

                if (!token) {
                    // 토큰이 없으면 로그인 페이지로 이동
                    setError('인증이 필요합니다.');
                    setLoginSuccess(false);
                    router.push('/login');
                    return;
                }

                // 토큰이 있으면 로그인 성공으로 처리
                if (token && !loginSuccess) {
                    setLoginSuccess(true);
                    setError(null);
                }

                // 3. 백엔드 API로 현재 사용자 정보 조회
                const gatewayUrl = process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:8080';

                console.log('🔍 사용자 정보 조회 시작, 토큰:', token.substring(0, 20) + '...');

                // 카카오 사용자 정보 조회 시도
                let response = await fetch(`${gatewayUrl}/auth/kakao/user`, {
                    method: 'GET',
                    credentials: 'include',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                });

                // 카카오 조회 실패 시 네이버 사용자 정보 조회 시도
                if (!response.ok && response.status !== 401) {
                    console.log('⚠️ 카카오 사용자 정보 조회 실패, 네이버 조회 시도...');
                    response = await fetch(`${gatewayUrl}/auth/naver/user`, {
                        method: 'GET',
                        credentials: 'include',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json',
                        },
                    });
                }

                // 네이버 조회도 실패 시 구글 사용자 정보 조회 시도
                if (!response.ok && response.status !== 401) {
                    console.log('⚠️ 네이버 사용자 정보 조회 실패, 구글 조회 시도...');
                    response = await fetch(`${gatewayUrl}/auth/google/user`, {
                        method: 'GET',
                        credentials: 'include',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json',
                        },
                    });
                }

                console.log('📡 응답 상태:', response.status, response.statusText);

                if (response.ok) {
                    const data = await response.json();
                    console.log('📦 응답 데이터:', JSON.stringify(data, null, 2));

                    if (data.success) {
                        const userData = data.data || data.user || data;
                        if (userData && (userData.userId || userData.kakaoId || userData.naverId || userData.googleId || userData.nickname || userData.name || userData.email)) {
                            setUserInfo(userData);
                            setError(null);
                            setLoginSuccess(true);
                            console.log('✅ 사용자 정보 조회 성공:', userData);
                        } else {
                            console.error('❌ 사용자 데이터 형식 오류:', userData);
                            if (token) {
                                setLoginSuccess(true);
                                setError(null);
                            } else {
                                setError('사용자 정보 형식이 올바르지 않습니다.');
                            }
                        }
                    } else {
                        console.error('❌ 응답 success가 false:', data);
                        if (token) {
                            setLoginSuccess(true);
                            setError(null);
                        } else {
                            setError(data.message || '사용자 정보를 가져올 수 없습니다.');
                        }
                    }
                } else if (response.status === 401) {
                    console.error('❌ 인증 실패 (401)');
                    localStorage.removeItem('access_token');
                    setError('인증이 필요합니다.');
                    router.push('/login');
                } else {
                    console.warn('⚠️ 사용자 정보 조회 실패:', response.status, response.statusText);
                    if (token) {
                        setLoginSuccess(true);
                        setError(null);
                        console.log('✅ 토큰이 정상적으로 저장되어 로그인 성공으로 처리합니다.');
                    } else {
                        try {
                            const errorData = await response.json();
                            console.error('❌ 에러 응답 데이터:', JSON.stringify(errorData, null, 2));
                        } catch (e) {
                            console.error('❌ 에러 응답 파싱 실패:', e);
                        }
                        setError('인증이 필요합니다.');
                    }
                }
            } catch (err) {
                console.error('사용자 정보 조회 실패:', err);
                setError('서버 연결에 실패했습니다.');
            } finally {
                setIsLoading(false);
            }
        };

        initialize();
    }, [router, searchParams]);

    // 로딩 중
    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-slate-200 dark:border-slate-700 border-t-slate-900 dark:border-t-slate-100 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-slate-600 dark:text-slate-400 font-medium">로딩 중...</p>
                </div>
            </div>
        );
    }

    // 에러 발생
    if (error && !loginSuccess) {
        return (
            <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
                <div className="max-w-md w-full text-center">
                    <div className="mb-6">
                        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">인증 오류</h2>
                        <p className="text-gray-600 dark:text-gray-400">{error}</p>
                    </div>
                    <button
                        onClick={() => router.push('/login')}
                        className="w-full rounded-lg bg-slate-900 dark:bg-slate-100 px-4 py-3 font-semibold text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 transition-colors"
                    >
                        로그인 페이지로 이동
                    </button>
                </div>
            </div>
        );
    }

    // ERP 대시보드 메인
    return (
        <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
            {/* 헤더 */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <div className="px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">대시보드</h1>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                {userInfo?.name || userInfo?.nickname ? `${userInfo.name || userInfo.nickname}님, ` : ''}환영합니다
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* 메인 컨텐츠 */}
            <div className="px-6 py-6">
                {/* 통계 카드 */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">총 매출</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">₩166.3M</p>
                                <p className="text-xs text-green-600 dark:text-green-400 mt-1">+12.5% 전월 대비</p>
                            </div>
                            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                                <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">총 주문</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">65</p>
                                <p className="text-xs text-green-600 dark:text-green-400 mt-1">+8.2% 전월 대비</p>
                            </div>
                            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                                <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">활성 고객</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">5</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">전체 고객: 6</p>
                            </div>
                            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                                <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">재고 항목</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">507</p>
                                <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">12개 재고 부족</p>
                            </div>
                            <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg flex items-center justify-center">
                                <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 빠른 액세스 */}
                <div className="mb-6">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">빠른 액세스</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Link
                            href="/dashboard/inventory"
                            className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:border-blue-500 dark:hover:border-blue-400 transition-colors group"
                        >
                            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center mb-4 group-hover:bg-blue-200 dark:group-hover:bg-blue-900/30 transition-colors">
                                <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                </svg>
                            </div>
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">재고 관리</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">재고 현황 확인</p>
                        </Link>

                        <Link
                            href="/dashboard/orders"
                            className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:border-green-500 dark:hover:border-green-400 transition-colors group"
                        >
                            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center mb-4 group-hover:bg-green-200 dark:group-hover:bg-green-900/30 transition-colors">
                                <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                            </div>
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">주문 관리</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">주문 현황 확인</p>
                        </Link>

                        <Link
                            href="/dashboard/customers"
                            className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:border-purple-500 dark:hover:border-purple-400 transition-colors group"
                        >
                            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center mb-4 group-hover:bg-purple-200 dark:group-hover:bg-purple-900/30 transition-colors">
                                <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                            </div>
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">고객 관리</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">고객 정보 관리</p>
                        </Link>

                        <Link
                            href="/dashboard/finance"
                            className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:border-yellow-500 dark:hover:border-yellow-400 transition-colors group"
                        >
                            <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg flex items-center justify-center mb-4 group-hover:bg-yellow-200 dark:group-hover:bg-yellow-900/30 transition-colors">
                                <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                            </div>
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">재무 관리</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">재무 현황 확인</p>
                        </Link>
                    </div>
                </div>

                {/* 최근 활동 */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* 최근 주문 */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">최근 주문</h2>
                        </div>
                        <div className="p-6">
                            <div className="space-y-4">
                                {[
                                    { id: 'ORD-2024-001', customer: 'ABC 기업', amount: '₩6,000,000', date: '2024-01-15' },
                                    { id: 'ORD-2024-002', customer: 'XYZ 회사', amount: '₩700,000', date: '2024-01-16' },
                                    { id: 'ORD-2024-003', customer: 'DEF 주식회사', amount: '₩850,000', date: '2024-01-17' },
                                ].map((order) => (
                                    <div key={order.id} className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-700 last:border-0 last:pb-0">
                                        <div>
                                            <p className="text-sm font-medium text-gray-900 dark:text-white">{order.id}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">{order.customer}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-medium text-gray-900 dark:text-white">{order.amount}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">{order.date}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <Link
                                href="/dashboard/orders"
                                className="mt-4 block text-center text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                            >
                                전체 주문 보기 →
                            </Link>
                        </div>
                    </div>

                    {/* 재고 알림 */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">재고 알림</h2>
                        </div>
                        <div className="p-6">
                            <div className="space-y-4">
                                {[
                                    { item: '모니터 27인치', status: '재고 부족', quantity: 12 },
                                    { item: 'USB 케이블', status: '재고 있음', quantity: 250 },
                                    { item: '헤드셋', status: '품절', quantity: 0 },
                                ].map((item, index) => (
                                    <div key={index} className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-700 last:border-0 last:pb-0">
                                        <div>
                                            <p className="text-sm font-medium text-gray-900 dark:text-white">{item.item}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">수량: {item.quantity}</p>
                                        </div>
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${item.status === '재고 있음'
                                            ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                                            : item.status === '재고 부족'
                                                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                                                : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                                            }`}>
                                            {item.status}
                                        </span>
                                    </div>
                                ))}
                            </div>
                            <Link
                                href="/dashboard/inventory"
                                className="mt-4 block text-center text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                            >
                                전체 재고 보기 →
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function DashboardPage() {
    return (
        <Suspense fallback={
            <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-slate-200 dark:border-slate-700 border-t-slate-900 dark:border-t-slate-100 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-slate-600 dark:text-slate-400 font-medium">로딩 중...</p>
                </div>
            </div>
        }>
            <DashboardContent />
        </Suspense>
    );
}
