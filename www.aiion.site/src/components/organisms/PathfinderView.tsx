import React, { useState } from 'react';
import { Button } from '../atoms';
import { PathfinderView as PathfinderViewType } from '../types';

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
            <div className={`rounded-2xl border-2 p-8 shadow-lg ${styles.card}`}>
              <p className={`text-center py-8 ${styles.textMuted}`}>학습 목록이 없습니다.</p>
            </div>
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
