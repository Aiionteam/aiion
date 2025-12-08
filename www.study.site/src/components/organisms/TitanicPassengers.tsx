"use client";

import React from "react";
import { useRouter } from "next/navigation";

export const TitanicPassengers: React.FC = () => {
  const router = useRouter();

  const handleNavigate = () => {
    router.push("/titanic");
  };

  return (
    <div className="absolute top-4 left-4 z-10">
      <button
        onClick={handleNavigate}
        className="bg-white border border-gray-200 rounded-lg shadow-lg px-4 py-3 hover:bg-gray-50 transition-colors flex items-center gap-2"
      >
        <span className="text-sm font-semibold text-gray-900">
          타이타닉 승객 목록
        </span>
        <svg
          className="w-4 h-4 text-gray-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      </button>
    </div>
  );
};

