import React, { useState } from 'react';
import { Button } from '../atoms';
import { CultureView as CultureViewType } from '../types';

interface CultureViewProps {
  cultureView: CultureViewType;
  setCultureView: (view: CultureViewType) => void;
  darkMode?: boolean;
}

const getCommonStyles = (darkMode: boolean) => ({
  bg: darkMode ? 'bg-[#0a0a0a]' : 'bg-[#e8e2d5]',
  bgSecondary: darkMode ? 'bg-[#121212]' : 'bg-[#f5f1e8]',
  header: darkMode ? 'bg-[#121212] border-[#2a2a2a]' : 'bg-white border-[#d4c4a8]',
  card: darkMode ? 'bg-[#121212] border-[#2a2a2a]' : 'bg-white border-[#8B7355]',
  title: darkMode ? 'text-white' : 'text-gray-900',
  textMuted: darkMode ? 'text-gray-400' : 'text-gray-500',
  border: darkMode ? 'border-[#2a2a2a]' : 'border-[#d4c4a8]',
  button: darkMode ? 'bg-gradient-to-br from-[#1a1a1a] to-[#121212] border-[#2a2a2a]' : 'bg-gradient-to-br from-white to-[#f5f0e8] border-[#8B7355]',
  buttonHover: darkMode ? 'text-gray-300 hover:text-white hover:bg-[#1a1a1a]' : 'text-gray-600 hover:text-gray-900 hover:bg-[#f5f1e8]',
});

export const CultureView: React.FC<CultureViewProps> = ({
  cultureView,
  setCultureView,
  darkMode = false,
}) => {
  const [selectedWishCategory, setSelectedWishCategory] = useState<'travel' | 'movie' | 'performance'>('travel');
  const [favorites, setFavorites] = useState<Set<number>>(new Set([1])); // 여행 추천 좋아요 상태
  const [movieFavorites, setMovieFavorites] = useState<Set<number>>(new Set([1])); // 영화 추천 좋아요 상태
  const [performanceFavorites, setPerformanceFavorites] = useState<Set<number>>(new Set([1])); // 공연 추천 좋아요 상태
  const [expandedRecords, setExpandedRecords] = useState<Set<number>>(new Set()); // 각 기록별 접기/열기 상태
  const styles = getCommonStyles(darkMode);

  // Home 뷰
  if (cultureView === 'home') {
    return (
      <div className={`flex-1 flex flex-col ${styles.bg}`}>
        <div className="flex-1 overflow-y-auto p-4 md:p-6" style={{ WebkitOverflowScrolling: 'touch' }}>
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="text-center py-4">
              <h1 className={`text-3xl font-bold ${styles.title}`}>문화 생활</h1>
            </div>

            <div className={`rounded-2xl border-2 p-8 shadow-lg ${styles.card}`}>
              <h2 className={`text-2xl font-bold mb-4 text-center border-b-2 pb-3 ${styles.title} ${styles.border}`}>
                📊 종합 문화 분석
              </h2>
              <div className={`leading-relaxed text-sm ${styles.title}`}>
                <p className={`text-center py-4 ${styles.textMuted}`}>
                  아직 기록된 문화 활동이 없습니다. 첫 문화 활동을 기록해보세요!
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <Button
                onClick={() => setCultureView('travel')}
                className={`rounded-2xl border-2 p-12 hover:shadow-lg hover:scale-105 transition-all ${styles.button}`}
              >
                <div className="flex flex-col items-center space-y-3">
                  <span className="text-4xl">✈️</span>
                  <p className={`text-xl font-bold ${styles.title}`}>여행</p>
                </div>
              </Button>
              <Button
                onClick={() => setCultureView('movie')}
                className={`rounded-2xl border-2 p-12 hover:shadow-lg hover:scale-105 transition-all ${styles.button}`}
              >
                <div className="flex flex-col items-center space-y-3">
                  <span className="text-4xl">🎬</span>
                  <p className={`text-xl font-bold ${styles.title}`}>영화</p>
                </div>
              </Button>
              <Button
                onClick={() => setCultureView('performance')}
                className={`rounded-2xl border-2 p-12 hover:shadow-lg hover:scale-105 transition-all ${styles.button}`}
              >
                <div className="flex flex-col items-center space-y-3">
                  <span className="text-4xl">🎭</span>
                  <p className={`text-xl font-bold ${styles.title}`}>공연</p>
                </div>
              </Button>
              <Button
                onClick={() => setCultureView('records')}
                className={`rounded-2xl border-2 p-12 hover:shadow-lg hover:scale-105 transition-all ${styles.button}`}
              >
                <div className="flex flex-col items-center space-y-3">
                  <span className="text-4xl">📝</span>
                  <p className={`text-xl font-bold ${styles.title}`}>기록</p>
                </div>
              </Button>
            </div>
            <Button
              onClick={() => setCultureView('wishlist')}
              className={`w-full rounded-2xl border-2 p-8 hover:shadow-lg hover:scale-105 transition-all ${styles.button}`}
            >
              <div className="flex flex-col items-center space-y-2">
                <span className="text-3xl">⭐</span>
                <p className={`text-lg font-bold ${styles.title}`}>위시리스트</p>
              </div>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Travel 뷰
  if (cultureView === 'travel') {
    const travelRecommendations = [
      {
        id: 1,
        name: '안면도',
        location: '충남 태안',
        fullName: '1 안면도_충남 태안',
      },
      {
        id: 2,
        name: '대부도',
        location: '경기 안산',
        fullName: '2 대부도_경기 안산',
      },
      {
        id: 3,
        name: '남해',
        location: '경남 남해군',
        fullName: '3 남해_경남 남해군',
      },
      {
        id: 4,
        name: '강화도',
        location: '인천 강화군',
        fullName: '4 강화도_인천 강화군',
      },
    ];

    const toggleFavorite = (id: number) => {
      setFavorites((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(id)) {
          newSet.delete(id);
        } else {
          newSet.add(id);
        }
        return newSet;
      });
    };

    return (
      <div className={`flex-1 flex flex-col overflow-hidden ${styles.bg}`}>
        <div className={`border-b shadow-sm p-4 ${styles.header}`}>
          <div className="max-w-4xl mx-auto flex items-center gap-4">
            <button
              onClick={() => setCultureView('home')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${styles.buttonHover}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className={`text-2xl font-bold ${styles.title}`}>여행</h1>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 md:p-6" style={{ WebkitOverflowScrolling: 'touch' }}>
          <div className="max-w-4xl mx-auto space-y-6">
            {/* 추천 리스트 섹션 */}
            <div className="space-y-4">
              <h2 className={`text-2xl font-bold text-center ${styles.title}`}>추천 리스트</h2>
              <p className={`text-center ${styles.textMuted} text-base`}>
                제부도처럼 힐링과 산책을 즐길 수 있는 바다 여행지로 추천 해드렸어요!
              </p>
              
              {/* 여행지 추천 카드들 */}
              <div className="space-y-3">
                {travelRecommendations.map((item) => {
                  const isFavorite = favorites.has(item.id);
                  return (
                    <div
                      key={item.id}
                      className={`rounded-xl border p-4 ${styles.card} transition-all hover:shadow-md`}
                    >
                      <div className="flex items-start gap-4">
                        {/* 이미지 영역 */}
                        <div className={`w-24 h-24 rounded-lg border flex items-center justify-center ${styles.bgSecondary} ${styles.border} flex-shrink-0`}>
                          <span className={`text-sm ${styles.textMuted}`}>이미지</span>
                        </div>
                        
                        {/* 정보 영역 */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className={`font-semibold text-lg ${styles.title}`}>
                              {item.fullName}
                            </h3>
                            <button
                              onClick={() => toggleFavorite(item.id)}
                              className="flex-shrink-0 ml-2 focus:outline-none"
                              aria-label={isFavorite ? '좋아요 취소' : '좋아요'}
                            >
                              {isFavorite ? (
                                <svg
                                  className="w-6 h-6 fill-red-500"
                                  viewBox="0 0 24 24"
                                  fill="currentColor"
                                >
                                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                                </svg>
                              ) : (
                                <svg
                                  className="w-6 h-6 stroke-gray-400 fill-none"
                                  viewBox="0 0 24 24"
                                  strokeWidth={2}
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                                  />
                                </svg>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Movie 뷰
  if (cultureView === 'movie') {
    const movieRecommendations = [
      {
        id: 1,
        name: '기생충',
        fullName: '1 기생충',
      },
      {
        id: 2,
        name: '올드보이',
        fullName: '2 올드보이',
      },
      {
        id: 3,
        name: '신과함께',
        fullName: '3 신과함께',
      },
      {
        id: 4,
        name: '극한직업',
        fullName: '4 극한직업',
      },
    ];

    const toggleMovieFavorite = (id: number) => {
      setMovieFavorites((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(id)) {
          newSet.delete(id);
        } else {
          newSet.add(id);
        }
        return newSet;
      });
    };

    return (
      <div className={`flex-1 flex flex-col overflow-hidden ${styles.bg}`}>
        <div className={`border-b shadow-sm p-4 ${styles.header}`}>
          <div className="max-w-4xl mx-auto flex items-center gap-4">
            <button
              onClick={() => setCultureView('home')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${styles.buttonHover}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className={`text-2xl font-bold ${styles.title}`}>영화</h1>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 md:p-6" style={{ WebkitOverflowScrolling: 'touch' }}>
          <div className="max-w-4xl mx-auto space-y-6">
            {/* 추천 리스트 섹션 */}
            <div className="space-y-4">
              <h2 className={`text-2xl font-bold text-center ${styles.title}`}>추천 리스트</h2>
              <p className={`text-center ${styles.textMuted} text-base`}>
                당신의 취향에 맞는 한국 영화를 추천 해드렸어요!
              </p>
              
              {/* 영화 추천 카드들 */}
              <div className="space-y-3">
                {movieRecommendations.map((item) => {
                  const isFavorite = movieFavorites.has(item.id);
                  return (
                    <div
                      key={item.id}
                      className={`rounded-xl border p-4 ${styles.card} transition-all hover:shadow-md`}
                    >
                      <div className="flex items-start gap-4">
                        {/* 이미지 영역 */}
                        <div className={`w-24 h-24 rounded-lg border flex items-center justify-center ${styles.bgSecondary} ${styles.border} flex-shrink-0`}>
                          <span className={`text-sm ${styles.textMuted}`}>이미지</span>
                        </div>
                        
                        {/* 정보 영역 */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className={`font-semibold text-lg ${styles.title}`}>
                              {item.fullName}
                            </h3>
                            <button
                              onClick={() => toggleMovieFavorite(item.id)}
                              className="flex-shrink-0 ml-2 focus:outline-none"
                              aria-label={isFavorite ? '좋아요 취소' : '좋아요'}
                            >
                              {isFavorite ? (
                                <svg
                                  className="w-6 h-6 fill-red-500"
                                  viewBox="0 0 24 24"
                                  fill="currentColor"
                                >
                                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                                </svg>
                              ) : (
                                <svg
                                  className="w-6 h-6 stroke-gray-400 fill-none"
                                  viewBox="0 0 24 24"
                                  strokeWidth={2}
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                                  />
                                </svg>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Performance 뷰
  if (cultureView === 'performance') {
    const performanceRecommendations = [
      {
        id: 1,
        name: '캣츠',
        fullName: '1 캣츠',
      },
      {
        id: 2,
        name: '레미제라블',
        fullName: '2 레미제라블',
      },
      {
        id: 3,
        name: '맘마미아',
        fullName: '3 맘마미아',
      },
      {
        id: 4,
        name: '위키드',
        fullName: '4 위키드',
      },
    ];

    const togglePerformanceFavorite = (id: number) => {
      setPerformanceFavorites((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(id)) {
          newSet.delete(id);
        } else {
          newSet.add(id);
        }
        return newSet;
      });
    };

    return (
      <div className={`flex-1 flex flex-col overflow-hidden ${styles.bg}`}>
        <div className={`border-b shadow-sm p-4 ${styles.header}`}>
          <div className="max-w-4xl mx-auto flex items-center gap-4">
            <button
              onClick={() => setCultureView('home')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${styles.buttonHover}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className={`text-2xl font-bold ${styles.title}`}>공연</h1>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 md:p-6" style={{ WebkitOverflowScrolling: 'touch' }}>
          <div className="max-w-4xl mx-auto space-y-6">
            {/* 추천 리스트 섹션 */}
            <div className="space-y-4">
              <h2 className={`text-2xl font-bold text-center ${styles.title}`}>추천 리스트</h2>
              <p className={`text-center ${styles.textMuted} text-base`}>
                당신의 취향에 맞는 뮤지컬과 공연을 추천 해드렸어요!
              </p>
              
              {/* 공연 추천 카드들 */}
              <div className="space-y-3">
                {performanceRecommendations.map((item) => {
                  const isFavorite = performanceFavorites.has(item.id);
                  return (
                    <div
                      key={item.id}
                      className={`rounded-xl border p-4 ${styles.card} transition-all hover:shadow-md`}
                    >
                      <div className="flex items-start gap-4">
                        {/* 이미지 영역 */}
                        <div className={`w-24 h-24 rounded-lg border flex items-center justify-center ${styles.bgSecondary} ${styles.border} flex-shrink-0`}>
                          <span className={`text-sm ${styles.textMuted}`}>이미지</span>
                        </div>
                        
                        {/* 정보 영역 */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className={`font-semibold text-lg ${styles.title}`}>
                              {item.fullName}
                            </h3>
                            <button
                              onClick={() => togglePerformanceFavorite(item.id)}
                              className="flex-shrink-0 ml-2 focus:outline-none"
                              aria-label={isFavorite ? '좋아요 취소' : '좋아요'}
                            >
                              {isFavorite ? (
                                <svg
                                  className="w-6 h-6 fill-red-500"
                                  viewBox="0 0 24 24"
                                  fill="currentColor"
                                >
                                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                                </svg>
                              ) : (
                                <svg
                                  className="w-6 h-6 stroke-gray-400 fill-none"
                                  viewBox="0 0 24 24"
                                  strokeWidth={2}
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                                  />
                                </svg>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Records 뷰
  if (cultureView === 'records') {
    // 샘플 데이터 (실제로는 API에서 가져올 데이터)
    const cultureRecords = [
      {
        id: 1,
        text: '심야 영화로 8번 출구를 봤다. 스릴러라 무서울지 알았는데 괜찮았다.',
        date: '2025-11-19',
        dayOfWeek: '수',
        type: 'movie',
        icon: '💬', // 말풍선 아이콘
      },
      {
        id: 2,
        text: '퇴근 후 남자친구와 연극을 봤다. 오마이갓이라는 공포 연극이었는데, 실제 공포 장르 연극은 처음이라 재밌었다.',
        date: '2025-11-17',
        dayOfWeek: '월',
        type: 'performance',
        icon: '☀️', // 태양 아이콘
      },
      {
        id: 3,
        text: '오늘은 친구들과 함께 제부도로 여행을 갔다. 바베큐장이 있는 숙소',
        date: '2025-11-16',
        dayOfWeek: '일',
        type: 'travel',
        icon: '💬', // 말풍선 아이콘
      },
    ];

    // 각 기록별 맞춤 추천 리스트
    const getRecommendationsByRecord = (recordId: number) => {
      switch (recordId) {
        case 1: // 영화 기록
          return [
            {
              id: 1,
              name: '기생충',
              fullName: '1 기생충',
            },
            {
              id: 2,
              name: '올드보이',
              fullName: '2 올드보이',
            },
            {
              id: 3,
              name: '신과함께',
              fullName: '3 신과함께',
            },
          ];
        case 2: // 공연 기록
          return [
            {
              id: 1,
              name: '캣츠',
              fullName: '1 캣츠',
            },
            {
              id: 2,
              name: '레미제라블',
              fullName: '2 레미제라블',
            },
            {
              id: 3,
              name: '맘마미아',
              fullName: '3 맘마미아',
            },
          ];
        case 3: // 여행 기록
          return [
            {
              id: 1,
              name: '안면도',
              location: '충남 태안',
              fullName: '1 안면도 충남 태안',
            },
            {
              id: 2,
              name: '대부도',
              location: '경기 안산',
              fullName: '2 대부도 경기 안산',
            },
            {
              id: 3,
              name: '남해',
              location: '경남 남해군',
              fullName: '3 남해 경남 남해군',
            },
          ];
        default:
          return [];
      }
    };

    const toggleRecordExpansion = (recordId: number) => {
      setExpandedRecords((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(recordId)) {
          newSet.delete(recordId);
        } else {
          newSet.add(recordId);
        }
        return newSet;
      });
    };

    const formatDate = (date: string, dayOfWeek: string) => {
      return `${date}-${dayOfWeek}`;
    };

    return (
      <div className={`flex-1 flex flex-col overflow-hidden ${styles.bg}`}>
        <div className={`border-b shadow-sm p-4 ${styles.header}`}>
          <div className="max-w-4xl mx-auto flex items-center gap-4">
            <button
              onClick={() => setCultureView('home')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${styles.buttonHover}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className={`text-2xl font-bold ${styles.title}`}>문화 기록</h1>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 md:p-6" style={{ WebkitOverflowScrolling: 'touch' }}>
          <div className="max-w-4xl mx-auto space-y-6">
            {/* 데이터 리스트 섹션 */}
            <div className="space-y-4">
              <h2 className={`text-xl font-bold ${styles.title} mb-4`}>데이터 리스트</h2>
              
              {cultureRecords.length === 0 ? (
                <div className={`rounded-2xl border-2 p-8 shadow-lg ${styles.card}`}>
                  <p className={`text-center py-8 ${styles.textMuted}`}>기록이 없습니다.</p>
                </div>
              ) : (
                <div className={`rounded-2xl border-2 p-6 shadow-lg ${styles.card}`}>
                  <div className="space-y-0">
                    {cultureRecords.map((record, index) => {
                      const isExpanded = expandedRecords.has(record.id);
                      const recommendations = getRecommendationsByRecord(record.id);
                      
                      return (
                        <div key={record.id}>
                          <div className="py-4">
                            <p className={`${styles.title} mb-2 leading-relaxed`}>{record.text}</p>
                            <div className="flex items-center justify-between">
                              <span className={`text-sm ${styles.textMuted}`}>
                                {formatDate(record.date, record.dayOfWeek)}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-lg">{record.icon}</span>
                                <button
                                  onClick={() => toggleRecordExpansion(record.id)}
                                  className="focus:outline-none"
                                  aria-label={isExpanded ? '추천 리스트 접기' : '추천 리스트 열기'}
                                >
                                  {isExpanded ? (
                                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                    </svg>
                                  ) : (
                                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                          
                          {/* 각 기록별 맞춤 추천 리스트 */}
                          {isExpanded && recommendations.length > 0 && (
                            <div className="mt-4 mb-4 pb-4 border-t pt-4">
                              <p className={`text-center ${styles.textMuted} text-sm mb-4`}>
                                일기 내용을 적용한 맞춤 추천 리스트예요!
                              </p>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {recommendations.map((item) => (
                                  <div
                                    key={item.id}
                                    className={`rounded-xl border p-4 ${styles.card} transition-all hover:shadow-md`}
                                  >
                                    <div className="flex flex-col items-center space-y-3">
                                      <h3 className={`font-semibold text-base text-center ${styles.title}`}>
                                        {item.fullName}
                                      </h3>
                                      <div className={`w-full h-32 rounded-lg border flex items-center justify-center ${styles.bgSecondary} ${styles.border}`}>
                                        <span className={`text-sm ${styles.textMuted}`}>이미지</span>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {index < cultureRecords.length - 1 && (
                            <div className={`border-t ${styles.border}`} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    );
  }

  // Wishlist 뷰
  if (cultureView === 'wishlist') {
    // 각 카테고리별 추천 리스트 데이터
    const travelRecommendations = [
      {
        id: 1,
        name: '안면도',
        location: '충남 태안',
        fullName: '1 안면도_충남 태안',
      },
      {
        id: 2,
        name: '대부도',
        location: '경기 안산',
        fullName: '2 대부도_경기 안산',
      },
      {
        id: 3,
        name: '남해',
        location: '경남 남해군',
        fullName: '3 남해_경남 남해군',
      },
      {
        id: 4,
        name: '강화도',
        location: '인천 강화군',
        fullName: '4 강화도_인천 강화군',
      },
    ];

    const movieRecommendations = [
      {
        id: 1,
        name: '기생충',
        fullName: '1 기생충',
      },
      {
        id: 2,
        name: '올드보이',
        fullName: '2 올드보이',
      },
      {
        id: 3,
        name: '신과함께',
        fullName: '3 신과함께',
      },
      {
        id: 4,
        name: '극한직업',
        fullName: '4 극한직업',
      },
    ];

    const performanceRecommendations = [
      {
        id: 1,
        name: '캣츠',
        fullName: '1 캣츠',
      },
      {
        id: 2,
        name: '레미제라블',
        fullName: '2 레미제라블',
      },
      {
        id: 3,
        name: '맘마미아',
        fullName: '3 맘마미아',
      },
      {
        id: 4,
        name: '위키드',
        fullName: '4 위키드',
      },
    ];

    // 선택된 카테고리별로 좋아요가 눌린 항목들 필터링
    const getWishlistItems = () => {
      switch (selectedWishCategory) {
        case 'travel':
          return travelRecommendations.filter((item) => favorites.has(item.id));
        case 'movie':
          return movieRecommendations.filter((item) => movieFavorites.has(item.id));
        case 'performance':
          return performanceRecommendations.filter((item) => performanceFavorites.has(item.id));
        default:
          return [];
      }
    };

    const wishlistItems = getWishlistItems();

    return (
      <div className={`flex-1 flex flex-col overflow-hidden ${styles.bg}`}>
        <div className={`border-b shadow-sm p-4 ${styles.header}`}>
          <div className="max-w-4xl mx-auto flex items-center gap-4">
            <button
              onClick={() => setCultureView('home')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${styles.buttonHover}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className={`text-2xl font-bold ${styles.title}`}>위시리스트</h1>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 md:p-6" style={{ WebkitOverflowScrolling: 'touch' }}>
          <div className="max-w-4xl mx-auto space-y-4">
            <div className={`rounded-2xl border-2 p-8 shadow-lg ${styles.card}`}>
              <div className="mb-4">
                <div className="flex gap-2">
                  {(['travel', 'movie', 'performance'] as const).map((category) => (
                    <button
                      key={category}
                      onClick={() => setSelectedWishCategory(category)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        selectedWishCategory === category
                          ? darkMode
                            ? 'bg-[#8B7355] text-white'
                            : 'bg-[#8B7355] text-white'
                          : darkMode
                          ? 'bg-transparent text-gray-400 hover:text-white'
                          : 'bg-transparent text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      {category === 'travel' ? '여행' : category === 'movie' ? '영화' : '공연'}
                    </button>
                  ))}
                </div>
              </div>
              
              {wishlistItems.length === 0 ? (
                <p className={`text-center py-8 ${styles.textMuted}`}>위시리스트가 비어있습니다.</p>
              ) : (
                <div className="space-y-3">
                  {wishlistItems.map((item) => (
                    <div
                      key={item.id}
                      className={`rounded-xl border p-4 ${styles.card} transition-all hover:shadow-md`}
                    >
                      <div className="flex items-start gap-4">
                        {/* 이미지 영역 */}
                        <div className={`w-24 h-24 rounded-lg border flex items-center justify-center ${styles.bgSecondary} ${styles.border} flex-shrink-0`}>
                          <span className={`text-sm ${styles.textMuted}`}>이미지</span>
                        </div>
                        
                        {/* 정보 영역 */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className={`font-semibold text-lg ${styles.title}`}>
                              {item.fullName}
                            </h3>
                            <button
                              className="flex-shrink-0 ml-2 focus:outline-none"
                              aria-label="위시리스트에 추가됨"
                            >
                              <svg
                                className="w-6 h-6 fill-red-500"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                              >
                                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
