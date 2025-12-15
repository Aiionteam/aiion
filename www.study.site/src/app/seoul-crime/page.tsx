"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/atoms/Button";
import { useLoginStore } from "@/store";
import { getToken } from "@/lib/api/auth";
import apiClient from "@/lib/api/client";

export default function SeoulCrimePage() {
  const router = useRouter();
  const { isAuthenticated, restoreAuthState } = useLoginStore();
  const [isHydrated, setIsHydrated] = useState(false);
  const [mapHtml, setMapHtml] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [crimeHeatmapLoaded, setCrimeHeatmapLoaded] = useState(false);
  const [arrestHeatmapLoaded, setArrestHeatmapLoaded] = useState(false);
  const [heatmapError, setHeatmapError] = useState<string | null>(null);

  useEffect(() => {
    setIsHydrated(true);
    restoreAuthState();
  }, [restoreAuthState]);

  useEffect(() => {
    if (!isHydrated) return;

    const token = getToken();
    if (!token || !isAuthenticated) {
      router.replace("/");
      return;
    }

    // 범죄율 지도 HTML 가져오기
    const fetchMapHtml = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // API에서 지도 HTML 가져오기
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
        const response = await fetch(
          `${API_BASE_URL}/api/ml-service/seoul-crime/map/html`,
          {
            method: "GET",
            headers: {
              "Accept": "text/html",
            },
            credentials: "include",
          }
        );
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const html = await response.text();
        setMapHtml(html);
      } catch (err: any) {
        console.error("범죄율 지도 로드 실패:", err);
        setError(err.userMessage || err.message || "지도를 불러오는데 실패했습니다.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchMapHtml();
  }, [isAuthenticated, router, isHydrated]);

  if (!isHydrated) {
    return null;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="relative min-h-screen w-full">
      {/* 헤더 */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white shadow-md p-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <Link href="/home">
              <Button variant="secondary" className="w-auto px-4 py-2">
                ← 뒤로가기
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-gray-800">
              🗺️ 서울시 범죄율 지도
            </h1>
          </div>
          <div className="text-sm text-gray-600">
            범죄율, 검거율, CCTV 개수 확인
          </div>
        </div>
      </div>

      {/* 지도 컨테이너 - 크기 줄임 */}
      <div className="pt-20 w-full">
        <div className="h-[60vh] mb-6">
          {isLoading && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto mb-4"></div>
                <p className="text-gray-600">지도를 불러오는 중...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
                <p className="text-red-600 font-semibold mb-2">오류 발생</p>
                <p className="text-red-500 text-sm mb-4">{error}</p>
                <Button
                  variant="primary"
                  onClick={() => window.location.reload()}
                  className="w-auto"
                >
                  다시 시도
                </Button>
              </div>
            </div>
          )}

          {!isLoading && !error && mapHtml && (
            <iframe
              srcDoc={mapHtml}
              className="w-full h-full border-0 rounded-lg shadow-lg"
              title="서울시 범죄율 지도"
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            />
          )}
        </div>

        {/* 히트맵 이미지 섹션 */}
        <div className="max-w-7xl mx-auto px-4 pb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
            📊 자치구별 상세 통계 히트맵
          </h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 범죄율 히트맵 */}
            <div className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
              <div className="bg-gradient-to-r from-red-500 to-red-600 text-white px-6 py-4">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  🔴 범죄율 히트맵
                </h3>
                <p className="text-sm text-red-100 mt-1">인구 1만명당 범죄 발생 건수</p>
              </div>
              <div className="p-4 bg-gray-50">
                {!crimeHeatmapLoaded && (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500 mx-auto mb-2"></div>
                      <p className="text-gray-500 text-sm">이미지 로딩 중...</p>
                    </div>
                  </div>
                )}
                <img
                  src="/crime_rate_heatmap.png"
                  alt="범죄율 히트맵"
                  className={`w-full h-auto rounded-lg shadow-md hover:scale-105 transition-transform duration-300 ${crimeHeatmapLoaded ? 'block' : 'hidden'}`}
                  onLoad={() => setCrimeHeatmapLoaded(true)}
                  onError={(e) => {
                    console.error("범죄율 히트맵 로드 실패:", e);
                    setHeatmapError("범죄율 히트맵을 불러올 수 없습니다.");
                    const target = e.target as HTMLImageElement;
                    target.style.display = "none";
                  }}
                />
              </div>
            </div>

            {/* 검거율 히트맵 */}
            <div className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-4">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  🔵 검거율 히트맵
                </h3>
                <p className="text-sm text-blue-100 mt-1">인구 1만명당 검거 건수</p>
              </div>
              <div className="p-4 bg-gray-50">
                {!arrestHeatmapLoaded && (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                      <p className="text-gray-500 text-sm">이미지 로딩 중...</p>
                    </div>
                  </div>
                )}
                <img
                  src="/arrest_rate_heatmap.png"
                  alt="검거율 히트맵"
                  className={`w-full h-auto rounded-lg shadow-md hover:scale-105 transition-transform duration-300 ${arrestHeatmapLoaded ? 'block' : 'hidden'}`}
                  onLoad={() => setArrestHeatmapLoaded(true)}
                  onError={(e) => {
                    console.error("검거율 히트맵 로드 실패:", e);
                    setHeatmapError("검거율 히트맵을 불러올 수 없습니다.");
                    const target = e.target as HTMLImageElement;
                    target.style.display = "none";
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

