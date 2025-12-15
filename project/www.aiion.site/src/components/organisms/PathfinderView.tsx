import React, { useState, useEffect } from 'react';
import { Button } from '../atoms';
import { PathfinderView as PathfinderViewType } from '../types';
import { useStore } from '../../store';
import { fetchRecommendations, ComprehensiveRecommendation, LearningRecommendation } from '../../app/hooks/usePathfinderApi';

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

  // 학습 추천 데이터 로드
  useEffect(() => {
    const loadRecommendations = async () => {
      if (user?.id && pathfinderView === 'learning') {
        try {
          setIsLoading(true);
          console.log('[PathfinderView] 사용자 ID:', user.id);
          console.log('[PathfinderView] API 호출 시작...');
          const data = await fetchRecommendations(user.id);
          console.log('[PathfinderView] API 응답 데이터:', data);
          setRecommendations(data);
        } catch (error) {
          console.error('[PathfinderView] 추천 데이터 로드 실패:', error);
          setRecommendations(null);
        } finally {
          setIsLoading(false);
        }
      } else {
        console.log('[PathfinderView] 사용자 ID 없음 또는 learning 뷰가 아님:', {
          userId: user?.id,
          pathfinderView
        });
      }
    };

    loadRecommendations();
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

            <div className={`rounded-2xl border-2 p-8 shadow-lg ${styles.card}`}>
              <h2 className={`text-2xl font-bold mb-4 text-center border-b-2 pb-3 ${styles.title} ${styles.border}`}>
                📊 종합 학습 분석
              </h2>
              <div className={`leading-relaxed text-sm ${styles.title}`}>
                <p className={`text-center py-4 ${styles.textMuted}`}>
                  아직 기록된 학습 데이터가 없습니다. 첫 학습을 시작해보세요!
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <Button
                onClick={() => setPathfinderView('learning')}
                className={`rounded-2xl border-2 p-12 hover:shadow-lg hover:scale-105 transition-all ${styles.button}`}
              >
                <div className="flex flex-col items-center space-y-3">
                  <span className="text-4xl">📚</span>
                  <p className={`text-xl font-bold ${styles.title}`}>학습</p>
                </div>
              </Button>
              <Button
                onClick={() => setPathfinderView('new-learning')}
                className={`rounded-2xl border-2 p-12 hover:shadow-lg hover:scale-105 transition-all ${styles.button}`}
              >
                <div className="flex flex-col items-center space-y-3">
                  <span className="text-4xl">✨</span>
                  <p className={`text-xl font-bold ${styles.title}`}>새 학습</p>
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

  // Learning 뷰
  if (pathfinderView === 'learning') {
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
            <h1 className={`text-2xl font-bold ${styles.title}`}>학습</h1>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 md:p-6" style={{ WebkitOverflowScrolling: 'touch' }}>
          <div className="max-w-4xl mx-auto space-y-4">
            {isLoading ? (
              <div className={`rounded-2xl border-2 p-8 shadow-lg ${styles.card}`}>
                <p className={`text-center py-8 ${styles.textMuted}`}>로딩 중...</p>
              </div>
            ) : recommendations && recommendations.recommendations && recommendations.recommendations.length > 0 ? (
              <>
                {/* 통계 정보 */}
                {recommendations.stats && (
                  <div className={`rounded-2xl border-2 p-6 shadow-lg ${styles.card}`}>
                    <h3 className={`text-xl font-bold mb-4 ${styles.title}`}>📊 학습 통계</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center">
                        <p className={`text-2xl font-bold ${styles.title}`}>{recommendations.stats.discovered}</p>
                        <p className={`text-sm ${styles.textMuted}`}>발견한 학습</p>
                      </div>
                      <div className="text-center">
                        <p className={`text-2xl font-bold ${styles.title}`}>{recommendations.stats.inProgress}</p>
                        <p className={`text-sm ${styles.textMuted}`}>진행 중</p>
                      </div>
                      <div className="text-center">
                        <p className={`text-2xl font-bold ${styles.title}`}>{recommendations.stats.completed}</p>
                        <p className={`text-sm ${styles.textMuted}`}>완료</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 학습 추천 목록 */}
                <div className={`rounded-2xl border-2 p-6 shadow-lg ${styles.card}`}>
                  <h3 className={`text-xl font-bold mb-4 ${styles.title}`}>📚 추천 학습 주제</h3>
                  <div className="space-y-4">
                    {recommendations.recommendations.map((rec: LearningRecommendation) => (
                      <div key={rec.id} className={`p-4 rounded-lg border ${styles.border}`}>
                        <div className="flex items-start gap-3">
                          <span className="text-2xl">{rec.emoji}</span>
                          <div className="flex-1">
                            <h4 className={`text-lg font-bold ${styles.title}`}>{rec.title}</h4>
                            <p className={`text-sm ${styles.textMuted} mt-1`}>{rec.category}</p>
                            {rec.reason && (
                              <p className={`text-sm ${styles.textSecondary} mt-2`}>{rec.reason}</p>
                            )}
                            {rec.quickLearn && (
                              <p className={`text-xs ${styles.textMuted} mt-2`}>💡 {rec.quickLearn}</p>
                            )}
                          </div>
                          <span className={`text-sm ${styles.textMuted}`}>{rec.frequency}회</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 인기 주제 */}
                {recommendations.popularTopics && recommendations.popularTopics.length > 0 && (
                  <div className={`rounded-2xl border-2 p-6 shadow-lg ${styles.card}`}>
                    <h3 className={`text-xl font-bold mb-4 ${styles.title}`}>🔥 인기 학습 주제</h3>
                    <div className="flex flex-wrap gap-2">
                      {recommendations.popularTopics.map((topic, index) => (
                        <span
                          key={index}
                          className={`px-3 py-1 rounded-full text-sm ${styles.button} ${styles.textSecondary}`}
                        >
                          {topic}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className={`rounded-2xl border-2 p-8 shadow-lg ${styles.card}`}>
                <p className={`text-center py-8 ${styles.textMuted}`}>학습 목록이 없습니다.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // New-learning 뷰
  if (pathfinderView === 'new-learning') {
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
            <h1 className={`text-2xl font-bold ${styles.title}`}>새 학습 시작</h1>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 md:p-6" style={{ WebkitOverflowScrolling: 'touch' }}>
          <div className="max-w-4xl mx-auto space-y-4">
            <div className={`rounded-2xl border-2 p-8 shadow-lg ${styles.card}`}>
              <div className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${styles.textSecondary}`}>
                    학습 주제
                  </label>
                  <input
                    type="text"
                    placeholder="학습하고 싶은 주제를 입력하세요"
                    className={`w-full px-4 py-2 border-2 rounded-lg focus:outline-none ${styles.input}`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-2 ${styles.textSecondary}`}>
                    목표
                  </label>
                  <textarea
                    placeholder="학습 목표를 입력하세요"
                    rows={5}
                    className={`w-full px-4 py-2 border-2 rounded-lg focus:outline-none resize-none ${styles.input}`}
                  />
                </div>
                <Button className="w-full">학습 시작하기</Button>
              </div>
            </div>
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
            <h1 className={`text-2xl font-bold ${styles.title}`}>커리어</h1>
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
            <h1 className={`text-2xl font-bold ${styles.title}`}>로드맵</h1>
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
