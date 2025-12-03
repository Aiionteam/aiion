'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '../atoms';
import { HealthView as HealthViewType } from '../types';
import { useDiaries } from '../../app/hooks/useDiary';
import { useHealthcareRecords, useHealthcareAnalysis } from '../../app/hooks/useHealthcare';
import { aiGatewayClient } from '../../lib/api/aiGateway';
import { getAccessToken } from '../../lib/api/client';

interface HealthViewProps {
  healthView: HealthViewType;
  setHealthView: (view: HealthViewType) => void;
  darkMode?: boolean;
}

interface Exercise {
  name: string;
  description: string;
  duration: string;
  difficulty: string;
  benefits: string[];
  youtubeVideoId: string; // 유튜브 비디오 ID
}

interface ExerciseCategory {
  name: string; // 카테고리 이름 (예: "스트레칭", "실내 스포츠")
  exercises: Exercise[];
}

interface ExerciseRecommendation {
  categories: ExerciseCategory[];
  summary: string;
}

const getCommonStyles = (darkMode: boolean) => ({
  bg: darkMode ? 'bg-[#0a0a0a]' : 'bg-[#e8e2d5]',
  header: darkMode ? 'bg-[#121212] border-[#2a2a2a]' : 'bg-white border-[#d4c4a8]',
  card: darkMode ? 'bg-[#121212] border-[#2a2a2a]' : 'bg-white border-[#8B7355]',
  title: darkMode ? 'text-white' : 'text-gray-900',
  textMuted: darkMode ? 'text-gray-400' : 'text-gray-500',
  border: darkMode ? 'border-[#2a2a2a]' : 'border-[#d4c4a8]',
  button: darkMode ? 'bg-gradient-to-br from-[#1a1a1a] to-[#121212] border-[#2a2a2a]' : 'bg-gradient-to-br from-white to-[#f5f0e8] border-[#8B7355]',
  buttonHover: darkMode ? 'text-gray-300 hover:text-white hover:bg-[#1a1a1a]' : 'text-gray-600 hover:text-gray-900 hover:bg-[#f5f1e8]',
  cardBg: darkMode ? 'bg-[#1a1a1a]' : 'bg-[#f5f1e8]',
});

export const HealthView: React.FC<HealthViewProps> = ({
  healthView,
  setHealthView,
  darkMode = false,
}) => {
  const styles = getCommonStyles(darkMode);

  // Hook은 항상 최상위에서 호출해야 함 (early return 전에 모두 호출)
  const { data: diaries = [], isLoading: diariesLoading } = useDiaries();
  const { data: healthcareRecords = [], isLoading: healthcareLoading } = useHealthcareRecords();
  const { data: healthcareAnalysis, isLoading: analysisLoading } = useHealthcareAnalysis();
  const [recommendation, setRecommendation] = useState<ExerciseRecommendation | null>(null);
  const [isLoadingRecommendation, setIsLoadingRecommendation] = useState(false);
  const [recommendationError, setRecommendationError] = useState<string | null>(null);
  const [customizedMessage, setCustomizedMessage] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [promptText, setPromptText] = useState('');
  const [healthInfo, setHealthInfo] = useState<string>('');
  const [healthCheckupSummary, setHealthCheckupSummary] = useState<string>('');
  const [inbodyData, setInbodyData] = useState<Array<{ month: string; bmi: number; weight: number; muscle: number }>>([]);
  const [bodyType, setBodyType] = useState<string>('');

  const getExerciseRecommendation = useCallback(async () => {
    setIsLoadingRecommendation(true);
    setRecommendationError(null);

    try {
      // 일기 데이터가 없으면 기본 메시지
      if (!diaries || diaries.length === 0) {
        setRecommendationError('일기 기록이 없어 맞춤 운동을 추천할 수 없습니다. 먼저 일기를 작성해주세요.');
        setIsLoadingRecommendation(false);
        return;
      }

      // 최근 일기 10개를 가져와서 분석
      const recentDiaries = diaries
        .slice()
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 10);

      // 일기 내용을 요약
      const diarySummary = recentDiaries
        .map((diary) => `날짜: ${diary.date}\n제목: ${diary.title}\n내용: ${diary.content}\n감정: ${diary.emotion}`)
        .join('\n\n---\n\n');

      // AI에게 운동 추천 요청
      const systemMessage = `당신은 건강 전문가입니다. 사용자의 일기 기록을 분석하여 맞춤 운동을 추천해주세요.
다음 형식으로 JSON 응답을 제공해주세요:
{
  "categories": [
    {
      "name": "카테고리 이름 (예: 스트레칭, 실내 스포츠, 유산소 운동 등)",
      "exercises": [
        {
          "name": "운동 이름",
          "description": "운동 설명",
          "duration": "운동 시간 (예: 30분)",
          "difficulty": "난이도 (초급/중급/고급)",
          "benefits": ["효과1", "효과2", "효과3"],
          "youtubeVideoId": "유튜브 비디오 ID (예: dQw4w9WgXcQ)"
        }
      ]
    }
  ],
  "summary": "전체 추천 요약"
}

중요 사항:
1. 카테고리는 사용자의 일기 내용을 분석하여 자동으로 생성해주세요. 예를 들어 실내 활동을 선호한다면 "실내 스포츠", "스트레칭" 같은 카테고리를 만들어주세요.
2. 각 카테고리마다 최대 5개의 운동을 추천해주세요.
3. 각 운동에는 반드시 유튜브 비디오 ID를 포함해주세요. 실제 존재하는 운동 영상의 ID를 사용해주세요.
4. 카테고리는 2-4개 정도가 적당합니다.
5. 사용자의 일기 내용에서 파악한 감정 상태, 생활 패턴, 건강 상태, 선호도를 고려하여 추천해주세요.`;

      const userMessage = `다음은 사용자의 최근 일기 기록입니다:\n\n${diarySummary}\n\n이 일기 기록을 바탕으로 사용자에게 맞는 운동을 카테고리별로 추천해주세요. 각 운동에는 유튜브 비디오 ID를 포함해주세요. JSON 형식으로 응답해주세요.`;

      // 클라이언트 사이드에서만 토큰 가져오기
      let jwtToken: string | null = null;
      if (typeof window !== 'undefined') {
        jwtToken = getAccessToken();
      }

      const response = await aiGatewayClient.sendChat({
        message: userMessage,
        system_message: systemMessage,
        jwtToken: jwtToken || undefined,
      });

      if (response.error || !response.data) {
        throw new Error(response.error || '운동 추천을 받을 수 없습니다.');
      }

      if (response.data.status === 'error') {
        throw new Error(response.data.message || 'AI 처리 중 오류가 발생했습니다.');
      }

      // AI 응답에서 JSON 추출 시도
      let recommendationData: ExerciseRecommendation;
      try {
        // 응답이 JSON 형식인지 확인
        const responseText = response.data.message.trim();

        // JSON 코드 블록이 있으면 추출
        const jsonMatch = responseText.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
        if (jsonMatch) {
          recommendationData = JSON.parse(jsonMatch[1]);
        } else {
          // JSON 코드 블록이 없으면 직접 파싱 시도
          recommendationData = JSON.parse(responseText);
        }
      } catch (parseError) {
        // JSON 파싱 실패 시 텍스트로 표시
        console.warn('JSON 파싱 실패, 텍스트로 표시:', parseError);
        recommendationData = {
          categories: [],
          summary: response.data.message,
        };
      }

      setRecommendation(recommendationData);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
      setRecommendationError(errorMessage);
      console.error('운동 추천 오류:', error);
    } finally {
      setIsLoadingRecommendation(false);
    }
  }, [diaries]);

  // 운동 관련 일기 필터링
  const getExerciseRelatedDiaries = useCallback(() => {
    if (!diaries || diaries.length === 0) return [];

    const exerciseKeywords = ['운동', '운동하다', '땀', '피로', '스트레칭', '달리기', '걷기', '산책', '헬스', '요가', '필라테스', '수영', '자전거', '등산', '조깅'];

    return diaries
      .filter((diary) => {
        const text = `${diary.title} ${diary.content}`.toLowerCase();
        return exerciseKeywords.some(keyword => text.includes(keyword.toLowerCase()));
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 3);
  }, [diaries]);

  // 맞춤형 추천 메시지 생성
  const generateCustomizedMessage = useCallback(async () => {
    if (!diaries || diaries.length === 0) {
      setCustomizedMessage('');
      return;
    }

    try {
      const recentDiaries = diaries
        .slice()
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5);

      const diarySummary = recentDiaries
        .map((diary) => `날짜: ${diary.date}\n내용: ${diary.content}`)
        .join('\n\n');

      const systemMessage = `당신은 건강 전문가입니다. 사용자의 일기 기록을 간단히 분석하여 한 문장으로 맞춤형 운동 추천 메시지를 작성해주세요.
예시:
- "최근에 유산소 위주로 운동하셨네요! 오늘은 실내에서 할 수 있는 운동 위주로 추천해드릴까요?"
- "스트레스가 많으신 것 같아요. 마음을 편안하게 해주는 요가나 스트레칭을 추천해드릴게요."
- "오늘은 오후에 비 소식이 있으니 실내 운동을 추천해드릴까요?"

메시지는 친근하고 자연스럽게 작성해주세요.`;

      const userMessage = `다음은 사용자의 최근 일기 기록입니다:\n\n${diarySummary}\n\n위 일기를 바탕으로 맞춤형 운동 추천 메시지를 한 문장으로 작성해주세요.`;

      let jwtToken: string | null = null;
      if (typeof window !== 'undefined') {
        jwtToken = getAccessToken();
      }

      const response = await aiGatewayClient.sendChat({
        message: userMessage,
        system_message: systemMessage,
        jwtToken: jwtToken || undefined,
      });

      if (response.data && response.data.status !== 'error') {
        setCustomizedMessage(response.data.message);
      }
    } catch (error) {
      console.error('맞춤형 메시지 생성 오류:', error);
    }
  }, [diaries]);

  // 건강 관련 일기 필터링
  const getHealthRelatedDiaries = useCallback(() => {
    if (!diaries || diaries.length === 0) return [];

    const healthKeywords = ['건강', '병원', '진료', '약', '감기', '몸살', '두통', '복통', '검진', '체중', '혈압', '혈당', '콜레스테롤', '인바디', 'BMI'];

    return diaries
      .filter((diary) => {
        const text = `${diary.title} ${diary.content}`.toLowerCase();
        return healthKeywords.some(keyword => text.includes(keyword.toLowerCase()));
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }, [diaries]);

  // 건강 정보 생성 (AI 기반)
  const generateHealthInfo = useCallback(async () => {
    if (!diaries || diaries.length === 0) {
      setHealthInfo('');
      return;
    }

    try {
      const recentDiaries = diaries
        .slice()
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 10);

      const diarySummary = recentDiaries
        .map((diary) => `날짜: ${diary.date}\n내용: ${diary.content}`)
        .join('\n\n');

      const systemMessage = `당신은 건강 전문가입니다. 사용자의 일기 기록을 분석하여 건강 관련 정보, 예정된 일정, 건강 관련 이슈를 자연스러운 문장으로 작성해주세요.
예시:
- "Aiion님은 작년 비슷한 시기에 감기로 AI 병원에서 진료 받았어요."
- "요즘 감기에 걸린 사용자가 급증하고 있으니 외출 시 마스크를 꼭 착용하세요. 😊"
- "이번 주 토요일 12시 AI치과 스케일링이 예약 되어 있어요."
- "다음 주 금요일에 AI병원 건강검진이 예약 되어 있어요."

일기에서 건강 관련 정보, 병원 예약, 건강 이슈 등을 찾아서 자연스럽게 작성해주세요.`;

      const userMessage = `다음은 사용자의 최근 일기 기록입니다:\n\n${diarySummary}\n\n위 일기를 바탕으로 건강 관련 정보를 작성해주세요.`;

      let jwtToken: string | null = null;
      if (typeof window !== 'undefined') {
        jwtToken = getAccessToken();
      }

      const response = await aiGatewayClient.sendChat({
        message: userMessage,
        system_message: systemMessage,
        jwtToken: jwtToken || undefined,
      });

      if (response.data && response.data.status !== 'error') {
        setHealthInfo(response.data.message);
      }
    } catch (error) {
      console.error('건강 정보 생성 오류:', error);
    }
  }, [diaries]);

  // 건강검진 요약 생성
  const generateHealthCheckupSummary = useCallback(async () => {
    if (!diaries || diaries.length === 0) {
      setHealthCheckupSummary('');
      return;
    }

    try {
      const healthCheckupDiaries = diaries
        .filter((diary) => {
          const text = `${diary.title} ${diary.content}`.toLowerCase();
          return text.includes('검진') || text.includes('건강검진') || text.includes('인바디') || text.includes('체성분');
        })
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 3);

      if (healthCheckupDiaries.length === 0) {
        setHealthCheckupSummary('최근 건강검진 데이터가 없습니다.');
        return;
      }

      const summary = healthCheckupDiaries
        .map((diary) => `날짜: ${diary.date}\n${diary.content}`)
        .join('\n\n---\n\n');

      setHealthCheckupSummary(summary);
    } catch (error) {
      console.error('건강검진 요약 생성 오류:', error);
    }
  }, [diaries]);

  // InBody 데이터 생성 (예시 데이터)
  const generateInbodyData = useCallback(() => {
    // 실제로는 API에서 가져와야 하지만, 현재는 예시 데이터
    const months = ['10월', '11월', '12월'];
    const data = months.map((month, index) => ({
      month,
      bmi: 25 - index * 2, // 예시: BMI 감소 추세
      weight: 80 - index * 2, // 예시: 체중 감소 추세
      muscle: 30 + index * 2, // 예시: 골격근량 증가 추세
    }));
    setInbodyData(data);

    // BMI 기반 체형 판단
    const latestBMI = data[data.length - 1].bmi;
    if (latestBMI < 18.5) {
      setBodyType('Underweight');
    } else if (latestBMI < 23) {
      setBodyType('Normal');
    } else if (latestBMI < 25) {
      setBodyType('Overweight');
    } else if (latestBMI < 30) {
      setBodyType('Overweight (25-30)');
    } else {
      setBodyType('Obese');
    }
  }, []);

  // 운동 메인 화면 진입 시 맞춤형 메시지 생성
  useEffect(() => {
    if (healthView === 'exercise' && diaries && diaries.length > 0) {
      generateCustomizedMessage();
    }
  }, [healthView, diaries, generateCustomizedMessage]);

  // 건강 화면 진입 시 정보 생성
  useEffect(() => {
    if (healthView === 'health' && diaries && diaries.length > 0) {
      generateHealthInfo();
      generateHealthCheckupSummary();
      generateInbodyData();
    }
  }, [healthView, diaries, generateHealthInfo, generateHealthCheckupSummary, generateInbodyData]);

  // 뷰가 변경될 때 상태 초기화
  useEffect(() => {
    if (healthView !== 'exercise' && healthView !== 'exercise-recommendation') {
      setRecommendation(null);
      setRecommendationError(null);
      setIsLoadingRecommendation(false);
      setSelectedCategory('');
    }
  }, [healthView]);

  // Home 뷰
  if (healthView === 'home') {
    return (
      <div className={`flex-1 flex flex-col ${styles.bg}`}>
        <div className="flex-1 overflow-y-auto p-4 md:p-6" style={{ WebkitOverflowScrolling: 'touch' }}>
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="text-center py-4">
              <h1 className={`text-3xl font-bold ${styles.title}`}>헬스케어</h1>
            </div>

            <div className={`rounded-2xl border-2 p-8 shadow-lg ${styles.card}`}>
              <h2 className={`text-2xl font-bold mb-4 text-center border-b-2 pb-3 ${styles.title} ${styles.border}`}>
                📊 종합 건강 분석
              </h2>
              <div className={`leading-relaxed text-sm ${styles.title}`}>
                {analysisLoading ? (
                  <p className={`text-center py-4 ${styles.textMuted}`}>로딩 중...</p>
                ) : healthcareAnalysis ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div className={`p-4 rounded-lg ${styles.cardBg}`}>
                        <p className={`text-xs ${styles.textMuted} mb-1`}>총 기록 수</p>
                        <p className={`text-2xl font-bold ${styles.title}`}>{healthcareAnalysis.summary.total_records}개</p>
                      </div>
                      <div className={`p-4 rounded-lg ${styles.cardBg}`}>
                        <p className={`text-xs ${styles.textMuted} mb-1`}>기록 기간</p>
                        <p className={`text-2xl font-bold ${styles.title}`}>{healthcareAnalysis.summary.total_months}개월</p>
                      </div>
                      {healthcareAnalysis.summary.avg_steps && (
                        <div className={`p-4 rounded-lg ${styles.cardBg}`}>
                          <p className={`text-xs ${styles.textMuted} mb-1`}>평균 걸음수</p>
                          <p className={`text-2xl font-bold ${styles.title}`}>{Math.round(healthcareAnalysis.summary.avg_steps).toLocaleString()}걸음</p>
                        </div>
                      )}
                    </div>
                    {healthcareAnalysis.type_distribution.length > 0 && (
                      <div className={`mt-4 pt-4 border-t ${styles.border}`}>
                        <p className={`text-sm font-semibold mb-2 ${styles.title}`}>타입별 분포</p>
                        <div className="space-y-2">
                          {healthcareAnalysis.type_distribution.map((type, index) => (
                            <div key={index} className="flex items-center justify-between">
                              <span className={`text-sm ${styles.textMuted}`}>{type.type}</span>
                              <span className={`text-sm font-semibold ${styles.title}`}>{type.count}개</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {healthcareAnalysis.recent_activity.recent_records > 0 && (
                      <div className={`mt-4 pt-4 border-t ${styles.border}`}>
                        <p className={`text-sm font-semibold mb-2 ${styles.title}`}>최근 30일 활동</p>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className={`text-sm ${styles.textMuted}`}>기록 수</span>
                            <span className={`text-sm font-semibold ${styles.title}`}>{healthcareAnalysis.recent_activity.recent_records}개</span>
                          </div>
                          {healthcareAnalysis.recent_activity.recent_avg_steps && (
                            <div className="flex items-center justify-between">
                              <span className={`text-sm ${styles.textMuted}`}>평균 걸음수</span>
                              <span className={`text-sm font-semibold ${styles.title}`}>
                                {Math.round(healthcareAnalysis.recent_activity.recent_avg_steps).toLocaleString()}걸음
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className={`text-center py-4 ${styles.textMuted}`}>
                    아직 기록된 건강 데이터가 없습니다. 첫 건강 기록을 작성해보세요!
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <Button
                onClick={() => setHealthView('exercise')}
                className={`rounded-2xl border-2 p-12 hover:shadow-lg hover:scale-105 transition-all ${styles.button}`}
              >
                <div className="flex flex-col items-center space-y-3">
                  <span className="text-4xl">💪</span>
                  <p className={`text-xl font-bold ${styles.title}`}>운동</p>
                </div>
              </Button>
              <Button
                onClick={() => setHealthView('health')}
                className={`rounded-2xl border-2 p-12 hover:shadow-lg hover:scale-105 transition-all ${styles.button}`}
              >
                <div className="flex flex-col items-center space-y-3">
                  <span className="text-4xl">🏥</span>
                  <p className={`text-xl font-bold ${styles.title}`}>건강</p>
                </div>
              </Button>
              <Button
                onClick={() => setHealthView('records')}
                className={`rounded-2xl border-2 p-12 hover:shadow-lg hover:scale-105 transition-all ${styles.button}`}
              >
                <div className="flex flex-col items-center space-y-3">
                  <span className="text-4xl">📊</span>
                  <p className={`text-xl font-bold ${styles.title}`}>기록</p>
                </div>
              </Button>
              <Button
                onClick={() => setHealthView('scan')}
                className={`rounded-2xl border-2 p-12 hover:shadow-lg hover:scale-105 transition-all ${styles.button}`}
              >
                <div className="flex flex-col items-center space-y-3">
                  <span className="text-4xl">📷</span>
                  <p className={`text-xl font-bold ${styles.title}`}>스캔</p>
                </div>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Exercise 메인 뷰
  if (healthView === 'exercise') {
    const exerciseRelatedDiaries = getExerciseRelatedDiaries();
    const exerciseCategories = ['스트레칭', '체중감량', '웨이트', '스포츠'];

    // 날짜 포맷팅 함수
    const formatDate = (dateString: string) => {
      const date = new Date(dateString);
      const days = ['일', '월', '화', '수', '목', '금', '토'];
      const month = date.getMonth() + 1;
      const day = date.getDate();
      const dayOfWeek = days[date.getDay()];
      return `${date.getFullYear()}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}-${dayOfWeek}`;
    };

    // 카테고리별 추천 받기
    const handleCategoryClick = async (category: string) => {
      setSelectedCategory(category);
      setIsLoadingRecommendation(true);
      setRecommendationError(null);

      try {
        if (!diaries || diaries.length === 0) {
          setRecommendationError('일기 기록이 없어 맞춤 운동을 추천할 수 없습니다.');
          setIsLoadingRecommendation(false);
          return;
        }

        const recentDiaries = diaries
          .slice()
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, 10);

        const diarySummary = recentDiaries
          .map((diary) => `날짜: ${diary.date}\n제목: ${diary.title}\n내용: ${diary.content}\n감정: ${diary.emotion}`)
          .join('\n\n---\n\n');

        const systemMessage = `당신은 건강 전문가입니다. 사용자의 일기 기록을 분석하여 "${category}" 카테고리에 맞는 운동을 추천해주세요.
다음 형식으로 JSON 응답을 제공해주세요:
{
  "categories": [
    {
      "name": "${category}",
      "exercises": [
        {
          "name": "운동 이름",
          "description": "운동 설명",
          "duration": "운동 시간 (예: 30분)",
          "difficulty": "난이도 (초급/중급/고급)",
          "benefits": ["효과1", "효과2", "효과3"],
          "youtubeVideoId": "유튜브 비디오 ID"
        }
      ]
    }
  ],
  "summary": "전체 추천 요약"
}
각 카테고리마다 최대 5개의 운동을 추천하고, 각 운동에는 반드시 유튜브 비디오 ID를 포함해주세요.`;

        const userMessage = `다음은 사용자의 최근 일기 기록입니다:\n\n${diarySummary}\n\n이 일기 기록을 바탕으로 "${category}" 카테고리에 맞는 운동을 추천해주세요. JSON 형식으로 응답해주세요.`;

        let jwtToken: string | null = null;
        if (typeof window !== 'undefined') {
          jwtToken = getAccessToken();
        }

        const response = await aiGatewayClient.sendChat({
          message: userMessage,
          system_message: systemMessage,
          jwtToken: jwtToken || undefined,
        });

        if (response.error || !response.data) {
          throw new Error(response.error || '운동 추천을 받을 수 없습니다.');
        }

        if (response.data.status === 'error') {
          throw new Error(response.data.message || 'AI 처리 중 오류가 발생했습니다.');
        }

        let recommendationData: ExerciseRecommendation;
        try {
          const responseText = response.data.message.trim();
          const jsonMatch = responseText.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
          if (jsonMatch) {
            recommendationData = JSON.parse(jsonMatch[1]);
          } else {
            recommendationData = JSON.parse(responseText);
          }
        } catch (parseError) {
          console.warn('JSON 파싱 실패:', parseError);
          recommendationData = {
            categories: [],
            summary: response.data.message,
          };
        }

        setRecommendation(recommendationData);
        setHealthView('exercise-recommendation');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
        setRecommendationError(errorMessage);
        console.error('운동 추천 오류:', error);
      } finally {
        setIsLoadingRecommendation(false);
      }
    };

    // 맞춤형 추천 받기
    const handleCustomizedRecommendation = async () => {
      await getExerciseRecommendation();
      if (recommendation) {
        setHealthView('exercise-recommendation');
      }
    };

    return (
      <div className={`flex-1 flex flex-col overflow-hidden ${styles.bg}`}>
        <div className={`border-b shadow-sm p-4 ${styles.header}`}>
          <div className="max-w-4xl mx-auto flex items-center gap-4">
            <button
              onClick={() => setHealthView('home')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${styles.buttonHover}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className={`text-2xl font-bold ${styles.title}`}>운동</h1>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 md:p-6" style={{ WebkitOverflowScrolling: 'touch' }}>
          <div className="max-w-4xl mx-auto space-y-6">
            {/* 최근 운동 관련 일기 */}
            {exerciseRelatedDiaries.length > 0 && (
              <div className={`rounded-2xl border-2 p-6 shadow-lg ${styles.card}`}>
                <h2 className={`text-lg font-bold mb-4 ${styles.title}`}>최근 작성된 운동 관련 일기</h2>
                <div className="space-y-3">
                  {exerciseRelatedDiaries.map((diary, index) => (
                    <div key={index} className={`rounded-lg p-4 ${styles.cardBg}`}>
                      <p className={`text-sm ${styles.textMuted} mb-1`}>{formatDate(diary.date)}</p>
                      <p className={`${styles.title} whitespace-pre-wrap`}>{diary.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 카테고리 버튼 (2x2 그리드) */}
            <div className="grid grid-cols-2 gap-4">
              {exerciseCategories.map((category) => (
                <Button
                  key={category}
                  onClick={() => handleCategoryClick(category)}
                  disabled={isLoadingRecommendation || diariesLoading || !diaries || diaries.length === 0}
                  className={`rounded-2xl border-2 p-8 hover:shadow-lg hover:scale-105 transition-all ${styles.button}`}
                >
                  <p className={`text-xl font-bold ${styles.title}`}>{category}</p>
                </Button>
              ))}
            </div>

            {/* 맞춤형 추천 메시지 및 버튼 */}
            <div className={`rounded-2xl border-2 p-6 shadow-lg ${styles.card}`}>
              {customizedMessage && (
                <p className={`mb-4 ${styles.title} whitespace-pre-wrap`}>{customizedMessage}</p>
              )}
              <Button
                onClick={handleCustomizedRecommendation}
                disabled={isLoadingRecommendation || diariesLoading || !diaries || diaries.length === 0}
                variant="primary"
                className="w-full"
              >
                {isLoadingRecommendation ? '추천 중...' : '맞춤 운동 추천 받기'}
              </Button>
            </div>

            {/* 로딩 상태 */}
            {isLoadingRecommendation && (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
                <p className={`mt-4 ${styles.textMuted}`}>일기 기록을 분석하여 맞춤 운동을 추천하고 있습니다...</p>
              </div>
            )}

            {/* 에러 메시지 */}
            {recommendationError && (
              <div className={`rounded-lg p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800`}>
                <p className={`text-sm text-red-600 dark:text-red-400`}>{recommendationError}</p>
              </div>
            )}

            {/* 프롬프트 입력 필드 */}
            <div className={`border-t pt-4 ${styles.border}`}>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={promptText}
                  onChange={(e) => setPromptText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && promptText.trim()) {
                      // 프롬프트 처리 로직 (추후 구현)
                      setPromptText('');
                    }
                  }}
                  placeholder="프롬프트를 입력하세요."
                  className={`flex-1 px-4 py-3 rounded-lg border-2 ${styles.border} ${styles.cardBg} ${styles.title} focus:outline-none focus:ring-2 focus:ring-[#8B7355]`}
                />
                <button
                  onClick={() => {
                    if (promptText.trim()) {
                      // 프롬프트 처리 로직 (추후 구현)
                      setPromptText('');
                    }
                  }}
                  disabled={!promptText.trim()}
                  className={`w-12 h-12 rounded-full flex items-center justify-center text-white transition-colors disabled:opacity-50 ${darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-[#8B7355] hover:bg-[#6d5943]'
                    }`}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Exercise 추천 뷰
  if (healthView === 'exercise-recommendation') {
    return (
      <div className={`flex-1 flex flex-col overflow-hidden ${styles.bg}`}>
        <div className={`border-b shadow-sm p-4 ${styles.header}`}>
          <div className="max-w-4xl mx-auto flex items-center gap-4">
            <button
              onClick={() => setHealthView('exercise')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${styles.buttonHover}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className={`text-2xl font-bold ${styles.title}`}>추천 운동</h1>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 md:p-6" style={{ WebkitOverflowScrolling: 'touch' }}>
          <div className="max-w-4xl mx-auto space-y-6">
            {/* 맞춤 안내 메시지 */}
            {recommendation && recommendation.summary && (
              <div className={`rounded-2xl border-2 p-6 shadow-lg ${styles.card}`}>
                <p className={`${styles.title} whitespace-pre-wrap`}>
                  {selectedCategory
                    ? `${selectedCategory} 카테고리에 맞는 맞춤 운동 리스트입니다. 운동 전 후 스트레칭은 필수!`
                    : recommendation.summary
                  }
                </p>
              </div>
            )}

            {/* 카테고리별 영상 리스트 (수평 스크롤) */}
            {recommendation && recommendation.categories && recommendation.categories.length > 0 && (
              <div className="space-y-8">
                {recommendation.categories.map((category, categoryIndex) => (
                  <div key={categoryIndex} className="space-y-4">
                    <h3 className={`text-2xl font-bold ${styles.title}`}>{category.name}</h3>

                    {/* 수평 스크롤 가능한 영상 리스트 */}
                    {category.exercises && category.exercises.length > 0 && (
                      <div className="overflow-x-auto pb-4" style={{ scrollbarWidth: 'thin' }}>
                        <div className="flex gap-4" style={{ minWidth: 'max-content' }}>
                          {category.exercises.map((exercise, exerciseIndex) => (
                            <div
                              key={exerciseIndex}
                              className={`flex-shrink-0 w-64 rounded-lg overflow-hidden border-2 ${styles.border} hover:shadow-lg transition-shadow cursor-pointer`}
                              onClick={() => {
                                if (exercise.youtubeVideoId) {
                                  window.open(`https://www.youtube.com/watch?v=${exercise.youtubeVideoId}`, '_blank');
                                }
                              }}
                            >
                              {/* 유튜브 썸네일 */}
                              <div className="relative w-full aspect-video bg-gray-200 dark:bg-gray-800">
                                {exercise.youtubeVideoId ? (
                                  <img
                                    src={`https://img.youtube.com/vi/${exercise.youtubeVideoId}/maxresdefault.jpg`}
                                    alt={exercise.name}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${exercise.youtubeVideoId}/hqdefault.jpg`;
                                    }}
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <span className="text-4xl">🎥</span>
                                  </div>
                                )}
                                {/* 재생 버튼 오버레이 */}
                                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 hover:bg-opacity-30 transition-all">
                                  <div className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                    <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                                      <path d="M8 5v14l11-7z" />
                                    </svg>
                                  </div>
                                </div>
                              </div>

                              {/* 운동 정보 */}
                              <div className={`p-3 ${styles.cardBg}`}>
                                <h4 className={`font-bold text-sm mb-1 ${styles.title} line-clamp-2`}>
                                  {exercise.name}
                                </h4>
                                <div className="flex items-center justify-between mt-2">
                                  <span className={`text-xs ${styles.textMuted}`}>⏱️ {exercise.duration}</span>
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${exercise.difficulty === '초급'
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                    : exercise.difficulty === '중급'
                                      ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                    }`}>
                                    {exercise.difficulty}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* 프롬프트 입력 필드 */}
            <div className={`border-t pt-4 ${styles.border}`}>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={promptText}
                  onChange={(e) => setPromptText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && promptText.trim()) {
                      // 프롬프트 처리 로직 (추후 구현)
                      setPromptText('');
                    }
                  }}
                  placeholder="프롬프트를 입력하세요."
                  className={`flex-1 px-4 py-3 rounded-lg border-2 ${styles.border} ${styles.cardBg} ${styles.title} focus:outline-none focus:ring-2 focus:ring-[#8B7355]`}
                />
                <button
                  onClick={() => {
                    if (promptText.trim()) {
                      // 프롬프트 처리 로직 (추후 구현)
                      setPromptText('');
                    }
                  }}
                  disabled={!promptText.trim()}
                  className={`w-12 h-12 rounded-full flex items-center justify-center text-white transition-colors disabled:opacity-50 ${darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-[#8B7355] hover:bg-[#6d5943]'
                    }`}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Health 뷰
  if (healthView === 'health') {
    const healthRelatedDiaries = getHealthRelatedDiaries();
    const maxValue = inbodyData.length > 0
      ? Math.max(...inbodyData.flatMap(d => [d.bmi, d.weight, d.muscle]), 90)
      : 90;

    return (
      <div className={`flex-1 flex flex-col overflow-hidden ${styles.bg}`}>
        <div className={`border-b shadow-sm p-4 ${styles.header}`}>
          <div className="max-w-4xl mx-auto flex items-center gap-4">
            <button
              onClick={() => setHealthView('home')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${styles.buttonHover}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className={`text-2xl font-bold ${styles.title}`}>건강</h1>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 md:p-6" style={{ WebkitOverflowScrolling: 'touch' }}>
          <div className="max-w-4xl mx-auto space-y-6">
            {/* 1. 일기 기반 사용자 데이터 요약 (최상단) */}
            {healthInfo && (
              <div className={`rounded-2xl border-2 p-6 shadow-lg ${styles.card}`}>
                <div className="max-h-64 overflow-y-auto pr-2" style={{ scrollbarWidth: 'thin' }}>
                  <p className={`${styles.title} whitespace-pre-wrap leading-relaxed`}>{healthInfo}</p>
                </div>
              </div>
            )}

            {/* 2. 인바디 기반 사용자 체형 데이터 */}
            <div className="space-y-6">
              {/* 체형 요약 (인바디 기반) */}
              {bodyType && (
                <div className={`rounded-2xl border-2 p-6 shadow-lg ${styles.card}`}>
                  <div className="flex flex-col items-center space-y-4">
                    {/* 체형 실루엣 */}
                    <div className="w-32 h-48 flex items-center justify-center">
                      {bodyType.includes('Overweight') ? (
                        <svg viewBox="0 0 100 200" className="w-full h-full">
                          {/* Overweight 실루엣 */}
                          <ellipse cx="50" cy="100" rx="35" ry="50" fill={darkMode ? '#333' : '#000'} />
                          <circle cx="50" cy="40" r="20" fill={darkMode ? '#333' : '#000'} />
                          <rect x="30" y="150" width="40" height="30" rx="5" fill={darkMode ? '#333' : '#000'} />
                        </svg>
                      ) : bodyType === 'Normal' ? (
                        <svg viewBox="0 0 100 200" className="w-full h-full">
                          {/* Normal 실루엣 */}
                          <ellipse cx="50" cy="100" rx="25" ry="45" fill={darkMode ? '#333' : '#000'} />
                          <circle cx="50" cy="40" r="18" fill={darkMode ? '#333' : '#000'} />
                          <rect x="35" y="145" width="30" height="30" rx="5" fill={darkMode ? '#333' : '#000'} />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 100 200" className="w-full h-full">
                          {/* Underweight 실루엣 */}
                          <ellipse cx="50" cy="100" rx="20" ry="40" fill={darkMode ? '#333' : '#000'} />
                          <circle cx="50" cy="40" r="15" fill={darkMode ? '#333' : '#000'} />
                          <rect x="40" y="140" width="20" height="30" rx="5" fill={darkMode ? '#333' : '#000'} />
                        </svg>
                      )}
                    </div>
                    {/* 체형 라벨 */}
                    <div className={`px-4 py-2 rounded-lg ${styles.cardBg}`}>
                      <p className={`text-lg font-bold ${styles.title}`}>{bodyType}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* InBody 차트 */}
              {inbodyData.length > 0 && (
                <div className={`rounded-2xl border-2 p-6 shadow-lg ${styles.card}`}>
                  <h2 className={`text-xl font-bold mb-6 ${styles.title}`}>InBody</h2>

                  {/* 수평 바 차트 (월별로 3개 바 표시) */}
                  <div className="space-y-6">
                    {inbodyData.map((data, index) => (
                      <div key={index} className="space-y-3">
                        {/* 월 레이블 */}
                        <p className={`text-sm font-semibold ${styles.title}`}>{data.month}</p>

                        {/* 3개 바 (BMI, 체중, 골격근량) */}
                        <div className="space-y-2">
                          {/* BMI 바 */}
                          <div className="flex items-center gap-3">
                            <div className="w-20 flex-shrink-0">
                              <span className={`text-xs ${styles.textMuted}`}>BMI(kg/m²)</span>
                            </div>
                            <div className="flex-1 h-6 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden relative">
                              <div
                                className="h-full bg-blue-600 dark:bg-blue-500 rounded-full transition-all"
                                style={{ width: `${(data.bmi / maxValue) * 100}%` }}
                              />
                              <span className={`absolute right-2 top-1/2 transform -translate-y-1/2 text-xs font-semibold ${styles.title}`}>
                                {data.bmi}
                              </span>
                            </div>
                          </div>

                          {/* 체중 바 */}
                          <div className="flex items-center gap-3">
                            <div className="w-20 flex-shrink-0">
                              <span className={`text-xs ${styles.textMuted}`}>체중(kg)</span>
                            </div>
                            <div className="flex-1 h-6 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden relative">
                              <div
                                className="h-full bg-orange-500 dark:bg-orange-400 rounded-full transition-all"
                                style={{ width: `${(data.weight / maxValue) * 100}%` }}
                              />
                              <span className={`absolute right-2 top-1/2 transform -translate-y-1/2 text-xs font-semibold ${styles.title}`}>
                                {data.weight}
                              </span>
                            </div>
                          </div>

                          {/* 골격근량 바 */}
                          <div className="flex items-center gap-3">
                            <div className="w-20 flex-shrink-0">
                              <span className={`text-xs ${styles.textMuted}`}>골격근량(kg)</span>
                            </div>
                            <div className="flex-1 h-6 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden relative">
                              <div
                                className="h-full bg-green-500 dark:bg-green-400 rounded-full transition-all"
                                style={{ width: `${(data.muscle / maxValue) * 100}%` }}
                              />
                              <span className={`absolute right-2 top-1/2 transform -translate-y-1/2 text-xs font-semibold ${styles.title}`}>
                                {data.muscle}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* X축 레이블 (0-90) */}
                  <div className="flex items-center justify-end mt-4 pr-20">
                    <div className="flex-1 flex items-center justify-between max-w-md">
                      <span className={`text-xs ${styles.textMuted}`}>0</span>
                      <span className={`text-xs ${styles.textMuted}`}>30</span>
                      <span className={`text-xs ${styles.textMuted}`}>60</span>
                      <span className={`text-xs ${styles.textMuted}`}>90</span>
                    </div>
                  </div>

                  {/* 범례 */}
                  <div className={`flex gap-4 mt-6 pt-4 border-t ${styles.border}`}>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-blue-600 dark:bg-blue-500 rounded"></div>
                      <span className={`text-xs ${styles.textMuted}`}>BMI(kg/m²)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-orange-500 dark:bg-orange-400 rounded"></div>
                      <span className={`text-xs ${styles.textMuted}`}>체중(kg)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-green-500 dark:bg-green-400 rounded"></div>
                      <span className={`text-xs ${styles.textMuted}`}>골격근량(kg)</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 3. 건강기록 데이터 */}
            <div className={`rounded-2xl border-2 p-6 shadow-lg ${styles.card}`}>
              <h2 className={`text-xl font-bold mb-4 ${styles.title}`}>건강검진 요약</h2>
              <div className="max-h-64 overflow-y-auto pr-2" style={{ scrollbarWidth: 'thin' }}>
                {healthCheckupSummary ? (
                  <p className={`${styles.textMuted} whitespace-pre-wrap leading-relaxed`}>{healthCheckupSummary}</p>
                ) : (
                  <p className={`${styles.textMuted}`}>최근 건강검진 데이터가 없습니다.</p>
                )}
              </div>
            </div>

            {/* 프롬프트 입력 필드 */}
            <div className={`border-t pt-4 ${styles.border}`}>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={promptText}
                  onChange={(e) => setPromptText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && promptText.trim()) {
                      // 프롬프트 처리 로직 (추후 구현)
                      setPromptText('');
                    }
                  }}
                  placeholder="프롬프트를 입력하세요."
                  className={`flex-1 px-4 py-3 rounded-lg border-2 ${styles.border} ${styles.cardBg} ${styles.title} focus:outline-none focus:ring-2 focus:ring-[#8B7355]`}
                />
                <button
                  onClick={() => {
                    if (promptText.trim()) {
                      // 프롬프트 처리 로직 (추후 구현)
                      setPromptText('');
                    }
                  }}
                  disabled={!promptText.trim()}
                  className={`w-12 h-12 rounded-full flex items-center justify-center text-white transition-colors disabled:opacity-50 ${darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-[#8B7355] hover:bg-[#6d5943]'}`}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Records 뷰
  if (healthView === 'records') {
    // 날짜 포맷팅 함수
    const formatDate = (dateString: string) => {
      try {
        const date = new Date(dateString);
        const days = ['일', '월', '화', '수', '목', '금', '토'];
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const dayOfWeek = days[date.getDay()];
        return `${year}-${month}-${day} ${dayOfWeek}`;
      } catch (e) {
        return dateString;
      }
    };

    // 날짜순으로 정렬 (최신순)
    const sortedRecords = [...healthcareRecords].sort((a, b) => {
      const dateA = new Date(a.recordDate).getTime();
      const dateB = new Date(b.recordDate).getTime();
      return dateB - dateA;
    });

    return (
      <div className={`flex-1 flex flex-col overflow-hidden ${styles.bg}`}>
        <div className={`border-b shadow-sm p-4 ${styles.header}`}>
          <div className="max-w-4xl mx-auto flex items-center gap-4">
            <button
              onClick={() => setHealthView('home')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${styles.buttonHover}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className={`text-2xl font-bold ${styles.title}`}>건강 기록</h1>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 md:p-6" style={{ WebkitOverflowScrolling: 'touch' }}>
          <div className="max-w-4xl mx-auto space-y-4">
            {healthcareLoading ? (
              <div className={`rounded-2xl border-2 p-8 shadow-lg ${styles.card}`}>
                <p className={`text-center py-8 ${styles.textMuted}`}>로딩 중...</p>
              </div>
            ) : sortedRecords.length === 0 ? (
              <div className={`rounded-2xl border-2 p-8 shadow-lg ${styles.card}`}>
                <p className={`text-center py-8 ${styles.textMuted}`}>기록이 없습니다.</p>
              </div>
            ) : (
              sortedRecords.map((record) => (
                <div key={record.id} className={`rounded-2xl border-2 p-6 shadow-lg ${styles.card}`}>
                  {/* 날짜 */}
                  <div className={`mb-3 ${styles.title}`}>
                    <p className="text-lg font-semibold">{formatDate(record.recordDate)}</p>
                  </div>

                  {/* 주간 요약 (weeklySummary) */}
                  {record.weeklySummary && (
                    <div className={`mb-4 ${styles.textMuted}`}>
                      <p className="whitespace-pre-wrap leading-relaxed">{record.weeklySummary}</p>
                    </div>
                  )}

                  {/* 건강 데이터 링크 */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm ${styles.textMuted}`}>
                        ㄴ&gt; 일기 속 Aiion님 건강 데이터예요!
                      </span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>

                  {/* 건강 데이터 정보 */}
                  <div className={`space-y-2 ${styles.cardBg} p-4 rounded-lg`}>
                    {record.type && (
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${styles.textMuted}`}>유형:</span>
                        <span className={`text-sm ${styles.title}`}>{record.type}</span>
                      </div>
                    )}
                    {record.steps !== null && record.steps !== undefined && (
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${styles.textMuted}`}>걸음수:</span>
                        <span className={`text-sm ${styles.title}`}>{record.steps.toLocaleString()}걸음</span>
                      </div>
                    )}
                    {record.weight !== null && record.weight !== undefined && (
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${styles.textMuted}`}>체중:</span>
                        <span className={`text-sm ${styles.title}`}>{record.weight}kg</span>
                      </div>
                    )}
                    {record.bloodPressure && (
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${styles.textMuted}`}>혈압:</span>
                        <span className={`text-sm ${styles.title}`}>{record.bloodPressure}</span>
                      </div>
                    )}
                    {record.condition && (
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${styles.textMuted}`}>컨디션:</span>
                        <span className={`text-sm ${styles.title}`}>{record.condition}</span>
                      </div>
                    )}
                    {record.sleepHours !== null && record.sleepHours !== undefined && (
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${styles.textMuted}`}>수면 시간:</span>
                        <span className={`text-sm ${styles.title}`}>{record.sleepHours}시간</span>
                      </div>
                    )}
                  </div>

                  {/* 추천 루틴 (recommendedRoutine) */}
                  {record.recommendedRoutine && (
                    <div className={`mt-4 pt-4 border-t ${styles.border}`}>
                      <p className={`text-sm font-medium mb-2 ${styles.title}`}>추천 루틴:</p>
                      <p className={`text-sm whitespace-pre-wrap leading-relaxed ${styles.textMuted}`}>
                        {record.recommendedRoutine}
                      </p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  // Scan 뷰
  if (healthView === 'scan') {
    return (
      <div className={`flex-1 flex flex-col overflow-hidden ${styles.bg}`}>
        <div className={`border-b shadow-sm p-4 ${styles.header}`}>
          <div className="max-w-4xl mx-auto flex items-center gap-4">
            <button
              onClick={() => setHealthView('home')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${styles.buttonHover}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className={`text-2xl font-bold ${styles.title}`}>스캔</h1>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 md:p-6" style={{ WebkitOverflowScrolling: 'touch' }}>
          <div className="max-w-4xl mx-auto space-y-4">
            <div className={`rounded-2xl border-2 p-8 shadow-lg ${styles.card}`}>
              <div className="text-center py-8">
                <p className={`mb-4 ${styles.textMuted}`}>건강 검진 결과를 스캔하여 저장할 수 있습니다.</p>
                <Button>스캔하기</Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Exercise-detail 뷰
  if (healthView === 'exercise-detail') {
    return (
      <div className={`flex-1 flex flex-col overflow-hidden ${styles.bg}`}>
        <div className={`border-b shadow-sm p-4 ${styles.header}`}>
          <div className="max-w-4xl mx-auto flex items-center gap-4">
            <button
              onClick={() => setHealthView('exercise')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${styles.buttonHover}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className={`text-2xl font-bold ${styles.title}`}>운동 상세</h1>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 md:p-6" style={{ WebkitOverflowScrolling: 'touch' }}>
          <div className="max-w-4xl mx-auto space-y-4">
            <div className={`rounded-2xl border-2 p-8 shadow-lg ${styles.card}`}>
              <p className={`text-center py-8 ${styles.textMuted}`}>운동 상세 정보가 없습니다.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
