import React, { useState, useEffect } from 'react';
import { Button } from '../atoms';
import { PathfinderView as PathfinderViewType } from '../types';
import { useStore } from '../../store';
import { fetchRecommendations, fetchDiariesForPathfinder, ComprehensiveRecommendation, LearningRecommendation } from '../../app/hooks/usePathfinderApi';
import { Diary } from '../types';

interface PathfinderViewProps {
  pathfinderView: PathfinderViewType;
  setPathfinderView: (view: PathfinderViewType) => void;
  darkMode?: boolean;
}

const getCommonStyles = (darkMode: boolean) => ({
  bg: darkMode ? 'bg-[#0a0a0a]' : 'bg-[#e8e2d5]',
  header: darkMode ? 'bg-[#121212] border-[#2a2a2a]' : 'bg-white border-[#d4c4a8]',
  card: darkMode ? 'bg-[#121212] border-[#2a2a2a]' : 'bg-white border-[#8B7355]',
  title: darkMode ? 'text-white' : 'text-gray-900',
  textSecondary: darkMode ? 'text-gray-300' : 'text-gray-700',
  textMuted: darkMode ? 'text-gray-400' : 'text-gray-500',
  border: darkMode ? 'border-[#2a2a2a]' : 'border-[#d4c4a8]',
  button: darkMode ? 'bg-gradient-to-br from-[#1a1a1a] to-[#121212] border-[#2a2a2a]' : 'bg-gradient-to-br from-white to-[#f5f0e8] border-[#8B7355]',
  buttonHover: darkMode ? 'text-gray-300 hover:text-white hover:bg-[#1a1a1a]' : 'text-gray-600 hover:text-gray-900 hover:bg-[#f5f1e8]',
  input: darkMode ? 'bg-[#1a1a1a] text-white border-[#2a2a2a] focus:border-[#333333] placeholder-gray-400' : 'border-[#d4c4a8] focus:border-[#8B7355]',
  badge: darkMode ? 'bg-red-900/30 text-red-300' : 'bg-red-100 text-red-600',
  progressBg: darkMode ? 'bg-[#2a2a2a]' : 'bg-gray-200',
  progressBar: darkMode ? 'bg-blue-500' : 'bg-blue-600',
});

export const PathfinderView: React.FC<PathfinderViewProps> = ({
  pathfinderView,
  setPathfinderView,
  darkMode = false,
}) => {
  const styles = getCommonStyles(darkMode);
  const user = useStore((state) => state.user?.user);
  const [recommendations, setRecommendations] = useState<ComprehensiveRecommendation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRecommendation, setSelectedRecommendation] = useState<string | null>(null);
  const [diaries, setDiaries] = useState<Diary[]>([]);
  const [apiError, setApiError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<{diaryCount: number; recommendationCount: number; lastUpdate: string} | null>(null);

  // 학습 추천 데이터 및 일기 데이터 로드
  useEffect(() => {
    const loadData = async () => {
      // 테스트용: userId 1 사용 (PL/관리자 데이터로 테스트)
      const testUserId = 1;
      console.log('[PathfinderView] 테스트 모드: userId 1 사용 (실제 로그인 userId:', user?.id, ')');

      // 일기 데이터 로드 (항상 로드)
      // 테스트 모드: skipAuth=true로 설정하여 JWT 토큰 없이 호출 (userId 1로 테스트)
      let diaryData: Diary[] = [];
      try {
        console.log('[PathfinderView] 일기 데이터 로드 시작... (testUserId:', testUserId, ', skipAuth: true)');
        diaryData = await fetchDiariesForPathfinder(testUserId, true); // skipAuth=true
        console.log('[PathfinderView] 일기 데이터 로드 완료:', diaryData.length, '개');
        setDiaries(diaryData);
        setApiError(null);
      } catch (error) {
        console.error('[PathfinderView] 일기 데이터 로드 실패:', error);
        setDiaries([]);
        setApiError(`일기 데이터 로드 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
      }

      // 학습 추천 데이터 로드 (recommendations 탭에서만)
      if (pathfinderView === 'recommendations') {
        try {
          setIsLoading(true);
          setApiError(null);
          console.log('[PathfinderView] 추천 데이터 API 호출 시작... (testUserId:', testUserId, ')');
          const data = await fetchRecommendations(testUserId);
          console.log('[PathfinderView] 추천 데이터 API 응답:', data);
          setRecommendations(data);
          
          // 디버깅 정보 업데이트 (일기 데이터는 위에서 로드한 diaryData 사용)
          // 사용자 요구사항: 모든 행을 1개의 일기로 간주
          const uniqueDiaryCount = diaryData.length > 0 ? 1 : 0;
          
          setDebugInfo({
            diaryCount: uniqueDiaryCount, // 고유한 일기 개수
            recommendationCount: data?.recommendations?.length || 0,
            lastUpdate: new Date().toLocaleTimeString('ko-KR')
          });
        } catch (error) {
          console.error('[PathfinderView] 추천 데이터 로드 실패:', error);
          setRecommendations(null);
          setApiError(`추천 데이터 로드 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
        } finally {
          setIsLoading(false);
        }
      }
    };

    loadData();
  }, [user?.id, pathfinderView]);

  // Home 뷰
  if (pathfinderView === 'home') {
    return (
      <div className={`flex-1 flex flex-col ${styles.bg}`}>
        <div className="flex-1 overflow-y-auto p-4 md:p-6" style={{ WebkitOverflowScrolling: 'touch' }}>
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="text-center py-4">
              <h1 className={`text-3xl font-bold ${styles.title}`}>Path Finder</h1>
            </div>

            {/* 종합 통계 */}
            <div className={`rounded-2xl border-2 p-8 shadow-lg ${styles.card}`}>
              <h2 className={`text-2xl font-bold mb-4 text-center border-b-2 pb-3 ${styles.title} ${styles.border}`}>
                📊 종합 학습 분석
              </h2>
              
              {recommendations?.stats ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className={`text-3xl font-bold ${styles.title}`}>{recommendations.stats.discovered}</p>
                      <p className={`text-sm ${styles.textMuted}`}>발견한 학습</p>
                    </div>
                    <div>
                      <p className={`text-3xl font-bold ${styles.title}`}>{recommendations.stats.inProgress}</p>
                      <p className={`text-sm ${styles.textMuted}`}>진행 중</p>
                    </div>
                    <div>
                      <p className={`text-3xl font-bold ${styles.title}`}>{recommendations.stats.completed}</p>
                      <p className={`text-sm ${styles.textMuted}`}>완료</p>
                    </div>
                  </div>

                  <div className={`mt-6 p-4 rounded-lg border ${styles.border}`}>
                    <p className={`text-sm font-medium mb-2 ${styles.textSecondary}`}>최근 활동</p>
                    <p className={`text-sm ${styles.textMuted}`}>
                      • 총 {recommendations.recommendations?.length || 0}개의 학습 추천
                    </p>
                  </div>
                </div>
              ) : (
                <p className={`text-center py-4 ${styles.textMuted}`}>
                  일기를 작성하면 맞춤 학습을 추천해드려요!
                </p>
              )}
            </div>

            {/* 4개 메인 버튼 */}
            <div className="grid grid-cols-2 gap-6">
              <Button
                onClick={() => setPathfinderView('recommendations')}
                className={`rounded-2xl border-2 p-12 hover:shadow-lg hover:scale-105 transition-all ${styles.button} relative`}
              >
                <div className="flex flex-col items-center space-y-3">
                  <span className="text-4xl">💡</span>
                  <p className={`text-xl font-bold ${styles.title}`}>학습 추천</p>
                  {recommendations?.stats && recommendations.stats.discovered > 0 && (
                    <span className={`absolute top-3 right-3 text-xs px-2 py-1 rounded-full font-bold ${styles.badge}`}>
                      {recommendations.stats.discovered}
                    </span>
                  )}
                </div>
              </Button>
              
              <Button
                onClick={() => setPathfinderView('my-learning')}
                className={`rounded-2xl border-2 p-12 hover:shadow-lg hover:scale-105 transition-all ${styles.button}`}
              >
                <div className="flex flex-col items-center space-y-3">
                  <span className="text-4xl">📝</span>
                  <p className={`text-xl font-bold ${styles.title}`}>나의 학습</p>
                  {recommendations?.stats && recommendations.stats.inProgress > 0 && (
                    <p className={`text-xs ${styles.textMuted}`}>진행중 {recommendations.stats.inProgress}개</p>
                  )}
                </div>
              </Button>
              
              <Button
                onClick={() => setPathfinderView('career')}
                className={`rounded-2xl border-2 p-12 hover:shadow-lg hover:scale-105 transition-all ${styles.button}`}
              >
                <div className="flex flex-col items-center space-y-3">
                  <span className="text-4xl">💼</span>
                  <p className={`text-xl font-bold ${styles.title}`}>커리어</p>
                </div>
              </Button>
              
              <Button
                onClick={() => setPathfinderView('roadmap')}
                className={`rounded-2xl border-2 p-12 hover:shadow-lg hover:scale-105 transition-all ${styles.button}`}
              >
                <div className="flex flex-col items-center space-y-3">
                  <span className="text-4xl">🗺️</span>
                  <p className={`text-xl font-bold ${styles.title}`}>로드맵</p>
                </div>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 학습 추천 뷰 (recommendations) - API 데이터 사용
  if (pathfinderView === 'recommendations') {
    return (
      <div className={`flex-1 flex flex-col ${styles.bg}`}>
        <div className={`border-b shadow-sm p-4 ${styles.header}`}>
          <div className="max-w-4xl mx-auto flex items-center gap-4">
            <button
              onClick={() => setPathfinderView('home')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${styles.buttonHover}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className={`text-2xl font-bold ${styles.title}`}>💡 학습 추천</h1>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6" style={{ WebkitOverflowScrolling: 'touch' }}>
          <div className="max-w-4xl mx-auto space-y-6">
            
            {/* 디버깅 정보 표시 */}
            <div className={`rounded-xl border-2 p-4 ${styles.card} bg-opacity-50`}>
              <h3 className={`text-sm font-bold mb-2 ${styles.title}`}>🔍 디버깅 정보</h3>
              <div className="space-y-1 text-xs">
                {/* 일기 개수 표시 */}
                {(() => {
                  // 사용자 요구사항: 638개 행이 모두 다른 id를 가지고 있지만 실제 일기는 1개
                  // 예시 데이터(nanjung.csv)는 모두 1개의 일기 컬렉션으로 간주
                  // 따라서 데이터가 있으면 항상 1개로 표시
                  
                  const totalRowCount = diaries.length;
                  const uniqueDiaryCount = totalRowCount > 0 ? 1 : 0;
                  
                  return (
                    <>
                      <p className={styles.textMuted}>
                        일기 데이터: <span className={styles.title}>{uniqueDiaryCount}개</span>
                        {totalRowCount > 1 && (
                          <span className="text-gray-400 ml-1">(총 {totalRowCount}개 행)</span>
                        )}
                      </p>
                    </>
                  );
                })()}
                {debugInfo && (
                  <>
                    <p className={styles.textMuted}>
                      추천 결과: <span className={styles.title}>{debugInfo.recommendationCount}개</span>
                    </p>
                    <p className={styles.textMuted}>
                      마지막 업데이트: <span className={styles.title}>{debugInfo.lastUpdate}</span>
                    </p>
                  </>
                )}
                {apiError && (
                  <p className="text-red-500 text-xs">⚠️ {apiError}</p>
                )}
                {(() => {
                  // 모든 행을 1개의 일기로 간주
                  const uniqueDiaryCount = diaries.length > 0 ? 1 : 0;
                  return (
                    <>
                      {!apiError && uniqueDiaryCount === 0 && (
                        <p className="text-yellow-500 text-xs">⚠️ 일기 데이터가 없습니다. 일기를 작성해주세요.</p>
                      )}
                      {!apiError && uniqueDiaryCount > 0 && (!recommendations || recommendations.recommendations.length === 0) && (
                        <p className="text-yellow-500 text-xs">⚠️ 일기는 있지만 추천 결과가 없습니다. 일기 내용에 학습 키워드가 포함되어 있는지 확인해주세요.</p>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
            
            {isLoading ? (
              <div className={`rounded-xl border-2 p-8 ${styles.card}`}>
                <p className={`text-center ${styles.textMuted}`}>일기를 분석하는 중...</p>
                <p className={`text-center text-xs mt-2 ${styles.textMuted}`}>
                  일기 {diaries.length}개를 분석하고 있습니다...
                </p>
              </div>
            ) : !recommendations || !recommendations.recommendations || recommendations.recommendations.length === 0 ? (
              <div className={`rounded-xl border-2 p-8 ${styles.card}`}>
                <p className={`text-center ${styles.textMuted}`}>
                  {(() => {
                    // 모든 행을 1개의 일기로 간주
                    const uniqueDiaryCount = diaries.length > 0 ? 1 : 0;
                    return uniqueDiaryCount === 0 
                      ? '일기를 작성하면 맞춤 학습을 추천해드려요'
                      : `일기 ${uniqueDiaryCount}개를 분석했지만 추천할 학습이 없습니다.\n일기 내용에 "요리", "운동", "공부", "여행" 등의 키워드가 포함되어 있는지 확인해주세요.`;
                  })()}
                </p>
              </div>
            ) : (
              <>
                {/* 일기에서 발견한 학습 기회 */}
                <section>
                  <h2 className={`text-xl font-bold mb-4 ${styles.title}`}>
                    💡 일기에서 발견한 학습 기회
                  </h2>
                  <p className={`text-sm mb-4 ${styles.textMuted}`}>
                    최근 일기를 분석해 필요한 학습을 추천해드려요
                  </p>
                  
                  <div className="space-y-3">
                    {recommendations.recommendations.map((rec, index) => (
                      <div
                        key={rec.id}
                        onClick={() => setSelectedRecommendation(rec.id)}
                        className={`rounded-xl border-2 p-6 cursor-pointer hover:shadow-lg transition-all ${styles.card} hover:scale-[1.02]`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 flex-1">
                            <span className="text-4xl">{rec.emoji}</span>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h3 className={`text-lg font-bold ${styles.title}`}>{rec.title}</h3>
                                {index === 0 && (
                                  <span className={`text-xs px-2 py-1 rounded-full font-bold ${styles.badge}`}>
                                    NEW
                                  </span>
                                )}
                              </div>
                              <p className={`text-sm mt-1 ${styles.textMuted}`}>{rec.reason}</p>
                              <p className={`text-xs mt-1 ${styles.textMuted}`}>
                                {rec.frequency}회 언급
                              </p>
                            </div>
                          </div>
                          <svg className={`w-5 h-5 ${styles.textMuted}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* 검색 */}
                <section className={`rounded-xl border-2 p-6 ${styles.card}`}>
                  <h2 className={`text-lg font-bold mb-3 ${styles.title}`}>
                    🔍 관심 분야 직접 찾기
                  </h2>
                  <input
                    type="text"
                    placeholder="배우고 싶은 주제를 검색하세요"
                    className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none ${styles.input}`}
                  />
                </section>

                {/* 인기 주제 */}
                {recommendations.popularTopics && recommendations.popularTopics.length > 0 && (
                  <section>
                    <h2 className={`text-lg font-bold mb-3 ${styles.title}`}>
                      🔥 인기 학습 주제
                    </h2>
                    <div className="flex flex-wrap gap-2">
                      {recommendations.popularTopics.map((topic, index) => (
                        <button
                          key={index}
                          className={`px-4 py-2 rounded-full border-2 text-sm transition-colors ${styles.button} ${styles.buttonHover}`}
                        >
                          #{topic}
                        </button>
                      ))}
                    </div>
                  </section>
                )}

                {/* 카테고리 */}
                {recommendations.categories && recommendations.categories.length > 0 && (
                  <section>
                    <h2 className={`text-lg font-bold mb-3 ${styles.title}`}>
                      📂 카테고리별 탐색
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {recommendations.categories.map((category) => (
                        <div
                          key={category.id}
                          className={`rounded-xl border-2 p-6 text-center cursor-pointer hover:shadow-lg transition-all ${styles.card} hover:scale-105`}
                        >
                          <div className="text-3xl mb-2">{category.emoji}</div>
                          <p className={`text-sm font-medium ${styles.title}`}>{category.name}</p>
                          <p className={`text-xs ${styles.textMuted} mt-1`}>{category.count}개</p>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </>
            )}
          </div>
        </div>

        {/* 상세 모달 */}
        {selectedRecommendation && recommendations?.recommendations && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={() => setSelectedRecommendation(null)}
          >
            <div 
              className={`max-w-2xl w-full max-h-[90vh] overflow-y-auto rounded-2xl ${styles.card} p-6`}
              onClick={(e) => e.stopPropagation()}
            >
              {(() => {
                const rec = recommendations.recommendations.find(r => r.id === selectedRecommendation);
                if (!rec) return null;

                return (
                  <>
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <span className="text-4xl">{rec.emoji}</span>
                        <h2 className={`text-2xl font-bold ${styles.title}`}>{rec.title}</h2>
                      </div>
                      <button
                        onClick={() => setSelectedRecommendation(null)}
                        className={`p-2 rounded-lg ${styles.buttonHover}`}
                      >
                        ✕
                      </button>
                    </div>

                    {/* 추천 이유 */}
                    <section className="mb-6">
                      <h3 className={`text-lg font-bold mb-3 ${styles.title}`}>왜 이 학습을 추천했나요?</h3>
                      <div className={`p-4 rounded-lg border ${styles.border}`}>
                        <p className={`text-sm ${styles.textSecondary}`}>{rec.reason}</p>
                        {rec.relatedDiary && (
                          <p className={`text-xs ${styles.textMuted} mt-2`}>
                            관련 일기: {rec.relatedDiary}
                          </p>
                        )}
                      </div>
                    </section>

                    {/* 간단 학습 */}
                    {rec.quickLearn && (
                      <section className="mb-6">
                        <h3 className={`text-lg font-bold mb-3 ${styles.title}`}>💡 핵심 요약</h3>
                        <div className={`p-4 rounded-lg ${darkMode ? 'bg-[#1a1a1a]' : 'bg-gray-50'}`}>
                          <p className={`text-sm ${styles.textSecondary}`}>{rec.quickLearn}</p>
                        </div>
                      </section>
                    )}

                    {/* 추천 영상 */}
                    {rec.videos && rec.videos.length > 0 && (
                      <section>
                        <h3 className={`text-lg font-bold mb-3 ${styles.title}`}>📺 추천 영상</h3>
                        <div className="space-y-3">
                          {rec.videos.map((video) => (
                            <div key={video.id} className={`p-4 rounded-lg border-2 cursor-pointer hover:shadow-md transition-all ${styles.card}`}>
                              <h4 className={`font-bold ${styles.title}`}>{video.title}</h4>
                              <p className={`text-sm ${styles.textMuted} mt-1`}>⏱️ {video.duration}</p>
                            </div>
                          ))}
                        </div>
                      </section>
                    )}

                    <Button className="w-full mt-6">학습 시작하기</Button>
                  </>
                );
              })()}
            </div>
          </div>
        )}
      </div>
    );
  }

  // 나의 학습 뷰 (my-learning) - localStorage 사용
  if (pathfinderView === 'my-learning') {
    return (
      <div className={`flex-1 flex flex-col ${styles.bg}`}>
        <div className={`border-b shadow-sm p-4 ${styles.header}`}>
          <div className="max-w-4xl mx-auto flex items-center gap-4">
            <button
              onClick={() => setPathfinderView('home')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${styles.buttonHover}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className={`text-2xl font-bold ${styles.title}`}>📝 나의 학습</h1>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 md:p-6" style={{ WebkitOverflowScrolling: 'touch' }}>
          <div className="max-w-4xl mx-auto space-y-6">
            
            {/* 진행 중 */}
            <section>
              <h2 className={`text-lg font-bold mb-3 ${styles.title}`}>진행 중 (0)</h2>
              <div className={`rounded-xl border-2 p-8 ${styles.card}`}>
                <p className={`text-center ${styles.textMuted}`}>
                  진행 중인 학습이 없습니다. 학습 추천에서 새로운 학습을 시작해보세요!
                </p>
              </div>
            </section>

            {/* 완료 */}
            <section>
              <h2 className={`text-lg font-bold mb-3 ${styles.title}`}>완료 (0)</h2>
              <div className={`rounded-xl border-2 p-8 ${styles.card}`}>
                <p className={`text-center ${styles.textMuted}`}>
                  완료한 학습이 없습니다.
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    );
  }

  // Career 뷰
  if (pathfinderView === 'career') {
    return (
      <div className={`flex-1 flex flex-col ${styles.bg}`}>
        <div className={`border-b shadow-sm p-4 ${styles.header}`}>
          <div className="max-w-4xl mx-auto flex items-center gap-4">
            <button
              onClick={() => setPathfinderView('home')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${styles.buttonHover}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className={`text-2xl font-bold ${styles.title}`}>💼 커리어</h1>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 md:p-6" style={{ WebkitOverflowScrolling: 'touch' }}>
          <div className="max-w-4xl mx-auto space-y-4">
            <div className={`rounded-2xl border-2 p-8 shadow-lg ${styles.card}`}>
              <p className={`text-center py-8 ${styles.textMuted}`}>커리어 정보가 없습니다.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Roadmap 뷰
  if (pathfinderView === 'roadmap') {
    return (
      <div className={`flex-1 flex flex-col ${styles.bg}`}>
        <div className={`border-b shadow-sm p-4 ${styles.header}`}>
          <div className="max-w-4xl mx-auto flex items-center gap-4">
            <button
              onClick={() => setPathfinderView('home')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${styles.buttonHover}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className={`text-2xl font-bold ${styles.title}`}>🗺️ 로드맵</h1>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 md:p-6" style={{ WebkitOverflowScrolling: 'touch' }}>
          <div className="max-w-4xl mx-auto space-y-4">
            <div className={`rounded-2xl border-2 p-8 shadow-lg ${styles.card}`}>
              <p className={`text-center py-8 ${styles.textMuted}`}>로드맵이 없습니다.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};