"use client";

import React, { useEffect, useState } from "react";
import { getNanjungDiaries, Diary } from "@/lib/api/diary";

export const NanjungDiaries: React.FC = () => {
  const [diaries, setDiaries] = useState<Diary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const fetchDiaries = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await getNanjungDiaries(10);
        setDiaries(response.diaries || []);
      } catch (err: any) {
        console.error("난중일기 정보 로드 실패:", err);
        setError("일기 정보를 불러올 수 없습니다.");
      } finally {
        setLoading(false);
      }
    };

    fetchDiaries();
  }, []);

  if (loading) {
    return (
      <div className="absolute top-4 right-4 z-10 w-64 bg-white border border-gray-200 rounded-lg shadow-lg p-3">
        <div className="text-sm text-gray-500">로딩 중...</div>
      </div>
    );
  }

  if (error || diaries.length === 0) {
    return null;
  }

  // 날짜 포맷팅 함수
  const formatDate = (dateStr: string) => {
    try {
      // '1592-02-13,<임술>' 형식을 처리
      const datePart = dateStr.split(',')[0];
      return datePart;
    } catch {
      return dateStr;
    }
  };

  // 제목에서 태그 제거 및 정리
  const cleanTitle = (title: string) => {
    return title.replace(/<[^>]*>/g, '').trim();
  };

  // 내용 요약 (최대 50자)
  const truncateContent = (content: string, maxLength: number = 50) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  return (
    <div className="absolute top-4 right-4 z-10 w-80 bg-white border border-gray-200 rounded-lg shadow-lg">
      <div
        className="px-4 py-3 border-b border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">
            난중일기 상위 10개
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
          {diaries.map((diary, index) => (
            <div
              key={diary.id}
              className="px-4 py-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-gray-900">
                      {index + 1}.
                    </span>
                    <span className="text-xs font-medium text-gray-900 truncate">
                      {cleanTitle(diary.title) || formatDate(diary.localdate)}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-600 mb-1">
                    <span>날짜: {formatDate(diary.localdate)}</span>
                  </div>
                  {diary.content && (
                    <div className="text-xs text-gray-600 line-clamp-2">
                      {truncateContent(diary.content, 80)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!isExpanded && (
        <div className="px-4 py-2 text-xs text-gray-500">
          {diaries.length}개의 일기 보기 (클릭하여 펼치기)
        </div>
      )}
    </div>
  );
};
