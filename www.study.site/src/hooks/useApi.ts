"use client";

import { useQuery, useMutation, UseQueryOptions, UseMutationOptions } from "@tanstack/react-query";
import { useQueryClient } from "@/providers/DependencyContext";
import apiClient from "@/lib/api/client";

/**
 * React Query와 의존성 주입을 활용한 API Hook
 */
export const useApiQuery = <TData = unknown, TError = unknown>(
  queryKey: string[],
  url: string,
  options?: Omit<UseQueryOptions<TData, TError>, "queryKey" | "queryFn">
) => {
  const queryClient = useQueryClient();

  return useQuery<TData, TError>({
    queryKey,
    queryFn: async () => {
      const response = await apiClient.get<TData>(url);
      return response.data;
    },
    ...options,
  });
};

export const useApiMutation = <TData = unknown, TVariables = unknown, TError = unknown>(
  url: string,
  method: "post" | "put" | "patch" | "delete" = "post",
  options?: UseMutationOptions<TData, TError, TVariables>
) => {
  const queryClient = useQueryClient();

  return useMutation<TData, TError, TVariables>({
    mutationFn: async (variables: TVariables) => {
      let response: { data: TData };
      
      // 메서드별로 분기 처리 (타입 안전성)
      switch (method) {
        case "post":
          response = await apiClient.post<TData>(url, variables);
          break;
        case "put":
          response = await apiClient.put<TData>(url, variables);
          break;
        case "patch":
          // patch는 put과 동일하게 처리 (apiClient에 patch 메서드가 없음)
          response = await apiClient.put<TData>(url, variables);
          break;
        case "delete":
          // delete는 body가 없으므로 variables를 options로 전달
          response = await apiClient.delete<TData>(url);
          break;
        default:
          throw new Error(`지원하지 않는 HTTP 메서드: ${method}`);
      }
      
      return response.data;
    },
    ...options,
  });
};

