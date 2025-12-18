/**
 * Zustand 슬라이스 사용 예시 (카테고리별)
 * 
 * 이 파일은 참고용 예시입니다. 실제 컴포넌트에서 사용하는 방법을 보여줍니다.
 */

import React from "react";
import { useAppStore } from "../useAppStore";

// ============================================
// 예시 1: UI 슬라이스 사용
// ============================================

export function ExampleUiUsage() {
  // ✅ 좋은 방법: 필요한 상태만 구독 (성능 최적화)
  const darkMode = useAppStore((state) => state.ui.darkMode);
  const sidebarOpen = useAppStore((state) => state.ui.sidebarOpen);
  
  // ✅ 액션 가져오기
  const toggleDarkMode = useAppStore((state) => state.ui.toggleDarkMode);
  const setSidebarOpen = useAppStore((state) => state.ui.setSidebarOpen);
  
  return (
    <div>
      <button onClick={toggleDarkMode}>
        다크모드: {darkMode ? 'ON' : 'OFF'}
      </button>
      <button onClick={() => setSidebarOpen(!sidebarOpen)}>
        사이드바: {sidebarOpen ? '열림' : '닫힘'}
      </button>
    </div>
  );
}

// ============================================
// 예시 2: Soccer 슬라이스 사용
// ============================================

export function ExampleSoccerUsage() {
  // 상태 구독
  const searchResults = useAppStore((state) => state.soccer.searchResults);
  const isLoading = useAppStore((state) => state.soccer.isLoading);
  const error = useAppStore((state) => state.soccer.error);
  
  // 액션 가져오기
  const searchSoccer = useAppStore((state) => state.soccer.searchSoccer);
  const clearResults = useAppStore((state) => state.soccer.clearResults);
  
  const handleSearch = async () => {
    await searchSoccer("손흥민");
  };
  
  return (
    <div>
      <button onClick={handleSearch} disabled={isLoading}>
        {isLoading ? '검색 중...' : '축구 검색'}
      </button>
      {error && <p>에러: {error}</p>}
      {searchResults && (
        <div>
          <h3>검색 결과</h3>
          <pre>{JSON.stringify(searchResults, null, 2)}</pre>
        </div>
      )}
      <button onClick={clearResults}>결과 초기화</button>
    </div>
  );
}

// ============================================
// 예시 3: 일기 (Diary) 슬라이스 사용
// ============================================

export function ExampleDiaryUsage() {
  const diaryView = useAppStore((state) => state.diary.diaryView);
  const setDiaryView = useAppStore((state) => state.diary.setDiaryView);
  const resetDiaryView = useAppStore((state) => state.diary.resetDiaryView);
  
  return (
    <div>
      <p>현재 뷰: {diaryView}</p>
      <button onClick={() => setDiaryView('write')}>일기 쓰기</button>
      <button onClick={() => setDiaryView('list')}>일기 리스트</button>
      <button onClick={resetDiaryView}>홈으로</button>
    </div>
  );
}

// ============================================
// 예시 4: 캘린더 (Calendar) 슬라이스 사용
// ============================================

export function ExampleCalendarUsage() {
  const events = useAppStore((state) => state.calendar.events);
  const todayTasks = useAppStore((state) => state.calendar.todayTasks);
  const selectedDate = useAppStore((state) => state.calendar.selectedDate);
  
  const addEvent = useAppStore((state) => state.calendar.addEvent);
  const addTask = useAppStore((state) => state.calendar.addTask);
  const setSelectedDate = useAppStore((state) => state.calendar.setSelectedDate);
  
  const handleAddEvent = () => {
    addEvent({
      id: Date.now().toString(),
      date: selectedDate.toISOString().split('T')[0],
      text: '새 일정',
      time: '10:00',
      isAllDay: false,
      alarmOn: true,
    });
  };
  
  return (
    <div>
      <p>선택된 날짜: {selectedDate.toLocaleDateString()}</p>
      <p>일정 개수: {events.length}</p>
      <p>할 일 개수: {todayTasks.length}</p>
      <button onClick={handleAddEvent}>일정 추가</button>
    </div>
  );
}

// ============================================
// 예시 5: 인터랙션 (Interaction) 슬라이스 사용
// ============================================

export function ExampleInteractionUsage() {
  const inputText = useAppStore((state) => state.interaction.inputText);
  const interactions = useAppStore((state) => state.interaction.interactions);
  const currentCategory = useAppStore((state) => state.interaction.currentCategory);
  
  const setInputText = useAppStore((state) => state.interaction.setInputText);
  const setCurrentCategory = useAppStore((state) => state.interaction.setCurrentCategory);
  const addInteraction = useAppStore((state) => state.interaction.addInteraction);
  
  return (
    <div>
      <input 
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        placeholder="프롬프트 입력"
      />
      <p>현재 카테고리: {currentCategory}</p>
      <p>대화 기록: {interactions.length}개</p>
    </div>
  );
}

// ============================================
// 예시 6: 아바타 (Avatar) 슬라이스 사용
// ============================================

export function ExampleAvatarUsage() {
  const avatarMode = useAppStore((state) => state.avatar.avatarMode);
  const isListening = useAppStore((state) => state.avatar.isListening);
  const micAvailable = useAppStore((state) => state.avatar.micAvailable);
  
  const toggleAvatarMode = useAppStore((state) => state.avatar.toggleAvatarMode);
  
  return (
    <div>
      <button 
        onClick={toggleAvatarMode}
        disabled={!micAvailable}
      >
        {avatarMode ? '아바타 모드 종료' : '아바타 모드 시작'}
      </button>
      {isListening && <p>듣고 있습니다...</p>}
    </div>
  );
}

// ============================================
// 예시 7: 여러 슬라이스 동시 사용
// ============================================

export function ExampleMultipleSlices() {
  // 여러 슬라이스에서 상태 가져오기
  const darkMode = useAppStore((state) => state.ui.darkMode);
  const searchResults = useAppStore((state) => state.soccer.searchResults);
  const diaryView = useAppStore((state) => state.diary.diaryView);
  const events = useAppStore((state) => state.calendar.events);
  
  // 여러 액션 가져오기
  const toggleDarkMode = useAppStore((state) => state.ui.toggleDarkMode);
  const searchSoccer = useAppStore((state) => state.soccer.searchSoccer);
  const setDiaryView = useAppStore((state) => state.diary.setDiaryView);
  
  return (
    <div className={darkMode ? 'dark' : ''}>
      <button onClick={toggleDarkMode}>다크모드 토글</button>
      <button onClick={() => searchSoccer("축구")}>축구 검색</button>
      <button onClick={() => setDiaryView('write')}>일기 쓰기</button>
      {searchResults && <div>검색 결과 있음</div>}
      <p>일정: {events.length}개</p>
    </div>
  );
}

// ============================================
// ❌ 나쁜 예시: 전체 스토어 구독
// ============================================

export function BadExample() {
  // ❌ 나쁜 방법: 전체 스토어를 구독하면 불필요한 리렌더링 발생
  const store = useAppStore();
  
  // 이렇게 하면 store의 어떤 부분이 변경되어도 컴포넌트가 리렌더링됨
  return <div>{store.ui.darkMode ? 'Dark' : 'Light'}</div>;
}

// ============================================
// ✅ 좋은 예시: 선택적 구독
// ============================================

export function GoodExample() {
  // ✅ 좋은 방법: 필요한 부분만 구독
  const darkMode = useAppStore((state) => state.ui.darkMode);
  
  // darkMode만 변경될 때만 리렌더링됨
  return <div>{darkMode ? 'Dark' : 'Light'}</div>;
}

