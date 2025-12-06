"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { getUserDiaries, getDiaryById, Diary, predictEmotion, PredictEmotionResponse } from "@/lib/api/diary";

// 로컬 스토리지 키
const EMOTION_CACHE_KEY = "diary_emotions_cache";

// 감정 분석 결과 캐시 인터페이스
interface EmotionCache {
  [diaryId: number]: {
    emotion: PredictEmotionResponse;
    timestamp: number;
  };
}

// 캐시 유효 기간 (24시간)
const CACHE_EXPIRY = 24 * 60 * 60 * 1000;

// 로컬 스토리지에서 감정 캐시 가져오기
const getEmotionCache = (): EmotionCache => {
  if (typeof window === "undefined") return {};
  try {
    const cached = localStorage.getItem(EMOTION_CACHE_KEY);
    if (!cached) return {};
    const cache: EmotionCache = JSON.parse(cached);
    // 만료된 캐시 제거
    const now = Date.now();
    const validCache: EmotionCache = {};
    for (const [id, data] of Object.entries(cache)) {
      if (now - data.timestamp < CACHE_EXPIRY) {
        validCache[Number(id)] = data;
      }
    }
    // 유효한 캐시만 저장
    if (Object.keys(validCache).length !== Object.keys(cache).length) {
      localStorage.setItem(EMOTION_CACHE_KEY, JSON.stringify(validCache));
    }
    return validCache;
  } catch {
    return {};
  }
};

// 로컬 스토리지에 감정 캐시 저장
const setEmotionCache = (diaryId: number, emotion: PredictEmotionResponse) => {
  if (typeof window === "undefined") return;
  try {
    const cache = getEmotionCache();
    cache[diaryId] = {
      emotion,
      timestamp: Date.now(),
    };
    localStorage.setItem(EMOTION_CACHE_KEY, JSON.stringify(cache));
  } catch (err) {
    console.error("감정 캐시 저장 실패:", err);
  }
};

export default function DiaryDetailPage() {
  const router = useRouter();
  const params = useParams();
  const diaryId = params?.id ? Number(params.id) : null;
  
  const [diary, setDiary] = useState<Diary | null>(null);
  const [emotion, setEmotion] = useState<PredictEmotionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [emotionLoading, setEmotionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDiary = async () => {
      if (!diaryId) {
        setError("일기 ID가 없습니다.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        // 개별 일기 조회 (일괄 조회 방식 사용, N+1 문제 해결)
        const foundDiary = await getDiaryById(diaryId, 1);
        
        if (!foundDiary) {
          setError("일기를 찾을 수 없습니다.");
          setLoading(false);
          return;
        }

        setDiary(foundDiary);

        // DB에 감정 정보가 있으면 사용 (이미 분석 완료)
        if (foundDiary.emotion != null) {
          setEmotionLoading(false);
          // DB에서 가져온 감정 정보를 PredictEmotionResponse 형식으로 변환
          if (foundDiary.emotionLabel) {
            setEmotion({
              emotion: foundDiary.emotion,
              emotion_label: foundDiary.emotionLabel,
              confidence: foundDiary.emotionConfidence,
            });
          }
        } else {
          // DB에 감정 정보가 없으면 캐시 확인
          const cache = getEmotionCache();
          const cachedEmotion = cache[diaryId];
          
          if (cachedEmotion) {
            // 캐시된 감정 분석 결과 사용
            setEmotion(cachedEmotion.emotion);
            setEmotionLoading(false);
          } else {
            // 캐시에도 없으면 분석 수행
            setEmotionLoading(true);
            try {
              const text = `${foundDiary.title || ""} ${foundDiary.content || ""}`.trim();
              if (text) {
                const emotionResult = await predictEmotion(text, 20000);
                setEmotion(emotionResult);
                // 캐시에 저장
                setEmotionCache(diaryId, emotionResult);
              }
            } catch (err) {
              console.error("감정 분석 실패:", err);
            } finally {
              setEmotionLoading(false);
            }
          }
        }
      } catch (err: any) {
        console.error("일기 로드 실패:", err);
        setError(err.message || "일기를 불러올 수 없습니다.");
      } finally {
        setLoading(false);
      }
    };

    fetchDiary();
  }, [diaryId]);

  // 날짜 포맷팅 함수
  const formatDate = (dateStr: string) => {
    try {
      const parts = dateStr.split("-");
      if (parts.length >= 3) {
        const year = parts[0];
        const month = parts[1];
        const day = parts[2].split(" ")[0];
        const date = new Date(`${year}-${month}-${day}`);
        const dayOfWeek = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"][
          date.getDay()
        ];
        return { year, month, day, dayOfWeek };
      }
      return { year: "", month: "", day: "", dayOfWeek: "" };
    } catch {
      return { year: "", month: "", day: "", dayOfWeek: "" };
    }
  };

  // 제목 정리 (태그 제거)
  const cleanTitle = (title: string) => {
    if (!title) return "";
    return title.replace(/<[^>]*>/g, "").trim() || "제목 없음";
  };

  // 감정에 따른 이모티콘 반환
  const getEmotionEmoji = (): string => {
    // DB에서 가져온 감정 정보 우선 사용
    if (diary?.emotion != null) {
      const emotionMap: Record<number, string> = {
        0: "😐", // 평가불가
        1: "😊", // 기쁨
        2: "😢", // 슬픔
        3: "😠", // 분노
        4: "😨", // 두려움
        5: "🤢", // 혐오
        6: "😲", // 놀람
      };
      return emotionMap[diary.emotion] || "😐";
    }
    
    // 캐시된 감정 분석 결과 사용
    if (emotion) {
      const emotionMap: Record<number, string> = {
        0: "😐", // 평가불가
        1: "😊", // 기쁨
        2: "😢", // 슬픔
        3: "😠", // 분노
        4: "😨", // 두려움
        5: "🤢", // 혐오
        6: "😲", // 놀람
      };
      return emotionMap[emotion.emotion] || "😐";
    }
    
    return "";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    );
  }

  if (error || !diary) {
    return (
      <div className="min-h-screen bg-white">
        <header className="sticky top-0 z-10 bg-white border-b border-gray-200">
          <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
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
            <h1 className="text-xl font-semibold text-gray-900">일기 상세</h1>
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-6 py-6">
          <div className="text-center py-20">
            <div className="text-red-500">{error || "일기를 찾을 수 없습니다."}</div>
          </div>
        </main>
      </div>
    );
  }

  const { year, month, day, dayOfWeek } = formatDate(diary.diaryDate);
  const title = cleanTitle(diary.title);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
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
          <h1 className="text-xl font-semibold text-gray-900">일기 상세</h1>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Title Section */}
        <div className="mb-6 pb-6 border-b border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
            {/* Emotion Emoji */}
            <div className="text-2xl">
              {emotionLoading && !diary.emotion ? (
                <span className="text-gray-300 animate-pulse">⏳</span>
              ) : (
                <span>{getEmotionEmoji()}</span>
              )}
            </div>
          </div>
          
          {/* Date Info */}
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>{year}년 {month}월 {day}일</span>
            {dayOfWeek && <span className="text-gray-500">{dayOfWeek}</span>}
            {(diary.emotionLabel || emotion?.emotion_label) && (
              <span className="ml-auto text-gray-500">
                감정: {diary.emotionLabel || emotion?.emotion_label}
              </span>
            )}
          </div>
        </div>

        {/* Content Section */}
        <div className="prose max-w-none">
          <div className="text-gray-900 whitespace-pre-wrap break-words leading-relaxed">
            {diary.content || "내용이 없습니다."}
          </div>
        </div>
      </main>
    </div>
  );
}
