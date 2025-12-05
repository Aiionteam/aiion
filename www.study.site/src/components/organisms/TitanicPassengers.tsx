"use client";

import React, { useEffect, useState } from "react";
import { getTop10Passengers, Passenger } from "@/lib/api/titanic";

export const TitanicPassengers: React.FC = () => {
  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const fetchPassengers = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await getTop10Passengers();
        setPassengers(response.passengers || []);
      } catch (err: any) {
        console.error("타이타닉 승객 정보 로드 실패:", err);
        setError("승객 정보를 불러올 수 없습니다.");
      } finally {
        setLoading(false);
      }
    };

    fetchPassengers();
  }, []);

  if (loading) {
    return (
      <div className="absolute top-4 left-4 z-10 w-64 bg-white border border-gray-200 rounded-lg shadow-lg p-3">
        <div className="text-sm text-gray-500">로딩 중...</div>
      </div>
    );
  }

  if (error || passengers.length === 0) {
    return null;
  }

  return (
    <div className="absolute top-4 left-4 z-10 w-80 bg-white border border-gray-200 rounded-lg shadow-lg">
      <div
        className="px-4 py-3 border-b border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">
            타이타닉 승객 상위 10명
          </h3>
          <svg
            className={`w-4 h-4 text-gray-500 transition-transform ${
              isExpanded ? "rotate-180" : ""
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </div>

      {isExpanded && (
        <div className="max-h-96 overflow-y-auto">
          {passengers.map((passenger, index) => (
            <div
              key={passenger.PassengerId}
              className="px-4 py-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-gray-900">
                      {index + 1}.
                    </span>
                    <span className="text-xs font-medium text-gray-900 truncate">
                      {passenger.Name}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-600">
                    <span>
                      생존:{" "}
                      <span
                        className={`font-medium ${
                          passenger.Survived === "1"
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {passenger.Survived === "1" ? "생존" : "사망"}
                      </span>
                    </span>
                    <span>등급: {passenger.Pclass}</span>
                    <span>성별: {passenger.Sex}</span>
                    {passenger.Age && <span>나이: {passenger.Age}</span>}
                    {passenger.Fare && (
                      <span>요금: {parseFloat(passenger.Fare).toFixed(2)}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!isExpanded && (
        <div className="px-4 py-2 text-xs text-gray-500">
          {passengers.length}명의 승객 정보 보기 (클릭하여 펼치기)
        </div>
      )}
    </div>
  );
};

