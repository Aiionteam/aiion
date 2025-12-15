"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLoginStore } from "@/store";
import { handleOAuthCallback, extractOAuthParams, type OAuthProvider } from "@/service";

/**
 * 통합 OAuth 콜백 페이지
 * 모든 OAuth Provider (구글, 카카오, 네이버)의 콜백을 처리합니다.
 * Provider는 토큰에서 자동으로 감지되거나 URL 파라미터로 지정할 수 있습니다.
 */
export default function OAuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setAuthenticated, setLoadingType } = useLoginStore();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [provider, setProvider] = useState<OAuthProvider | null>(null);

  useEffect(() => {
    // 이미 처리 중인 경우 중복 방지
    if (isProcessing) return;

    // URL 파라미터 추출
    const params = extractOAuthParams(searchParams);

    // 파라미터가 없으면 로그인 페이지로 리다이렉트
    if (!params.token && !params.error) {
      router.replace("/");
      return;
    }

    setIsProcessing(true);

    // URL에서 provider 파라미터 확인 (선택적)
    const urlProvider = searchParams.get("provider") as OAuthProvider | null;
    const targetProvider = urlProvider || undefined; // undefined면 토큰에서 자동 감지

    // 통합 OAuth 콜백 처리
    const result = handleOAuthCallback(params, {
      onSuccess: (detectedProvider) => {
        // 로그인 상태 업데이트
        setAuthenticated(true);
        setLoadingType(detectedProvider);
        setProvider(detectedProvider);

        // sessionStorage에 로그인 상태 저장
        if (typeof window !== "undefined") {
          sessionStorage.setItem("isAuthenticated", "true");
          sessionStorage.setItem("loadingType", detectedProvider);
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
    }, targetProvider);

    // 팝업인 경우는 이미 처리되었으므로 여기서는 아무것도 하지 않음
    if (result.success && !isProcessing) {
      setIsProcessing(false);
    }
  }, [searchParams, router, setAuthenticated, setLoadingType, isProcessing]);

  // Provider별 색상 및 메시지
  const getProviderInfo = () => {
    switch (provider) {
      case "google":
        return {
          color: "blue",
          name: "구글",
          loadingColor: "border-blue-500",
          buttonColor: "bg-blue-500 hover:bg-blue-600",
        };
      case "kakao":
        return {
          color: "yellow",
          name: "카카오",
          loadingColor: "border-yellow-500",
          buttonColor: "bg-yellow-500 hover:bg-yellow-600",
        };
      case "naver":
        return {
          color: "green",
          name: "네이버",
          loadingColor: "border-green-500",
          buttonColor: "bg-green-500 hover:bg-green-600",
        };
      default:
        return {
          color: "pink",
          name: "소셜",
          loadingColor: "border-pink-500",
          buttonColor: "bg-pink-500 hover:bg-pink-600",
        };
    }
  };

  const providerInfo = getProviderInfo();

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-pink-50 to-blue-50">
        <div className="text-center">
          <div className={`mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid ${providerInfo.loadingColor} border-r-transparent`}></div>
          <p className="text-lg text-gray-700">{providerInfo.name} 로그인 처리 중...</p>
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
            className={`rounded-lg ${providerInfo.buttonColor} px-6 py-2 text-white`}
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

