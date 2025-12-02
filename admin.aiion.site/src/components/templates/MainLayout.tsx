import React, { memo } from 'react';
import { Sidebar, ChatContainer, PromptInput, AvatarMode } from '../organisms';
import { Interaction } from '../types';

interface MainLayoutProps {
  // Sidebar props
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;

  // Content props
  avatarMode: boolean;
  isListening: boolean;
  interactions: Interaction[];
  
  // Prompt input props
  inputText: string;
  setInputText: (text: string) => void;
  loading: boolean;
  micAvailable: boolean;
  handleMicClick: () => void;
  handleSubmit: () => void;

  // Children
  children?: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = memo(({
  sidebarOpen,
  setSidebarOpen,
  darkMode,
  setDarkMode,
  avatarMode,
  isListening,
  interactions,
  inputText,
  setInputText,
  loading,
  micAvailable,
  handleMicClick,
  handleSubmit,
  children,
}) => {
  return (
    <div className={`flex h-screen overflow-hidden ${darkMode ? 'bg-[#0a0a0a]' : 'bg-[#e8e2d5]'} relative`}>
      {/* 모바일 사이드바는 fixed로 오버레이 - 레이아웃에서 완전히 제외 */}
      <div className="md:hidden">
        <Sidebar
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
        />
      </div>
      
      {/* 데스크톱에서만 flex 레이아웃에 포함 */}
      <div className="hidden md:block md:flex-shrink-0">
        <Sidebar
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
        />
      </div>

      <div className={`flex-1 flex flex-col overflow-hidden md:ml-0 ${darkMode ? 'bg-[#0a0a0a]' : 'bg-[#e8e2d5]'}`} style={{ width: '100%', maxWidth: '100%', minWidth: 0 }}>
        {/* 모바일/태블릿 햄버거 메뉴 버튼 */}
        <div className={`lg:hidden border-b flex items-center ${
          darkMode ? 'border-[#2a2a2a] bg-[#121212]' : 'border-[#d4cdc0] bg-[#f5f1e8]'
        }`} style={{ minHeight: '56px' }}>
          <button
            onClick={() => setSidebarOpen(true)}
            className={`p-3 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center active:scale-95 ${
              darkMode ? 'hover:bg-[#1a1a1a] active:bg-[#1a1a1a] text-gray-300' : 'hover:bg-[#e8e2d5] active:bg-[#e8e2d5] text-gray-700'
            }`}
            aria-label="메뉴 열기"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex-1 flex items-center justify-center px-4">
            <span className={`text-lg font-semibold ${
              darkMode ? 'text-white' : 'text-gray-900'
            }`}>Aiion</span>
          </div>
          <div className="w-[44px]" /> {/* 공간 균형을 위한 빈 div */}
        </div>

        {avatarMode ? (
          <>
            <AvatarMode isListening={isListening} />
            <PromptInput
              inputText={inputText}
              setInputText={setInputText}
              loading={loading}
              avatarMode={avatarMode}
              micAvailable={micAvailable}
              onMicClick={handleMicClick}
              onSubmit={handleSubmit}
              darkMode={darkMode}
            />
          </>
        ) : (
          <>
            <ChatContainer interactions={interactions} darkMode={darkMode} />
            <PromptInput
              inputText={inputText}
              setInputText={setInputText}
              loading={loading}
              avatarMode={avatarMode}
              micAvailable={micAvailable}
              onMicClick={handleMicClick}
              onSubmit={handleSubmit}
              darkMode={darkMode}
            />
          </>
        )}
      </div>
    </div>
  );
});

