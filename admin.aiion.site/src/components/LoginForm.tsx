'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createLoginHandlers } from '@/service/mainservice';

export function LoginForm() {
  const router = useRouter();
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showRegister, setShowRegister] = useState(false);

  const { handleEmailPasswordLogin } = createLoginHandlers();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 유효성 검사
    if (!usernameOrEmail.trim()) {
      setError('사용자명 또는 이메일을 입력해주세요.');
      return;
    }
    
    if (!password.trim()) {
      setError('비밀번호를 입력해주세요.');
      return;
    }

    await handleEmailPasswordLogin(
      usernameOrEmail.trim(),
      password,
      setIsLoading,
      setError,
      () => {
        // 로그인 성공 시 대시보드로 이동
        router.push('/dashboard');
      }
    );
  };

  return (
    <div className="max-w-lg mx-auto mb-16">
      <div className="bg-white dark:bg-gray-800 rounded-xl border-2 border-gray-300 dark:border-gray-600 p-10 shadow-xl">
        <div className="text-center mb-8">
          <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
            {showRegister ? '회원가입' : '시작하기'}
          </h3>
          <p className="text-base text-gray-600 dark:text-gray-400">
            {showRegister 
              ? '새 계정을 만들어 시작하세요' 
              : '계정이 있으신가요? 로그인하세요'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 에러 메시지 */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <p className="text-sm text-red-800 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* 사용자명/이메일 입력 */}
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              사용자명 또는 이메일
            </label>
            <input
              id="username"
              type="text"
              value={usernameOrEmail}
              onChange={(e) => {
                setUsernameOrEmail(e.target.value);
                setError('');
              }}
              placeholder="사용자명 또는 이메일을 입력하세요"
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500 dark:bg-gray-700 dark:text-white"
              disabled={isLoading}
              required
            />
          </div>

          {/* 비밀번호 입력 */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              비밀번호
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              placeholder="비밀번호를 입력하세요"
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500 dark:bg-gray-700 dark:text-white"
              disabled={isLoading}
              required
            />
          </div>

          {/* 로그인 버튼 */}
          <button
            type="submit"
            disabled={isLoading}
            className="block w-full flex items-center justify-center gap-3 px-6 py-4 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-lg font-semibold text-lg hover:bg-slate-800 dark:hover:bg-slate-200 transition-all transform hover:scale-105 shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                로그인 중...
              </>
            ) : (
              <>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                로그인
              </>
            )}
          </button>
        </form>

        {/* 회원가입 링크 */}
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => setShowRegister(!showRegister)}
            className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 underline"
          >
            {showRegister ? '이미 계정이 있으신가요? 로그인' : '계정이 없으신가요? 회원가입'}
          </button>
        </div>
      </div>
    </div>
  );
}

