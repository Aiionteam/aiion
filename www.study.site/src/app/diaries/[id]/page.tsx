"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { getUserDiaries, getDiaryById, Diary, predictEmotion, PredictEmotionResponse } from "@/lib/api/diary";
import { getUserIdFromToken } from "@/lib/api/auth";

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
  const [showAllProbabilities, setShowAllProbabilities] = useState(false);

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
        
        // 현재 로그인한 사용자 ID 가져오기
        const userIdStr = getUserIdFromToken();
        if (!userIdStr) {
          setError("로그인이 필요합니다.");
          setLoading(false);
          return;
        }
        const userId = parseInt(userIdStr, 10);
        if (isNaN(userId)) {
          setError("유효하지 않은 사용자 ID입니다.");
          setLoading(false);
          return;
        }
        
        // 개별 일기 조회 (일괄 조회 방식 사용, N+1 문제 해결)
        const foundDiary = await getDiaryById(diaryId, userId);
        
        if (!foundDiary) {
          setError("일기를 찾을 수 없습니다.");
          setLoading(false);
          return;
        }

        setDiary(foundDiary);

        // DB에 감정 정보가 있으면 사용 (이미 분석 완료)
        // emotion이 null이 아니고 undefined도 아니면 이미 분석된 것으로 간주
        // emotion: 0 (평가불가)도 이미 분석된 것으로 간주
        if (foundDiary.emotion !== null && foundDiary.emotion !== undefined) {
          setEmotionLoading(false);
          // DB에서 가져온 감정 정보를 PredictEmotionResponse 형식으로 변환
          if (foundDiary.emotionLabel) {
            // probabilities JSON 문자열을 파싱
            let probabilities: Record<string, number> | undefined;
            if (foundDiary.emotionProbabilities) {
              try {
                probabilities = JSON.parse(foundDiary.emotionProbabilities);
              } catch (e) {
                console.warn(`[DiaryDetailPage] probabilities JSON 파싱 실패: ${e}`);
              }
            }
            setEmotion({
              emotion: foundDiary.emotion,
              emotion_label: foundDiary.emotionLabel,
              confidence: foundDiary.emotionConfidence,
              probabilities: probabilities,
            });
          }
        } else {
          // DB에 감정 정보가 없으면 캐시 확인
          const cache = getEmotionCache();
          const cachedEmotion = cache[diaryId];
          
          if (cachedEmotion) {
            // 캐시된 감정 분석 결과 사용
            console.log(`[DiaryDetailPage] 일기 ID ${diaryId}의 캐시된 감정 정보 사용`);
            setEmotion(cachedEmotion.emotion);
            setEmotionLoading(false);
          } else {
            // 캐시에도 없으면 분석 수행 (백엔드 분석 실패 시에만)
            console.log(`[DiaryDetailPage] 일기 ID ${diaryId}의 감정 분석 시작 (DB와 캐시 모두 없음)`);
            setEmotionLoading(true);
            try {
              const text = `${foundDiary.title || ""} ${foundDiary.content || ""}`.trim();
              if (text) {
                const emotionResult = await predictEmotion(text, 20000);
                setEmotion(emotionResult);
                // 캐시에 저장
                setEmotionCache(diaryId, emotionResult);
                console.log(`[DiaryDetailPage] 일기 ID ${diaryId}의 감정 분석 완료: ${emotionResult.emotion_label}`);
              }
            } catch (err) {
              console.error(`[DiaryDetailPage] 일기 ID ${diaryId} 감정 분석 실패:`, err);
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

  // 감정 라벨을 "평범"으로 변환하는 함수
  const normalizeEmotionLabel = (label: string | undefined): string => {
    if (!label) return "";
    return label === "평가불가" ? "평범" : label;
  };

  // 1위/2위 감정을 표시하는 함수
  const getEmotionDisplay = (): string => {
    // probabilities가 있으면 1위/2위 표시
    if (emotion?.probabilities) {
      const sorted = Object.entries(emotion.probabilities)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 2);
      
      if (sorted.length >= 2) {
        const first = normalizeEmotionLabel(sorted[0][0]);
        const second = normalizeEmotionLabel(sorted[1][0]);
        return `${first}/${second}`;
      } else if (sorted.length === 1) {
        return normalizeEmotionLabel(sorted[0][0]);
      }
    }
    
    // probabilities가 없으면 기본 라벨 사용
    if (diary?.emotionLabel) {
      return normalizeEmotionLabel(diary.emotionLabel);
    }
    
    if (emotion?.emotion_label) {
      return normalizeEmotionLabel(emotion.emotion_label);
    }
    
    return "";
  };

  // 감정에 따른 이모티콘 반환 (1위만) - 확률이 가장 높은 감정 기준
  const getEmotionEmoji = (): string => {
    const emotionMap: Record<number, string> = {
      0: "😐", // 평가불가 -> 평범
      1: "😊", // 기쁨
      2: "😢", // 슬픔
      3: "😠", // 분노
      4: "😨", // 두려움
      5: "🤢", // 혐오
      6: "😲", // 놀람
      7: "🤝", // 신뢰
      8: "✨", // 기대
      9: "😰", // 불안
      10: "😌", // 안도
      11: "😔", // 후회
      12: "💭", // 그리움
      13: "🙏", // 감사
      14: "😞", // 외로움
    };
    
    // 감정 라벨을 숫자로 변환하는 매핑
    const labelToId: Record<string, number> = {
      '평가불가': 0,
      '평범': 0,
      '기쁨': 1,
      '슬픔': 2,
      '분노': 3,
      '두려움': 4,
      '혐오': 5,
      '놀람': 6,
      '신뢰': 7,
      '기대': 8,
      '불안': 9,
      '안도': 10,
      '후회': 11,
      '그리움': 12,
      '감사': 13,
      '외로움': 14,
    };
    
    // probabilities에서 확률이 가장 높은 감정 찾기
    if (emotion?.probabilities && Object.keys(emotion.probabilities).length > 0) {
      const sorted = Object.entries(emotion.probabilities)
        .sort(([, a], [, b]) => b - a);
      
      if (sorted.length > 0) {
        const topEmotionLabel = normalizeEmotionLabel(sorted[0][0]);
        const emotionId = labelToId[topEmotionLabel];
        if (emotionId !== undefined) {
          return emotionMap[emotionId] || "😐";
        }
      }
    }
    
    // DB에서 가져온 감정 정보 사용 (fallback)
    if (diary?.emotion !== null && diary?.emotion !== undefined) {
      return emotionMap[diary.emotion] || "😐";
    }
    
    // 캐시된 감정 분석 결과 사용 (fallback)
    if (emotion) {
      return emotionMap[emotion.emotion] || "😐";
    }
    
    return "😐";
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
              onClick={() => {
                // 목록 페이지의 스크롤 위치를 저장 (목록 페이지에서 이미 저장되지만 확실히 하기 위해)
                if (typeof window !== "undefined") {
                  const scrollY = window.scrollY || document.documentElement.scrollTop;
                  sessionStorage.setItem("diaries_scroll_position", scrollY.toString());
                }
                router.back();
              }}
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
            {getEmotionDisplay() && (
              <span className="ml-auto text-gray-500">
                감정: {getEmotionDisplay()}
              </span>
            )}
          </div>
          
          {/* Emotion Probabilities */}
          {emotion?.probabilities && Object.keys(emotion.probabilities).length > 0 && (() => {
            const sortedProbabilities = Object.entries(emotion.probabilities)
              .sort(([, a], [, b]) => b - a); // 확률이 높은 순으로 정렬
            const mainEmotion = sortedProbabilities[0];
            const otherEmotions = sortedProbabilities.slice(1);
            // 확률이 가장 높은 감정을 메인 감정으로 설정
            const mainEmotionLabel = normalizeEmotionLabel(mainEmotion[0]);
            
            return (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-700">감정 분석 확률</h3>
                  {otherEmotions.length > 0 && (
                    <button
                      onClick={() => setShowAllProbabilities(!showAllProbabilities)}
                      className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
                    >
                      {showAllProbabilities ? (
                        <>
                          <span>접기</span>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 15l-6-6-6 6" />
                          </svg>
                        </>
                      ) : (
                        <>
                          <span>전체 보기</span>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M6 9l6 6 6-6" />
                          </svg>
                        </>
                      )}
                    </button>
                  )}
                </div>
                <div className="space-y-2">
                  {/* 메인 감정 (항상 표시) */}
                  {mainEmotion && (() => {
                    const [label, prob] = mainEmotion;
                    const normalizedLabel = normalizeEmotionLabel(label);
                    const percentage = (prob * 100).toFixed(1);
                    const isMainEmotion = normalizedLabel === mainEmotionLabel;
                    return (
                      <div key={label} className="flex items-center gap-3">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className={`text-sm ${isMainEmotion ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
                              {normalizedLabel}
                            </span>
                            <span className={`text-sm ${isMainEmotion ? 'font-semibold text-gray-900' : 'text-gray-500'}`}>
                              {percentage}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all ${
                                isMainEmotion 
                                  ? 'bg-blue-500' 
                                  : 'bg-gray-400'
                              }`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                  
                  {/* 나머지 감정들 (접기/열기) */}
                  {showAllProbabilities && otherEmotions.map(([label, prob]) => {
                    const normalizedLabel = normalizeEmotionLabel(label);
                    const percentage = (prob * 100).toFixed(1);
                    const isMainEmotion = normalizedLabel === mainEmotionLabel;
                    return (
                      <div key={label} className="flex items-center gap-3">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className={`text-sm ${isMainEmotion ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
                              {normalizedLabel}
                            </span>
                            <span className={`text-sm ${isMainEmotion ? 'font-semibold text-gray-900' : 'text-gray-500'}`}>
                              {percentage}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all ${
                                isMainEmotion 
                                  ? 'bg-blue-500' 
                                  : 'bg-gray-400'
                              }`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
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
