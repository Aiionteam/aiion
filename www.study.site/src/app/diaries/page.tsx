"use client";

import React, { useEffect, useState, useRef, useLayoutEffect } from "react";
import { useRouter } from "next/navigation";
import { getUserDiaries, Diary, predictEmotion, PredictEmotionResponse } from "@/lib/api/diary";

interface DiaryWithEmotion extends Diary {
  emotionResponse?: PredictEmotionResponse; // 프론트엔드에서 분석한 결과 (캐시용)
  emotionLoading?: boolean;
}

export default function DiariesPage() {
  const router = useRouter();
  const [diaries, setDiaries] = useState<DiaryWithEmotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analyzedIds, setAnalyzedIds] = useState<Set<number>>(new Set());
  const scrollRestored = useRef(false);
  const listContainerRef = useRef<HTMLDivElement>(null);

  // 로컬 스토리지 키
  const EMOTION_CACHE_KEY = "diary_emotions_cache";
  const SCROLL_POSITION_KEY = "diaries_scroll_position";

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

  // 감정 분석 함수 (재사용 가능)
  const analyzeDiaryEmotion = async (diary: DiaryWithEmotion, index: number, isFirstRequest: boolean = false) => {
    try {
      // 제목과 내용을 결합하여 분석
      const text = `${diary.title || ""} ${diary.content || ""}`.trim();
      if (!text) {
        setDiaries((prev) =>
          prev.map((d, idx) =>
            idx === index ? { ...d, emotionLoading: false } : d
          )
        );
        setAnalyzedIds((prev) => new Set(prev).add(diary.id));
        return;
      }

      // 첫 번째 요청은 모델 학습 시간 고려하여 더 긴 타임아웃
      const timeout = isFirstRequest ? 60000 : 20000; // 첫 번째: 60초, 나머지: 20초
      const emotion = await predictEmotion(text, timeout);

            // 진행 상황 업데이트 (ID로 찾아서 업데이트 - 인덱스가 변경될 수 있음)
            setDiaries((prev) =>
              prev.map((d) =>
                d.id === diary.id
                  ? { ...d, emotionResponse: emotion, emotionLoading: false }
                  : d
              )
            );
      
      // 분석 완료된 ID 추가
      setAnalyzedIds((prev) => new Set(prev).add(diary.id));
    } catch (err) {
      console.error(`일기 ${diary.id} 감정 분석 실패:`, err);

      // 에러 발생 시에도 로딩 상태 해제
      setDiaries((prev) =>
        prev.map((d) =>
          d.id === diary.id ? { ...d, emotionLoading: false } : d
        )
      );
      setAnalyzedIds((prev) => new Set(prev).add(diary.id));
    }
  };

  // 스크롤 위치 저장
  const saveScrollPosition = () => {
    if (typeof window === "undefined") return;
    try {
      const scrollY = window.scrollY || document.documentElement.scrollTop;
      sessionStorage.setItem(SCROLL_POSITION_KEY, scrollY.toString());
    } catch (err) {
      console.error("스크롤 위치 저장 실패:", err);
    }
  };

  // 스크롤 위치 복원
  const restoreScrollPosition = () => {
    if (typeof window === "undefined" || scrollRestored.current) return;
    try {
      const savedPosition = sessionStorage.getItem(SCROLL_POSITION_KEY);
      if (savedPosition) {
        const scrollY = parseInt(savedPosition, 10);
        if (isNaN(scrollY) || scrollY < 0) return;
        
        // 여러 번 시도하여 확실히 복원
        const attemptRestore = (attempts = 0) => {
          if (attempts > 20) {
            // 최대 시도 횟수 초과 시 강제로 스크롤
            window.scrollTo({ top: scrollY, behavior: 'instant' });
            scrollRestored.current = true;
            return;
          }
          
          // DOM이 준비되었는지 확인
          const container = listContainerRef.current;
          if (container && container.children.length > 0) {
            // 리스트가 렌더링되었으면 스크롤 복원
            window.scrollTo({ top: scrollY, behavior: 'instant' });
            scrollRestored.current = true;
            console.log(`[DiariesPage] 스크롤 위치 복원: ${scrollY}px`);
          } else {
            // DOM이 아직 준비되지 않았으면 다시 시도
            setTimeout(() => attemptRestore(attempts + 1), 50);
          }
        };
        
        attemptRestore();
      }
    } catch (err) {
      console.error("스크롤 위치 복원 실패:", err);
      scrollRestored.current = true;
    }
  };

  // 브라우저 기본 스크롤 복원 비활성화
  useEffect(() => {
    if (typeof window !== "undefined" && 'scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  useEffect(() => {
    const fetchDiaries = async () => {
      try {
        setLoading(true);
        setError(null);
        // 스크롤 복원 플래그 리셋 (새로 로드할 때마다)
        scrollRestored.current = false;
        const diariesList = await getUserDiaries("1"); // userId1
        
        // 백엔드에서 감정 정보를 포함해서 반환 (diary.emotion, diary.emotionLabel, diary.emotionConfidence)
        // 일괄 조회로 N+1 문제 해결되어 있음
        console.log("[DiariesPage] 일기 목록 로드:", diariesList.length, "개");
        console.log("[DiariesPage] 감정 정보 포함 일기:", diariesList.filter(d => d.emotion != null).length, "개");
        
        // 각 일기의 감정 값 디버깅
        diariesList.forEach((diary, idx) => {
          console.log(`[DiariesPage] 일기 ${idx + 1} (ID: ${diary.id}): emotion=${diary.emotion}, label=${diary.emotionLabel}, confidence=${diary.emotionConfidence}`);
        });
        
        const diariesWithEmotion: DiaryWithEmotion[] = diariesList.map((diary) => {
          // 백엔드 DB에 감정 정보가 있으면 사용 (우선순위 1)
          // 백엔드에서 이미 분석된 결과를 포함해서 반환하므로 프론트엔드 분석 불필요
          const hasEmotion = diary.emotion != null;
          
          return {
            ...diary,
            emotionLoading: !hasEmotion, // 백엔드에 감정 정보가 없을 때만 로딩 표시
          };
        });
        
        setDiaries(diariesWithEmotion);

        // 백엔드에서 감정 정보를 포함해서 반환하므로 프론트엔드에서 추가 분석 불필요
        // 백엔드 분석이 실패한 경우에만 프론트엔드에서 분석 (fallback)
        const diariesToAnalyze = diariesWithEmotion.filter(
          (diary) => diary.emotion == null && diary.emotionLoading
        );

        if (diariesToAnalyze.length > 0) {
          console.log("[DiariesPage] 백엔드 분석 실패한 일기:", diariesToAnalyze.length, "개 - 프론트엔드에서 분석");
          // 각 일기의 감정 분석 (순차 처리) - 백엔드 분석 실패 시에만 실행
          for (let i = 0; i < diariesToAnalyze.length; i++) {
            const diary = diariesToAnalyze[i];
            const originalIndex = diariesWithEmotion.findIndex(d => d.id === diary.id);
            const isFirstRequest = i === 0 && analyzedIds.size === 0;
            await analyzeDiaryEmotion(diary, originalIndex, isFirstRequest);
          }
        } else {
          console.log("[DiariesPage] 모든 일기가 백엔드에서 감정 분석 완료");
        }
      } catch (err: any) {
        console.error("일기 목록 로드 실패:", err);
        setError(err.message || "일기 목록을 불러올 수 없습니다.");
      } finally {
        setLoading(false);
      }
    };

    fetchDiaries();
  }, []); // 초기 로드만

  // 스크롤 위치 저장 (스크롤 이벤트)
  useEffect(() => {
    const handleScroll = () => {
      saveScrollPosition();
    };

    // 스크롤 이벤트 리스너 추가 (throttle 적용)
    let ticking = false;
    const throttledScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", throttledScroll, { passive: true });
    
    return () => {
      window.removeEventListener("scroll", throttledScroll);
    };
  }, []);

  // 페이지를 떠날 때 스크롤 위치 저장
  useEffect(() => {
    const handleBeforeUnload = () => {
      saveScrollPosition();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  // 로딩 완료 후 스크롤 위치 복원 (useLayoutEffect로 DOM 업데이트 직후 실행)
  useLayoutEffect(() => {
    if (!loading && diaries.length > 0 && !scrollRestored.current) {
      // requestAnimationFrame을 사용하여 브라우저 렌더링 사이클에 맞춤
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          restoreScrollPosition();
        });
      });
    }
  }, [loading, diaries.length]);

  // 새 일기 추가 시 자동 감정 분석
  useEffect(() => {
    const checkForNewDiaries = async () => {
      try {
        const diariesList = await getUserDiaries("1");
        const currentIds = new Set(diaries.map(d => d.id));
        const newDiaries = diariesList.filter(d => !currentIds.has(d.id));

        if (newDiaries.length > 0) {
          // 캐시 확인
          const cache = getEmotionCache();
          
          // 새 일기 추가 (맨 앞에 추가)
          // 백엔드에서 감정 정보를 포함해서 반환하므로 캐시 확인 불필요
          const newDiariesWithEmotion: DiaryWithEmotion[] = newDiaries.map((diary) => {
            // 백엔드 DB에 감정 정보가 있으면 사용
            const hasEmotion = diary.emotion != null;
            return {
              ...diary,
              emotionLoading: !hasEmotion, // 백엔드에 감정 정보가 없을 때만 로딩 표시
            };
          });

          setDiaries((prev) => [...newDiariesWithEmotion, ...prev]);

          // 백엔드에서 감정 정보를 포함해서 반환하므로 프론트엔드에서 추가 분석 불필요
          // 백엔드 분석이 실패한 경우에만 프론트엔드에서 분석 (fallback)
          const diariesToAnalyze = newDiariesWithEmotion.filter(
            (diary) => diary.emotion == null && diary.emotionLoading
          );

          if (diariesToAnalyze.length > 0) {
            console.log("[DiariesPage] 새 일기 중 백엔드 분석 실패:", diariesToAnalyze.length, "개 - 프론트엔드에서 분석");
            // 백엔드 분석 실패 시에만 프론트엔드에서 분석 (백그라운드 처리)
            const emotionPromises = diariesToAnalyze.map(async (diary) => {
              await analyzeDiaryEmotion(diary, 0, false);
            });
            
            Promise.all(emotionPromises).catch((err) => {
              console.error("새 일기 감정 분석 중 오류:", err);
            });
          }
        }
      } catch (err) {
        console.error("새 일기 확인 실패:", err);
      }
    };

    // 페이지 포커스 시 새 일기 확인
    const handleFocus = () => {
      if (!loading && diaries.length > 0) {
        checkForNewDiaries();
      }
    };

    // 주기적으로 새 일기 확인 (30초마다)
    const interval = setInterval(() => {
      if (!loading && diaries.length > 0) {
        checkForNewDiaries();
      }
    }, 30000);

    window.addEventListener("focus", handleFocus);
    return () => {
      window.removeEventListener("focus", handleFocus);
      clearInterval(interval);
    };
  }, [diaries.length, loading]); // diaries.length와 loading만 의존성으로

  // 날짜 포맷팅 함수 (diaryDate: "yyyy-MM-dd" 형식)
  const formatDate = (dateStr: string) => {
    try {
      // "yyyy-MM-dd" 형식 파싱
      const parts = dateStr.split("-");
      if (parts.length >= 3) {
        const year = parts[0];
        const month = parts[1];
        const day = parts[2].split(" ")[0]; // 시간 부분 제거
        // 요일 계산
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
  const getEmotionEmoji = (diary: DiaryWithEmotion): string => {
    // DB에서 가져온 감정 정보 우선 사용
    if (diary.emotion != null) {
      const emotionMap: Record<number, string> = {
        0: "😐", // 평가불가
        1: "😊", // 기쁨
        2: "😢", // 슬픔
        3: "😡", // 분노 (빨간 얼굴)
        4: "😨", // 두려움
        5: "🤢", // 혐오
        6: "😲", // 놀람
      };
      const emoji = emotionMap[diary.emotion] || "😐";
      // 디버깅: emotion 값과 매핑된 이모지 확인
      if (process.env.NODE_ENV === 'development') {
        console.log(`[getEmotionEmoji] 일기 ID ${diary.id}: emotion=${diary.emotion}, emoji=${emoji}, label=${diary.emotionLabel}`);
      }
      return emoji;
    }
    
    // 캐시된 감정 분석 결과 사용
    if (diary.emotionResponse) {
      const emotionMap: Record<number, string> = {
        0: "😐", // 평가불가
        1: "😊", // 기쁨
        2: "😢", // 슬픔
        3: "😡", // 분노 (빨간 얼굴)
        4: "😨", // 두려움
        5: "🤢", // 혐오
        6: "😲", // 놀람
      };
      const emoji = emotionMap[diary.emotionResponse.emotion] || "😐";
      if (process.env.NODE_ENV === 'development') {
        console.log(`[getEmotionEmoji] 일기 ID ${diary.id}: emotionResponse=${diary.emotionResponse.emotion}, emoji=${emoji}`);
      }
      return emoji;
    }
    
    return "";
  };

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
          <h1 className="text-xl font-semibold text-gray-900">일기 리스트</h1>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-6">
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

        {!loading && !error && diaries.length === 0 && (
          <div className="flex items-center justify-center py-20">
            <div className="text-gray-500">일기가 없습니다.</div>
          </div>
        )}

        {!loading && !error && diaries.length > 0 && (
          <div className="bg-white" ref={listContainerRef}>
            {diaries.map((diary) => {
              const { year, month, day, dayOfWeek } = formatDate(diary.diaryDate);
              const title = cleanTitle(diary.title);

              return (
                <div
                  key={diary.id}
                  className="flex items-center justify-between py-4 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors px-2 cursor-pointer"
                  onClick={() => {
                    saveScrollPosition(); // 클릭 시 스크롤 위치 저장
                    router.push(`/diaries/${diary.id}`);
                  }}
                >
                  {/* Left: Title with Emotion */}
                  <div className="flex-1 min-w-0 pr-4 flex items-center gap-3">
                    <div className="text-sm text-gray-900">
                      <span className="text-gray-600">제목:</span>{" "}
                      <span className="font-medium">{title}</span>
                    </div>
                    {/* Emotion Emoji */}
                    <div className="text-lg">
                      {diary.emotionLoading ? (
                        <span className="text-gray-300 animate-pulse">⏳</span>
                      ) : (
                        <span>{getEmotionEmoji(diary)}</span>
                      )}
                    </div>
                  </div>

                  {/* Right: Date Info */}
                  <div className="flex flex-col items-end gap-1 text-sm text-gray-600 whitespace-nowrap">
                    <div>{year}</div>
                    <div>{month}</div>
                    <div>{day}</div>
                    {dayOfWeek && <div className="text-gray-500">{dayOfWeek}</div>}
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
