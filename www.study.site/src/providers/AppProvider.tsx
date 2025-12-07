"use client";

import React, { ReactNode } from "react";
import { QueryProvider } from "./QueryProvider";
import { StoreProvider } from "./StoreProvider";

interface AppProviderProps {
  children: ReactNode;
}

/**
 * 모든 Provider를 통합하는 최상위 Provider
 * 의존성 주입 순서:
 * 1. QueryProvider (React Query)
 * 2. DependencyProvider (의존성 주입 컨테이너)
 * 3. StoreProvider (Zustand stores)
 */
export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  return (
    <QueryProvider>
      <StoreProvider>{children}</StoreProvider>
    </QueryProvider>
  );
};

