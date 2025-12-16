"use client";

import React, { useEffect, useState, useRef, useLayoutEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getUserDiaries, Diary } from "@/lib/api/diary";

interface DiaryWithEmotion extends Diary {
  emotionLoading?: boolean;
}

export default function DiariesPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [diaries, setDiaries] = useState<DiaryWithEmotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analyzedIds, setAnalyzedIds] = useState<Set<number>>(new Set());
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc"); // 기본값: 내림차순 (최신순)
  const scrollRestored = useRef(false);
  const listContainerRef = useRef<HTMLDivElement>(null);
  const isNavigatingAway = useRef(false);

  // 로컬 스토리지 키
  const SCROLL_POSITION_KEY = "diaries_scroll_position";
  
  // 감정 캐시 관련 코드 제거 - DB에 저장된 결과만 사용

  // 감정 분석 함수 - 제거됨
  // 직접 ML 서비스 호출은 더 이상 지원하지 않습니다.
  // 일기 저장 시 백엔드에서 자동으로 분석되므로, DB에 저장된 결과만 사용합니다.

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
        if (isNaN(scrollY) || scrollY < 0) {
          scrollRestored.current = true;
          return;
        }
        
        // 여러 번 시도하여 확실히 복원
        const attemptRestore = (attempts = 0) => {
          if (attempts > 30) {
            // 최대 시도 횟수 초과 시 강제로 스크롤
            window.scrollTo({ top: scrollY, behavior: 'instant' });
            scrollRestored.current = true;
            console.log(`[DiariesPage] 스크롤 위치 복원 (강제): ${scrollY}px`);
            return;
          }
          
          // DOM이 준비되었는지 확인
          const container = listContainerRef.current;
          const documentHeight = document.documentElement.scrollHeight;
          const windowHeight = window.innerHeight;
          
          // 리스트가 렌더링되었고, 문서 높이가 충분한지 확인
          if (container && container.children.length > 0 && documentHeight > windowHeight) {
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
      } else {
        scrollRestored.current = true;
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
        // 스크롤 복원 플래그 리셋 (페이지가 다시 마운트될 때만)
        // 뒤로가기로 돌아온 경우에는 복원해야 하므로 false로 설정
        if (!isNavigatingAway.current) {
          scrollRestored.current = false;
        }
        
        // JWT 토큰에서 userId를 자동으로 추출하여 조회 (백엔드에서 처리)
        const diariesList = await getUserDiaries();
        
        // 백엔드에서 감정 정보를 포함해서 반환 (diary.emotion, diary.emotionLabel, diary.emotionConfidence)
        // 일괄 조회로 N+1 문제 해결되어 있음
        console.log("[DiariesPage] 일기 목록 로드:", diariesList.length, "개");
        console.log("[DiariesPage] 감정 정보 포함 일기:", diariesList.filter(d => d.emotion !== null && d.emotion !== undefined).length, "개");
        
        // 각 일기의 감정 값 디버깅
        diariesList.forEach((diary, idx) => {
          console.log(`[DiariesPage] 일기 ${idx + 1} (ID: ${diary.id}): emotion=${diary.emotion}, label=${diary.emotionLabel}, confidence=${diary.emotionConfidence}`);
        });
        
        const diariesWithEmotion: DiaryWithEmotion[] = diariesList.map((diary) => {
          // 백엔드 DB에 감정 정보가 있으면 사용 (우선순위 1)
          // emotion이 null이 아니고 undefined도 아니면 이미 분석된 것으로 간주
          // emotion: 0 (평가불가)도 이미 분석된 것으로 간주
          const hasEmotion = diary.emotion !== null && diary.emotion !== undefined;
          
          return {
            ...diary,
            emotionLoading: !hasEmotion, // 백엔드에 감정 정보가 없을 때만 로딩 표시
          };
        });
        
        // 날짜 기준으로 정렬 (기본값: 내림차순)
        const sortedDiaries = [...diariesWithEmotion].sort((a, b) => {
          const dateA = new Date(a.diaryDate).getTime();
          const dateB = new Date(b.diaryDate).getTime();
          return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
        });
        
        setDiaries(sortedDiaries);

        // 백엔드에서 감정 정보를 포함해서 반환하므로 프론트엔드에서 추가 분석 불필요
        // 백엔드 분석이 실패한 경우에만 프론트엔드에서 분석 (fallback)
        // emotion이 null이거나 undefined인 경우에만 분석 (0은 이미 분석된 것으로 간주)
        // 이미 analyzedIds에 포함된 일기는 제외
        // 제목과 내용이 모두 비어있는 일기는 분석하지 않음
        // 직접 감정 분석 호출 제거 - DB에 저장된 결과만 사용
        // 일기 저장 시 백엔드에서 자동으로 분석되므로, 프론트엔드에서 추가 분석하지 않음
        console.log("[DiariesPage] 일기 목록 로드 완료. DB에 저장된 감정 분석 결과를 표시합니다.");
      } catch (err: any) {
        console.error("일기 목록 로드 실패:", err);
        setError(err.message || "일기 목록을 불러올 수 없습니다.");
      } finally {
        setLoading(false);
      }
    };

    fetchDiaries();
  }, [pathname]); // pathname이 변경될 때마다 (뒤로가기 포함)

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
      // 여러 번 시도하여 확실히 복원
      const restoreWithDelay = () => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            restoreScrollPosition();
            // 추가로 약간의 지연 후 한 번 더 시도 (이미지 로딩 등으로 높이가 변경될 수 있음)
            setTimeout(() => {
              if (!scrollRestored.current) {
                restoreScrollPosition();
              }
            }, 100);
          });
        });
      };
      restoreWithDelay();
    }
  }, [loading, diaries.length]);

  // 페이지가 다시 마운트될 때 (뒤로가기로 돌아올 때) 스크롤 복원 플래그 리셋
  useEffect(() => {
    // pathname이 /diaries이고, 이전에 다른 페이지로 이동했던 경우
    if (pathname === '/diaries' && isNavigatingAway.current) {
      isNavigatingAway.current = false;
      scrollRestored.current = false;
      // 데이터가 이미 로드되어 있으면 스크롤 복원 시도
      if (!loading && diaries.length > 0) {
        setTimeout(() => {
          restoreScrollPosition();
        }, 100);
      }
    }
  }, [pathname, loading, diaries.length]);

  // 새 일기 추가 시 자동 감정 분석
  useEffect(() => {
    const checkForNewDiaries = async () => {
      try {
        // JWT 토큰에서 userId를 자동으로 추출하여 조회 (백엔드에서 처리)
        const diariesList = await getUserDiaries();
        const currentIds = new Set(diaries.map(d => d.id));
        const newDiaries = diariesList.filter(d => !currentIds.has(d.id));

        if (newDiaries.length > 0) {
          // 캐시 확인
          const cache = getEmotionCache();
          
          // 새 일기 추가 (맨 앞에 추가)
          // 백엔드에서 감정 정보를 포함해서 반환하므로 캐시 확인 불필요
          const newDiariesWithEmotion: DiaryWithEmotion[] = newDiaries.map((diary) => {
            // 백엔드 DB에 감정 정보가 있으면 사용
            // emotion이 null이 아니고 undefined도 아니면 이미 분석된 것으로 간주
            // emotion: 0 (평가불가)도 이미 분석된 것으로 간주
            const hasEmotion = diary.emotion !== null && diary.emotion !== undefined;
            return {
              ...diary,
              emotionLoading: !hasEmotion, // 백엔드에 감정 정보가 없을 때만 로딩 표시
            };
          });

          // 새 일기 추가 후 정렬
          const updatedDiaries = [...newDiariesWithEmotion, ...diaries];
          const sortedUpdatedDiaries = updatedDiaries.sort((a, b) => {
            const dateA = new Date(a.diaryDate).getTime();
            const dateB = new Date(b.diaryDate).getTime();
            return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
          });
          setDiaries(sortedUpdatedDiaries);

          // 백엔드에서 감정 정보를 포함해서 반환하므로 프론트엔드에서 추가 분석 불필요
          // 백엔드 분석이 실패한 경우에만 프론트엔드에서 분석 (fallback)
          // emotion이 null이거나 undefined인 경우에만 분석 (0은 이미 분석된 것으로 간주)
          // 이미 analyzedIds에 포함된 일기는 제외
          // 제목과 내용이 모두 비어있는 일기는 분석하지 않음
          // 백엔드에서 자동으로 분석하므로, 약간의 지연 후 다시 확인
          const diariesToAnalyze = newDiariesWithEmotion.filter(
            (diary) => 
              (diary.emotion === null || diary.emotion === undefined) && 
              diary.emotionLoading &&
              !analyzedIds.has(diary.id) &&
              (diary.title || diary.content) // 제목이나 내용이 있어야 함
          );

          if (diariesToAnalyze.length > 0) {
            // 백엔드에서 자동 분석을 수행하므로, 2초 대기 후 다시 확인
            setTimeout(async () => {
              try {
                const updatedDiaries = await getUserDiaries();
                const updatedMap = new Map(updatedDiaries.map(d => [d.id, d]));
                
                setDiaries((prev) =>
                  prev.map((d) => {
                    const updated = updatedMap.get(d.id);
                    if (updated && updated.emotion !== null && updated.emotion !== undefined) {
                      // 백엔드에서 분석 완료된 경우 업데이트
                      return {
                        ...d,
                        emotion: updated.emotion,
                        emotionLabel: updated.emotionLabel,
                        emotionConfidence: updated.emotionConfidence,
                        emotionProbabilities: updated.emotionProbabilities,
                        emotionLoading: false,
                      };
                    }
                    return d;
                  })
                );
                
                // 여전히 분석되지 않은 일기만 프론트엔드에서 분석
                const stillNeedAnalysis = diariesToAnalyze.filter(
                  (diary) => {
                    const updated = updatedMap.get(diary.id);
                    return !updated || (updated.emotion === null || updated.emotion === undefined);
                  }
                );
                
                if (stillNeedAnalysis.length > 0) {
                  console.log("[DiariesPage] 새 일기 중 백엔드 분석 실패:", stillNeedAnalysis.length, "개 - 프론트엔드에서 분석");
                  // 백엔드 분석 실패 시에만 프론트엔드에서 분석 (백그라운드 처리)
                  const emotionPromises = stillNeedAnalysis.map(async (diary) => {
                    await analyzeDiaryEmotion(diary, 0, false);
                  });
                  
                  Promise.all(emotionPromises).catch((err) => {
                    console.error("새 일기 감정 분석 중 오류:", err);
                  });
                }
              } catch (err) {
                console.error("새 일기 상태 확인 실패:", err);
              }
            }, 2000); // 2초 대기
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

  // 감정 라벨을 "평범"으로 변환하는 함수
  const normalizeEmotionLabel = (label: string | undefined): string => {
    if (!label) return "";
    return label === "평가불가" ? "평범" : label;
  };

  // 1위/2위 감정을 표시하는 함수
  const getEmotionDisplay = (diary: DiaryWithEmotion): string => {
    // probabilities가 있으면 1위/2위 표시
    if (diary.emotionProbabilities) {
      try {
        const probabilities = JSON.parse(diary.emotionProbabilities);
        const sorted = Object.entries(probabilities)
          .sort(([, a], [, b]) => (b as number) - (a as number))
          .slice(0, 2);
        
        if (sorted.length >= 2) {
          const first = normalizeEmotionLabel(sorted[0][0]);
          const second = normalizeEmotionLabel(sorted[1][0]);
          return `${first}/${second}`;
        } else if (sorted.length === 1) {
          return normalizeEmotionLabel(sorted[0][0]);
        }
      } catch (e) {
        // JSON 파싱 실패 시 기본 라벨 사용
      }
    }
    
    // probabilities가 없으면 기본 라벨 사용
    if (diary.emotionLabel) {
      return normalizeEmotionLabel(diary.emotionLabel);
    }
    
    // DB에서 가져온 emotionLabel 우선 사용
    
    return "";
  };

  // 정렬 순서 토글
  const toggleSortOrder = () => {
    const newSortOrder = sortOrder === "desc" ? "asc" : "desc";
    setSortOrder(newSortOrder);
    
    // 일기 리스트 재정렬
    const sortedDiaries = [...diaries].sort((a, b) => {
      const dateA = new Date(a.diaryDate).getTime();
      const dateB = new Date(b.diaryDate).getTime();
      return newSortOrder === "desc" ? dateB - dateA : dateA - dateB;
    });
    setDiaries(sortedDiaries);
  };

  // 감정에 따른 이모티콘 반환 (1위만) - 확률이 가장 높은 감정 기준
  const getEmotionEmoji = (diary: DiaryWithEmotion): string => {
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
    if (diary.emotionProbabilities) {
      try {
        const probabilities = JSON.parse(diary.emotionProbabilities);
        const sorted = Object.entries(probabilities)
          .sort(([, a], [, b]) => (b as number) - (a as number));
        
        if (sorted.length > 0) {
          const topEmotionLabel = normalizeEmotionLabel(sorted[0][0]);
          const emotionId = labelToId[topEmotionLabel];
          if (emotionId !== undefined) {
            return emotionMap[emotionId] || "😐";
          }
        }
      } catch (e) {
        // JSON 파싱 실패 시 fallback 사용
      }
    }
    
    // DB에서 가져온 감정 정보 사용 (fallback)
    if (diary.emotion !== null && diary.emotion !== undefined) {
      return emotionMap[diary.emotion] || "😐";
    }
    
    // DB에서 가져온 emotion 값 사용 (fallback)
    
    return "😐";
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
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
            <h1 className="text-xl font-semibold text-gray-900">일기 리스트</h1>
          </div>
          {/* 정렬 버튼 */}
          <button
            onClick={toggleSortOrder}
            className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors text-sm text-gray-700"
            aria-label={sortOrder === "desc" ? "오름차순 정렬" : "내림차순 정렬"}
          >
            {sortOrder === "desc" ? (
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
                <path d="M7 6l5 5 5-5" />
                <path d="M7 13l5 5 5-5" />
              </svg>
            )}
            <span>{sortOrder === "desc" ? "최신순" : "과거순"}</span>
          </button>
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
                    isNavigatingAway.current = true;
                    saveScrollPosition(); // 클릭 시 스크롤 위치 저장
                    router.push(`/diaries/${diary.id}`);
                  }}
                >
                  {/* Left: Title with Emotion */}
                  <div className="flex-1 min-w-0 pr-4 flex items-center gap-3">
                    <div className="text-sm text-gray-900 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600">제목:</span>
                        <span className="font-medium truncate">{title}</span>
                      </div>
                      {!diary.emotionLoading && getEmotionDisplay(diary) && (
                        <div className="text-xs text-gray-500 mt-1">
                          {getEmotionDisplay(diary)}
                        </div>
                      )}
                      {diary.mbtiType && (() => {
                        // 경계 성향 감지
                        const dimensions = ['E_I', 'S_N', 'T_F', 'J_P'] as const;
                        const hasBoundary = diary.mbtiDimensionPercentages && dimensions.some(dim => {
                          const data = diary.mbtiDimensionPercentages?.[dim];
                          return data && data.confidence_percent >= 45 && data.confidence_percent <= 55;
                        });
                        
                        return (
                          <div className="flex items-center gap-2 mt-1">
                            <div className="text-xs text-purple-600 font-medium">
                              MBTI: {diary.mbtiType}
                              {diary.mbtiConfidence && (
                                <span className="text-gray-500 ml-1">
                                  ({(diary.mbtiConfidence * 100).toFixed(0)}%)
                                </span>
                              )}
                            </div>
                            {hasBoundary && (
                              <span className="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full font-medium" title="일부 성향이 경계선상에 있습니다">
                                경계
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                    {/* Emotion Emoji (1위만) */}
                    <div className="text-lg flex-shrink-0">
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
