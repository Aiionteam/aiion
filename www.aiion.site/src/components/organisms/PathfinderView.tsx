import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '../atoms';
import { PathfinderView as PathfinderViewType } from '../types';
import { useStore } from '../../store';
import { 
  fetchRecommendations, 
  ComprehensiveRecommendation, 
  AptitudeRecommendation, 
  generateDummyAptitudeData, 
  generateDummyMyAptitudeData, 
  MyAptitudeItem,
  generateDummyCareerData,
  CareerRecommendation,
  generateDummyRoadmapData,
  CareerRoadmap
} from '../../app/hooks/usePathfinderApi';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedAptitude, setSelectedAptitude] = useState<AptitudeRecommendation | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [myAptitudes, setMyAptitudes] = useState<{ inProgress: MyAptitudeItem[]; completed: MyAptitudeItem[] } | null>(null);
  const [careers, setCareers] = useState<CareerRecommendation[]>([]);
  const [selectedCareer, setSelectedCareer] = useState<string | null>(null);
  const [roadmap, setRoadmap] = useState<CareerRoadmap | null>(null);
  const [selectedCareerDetail, setSelectedCareerDetail] = useState<CareerRecommendation | null>(null);
  const [selectedPhaseDetail, setSelectedPhaseDetail] = useState<{ phase: any; careerName: string } | null>(null);

  // 적성 추천 데이터 로드 (더미 데이터 사용)
  useEffect(() => {
    if (pathfinderView === 'learning') {
      setIsLoading(true);
      setTimeout(() => {
        const dummyData = generateDummyAptitudeData();
        setRecommendations(dummyData);
        setIsLoading(false);
      }, 500);
    } else if (pathfinderView === 'my-aptitude') {
      setIsLoading(true);
      setTimeout(() => {
        const dummyMyAptitudes = generateDummyMyAptitudeData();
        setMyAptitudes(dummyMyAptitudes);
        setIsLoading(false);
      }, 500);
    } else if (pathfinderView === 'career') {
      setIsLoading(true);
      setTimeout(() => {
        const dummyCareers = generateDummyCareerData();
        setCareers(dummyCareers);
        setIsLoading(false);
      }, 500);
    } else if (pathfinderView === 'roadmap') {
          setIsLoading(true);
      setTimeout(() => {
        const careerId = selectedCareer || '1';
        const dummyRoadmap = generateDummyRoadmapData(careerId);
        setRoadmap(dummyRoadmap);
        setIsLoading(false);
      }, 500);
    } else {
          setRecommendations(null);
      setMyAptitudes(null);
      setCareers([]);
      setRoadmap(null);
      setSearchQuery('');
      setSelectedCategory(null);
      setSelectedCareer(null);
    }
  }, [pathfinderView, selectedCareer]);

  // 필터링된 적성 추천
  const filteredRecommendations = useMemo(() => {
    if (!recommendations?.recommendations) return [];
    
    let filtered = recommendations.recommendations;
    
    // 검색어 필터
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(apt => 
        apt.tagName.toLowerCase().includes(query) ||
        apt.category.toLowerCase().includes(query) ||
        apt.discoveryReason.toLowerCase().includes(query)
      );
    }
    
    // 카테고리 필터
    if (selectedCategory) {
      filtered = filtered.filter(apt => apt.category === selectedCategory);
    }
    
    return filtered;
  }, [recommendations, searchQuery, selectedCategory]);

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
                📊 당신의 성향 분석
              </h2>
              <div className={`leading-relaxed text-sm ${styles.title}`}>
                <p className={`text-center py-4 ${styles.textMuted}`}>
                  일기를 작성하면 당신의 숨겨진 적성을 발견할 수 있습니다.
                </p>
                {/* 통계 카드 (더미 데이터) */}
                <div className="grid grid-cols-3 gap-4 mt-6">
                  <div className="text-center">
                    <p className={`text-2xl font-bold ${styles.title}`}>5</p>
                    <p className={`text-sm ${styles.textMuted}`}>발견한 적성</p>
                  </div>
                  <div className="text-center">
                    <p className={`text-2xl font-bold ${styles.title}`}>2</p>
                    <p className={`text-sm ${styles.textMuted}`}>강한 적성</p>
                  </div>
                  <div className="text-center">
                    <p className={`text-2xl font-bold ${styles.title}`}>3</p>
                    <p className={`text-sm ${styles.textMuted}`}>약한 적성</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <Button
                onClick={() => setPathfinderView('learning')}
                className={`relative rounded-2xl border-2 p-12 hover:shadow-lg hover:scale-105 transition-all ${styles.button}`}
              >
                <div className="flex flex-col items-center space-y-3">
                  <span className="text-4xl">💎</span>
                  <p className={`text-xl font-bold ${styles.title}`}>적성 추천</p>
                </div>
                <span className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full font-bold">NEW</span>
              </Button>
              <Button
                onClick={() => setPathfinderView('my-aptitude')}
                className={`rounded-2xl border-2 p-12 hover:shadow-lg hover:scale-105 transition-all ${styles.button}`}
              >
                <div className="flex flex-col items-center space-y-3">
                  <span className="text-4xl">📋</span>
                  <p className={`text-xl font-bold ${styles.title}`}>나의 적성</p>
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
            <h1 className={`text-2xl font-bold ${styles.title}`}>적성 추천</h1>
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
                    <h3 className={`text-xl font-bold mb-4 ${styles.title}`}>📊 적성 통계</h3>
                    <div className="grid grid-cols-4 gap-4">
                      <div className="text-center">
                        <p className={`text-2xl font-bold ${styles.title}`}>{recommendations.stats.discovered}</p>
                        <p className={`text-sm ${styles.textMuted}`}>발견한 적성</p>
                      </div>
                      <div className="text-center">
                        <p className={`text-2xl font-bold text-green-500`}>{recommendations.stats.strong}</p>
                        <p className={`text-sm ${styles.textMuted}`}>강한 적성</p>
                      </div>
                      <div className="text-center">
                        <p className={`text-2xl font-bold text-yellow-500`}>{recommendations.stats.moderate}</p>
                        <p className={`text-sm ${styles.textMuted}`}>보통 적성</p>
                      </div>
                      <div className="text-center">
                        <p className={`text-2xl font-bold text-gray-500`}>{recommendations.stats.weak}</p>
                        <p className={`text-sm ${styles.textMuted}`}>약한 적성</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 검색 입력 */}
                <div className={`rounded-2xl border-2 p-4 shadow-lg ${styles.card}`}>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="관심 분야를 검색하세요 (예: 공감, 돌봄, 분석)"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className={`w-full px-4 py-3 pr-10 border-2 rounded-lg focus:outline-none ${styles.input}`}
                    />
                    <svg className="absolute right-4 top-3.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>

                {/* 일기에서 발견한 적성 */}
                <div className={`rounded-2xl border-2 p-6 shadow-lg ${styles.card}`}>
                  <h3 className={`text-xl font-bold mb-4 ${styles.title}`}>💎 일기에서 발견한 적성</h3>
                  {filteredRecommendations.length > 0 ? (
                  <div className="space-y-4">
                      {filteredRecommendations.map((apt: AptitudeRecommendation) => (
                        <div
                          key={apt.id}
                          onClick={() => {
                            setSelectedAptitude(apt);
                            setShowModal(true);
                          }}
                          className={`p-4 rounded-lg border-2 cursor-pointer hover:shadow-md transition-all ${styles.border} ${
                            apt.strength === 'strong' ? 'border-green-500' :
                            apt.strength === 'moderate' ? 'border-yellow-500' :
                            'border-gray-400'
                          }`}
                        >
                        <div className="flex items-start gap-3">
                            <span className="text-3xl">{apt.emoji}</span>
                          <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className={`text-lg font-bold ${styles.title}`}>{apt.tagName}</h4>
                                <span className={`text-xs px-2 py-1 rounded-full ${
                                  apt.strength === 'strong' ? 'bg-green-100 text-green-700' :
                                  apt.strength === 'moderate' ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                  {apt.strength === 'strong' ? '강함' :
                                   apt.strength === 'moderate' ? '보통' : '약함'}
                                </span>
                                <span className={`text-sm font-semibold ${styles.textMuted}`}>
                                  {Math.round(apt.score * 100)}%
                                </span>
                              </div>
                              <p className={`text-xs ${styles.textMuted} mb-1`}>{apt.category}</p>
                              <p className={`text-sm ${styles.textSecondary} mt-2 line-clamp-2`}>
                                {apt.discoveryReason}
                              </p>
                              {apt.relatedDiaryDates.length > 0 && (
                                <p className={`text-xs ${styles.textMuted} mt-2`}>
                                  관련 일기: {apt.relatedDiaryDates.slice(0, 2).join(', ')}
                                  {apt.relatedDiaryDates.length > 2 && ` 외 ${apt.relatedDiaryDates.length - 2}개`}
                                </p>
                            )}
                          </div>
                          </div>
                          {/* 점수 바 */}
                          <div className="mt-3">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${
                                  apt.strength === 'strong' ? 'bg-green-500' :
                                  apt.strength === 'moderate' ? 'bg-yellow-500' :
                                  'bg-gray-400'
                                }`}
                                style={{ width: `${apt.score * 100}%` }}
                              />
                            </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  ) : (
                    <p className={`text-center py-4 ${styles.textMuted}`}>
                      {searchQuery ? '검색 결과가 없습니다.' : '적성 데이터가 없습니다.'}
                    </p>
                  )}
                </div>

                {/* 인기 적성 태그 */}
                {recommendations.popularTopics && recommendations.popularTopics.length > 0 && (
                  <div className={`rounded-2xl border-2 p-6 shadow-lg ${styles.card}`}>
                    <h3 className={`text-xl font-bold mb-4 ${styles.title}`}>🔥 인기 적성 태그</h3>
                    <div className="flex flex-wrap gap-2">
                      {recommendations.popularTopics.map((topic, index) => (
                        <button
                          key={index}
                          onClick={() => {
                            setSearchQuery(topic);
                            setSelectedCategory(null);
                          }}
                          className={`px-3 py-1 rounded-full text-sm transition-colors ${
                            searchQuery === topic
                              ? 'bg-blue-500 text-white'
                              : `${styles.button} ${styles.textSecondary}`
                          }`}
                        >
                          {topic}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 카테고리별 탐색 */}
                {recommendations.categories && recommendations.categories.length > 0 && (
                  <div className={`rounded-2xl border-2 p-6 shadow-lg ${styles.card}`}>
                    <h3 className={`text-xl font-bold mb-4 ${styles.title}`}>📂 카테고리별 탐색</h3>
                    <div className="grid grid-cols-3 gap-3">
                      {recommendations.categories.map((cat) => (
                        <button
                          key={cat.id}
                          onClick={() => {
                            setSelectedCategory(selectedCategory === cat.name ? null : cat.name);
                            setSearchQuery('');
                          }}
                          className={`p-4 rounded-lg border-2 transition-all ${
                            selectedCategory === cat.name
                              ? 'border-blue-500 bg-blue-50'
                              : styles.border
                          } ${styles.button}`}
                        >
                          <div className="text-center">
                            <span className="text-2xl">{cat.emoji}</span>
                            <p className={`text-sm font-medium mt-1 ${styles.title}`}>{cat.name}</p>
                            <p className={`text-xs ${styles.textMuted}`}>{cat.count}개</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className={`rounded-2xl border-2 p-8 shadow-lg ${styles.card}`}>
                <p className={`text-center py-8 ${styles.textMuted}`}>
                  일기를 작성하면 당신의 숨겨진 적성을 발견할 수 있습니다.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 적성 상세 모달 */}
        {showModal && selectedAptitude && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowModal(false)}
          >
            <div
              className={`rounded-2xl border-2 p-6 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto ${styles.card}`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-4xl">{selectedAptitude.emoji}</span>
                  <div>
                    <h2 className={`text-2xl font-bold ${styles.title}`}>{selectedAptitude.tagName}</h2>
                    <p className={`text-sm ${styles.textMuted}`}>{selectedAptitude.category}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className={`p-2 rounded-lg ${styles.buttonHover}`}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* 강도 표시 */}
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-lg font-semibold ${styles.title}`}>강도: </span>
                  <span className={`text-lg font-bold ${
                    selectedAptitude.strength === 'strong' ? 'text-green-500' :
                    selectedAptitude.strength === 'moderate' ? 'text-yellow-500' :
                    'text-gray-500'
                  }`}>
                    {Math.round(selectedAptitude.score * 100)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full ${
                      selectedAptitude.strength === 'strong' ? 'bg-green-500' :
                      selectedAptitude.strength === 'moderate' ? 'bg-yellow-500' :
                      'bg-gray-400'
                    }`}
                    style={{ width: `${selectedAptitude.score * 100}%` }}
                  />
                </div>
              </div>

              {/* 발견 이유 */}
              <div className="mb-4">
                <h3 className={`text-lg font-bold mb-2 ${styles.title}`}>왜 발견되었나요?</h3>
                <p className={`text-sm ${styles.textSecondary}`}>{selectedAptitude.discoveryReason}</p>
              </div>

              {/* 증거 문장 */}
              {selectedAptitude.evidenceSentences.length > 0 && (
                <div className="mb-4">
                  <h3 className={`text-lg font-bold mb-2 ${styles.title}`}>증거 문장</h3>
                  <div className="space-y-2">
                    {selectedAptitude.evidenceSentences.map((sentence, idx) => (
                      <div key={idx} className={`p-3 rounded-lg border ${styles.border} ${styles.textSecondary}`}>
                        <p className="text-sm">"{sentence}"</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 관련 일기 */}
              {selectedAptitude.relatedDiaryDates.length > 0 && (
                <div className="mb-4">
                  <h3 className={`text-lg font-bold mb-2 ${styles.title}`}>관련 일기</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedAptitude.relatedDiaryDates.map((date, idx) => (
                      <span
                        key={idx}
                        className={`px-3 py-1 rounded-full text-sm ${styles.button} ${styles.textSecondary}`}
                      >
                        {date}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* 관련 영상 */}
              {selectedAptitude.videos && selectedAptitude.videos.length > 0 && (
                <div className="mt-6">
                  <h3 className={`text-lg font-bold mb-4 ${styles.title}`}>이 적성을 키우려면</h3>
                  <div className="space-y-3">
                    {selectedAptitude.videos.map((video) => (
                      <div
                        key={video.id}
                        className={`p-4 rounded-lg border-2 cursor-pointer hover:shadow-md transition-all ${styles.border} ${styles.card}`}
                        onClick={() => {
                          // 영상 재생 로직 (나중에 구현)
                          console.log('영상 재생:', video.title);
                        }}
                      >
                        <p className={`text-base font-semibold mb-1 ${styles.title}`}>{video.title}</p>
                        <p className={`text-sm ${styles.textMuted}`}>재생 시간: {video.duration}</p>
                      </div>
                    ))}
                  </div>
              </div>
            )}
          </div>
        </div>
        )}
      </div>
    );
  }

  // 나의 적성 뷰
  if (pathfinderView === 'my-aptitude') {
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
            <h1 className={`text-2xl font-bold ${styles.title}`}>나의 적성</h1>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 md:p-6" style={{ WebkitOverflowScrolling: 'touch' }}>
          <div className="max-w-4xl mx-auto space-y-4">
            {isLoading ? (
            <div className={`rounded-2xl border-2 p-8 shadow-lg ${styles.card}`}>
                <p className={`text-center py-8 ${styles.textMuted}`}>로딩 중...</p>
              </div>
            ) : myAptitudes ? (
              <>
                {/* 진행 중 섹션 */}
                {myAptitudes.inProgress.length > 0 && (
                  <div className={`rounded-2xl border-2 p-6 shadow-lg ${styles.card}`}>
                    <h3 className={`text-xl font-bold mb-4 ${styles.title}`}>📚 진행 중인 적성</h3>
              <div className="space-y-4">
                      {myAptitudes.inProgress.map((apt) => (
                        <div key={apt.id} className={`p-4 rounded-lg border-2 ${styles.border}`}>
                          <div className="flex items-start gap-3">
                            <span className="text-3xl">{apt.emoji}</span>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className={`text-lg font-bold ${styles.title}`}>{apt.tagName}</h4>
                                <span className={`text-sm font-semibold ${styles.textMuted}`}>
                                  {Math.round(apt.score * 100)}%
                                </span>
                              </div>
                              <div className="mb-2">
                                <div className="flex items-center justify-between text-xs mb-1">
                                  <span className={styles.textMuted}>진행률</span>
                                  <span className={styles.textMuted}>{apt.progress}%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div
                                    className="bg-blue-500 h-2 rounded-full"
                                    style={{ width: `${apt.progress}%` }}
                  />
                </div>
                </div>
                              <div className="flex items-center gap-4 text-xs">
                                <span className={styles.textMuted}>
                                  영상: {apt.completed_videos}/{apt.total_videos}
                                </span>
                                <span className={styles.textMuted}>
                                  마지막 학습: {apt.last_studied}
                                </span>
              </div>
            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 완료 섹션 */}
                {myAptitudes.completed.length > 0 && (
                  <div className={`rounded-2xl border-2 p-6 shadow-lg ${styles.card}`}>
                    <h3 className={`text-xl font-bold mb-4 ${styles.title}`}>✅ 완료한 적성</h3>
                    <div className="space-y-4">
                      {myAptitudes.completed.map((apt) => (
                        <div key={apt.id} className={`p-4 rounded-lg border-2 ${styles.border}`}>
                          <div className="flex items-start gap-3">
                            <span className="text-3xl">{apt.emoji}</span>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className={`text-lg font-bold ${styles.title}`}>{apt.tagName}</h4>
                                {apt.rating && (
                                  <div className="flex items-center gap-1">
                                    {[...Array(5)].map((_, i) => (
                                      <span key={i} className={i < apt.rating! ? 'text-yellow-400' : 'text-gray-300'}>
                                        ★
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-4 text-xs">
                                <span className={styles.textMuted}>
                                  완료 날짜: {apt.completed_date}
                                </span>
                                <span className={styles.textMuted}>
                                  영상: {apt.completed_videos}/{apt.total_videos}
                                </span>
                              </div>
                            </div>
                            <span className="text-green-500 font-bold">완료</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className={`rounded-2xl border-2 p-8 shadow-lg ${styles.card}`}>
                <p className={`text-center py-8 ${styles.textMuted}`}>적성 데이터가 없습니다.</p>
              </div>
            )}
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
            <h1 className={`text-2xl font-bold ${styles.title}`}>커리어 추천</h1>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 md:p-6" style={{ WebkitOverflowScrolling: 'touch' }}>
          <div className="max-w-4xl mx-auto space-y-4">
            {isLoading ? (
              <div className={`rounded-2xl border-2 p-8 shadow-lg ${styles.card}`}>
                <p className={`text-center py-8 ${styles.textMuted}`}>로딩 중...</p>
              </div>
            ) : careers.length > 0 ? (
              <div className="space-y-4">
                {careers.map((career) => (
                  <div
                    key={career.job_id}
                    onClick={() => setSelectedCareerDetail(career)}
                    className={`rounded-2xl border-2 p-6 shadow-lg cursor-pointer hover:shadow-xl hover:scale-[1.02] transition-all active:scale-[0.98] ${styles.card} ${
                      career.match_percentage >= 90 ? 'border-green-500' :
                      career.match_percentage >= 80 ? 'border-yellow-500' :
                      'border-blue-500'
                    }`}
                    title="클릭하여 상세 정보 보기"
                  >
                    <div className="flex items-start gap-4">
                      <span className="text-5xl">{career.emoji}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className={`text-2xl font-bold ${styles.title}`}>{career.job_name}</h3>
                          <span className={`text-xl font-bold ${
                            career.match_percentage >= 90 ? 'text-green-500' :
                            career.match_percentage >= 80 ? 'text-yellow-500' :
                            'text-blue-500'
                          }`}>
                            {career.match_percentage}%
                          </span>
                        </div>
                        <p className={`text-sm ${styles.textSecondary} mb-4`}>{career.description}</p>
                        
                        {/* 매칭된 적성 */}
                        <div className="mb-4">
                          <p className={`text-sm font-medium mb-2 ${styles.textSecondary}`}>매칭된 적성:</p>
                          <div className="flex flex-wrap gap-2">
                            {career.matched_aptitudes.map((apt, idx) => (
                              <span
                                key={idx}
                                className={`px-3 py-1 rounded-full text-sm ${styles.button} ${styles.textSecondary}`}
                              >
                                {apt}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* 추천 이유 */}
                        <div className="mb-4">
                          <p className={`text-sm font-medium mb-2 ${styles.textSecondary}`}>추천 이유:</p>
                          <ul className="space-y-1">
                            {career.reasons.map((reason, idx) => (
                              <li key={idx} className={`text-sm ${styles.textMuted} flex items-start gap-2`}>
                                <span className="text-blue-500">•</span>
                                <span>{reason}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* 추가 정보 */}
                        <div className="flex items-center gap-4 text-xs mb-4">
                          {career.salary_range && (
                            <span className={styles.textMuted}>💰 {career.salary_range}</span>
                          )}
                          {career.growth_potential && (
                            <span className={styles.textMuted}>
                              📈 성장 가능성: {
                                career.growth_potential === 'high' ? '높음' :
                                career.growth_potential === 'medium' ? '보통' : '낮음'
                              }
                            </span>
                          )}
                        </div>

                        {/* 로드맵 보기 버튼 */}
                        <Button
                          onClick={() => {
                            setSelectedCareer(career.job_id);
                            setPathfinderView('roadmap');
                          }}
                          className="w-full"
                        >
                          로드맵 보기 →
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
            <div className={`rounded-2xl border-2 p-8 shadow-lg ${styles.card}`}>
              <p className={`text-center py-8 ${styles.textMuted}`}>커리어 정보가 없습니다.</p>
            </div>
            )}
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
              onClick={() => {
                setPathfinderView('career');
                setSelectedCareer(null);
              }}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${styles.buttonHover}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className={`text-2xl font-bold ${styles.title}`}>
              {roadmap ? `${roadmap.career_emoji} ${roadmap.career_name} 로드맵` : '로드맵'}
            </h1>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 md:p-6" style={{ WebkitOverflowScrolling: 'touch' }}>
          <div className="max-w-4xl mx-auto space-y-4">
            {isLoading ? (
            <div className={`rounded-2xl border-2 p-8 shadow-lg ${styles.card}`}>
                <p className={`text-center py-8 ${styles.textMuted}`}>로딩 중...</p>
              </div>
            ) : roadmap ? (
              <div className="space-y-4">
                {roadmap.phases.map((phase) => (
                  <div
                    key={phase.phase_id}
                    onClick={() => setSelectedPhaseDetail({ phase, careerName: roadmap.career_name })}
                    className={`rounded-2xl border-2 p-6 shadow-lg cursor-pointer hover:shadow-xl hover:scale-[1.02] transition-all active:scale-[0.98] ${styles.card} ${
                      phase.status === 'completed' ? 'border-green-500 bg-green-50 dark:bg-green-900/20' :
                      phase.status === 'in_progress' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' :
                      'border-purple-300 bg-purple-50 dark:bg-purple-900/10'
                    }`}
                    title="클릭하여 상세 정보 보기"
                  >
                    <div className="flex items-start gap-4">
                      {/* Phase 번호 */}
                      <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${
                        phase.status === 'completed' ? 'bg-green-500 text-white' :
                        phase.status === 'in_progress' ? 'bg-blue-500 text-white' :
                        'bg-purple-200 text-purple-700 dark:bg-purple-800 dark:text-purple-200'
                      }`}>
                        {phase.status === 'completed' ? '✓' : phase.phase_number}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className={`text-xl font-bold ${styles.title}`}>
                            Phase {phase.phase_number}: {phase.phase_name}
                          </h3>
                          {phase.status === 'completed' && (
                            <span className="text-green-500 font-bold text-sm">완료</span>
                          )}
                          {phase.status === 'in_progress' && (
                            <span className="text-blue-500 font-bold text-sm">진행 중</span>
                          )}
                          {phase.status === 'upcoming' && (
                            <span className="text-purple-500 font-bold text-sm">📅 예정</span>
                          )}
                          <span className={`text-xs ${styles.textMuted} ml-auto opacity-70`}>👆 클릭하여 상세 보기</span>
                        </div>
                        
                        <p className={`text-sm ${styles.textSecondary} mb-3`}>{phase.description}</p>
                        
                        {/* 진행률 (진행 중일 때만) */}
                        {phase.status === 'in_progress' && phase.progress !== undefined && (
                          <div className="mb-3">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className={styles.textMuted}>진행률</span>
                              <span className={styles.textMuted}>{phase.progress}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-500 h-2 rounded-full"
                                style={{ width: `${phase.progress}%` }}
                              />
                            </div>
                          </div>
                        )}
                        
                        {/* 필요한 적성 */}
                        <div className="mb-3">
                          <p className={`text-xs font-medium mb-1 ${styles.textMuted}`}>필요한 적성:</p>
                          <div className="flex flex-wrap gap-1">
                            {phase.required_aptitudes.map((apt, idx) => (
                              <span
                                key={idx}
                                className={`px-2 py-1 rounded text-xs ${styles.button} ${styles.textSecondary}`}
                              >
                                {apt}
                              </span>
                            ))}
                          </div>
                        </div>
                        
                        {/* 학습 항목 */}
                        {phase.learning_items.length > 0 && (
                          <div className="mb-3">
                            <p className={`text-xs font-medium mb-2 ${styles.textMuted}`}>학습 항목:</p>
                            <div className="space-y-1">
                              {phase.learning_items.map((item) => (
                                <div
                                  key={item.id}
                                  className={`flex items-center gap-2 text-sm ${
                                    item.completed ? 'line-through text-gray-400' : styles.textSecondary
                                  }`}
                                >
                                  <span className={item.completed ? 'text-green-500' : 'text-gray-400'}>
                                    {item.completed ? '✓' : '○'}
                                  </span>
                                  <span>{item.title}</span>
                                  {item.duration && (
                                    <span className={`text-xs ${styles.textMuted}`}>({item.duration})</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* 예상 기간 */}
                        <p className={`text-xs ${styles.textMuted}`}>
                          예상 기간: {phase.estimated_duration}
                        </p>
            </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={`rounded-2xl border-2 p-8 shadow-lg ${styles.card}`}>
                <p className={`text-center py-8 ${styles.textMuted}`}>
                  커리어를 선택하면 로드맵을 볼 수 있습니다.
                </p>
                <div className="text-center mt-4">
                  <Button onClick={() => setPathfinderView('career')}>
                    커리어 선택하기
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 커리어 상세 모달
  const CareerDetailModal = selectedCareerDetail && (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedCareerDetail(null)}>
      <div className={`max-w-2xl w-full max-h-[90vh] overflow-y-auto rounded-2xl border-2 p-6 shadow-2xl ${styles.card}`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-5xl">{selectedCareerDetail.emoji}</span>
            <div>
              <h2 className={`text-2xl font-bold ${styles.title}`}>{selectedCareerDetail.job_name}</h2>
              <span className={`text-lg font-bold ${
                selectedCareerDetail.match_percentage >= 90 ? 'text-green-500' :
                selectedCareerDetail.match_percentage >= 80 ? 'text-yellow-500' :
                'text-blue-500'
              }`}>
                {selectedCareerDetail.match_percentage}% 매칭
              </span>
            </div>
          </div>
          <button
            onClick={() => setSelectedCareerDetail(null)}
            className={`text-2xl ${styles.textMuted} hover:${styles.title}`}
          >
            ×
          </button>
        </div>

        {selectedCareerDetail.detailed_info ? (
          <div className="space-y-4">
            <div>
              <h3 className={`text-lg font-bold mb-2 ${styles.title}`}>📋 직무 설명</h3>
              <p className={`text-sm ${styles.textSecondary}`}>{selectedCareerDetail.detailed_info.job_description}</p>
            </div>

            <div>
              <h3 className={`text-lg font-bold mb-2 ${styles.title}`}>💼 주요 업무</h3>
              <ul className="space-y-1">
                {selectedCareerDetail.detailed_info.main_duties.map((duty, idx) => (
                  <li key={idx} className={`text-sm ${styles.textSecondary} flex items-start gap-2`}>
                    <span className="text-blue-500">•</span>
                    <span>{duty}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className={`text-lg font-bold mb-2 ${styles.title}`}>🎓 필요 학력</h3>
                <p className={`text-sm ${styles.textSecondary}`}>{selectedCareerDetail.detailed_info.required_education}</p>
              </div>
              <div>
                <h3 className={`text-lg font-bold mb-2 ${styles.title}`}>📜 필요 자격증</h3>
                <div className="flex flex-wrap gap-1">
                  {selectedCareerDetail.detailed_info.required_certifications.map((cert, idx) => (
                    <span key={idx} className={`px-2 py-1 rounded text-xs ${styles.button} ${styles.textSecondary}`}>
                      {cert}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <h3 className={`text-lg font-bold mb-2 ${styles.title}`}>🏢 근무 환경</h3>
              <p className={`text-sm ${styles.textSecondary}`}>{selectedCareerDetail.detailed_info.work_environment}</p>
            </div>

            <div>
              <h3 className={`text-lg font-bold mb-2 ${styles.title}`}>📈 전망</h3>
              <p className={`text-sm ${styles.textSecondary}`}>{selectedCareerDetail.detailed_info.career_prospects}</p>
            </div>

            <div>
              <h3 className={`text-lg font-bold mb-2 ${styles.title}`}>🔗 관련 직업</h3>
              <div className="flex flex-wrap gap-2">
                {selectedCareerDetail.detailed_info.related_jobs.map((job, idx) => (
                  <span key={idx} className={`px-3 py-1 rounded-full text-sm ${styles.button} ${styles.textSecondary}`}>
                    {job}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className={`text-lg font-bold mb-2 ${styles.title}`}>⚖️ 워라밸</h3>
                <p className={`text-sm ${styles.textSecondary}`}>{selectedCareerDetail.detailed_info.work_life_balance}</p>
              </div>
              <div>
                <h3 className={`text-lg font-bold mb-2 ${styles.title}`}>🎯 진입 난이도</h3>
                <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                  selectedCareerDetail.detailed_info.entry_difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                  selectedCareerDetail.detailed_info.entry_difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {selectedCareerDetail.detailed_info.entry_difficulty === 'easy' ? '쉬움' :
                   selectedCareerDetail.detailed_info.entry_difficulty === 'medium' ? '보통' : '어려움'}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <p className={`text-center py-8 ${styles.textMuted}`}>상세 정보가 준비 중입니다.</p>
        )}

        {/* 관련 영상 섹션 */}
        {selectedCareerDetail.videos && selectedCareerDetail.videos.length > 0 && (
          <div className="mt-6">
            <h3 className={`text-lg font-bold mb-3 ${styles.title}`}>🎥 관련 영상</h3>
            <div className="grid grid-cols-1 gap-3">
              {selectedCareerDetail.videos.map((video, idx) => (
                <div
                  key={video.id || idx}
                  className={`p-4 rounded-lg border-2 cursor-pointer hover:shadow-md transition-all ${styles.border} ${styles.card}`}
                  onClick={() => {
                    // 영상 재생 로직 (나중에 구현)
                    console.log('영상 재생:', video.title);
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                      <span className="text-2xl">▶️</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${styles.title} truncate`}>{video.title}</p>
                      <p className={`text-xs ${styles.textMuted}`}>{video.duration}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 flex gap-2">
          <Button
            onClick={() => {
              setSelectedCareer(selectedCareerDetail.job_id);
              setPathfinderView('roadmap');
              setSelectedCareerDetail(null);
            }}
            className="flex-1"
          >
            로드맵 보기 →
          </Button>
        </div>
      </div>
    </div>
  );

  // 로드맵 Phase 상세 모달
  const PhaseDetailModal = selectedPhaseDetail && (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedPhaseDetail(null)}>
      <div className={`max-w-2xl w-full max-h-[90vh] overflow-y-auto rounded-2xl border-2 p-6 shadow-2xl ${styles.card}`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className={`text-xl font-bold ${styles.title}`}>
              Phase {selectedPhaseDetail.phase.phase_number}: {selectedPhaseDetail.phase.phase_name}
            </h2>
            <p className={`text-sm ${styles.textMuted}`}>{selectedPhaseDetail.careerName}</p>
          </div>
          <button
            onClick={() => setSelectedPhaseDetail(null)}
            className={`text-2xl ${styles.textMuted} hover:${styles.title}`}
          >
            ×
          </button>
        </div>

        <div className="mb-4">
          <p className={`text-sm ${styles.textSecondary}`}>{selectedPhaseDetail.phase.description}</p>
        </div>

        {selectedPhaseDetail.phase.detailed_info ? (
          <div className="space-y-4">
            <div>
              <h3 className={`text-lg font-bold mb-2 ${styles.title}`}>📖 단계 개요</h3>
              <p className={`text-sm ${styles.textSecondary}`}>{selectedPhaseDetail.phase.detailed_info.overview}</p>
            </div>

            <div>
              <h3 className={`text-lg font-bold mb-2 ${styles.title}`}>✨ 핵심 포인트</h3>
              <ul className="space-y-1">
                {selectedPhaseDetail.phase.detailed_info.key_points.map((point, idx) => (
                  <li key={idx} className={`text-sm ${styles.textSecondary} flex items-start gap-2`}>
                    <span className="text-blue-500">•</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className={`text-lg font-bold mb-2 ${styles.title}`}>💡 학습 팁</h3>
              <ul className="space-y-1">
                {selectedPhaseDetail.phase.detailed_info.learning_tips.map((tip, idx) => (
                  <li key={idx} className={`text-sm ${styles.textSecondary} flex items-start gap-2`}>
                    <span className="text-yellow-500">💡</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>

            {(selectedPhaseDetail.phase.detailed_info.recommended_resources.books?.length ||
              selectedPhaseDetail.phase.detailed_info.recommended_resources.websites?.length ||
              selectedPhaseDetail.phase.detailed_info.recommended_resources.courses?.length ||
              selectedPhaseDetail.phase.detailed_info.recommended_resources.videos?.length) && (
              <div>
                <h3 className={`text-lg font-bold mb-2 ${styles.title}`}>📚 추천 자료</h3>
                {selectedPhaseDetail.phase.detailed_info.recommended_resources.videos?.length > 0 && (
                  <div className="mb-4">
                    <p className={`text-sm font-medium mb-2 ${styles.textSecondary}`}>🎥 추천 영상:</p>
                    <div className="grid grid-cols-1 gap-2">
                      {selectedPhaseDetail.phase.detailed_info.recommended_resources.videos.map((video, idx) => (
                        <div
                          key={idx}
                          className={`p-3 rounded-lg border-2 cursor-pointer hover:shadow-md transition-all ${styles.border} ${styles.card}`}
                          onClick={() => {
                            // 영상 재생 로직 (나중에 구현)
                            console.log('영상 재생:', video.title);
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex-shrink-0 w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                              <span className="text-xl">▶️</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-medium ${styles.title} truncate`}>{video.title}</p>
                              <p className={`text-xs ${styles.textMuted}`}>{video.duration}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {selectedPhaseDetail.phase.detailed_info.recommended_resources.books?.length > 0 && (
                  <div className="mb-2">
                    <p className={`text-sm font-medium mb-1 ${styles.textSecondary}`}>도서:</p>
                    <ul className="space-y-1">
                      {selectedPhaseDetail.phase.detailed_info.recommended_resources.books.map((book, idx) => (
                        <li key={idx} className={`text-sm ${styles.textMuted} flex items-start gap-2`}>
                          <span>📖</span>
                          <span>{book}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {selectedPhaseDetail.phase.detailed_info.recommended_resources.websites?.length > 0 && (
                  <div className="mb-2">
                    <p className={`text-sm font-medium mb-1 ${styles.textSecondary}`}>웹사이트:</p>
                    <ul className="space-y-1">
                      {selectedPhaseDetail.phase.detailed_info.recommended_resources.websites.map((site, idx) => (
                        <li key={idx} className={`text-sm ${styles.textMuted} flex items-start gap-2`}>
                          <span>🌐</span>
                          <span>{site}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {selectedPhaseDetail.phase.detailed_info.recommended_resources.courses?.length > 0 && (
                  <div>
                    <p className={`text-sm font-medium mb-1 ${styles.textSecondary}`}>강의:</p>
                    <ul className="space-y-1">
                      {selectedPhaseDetail.phase.detailed_info.recommended_resources.courses.map((course, idx) => (
                        <li key={idx} className={`text-sm ${styles.textMuted} flex items-start gap-2`}>
                          <span>🎓</span>
                          <span>{course}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {selectedPhaseDetail.phase.detailed_info.common_challenges?.length > 0 && (
              <div>
                <h3 className={`text-lg font-bold mb-2 ${styles.title}`}>⚠️ 자주 겪는 어려움</h3>
                <ul className="space-y-1">
                  {selectedPhaseDetail.phase.detailed_info.common_challenges.map((challenge, idx) => (
                    <li key={idx} className={`text-sm ${styles.textSecondary} flex items-start gap-2`}>
                      <span className="text-orange-500">⚠</span>
                      <span>{challenge}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {selectedPhaseDetail.phase.detailed_info.success_criteria?.length > 0 && (
              <div>
                <h3 className={`text-lg font-bold mb-2 ${styles.title}`}>✅ 성공 기준</h3>
                <ul className="space-y-1">
                  {selectedPhaseDetail.phase.detailed_info.success_criteria.map((criteria, idx) => (
                    <li key={idx} className={`text-sm ${styles.textSecondary} flex items-start gap-2`}>
                      <span className="text-green-500">✓</span>
                      <span>{criteria}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <h3 className={`text-lg font-bold mb-2 ${styles.title}`}>필요한 적성</h3>
              <div className="flex flex-wrap gap-2">
                {selectedPhaseDetail.phase.required_aptitudes.map((apt, idx) => (
                  <span key={idx} className={`px-3 py-1 rounded-full text-sm ${styles.button} ${styles.textSecondary}`}>
                    {apt}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <h3 className={`text-lg font-bold mb-2 ${styles.title}`}>학습 항목</h3>
              <ul className="space-y-2">
                {selectedPhaseDetail.phase.learning_items.map((item) => (
                  <li key={item.id} className={`text-sm ${styles.textSecondary} flex items-center gap-2`}>
                    <span className={item.completed ? 'text-green-500' : 'text-gray-400'}>
                      {item.completed ? '✓' : '○'}
                    </span>
                    <span>{item.title}</span>
                    {item.duration && (
                      <span className={`text-xs ${styles.textMuted}`}>({item.duration})</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
            <p className={`text-sm ${styles.textMuted}`}>
              예상 기간: {selectedPhaseDetail.phase.estimated_duration}
            </p>
            
            {/* 기본 영상 섹션 (detailed_info가 없을 때) */}
            <div className="mt-6">
              <h3 className={`text-lg font-bold mb-4 ${styles.title}`}>이 단계를 완료하려면</h3>
              <div className="space-y-3">
                {/* 더미 영상 데이터 */}
                <div
                  className={`p-4 rounded-lg border-2 cursor-pointer hover:shadow-md transition-all ${styles.border} ${styles.card}`}
                  onClick={() => {
                    console.log('영상 재생: Phase 학습 가이드');
                  }}
                >
                  <p className={`text-base font-semibold mb-1 ${styles.title}`}>
                    Phase {selectedPhaseDetail.phase.phase_number} 학습 가이드
                  </p>
                  <p className={`text-sm ${styles.textMuted}`}>재생 시간: 30분</p>
                </div>
                <div
                  className={`p-4 rounded-lg border-2 cursor-pointer hover:shadow-md transition-all ${styles.border} ${styles.card}`}
                  onClick={() => {
                    console.log('영상 재생: 실전 연습');
                  }}
                >
                  <p className={`text-base font-semibold mb-1 ${styles.title}`}>
                    {selectedPhaseDetail.phase.phase_name} 실전 연습
                  </p>
                  <p className={`text-sm ${styles.textMuted}`}>재생 시간: 45분</p>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* 영상 섹션을 detailed_info가 있을 때도 항상 표시 */}
        {selectedPhaseDetail.phase.detailed_info?.recommended_resources?.videos && 
         selectedPhaseDetail.phase.detailed_info.recommended_resources.videos.length > 0 && (
          <div className="mt-6">
            <h3 className={`text-lg font-bold mb-4 ${styles.title}`}>이 단계를 완료하려면</h3>
            <div className="space-y-3">
              {selectedPhaseDetail.phase.detailed_info.recommended_resources.videos.map((video, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-lg border-2 cursor-pointer hover:shadow-md transition-all ${styles.border} ${styles.card}`}
                  onClick={() => {
                    console.log('영상 재생:', video.title);
                  }}
                >
                  <p className={`text-base font-semibold mb-1 ${styles.title}`}>{video.title}</p>
                  <p className={`text-sm ${styles.textMuted}`}>재생 시간: {video.duration}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {CareerDetailModal}
      {PhaseDetailModal}
    </>
  );
};
