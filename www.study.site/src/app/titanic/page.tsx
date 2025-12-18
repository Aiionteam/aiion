"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAllPassengers, getTop10Passengers, Passenger } from "@/lib/api/titanic";

export default function TitanicPage() {
  const router = useRouter();
  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc"); // 기본값: 오름차순 (ID 순)

  useEffect(() => {
    const fetchPassengers = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // 전체 승객 목록 조회 시도
        try {
          const allPassengers = await getAllPassengers();
          setPassengers(allPassengers);
        } catch (err: any) {
          // 전체 목록 API가 없으면 상위 10명만 조회
          console.warn("[Titanic Page] 전체 목록 API 없음, 상위 10명만 조회:", err);
          const response = await getTop10Passengers();
          setPassengers(response.passengers || []);
        }
      } catch (err: any) {
        console.error("타이타닉 승객 목록 로드 실패:", err);
        setError(err.message || "승객 목록을 불러올 수 없습니다.");
      } finally {
        setLoading(false);
      }
    };

    fetchPassengers();
  }, []);

  // 정렬 순서 토글
  const toggleSortOrder = () => {
    const newSortOrder = sortOrder === "asc" ? "desc" : "asc";
    setSortOrder(newSortOrder);
    
    // 승객 리스트 재정렬
    const sortedPassengers = [...passengers].sort((a, b) => {
      const idA = parseInt(a.PassengerId) || 0;
      const idB = parseInt(b.PassengerId) || 0;
      return newSortOrder === "asc" ? idA - idB : idB - idA;
    });
    setPassengers(sortedPassengers);
  };

  // 생존 여부 표시 (test.csv에는 Survived 컬럼이 없을 수 있음)
  const getSurvivedDisplay = (survived: string | undefined): { text: string; color: string } => {
    if (!survived || survived === "") {
      return { text: "-", color: "text-gray-500" };
    }
    if (survived === "1") {
      return { text: "생존", color: "text-green-600" };
    }
    return { text: "사망", color: "text-red-600" };
  };

  // 등급 표시
  const getPclassDisplay = (pclass: string): string => {
    const classMap: Record<string, string> = {
      "1": "1등석",
      "2": "2등석",
      "3": "3등석",
    };
    return classMap[pclass] || pclass;
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="뒤로가기"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M19 12H5" />
                <path d="M12 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-xl font-semibold text-gray-900">타이타닉 승객 목록</h1>
            <span className="text-sm text-gray-500">({passengers.length}명)</span>
          </div>
          <div className="flex items-center gap-2">
            {/* 테스트 페이지로 가는 버튼 */}
            <button
              onClick={() => router.push("/titanic/test")}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors text-sm font-medium"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 11l3 3L22 4" />
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
              </svg>
              테스트 페이지
            </button>
            {/* 정렬 버튼 */}
            <button
              onClick={toggleSortOrder}
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors text-sm text-gray-700"
              aria-label={sortOrder === "asc" ? "내림차순 정렬" : "오름차순 정렬"}
            >
              {sortOrder === "asc" ? (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M7 6l5 5 5-5" />
                  <path d="M7 13l5 5 5-5" />
                </svg>
              ) : (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M7 13l5 5 5-5" />
                  <path d="M7 6l5-5 5 5" />
                </svg>
              )}
              <span>{sortOrder === "asc" ? "오름차순" : "내림차순"}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-6 py-6">
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="text-gray-500">로딩 중...</div>
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center py-20">
            <div className="text-red-500">{error}</div>
          </div>
        )}

        {!loading && !error && passengers.length === 0 && (
          <div className="flex items-center justify-center py-20">
            <div className="text-gray-500">승객 데이터가 없습니다.</div>
          </div>
        )}

        {!loading && !error && passengers.length > 0 && (
          <div className="bg-white">
            {/* 테이블 헤더 */}
            <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-gray-50 border-b border-gray-200 font-semibold text-sm text-gray-700">
              <div className="col-span-1">ID</div>
              <div className="col-span-3">이름</div>
              <div className="col-span-1">생존</div>
              <div className="col-span-1">등급</div>
              <div className="col-span-1">성별</div>
              <div className="col-span-1">나이</div>
              <div className="col-span-1">요금</div>
              <div className="col-span-1">탑승지</div>
              <div className="col-span-2">객실</div>
            </div>

            {/* 승객 리스트 */}
            {passengers.map((passenger) => {
              const survived = getSurvivedDisplay(passenger.Survived);
              const pclass = getPclassDisplay(passenger.Pclass);
              
              return (
                <div
                  key={passenger.PassengerId}
                  className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors"
                >
                  <div className="col-span-1 text-sm text-gray-900">
                    {passenger.PassengerId}
                  </div>
                  <div className="col-span-3 text-sm text-gray-900 truncate" title={passenger.Name}>
                    {passenger.Name}
                  </div>
                  <div className="col-span-1">
                    <span className={`text-sm font-medium ${survived.color}`}>
                      {survived.text}
                    </span>
                  </div>
                  <div className="col-span-1 text-sm text-gray-600">
                    {pclass}
                  </div>
                  <div className="col-span-1 text-sm text-gray-600">
                    {passenger.Sex === "male" ? "남성" : passenger.Sex === "female" ? "여성" : passenger.Sex}
                  </div>
                  <div className="col-span-1 text-sm text-gray-600">
                    {passenger.Age || "-"}
                  </div>
                  <div className="col-span-1 text-sm text-gray-600">
                    {passenger.Fare ? parseFloat(passenger.Fare).toFixed(2) : "-"}
                  </div>
                  <div className="col-span-1 text-sm text-gray-600">
                    {passenger.Embarked || "-"}
                  </div>
                  <div className="col-span-2 text-sm text-gray-600 truncate">
                    {passenger.Cabin || "-"}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

