import React, { useState } from 'react';
import { Button } from '../atoms';
import { HealthView as HealthViewType } from '../types';

interface HealthViewProps {
  healthView: HealthViewType;
  setHealthView: (view: HealthViewType) => void;
  darkMode?: boolean;
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
  const [selectedExerciseCategory, setSelectedExerciseCategory] = useState('');
  const styles = getCommonStyles(darkMode);

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
                <p className={`text-center py-4 ${styles.textMuted}`}>
                  아직 기록된 건강 데이터가 없습니다. 첫 건강 기록을 작성해보세요!
                </p>
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

  // Exercise 뷰
  if (healthView === 'exercise') {
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
          <div className="max-w-4xl mx-auto space-y-4">
            <div className={`rounded-2xl border-2 p-8 shadow-lg ${styles.card}`}>
              <div className="mb-4">
                <div className="flex gap-2 flex-wrap">
                  {['유산소', '근력', '요가', '필라테스', '수영'].map((category) => (
                    <Button
                      key={category}
                      onClick={() => setSelectedExerciseCategory(category)}
                      variant={selectedExerciseCategory === category ? 'primary' : 'ghost'}
                      size="sm"
                    >
                      {category}
                    </Button>
                  ))}
                </div>
              </div>
              <p className={`text-center py-8 ${styles.textMuted}`}>운동 기록이 없습니다.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Health 뷰
  if (healthView === 'health') {
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
            <h1 className={`text-2xl font-bold ${styles.title}`}>건강 관리</h1>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 md:p-6" style={{ WebkitOverflowScrolling: 'touch' }}>
          <div className="max-w-4xl mx-auto space-y-4">
            <div className={`rounded-2xl border-2 p-8 shadow-lg ${styles.card}`}>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className={`rounded-lg p-4 ${styles.cardBg}`}>
                    <p className={`text-sm mb-1 ${styles.textMuted}`}>체중</p>
                    <p className={`text-xl font-bold ${styles.title}`}>- kg</p>
                  </div>
                  <div className={`rounded-lg p-4 ${styles.cardBg}`}>
                    <p className={`text-sm mb-1 ${styles.textMuted}`}>혈압</p>
                    <p className={`text-xl font-bold ${styles.title}`}>- / -</p>
                  </div>
                </div>
                <p className={`text-center py-4 ${styles.textMuted}`}>건강 정보가 없습니다.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Records 뷰
  if (healthView === 'records') {
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
            <div className={`rounded-2xl border-2 p-8 shadow-lg ${styles.card}`}>
              <p className={`text-center py-8 ${styles.textMuted}`}>기록이 없습니다.</p>
            </div>
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
