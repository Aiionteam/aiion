"use client";

import React, { createContext, useContext, ReactNode } from "react";
import { QueryClient } from "@tanstack/react-query";

// 의존성 인터페이스 정의
interface Dependencies {
  queryClient: QueryClient;
}

// Context 생성
const DependencyContext = createContext<Dependencies | null>(null);

// Provider Props
interface DependencyProviderProps {
  children: ReactNode;
  queryClient: QueryClient;
}

// 의존성 Provider
export const DependencyProvider: React.FC<DependencyProviderProps> = ({
  children,
  queryClient,
}) => {
  const dependencies: Dependencies = {
    queryClient,
  };

  return (
    <DependencyContext.Provider value={dependencies}>
      {children}
    </DependencyContext.Provider>
  );
};

// 의존성 사용 Hook
export const useDependencies = (): Dependencies => {
  const context = useContext(DependencyContext);
  if (!context) {
    throw new Error("useDependencies must be used within DependencyProvider");
  }
  return context;
};

// 개별 의존성 Hooks
export const useQueryClient = (): QueryClient => {
  const { queryClient } = useDependencies();
  return queryClient;
};

