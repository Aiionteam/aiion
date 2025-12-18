/**
 * OAuth 처리 중 로딩 컴포넌트
 */

import React from "react";

export const OAuthProcessing: React.FC = () => {
  return (
    <div className="relative min-h-screen w-full overflow-hidden flex items-center justify-center">
      <div className="text-center">
        <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-pink-500 border-r-transparent"></div>
        <p className="text-lg text-gray-700">로그인 처리 중...</p>
      </div>
    </div>
  );
};

