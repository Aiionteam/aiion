"use client";

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useStore } from '../../../store';
import { NicknameSetupModal } from '../../../components/molecules/NicknameSetupModal';
import { updateUserNickname } from '../../hooks/useUserApi';

/**
 * OAuth 콜백 페이지 내부 컴포넌트
 */
function OAuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const login = useStore((state) => state.user?.login);
  const [error, setError] = useState<string | null>(null);
  const [showNicknameModal, setShowNicknameModal] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);
  const [currentNickname, setCurrentNickname] = useState<string>('');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // URL 파라미터에서 정보 추출
        const provider = searchParams.get('provider');
        const token = searchParams.get('token');
        const refreshToken = searchParams.get('refresh_token');
        const errorParam = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');

        // 에러가 있는 경우
        if (errorParam) {
          console.error('[OAuthCallback] OAuth 에러:', errorParam, errorDescription);
          setError(errorDescription || errorParam);
          setTimeout(() => {
            router.push('/');
          }, 3000);
          return;
        }

        // 필수 파라미터 확인
        if (!provider || !token) {
          console.error('[OAuthCallback] 필수 파라미터 누락:', { provider, token });
          setError('인증 정보가 없습니다.');
          setTimeout(() => {
            router.push('/');
          }, 3000);
          return;
        }

        console.log('[OAuthCallback] JWT 토큰 수신:', { provider, tokenLength: token.length });

        // JWT 토큰을 localStorage에 저장
        localStorage.setItem('access_token', token);
        if (refreshToken) {
          localStorage.setItem('refresh_token', refreshToken);
        }
        localStorage.setItem('auth_provider', provider);

        console.log('[OAuthCallback] 토큰 저장 완료');

        // JWT 토큰에서 사용자 정보 추출 (간단한 파싱)
        // 실제로는 백엔드에 /user 정보 요청을 보내야 할 수도 있음
        try {
          // JWT 토큰 디코딩 (간단한 방법 - base64 디코딩)
          const tokenParts = token.split('.');
          if (tokenParts.length === 3) {
            const payload = JSON.parse(atob(tokenParts[1]));
            console.log('[OAuthCallback] JWT 페이로드:', payload);

            // 사용자 정보 추출
            const extractedUserId = payload.sub || payload.userId;
            const email = payload.email;
            const name = payload.name || '사용자';
            const nickname = payload.nickname || name;

            const parsedUserId = extractedUserId ? parseInt(extractedUserId) : null;

            // 로그인 상태 업데이트
            if (login) {
              login({
                id: parsedUserId,
                name: nickname,
                email: email || `${provider}@example.com`,
              });
            }

            console.log('[OAuthCallback] 로그인 완료:', { userId: parsedUserId, name, nickname, email });

            // 닉네임이 name과 같으면 닉네임 설정 모달 표시 (최초 로그인 체크)
            if (nickname === name && parsedUserId) {
              setUserId(parsedUserId);
              setCurrentNickname(nickname);
              setShowNicknameModal(true);
            } else {
              // 이미 닉네임이 설정되어 있으면 홈으로 바로 이동
              // 상태가 제대로 반영되도록 약간의 지연 후 이동
              setTimeout(() => {
                window.location.href = '/';
              }, 100);
            }
          } else {
            throw new Error('JWT 토큰 형식이 올바르지 않습니다.');
          }
        } catch (parseError) {
          console.error('[OAuthCallback] JWT 파싱 에러:', parseError);
          // 토큰은 저장했지만 파싱 실패 시에도 로그인 처리
          if (login) {
            login({
              name: `${provider} 사용자`,
              email: `${provider}@example.com`,
            });
          }
          router.push('/');
        }
      } catch (error) {
        console.error('[OAuthCallback] 콜백 처리 중 에러:', error);
        setError(error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.');
        setTimeout(() => {
          router.push('/');
        }, 3000);
      }
    };

    handleCallback();
  }, [searchParams, router, login]);

  const handleNicknameSave = async (nickname: string) => {
    if (!userId) return;

    try {
      const updatedUser = await updateUserNickname(userId, nickname);
      if (updatedUser && login) {
        // 사용자 정보 업데이트
        login({
          id: userId,
          name: updatedUser.nickname || updatedUser.name,
          email: updatedUser.email,
        });
      }
      setShowNicknameModal(false);
      // 상태가 제대로 반영되도록 약간의 지연 후 이동
      setTimeout(() => {
        window.location.href = '/';
      }, 100);
    } catch (error) {
      console.error('[OAuthCallback] 닉네임 저장 실패:', error);
      throw error;
    }
  };

  const handleNicknameModalClose = () => {
    setShowNicknameModal(false);
    router.push('/');
  };

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-400 mb-4">로그인 오류</h1>
          <p className="text-gray-300 mb-4">{error}</p>
          <p className="text-sm text-gray-500">잠시 후 로그인 페이지로 이동합니다...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {!showNicknameModal && (
        <div className="flex items-center justify-center min-h-screen bg-gray-900">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-gray-300">로그인 처리 중...</p>
          </div>
        </div>
      )}

      <NicknameSetupModal
        isOpen={showNicknameModal}
        currentNickname={currentNickname}
        onSave={handleNicknameSave}
        onClose={handleNicknameModalClose}
      />
    </>
  );
}

/**
 * OAuth 콜백 페이지
 * 백엔드에서 JWT 토큰을 받아서 localStorage에 저장하고 로그인 처리
 * useSearchParams()를 사용하므로 Suspense로 감싸야 함
 */
export default function OAuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen bg-gray-900">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-gray-300">로딩 중...</p>
          </div>
        </div>
      }
    >
      <OAuthCallbackContent />
    </Suspense>
  );
}

