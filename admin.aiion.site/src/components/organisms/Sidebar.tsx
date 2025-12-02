import React, { memo, useEffect } from 'react';
import { Icon } from '../atoms';
import { Toggle } from '../atoms';

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = memo(({
  sidebarOpen,
  setSidebarOpen,
  darkMode,
  setDarkMode,
}) => {
  // 모바일에서 사이드바가 열려있을 때 body 스크롤 방지
  useEffect(() => {
    if (sidebarOpen && window.innerWidth < 768) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [sidebarOpen]);

  return (
    <>
      {/* 모바일/태블릿 오버레이 */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}
      
      <div
        className={`${
          sidebarOpen 
            ? 'w-64 lg:w-72' 
            : 'w-0 md:w-16'
        } ${
          darkMode ? 'bg-[#121212] border-[#2a2a2a]' : 'bg-[#f5f1e8] border-[#d4cdc0]'
        } border-r transition-all duration-300 flex flex-col fixed md:relative h-full z-50 md:z-auto overflow-hidden md:flex-shrink-0`}
      >

      {/* Menu Header */}
      <div className={`p-3 md:p-4 border-b ${darkMode ? 'border-[#2a2a2a]' : 'border-[#d4cdc0]'} ${!sidebarOpen ? 'md:px-2 md:py-3' : ''}`}>
        <div className="flex items-center justify-center">
          {sidebarOpen ? (
            <div className="w-16 h-16 md:w-20 md:h-20 flex items-center justify-center flex-shrink-0">
              <img
                src="/aiionlogo.png"
                alt="Aiion Logo"
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/logo.png';
                }}
              />
            </div>
          ) : (
            <div className="hidden md:flex w-12 h-12 items-center justify-center flex-shrink-0">
              <img
                src="/aiionlogo.png"
                alt="Aiion Logo"
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/logo.png';
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Admin Menu - 카테고리 제거됨 */}
      <nav className={`flex-1 overflow-y-auto ${sidebarOpen ? 'p-2' : 'md:p-2'} ${!sidebarOpen ? 'hidden md:block' : ''}`}>
        <div className="mb-2">
          {sidebarOpen && (
            <p className={`text-xs uppercase px-3 py-2 font-semibold ${
              darkMode ? 'text-gray-400' : 'text-gray-500'
            }`}>Admin</p>
          )}
        </div>
      </nav>

      {/* Theme Toggle */}
      <div className={`${sidebarOpen ? 'p-2' : 'md:p-2'} border-t ${darkMode ? 'border-[#2a2a2a]' : 'border-[#d4cdc0]'} ${!sidebarOpen ? 'hidden md:block' : ''}`}>
        <div className={sidebarOpen ? '' : 'md:flex md:justify-center'}>
          <Toggle
            checked={darkMode}
            onChange={setDarkMode}
            label={sidebarOpen ? '다크 모드' : undefined}
          />
        </div>
      </div>

      {/* Sidebar Toggle */}
      <div className={`${sidebarOpen ? 'p-2' : 'md:p-2'} ${!sidebarOpen ? 'hidden md:block' : ''}`}>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className={`w-full flex items-center ${sidebarOpen ? 'gap-2 md:gap-3 px-3' : 'md:justify-center md:px-2'} py-3 md:py-2.5 rounded-lg transition-colors min-h-[44px] md:min-h-[40px] ${
            darkMode ? 'hover:bg-[#1a1a1a] active:bg-[#1a1a1a] text-gray-300' : 'hover:bg-[#e8e2d5] active:bg-[#e8e2d5] text-gray-700'
          }`}
          title={!sidebarOpen ? '메뉴 열기' : undefined}
        >
          <Icon name={sidebarOpen ? 'arrowLeft' : 'arrowRight'} />
          {sidebarOpen && <span className="font-medium text-sm md:text-sm lg:text-base">접기</span>}
        </button>
      </div>
    </div>
    </>
  );
});

