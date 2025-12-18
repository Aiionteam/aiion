"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLoginStore } from "@/store";
import { handleOAuthCallback, extractOAuthParams } from "@/service";

/**
 * 백엔드가 /login으로 리다이렉트하는 경우를 처리
 * OAuth 콜백을 직접 처리하고 블로그로 이동
 */
export default function LoginRedirectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, setAuthenticated, setLoadingType } = useLoginStore();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    // 이미 처리 중이거나 로그인된 경우 중복 방지
    if (isProcessing || isAuthenticated) return;

    // URL 파라미터 추출
    const params = extractOAuthParams(searchParams);

    // 파라미터가 없으면 로그인 페이지로 리다이렉트
    if (!params.token && !params.error) {
      router.replace("/");
      return;
    }

    setIsProcessing(true);

    // OAuth 콜백 처리
    const result = handleOAuthCallback(params, {
      onSuccess: (provider) => {
        // 로그인 상태 업데이트
        setAuthenticated(true);
        setLoadingType(provider);

        // sessionStorage에 로그인 상태 저장
        if (typeof window !== "undefined") {
          sessionStorage.setItem("isAuthenticated", "true");
          sessionStorage.setItem("loadingType", provider);
        }

        setStatus("success");
      },
      onError: (error) => {
        setStatus("error");
        setErrorMessage(error);
        setIsProcessing(false);
      },
      onRedirect: (path) => {
        router.replace(path);
      },
    });

    // 팝업인 경우는 이미 처리되었으므로 여기서는 아무것도 하지 않음
    if (result.success && !isProcessing) {
      setIsProcessing(false);
    }
  }, [searchParams, router, setAuthenticated, setLoadingType, isProcessing, isAuthenticated]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-pink-50 to-blue-50">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-pink-500 border-r-transparent"></div>
          <p className="text-lg text-gray-700">로그인 처리 중...</p>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-pink-50 to-blue-50">
        <div className="text-center">
          <div className="mb-4 text-6xl">❌</div>
          <p className="mb-4 text-lg font-semibold text-red-600">로그인 실패</p>
          <p className="mb-6 text-gray-700">{errorMessage}</p>
          <button
            onClick={() => router.push("/")}
            className="rounded-lg bg-pink-500 px-6 py-2 text-white hover:bg-pink-600"
          >
            로그인 페이지로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-pink-50 to-blue-50">
      <div className="text-center">
        <div className="mb-4 text-6xl">✅</div>
        <p className="mb-4 text-lg font-semibold text-green-600">로그인 성공!</p>
        <p className="text-gray-700">블로그로 이동 중...</p>
      </div>
    </div>
  );
}

