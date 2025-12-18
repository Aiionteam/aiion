"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { getUserDiaries, getDiaryById, Diary } from "@/lib/api/diary";
import { getUserIdFromToken } from "@/lib/api/auth";

// 감정 분석 결과 인터페이스 (DB에서 가져온 데이터 형식)
interface EmotionResponse {
  emotion: number;
  emotion_label: string;
  confidence?: number;
  probabilities?: Record<string, number>;
}

export default function DiaryDetailPage() {
  const router = useRouter();
  const params = useParams();
  const diaryId = params?.id ? Number(params.id) : null;
  
  const [diary, setDiary] = useState<Diary | null>(null);
  const [emotion, setEmotion] = useState<EmotionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [emotionLoading, setEmotionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAllProbabilities, setShowAllProbabilities] = useState(false);
  const [showMbtiDetails, setShowMbtiDetails] = useState(false);

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
          // DB에 감정 정보가 없으면 표시하지 않음
          // 일기 저장 시 백엔드에서 자동으로 분석되므로, 분석 중이거나 아직 분석되지 않은 상태
          console.log(`[DiaryDetailPage] 일기 ID ${diaryId}의 감정 분석 결과가 DB에 없습니다. 일기 저장 시 자동으로 분석됩니다.`);
          setEmotionLoading(false);
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
          
          {/* MBTI Info */}
          {diary.mbtiType && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700">MBTI 분석 결과</h3>
                {diary.mbtiDimensionPercentages && (
                  <button
                    onClick={() => setShowMbtiDetails(!showMbtiDetails)}
                    className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
                  >
                    {showMbtiDetails ? (
                      <>
                        <span>접기</span>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M18 15l-6-6-6 6" />
                        </svg>
                      </>
                    ) : (
                      <>
                        <span>4축 상세보기</span>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M6 9l6 6 6-6" />
                        </svg>
                      </>
                    )}
                  </button>
                )}
              </div>
              <div className="flex items-center gap-3 mb-2">
                <div className="px-4 py-2 bg-purple-50 border border-purple-200 rounded-lg">
                  <span className="text-2xl font-bold text-purple-600">{diary.mbtiType}</span>
                </div>
                {diary.mbtiConfidence && (
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-500">
                        신뢰도: {(diary.mbtiConfidence * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="h-2 rounded-full bg-purple-500 transition-all"
                        style={{ width: `${diary.mbtiConfidence * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
              
              {/* 간단한 4축 요약 (접혀있을 때) */}
              {!showMbtiDetails && diary.mbtiDimensionPercentages && (() => {
                const dimensions = ['E_I', 'S_N', 'T_F', 'J_P'] as const;
                const hasBoundary = dimensions.some(dim => {
                  const data = diary.mbtiDimensionPercentages?.[dim];
                  return data && data.confidence_percent >= 45 && data.confidence_percent <= 55;
                });
                
                if (!hasBoundary) return null;
                
                return (
                  <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <svg className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <p className="text-xs text-amber-800">
                        일부 성향이 경계선상에 있습니다. 상세보기로 확인하세요.
                      </p>
                    </div>
                  </div>
                );
              })()}
              
              {/* 4축별 확률 표시 (개선된 버전) - 펼치기 토글 */}
              {showMbtiDetails && diary.mbtiDimensionPercentages && (() => {
                const dimensions = ['E_I', 'S_N', 'T_F', 'J_P'] as const;
                const dimensionLabels: Record<string, { full: string; left: string; right: string }> = {
                  E_I: { full: '에너지 방향', left: 'E (외향)', right: 'I (내향)' },
                  S_N: { full: '인식 기능', left: 'S (감각)', right: 'N (직관)' },
                  T_F: { full: '판단 기능', left: 'T (사고)', right: 'F (감정)' },
                  J_P: { full: '생활 양식', left: 'J (판단)', right: 'P (인식)' }
                };
                
                // 경계 성향 감지 (45~55% 범위)
                const boundaryDimensions = dimensions.filter(dim => {
                  const data = diary.mbtiDimensionPercentages?.[dim];
                  return data && data.confidence_percent >= 45 && data.confidence_percent <= 55;
                });
                
                // 유사 MBTI 후보군 계산
                const getSimilarMbtiTypes = () => {
                  if (boundaryDimensions.length === 0) return [];
                  
                  const baseType = diary.mbtiType || '';
                  const candidates: string[] = [];
                  
                  // 경계 축들의 조합으로 가능한 MBTI 생성
                  boundaryDimensions.forEach(dim => {
                    const currentChar = baseType[dimensions.indexOf(dim)];
                    const oppositeChar = dim.split('_').find(c => c !== currentChar) || '';
                    const newType = baseType.split('').map((char, idx) => 
                      idx === dimensions.indexOf(dim) ? oppositeChar : char
                    ).join('');
                    if (newType && newType !== baseType) {
                      candidates.push(newType);
                    }
                  });
                  
                  return [...new Set(candidates)];
                };
                
                const similarTypes = getSimilarMbtiTypes();
                
                return (
                  <div className="space-y-3 mt-3">
                    {/* 경계 성향 경고 */}
                    {boundaryDimensions.length > 0 && (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <div className="flex items-start gap-2">
                          <svg className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          <div className="flex-1">
                            <p className="text-xs font-medium text-amber-800">경계 성향 감지</p>
                            <p className="text-xs text-amber-700 mt-1">
                              {boundaryDimensions.map(dim => dimensionLabels[dim].full).join(', ')} 축에서 
                              두 성향이 비슷하게 나타납니다. 상황에 따라 성향이 달라질 수 있습니다.
                            </p>
                            {similarTypes.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                <span className="text-xs text-amber-700">유사 성향:</span>
                                {similarTypes.map(type => (
                                  <span key={type} className="px-2 py-0.5 bg-amber-100 text-amber-800 text-xs rounded-full font-medium">
                                    {type}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* 4축별 상세 확률 */}
                    <div className="space-y-3">
                      {dimensions.map((dimension) => {
                        const dimData = diary.mbtiDimensionPercentages?.[dimension];
                        if (!dimData) return null;
                        
                        const labels = dimensionLabels[dimension];
                        const isBoundary = dimData.confidence_percent >= 45 && dimData.confidence_percent <= 55;
                        const leftLetter = dimension.split('_')[0];
                        const rightLetter = dimension.split('_')[1];
                        const leftPercent = dimData.selected === leftLetter ? dimData.confidence_percent : 100 - dimData.confidence_percent;
                        const rightPercent = 100 - leftPercent;
                        
                        return (
                          <div key={dimension} className={`p-3 rounded-lg border ${isBoundary ? 'bg-amber-50 border-amber-300' : 'bg-gray-50 border-gray-200'}`}>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-semibold text-gray-700">{labels.full}</span>
                              {isBoundary && (
                                <span className="text-xs px-2 py-0.5 bg-amber-200 text-amber-800 rounded-full font-medium">
                                  경계
                                </span>
                              )}
                            </div>
                            
                            {/* 양방향 프로그레스 바 */}
                            <div className="relative">
                              <div className="flex items-center justify-between mb-1">
                                <span className={`text-xs ${dimData.selected === leftLetter ? 'font-bold text-purple-600' : 'text-gray-500'}`}>
                                  {labels.left}
                                </span>
                                <span className={`text-xs ${dimData.selected === rightLetter ? 'font-bold text-purple-600' : 'text-gray-500'}`}>
                                  {labels.right}
                                </span>
                              </div>
                              
                              <div className="relative h-6 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className="absolute left-0 h-full bg-gradient-to-r from-purple-500 to-purple-400 transition-all"
                                  style={{ width: `${leftPercent}%` }}
                                />
                                <div
                                  className="absolute right-0 h-full bg-gradient-to-l from-blue-500 to-blue-400 transition-all"
                                  style={{ width: `${rightPercent}%` }}
                                />
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <span className="text-xs font-bold text-white drop-shadow-md">
                                    {leftPercent.toFixed(0)}% : {rightPercent.toFixed(0)}%
                                  </span>
                                </div>
                              </div>
                              
                              {/* 신뢰도 표시 */}
                              <div className="flex items-center justify-between mt-1">
                                <span className="text-xs text-gray-500">
                                  신뢰도: {dimData.confidence_percent.toFixed(1)}%
                                </span>
                                <div className="flex items-center gap-1">
                                  <div className={`w-2 h-2 rounded-full ${
                                    dimData.confidence_percent >= 70 ? 'bg-green-500' :
                                    dimData.confidence_percent >= 55 ? 'bg-yellow-500' :
                                    'bg-amber-500'
                                  }`} />
                                  <span className="text-xs text-gray-500">
                                    {dimData.confidence_percent >= 70 ? '높음' :
                                     dimData.confidence_percent >= 55 ? '보통' : '낮음'}
                                  </span>
                                </div>
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
          )}
          
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
