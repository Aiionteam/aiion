/**
 * OAuth 콜백 처리 훅
 * URL 파라미터에서 OAuth 토큰을 추출하고 처리
 */

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLoginStore } from "@/store";
import { handleOAuthCallback, extractOAuthParams } from "@/service";

export const useOAuthCallback = (isHydrated: boolean, isAuthenticated: boolean) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setAuthenticated, setLoadingType } = useLoginStore();
  const [isProcessingOAuth, setIsProcessingOAuth] = useState(false);

  useEffect(() => {
    if (!isHydrated) return;
    if (isAuthenticated) return; // 이미 로그인된 경우 처리하지 않음
    if (isProcessingOAuth) return; // 이미 처리 중인 경우 중복 방지

    // URL 파라미터 추출
    const params = extractOAuthParams(searchParams);

    // 파라미터가 없으면 처리하지 않음
    if (!params.token && !params.error) {
      return;
    }

    setIsProcessingOAuth(true);

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

        // 팝업이 아닌 경우에만 리다이렉트
        const isPopup = typeof window !== "undefined" && window.opener !== null;
        if (!isPopup) {
          router.replace("/home");
        }
      },
      onError: (error) => {
        alert(error);
        router.replace("/");
        setIsProcessingOAuth(false);
      },
      onRedirect: (path) => {
        // 팝업이 아닌 경우에만 리다이렉트
        const isPopup = typeof window !== "undefined" && window.opener !== null;
        if (!isPopup) {
          router.replace(path);
        }
      },
    });

    // 팝업인 경우는 이미 처리되었으므로 여기서는 아무것도 하지 않음
    if (result.success) {
      const isPopup = typeof window !== "undefined" && window.opener !== null;
      if (!isPopup) {
        setIsProcessingOAuth(false);
      }
    }
  }, [isHydrated, isAuthenticated, searchParams, router, setAuthenticated, setLoadingType, isProcessingOAuth]);

  return isProcessingOAuth;
};

