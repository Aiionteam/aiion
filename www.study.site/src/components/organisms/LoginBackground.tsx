/**
 * 로그인 페이지 배경 컴포넌트
 */

import React from "react";

export const LoginBackground: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-r from-pink-400 via-pink-300 to-blue-300 opacity-80 blur-3xl"></div>
      <div className="absolute inset-0 bg-gradient-to-br from-pink-100/50 to-blue-100/50"></div>

      {/* Content */}
      <div className="relative flex h-screen w-full items-center justify-center px-8">
        {children}
      </div>
    </div>
  );
};

