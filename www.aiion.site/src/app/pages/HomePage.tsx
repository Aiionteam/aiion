"use client";

import React, { useMemo } from 'react';
import { MainLayout } from '../../components/templates/MainLayout';
import { useHomePage } from '../hooks/useHomePage';
import { DiaryView } from '../../components/organisms/DiaryView';
import { CalendarView } from '../../components/organisms/CalendarView';
import { AccountView } from '../../components/organisms/AccountView';
import { CultureView } from '../../components/organisms/CultureView';
import { HealthView } from '../../components/organisms/HealthView';
import { PathfinderView } from '../../components/organisms/PathfinderView';
import { SettingsView } from '../../components/organisms/SettingsView';

export const HomePage: React.FC = () => {
  const hookData = useHomePage();

  const {
    currentCategory,
    diaryView,
    setDiaryView,
    accountView,
    setAccountView,
    cultureView,
    setCultureView,
    healthView,
    setHealthView,
    pathfinderView,
    setPathfinderView,
    settingsView,
    setSettingsView,
    selectedDate,
    setSelectedDate,
    currentMonth,
    setCurrentMonth,
    events,
    setEvents,
    tasks,
    setTasks,
    diaries,
    setDiaries,
    darkMode,
  } = hookData;

  // 카테고리별 컴포넌트를 메모이제이션하여 불필요한 재생성 방지
  const categoryContent = useMemo(() => {
    switch (currentCategory) {
      case 'diary':
        return (
          <DiaryView
            diaryView={diaryView}
            setDiaryView={setDiaryView}
            diaries={diaries}
            setDiaries={setDiaries}
            darkMode={darkMode}
          />
        );
      case 'calendar':
        return (
          <CalendarView
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            currentMonth={currentMonth}
            setCurrentMonth={setCurrentMonth}
            events={events}
            setEvents={setEvents}
            tasks={tasks}
            setTasks={setTasks}
            diaries={diaries}
            darkMode={darkMode}
          />
        );
      case 'account':
        return (
          <AccountView
            accountView={accountView}
            setAccountView={setAccountView}
            darkMode={darkMode}
          />
        );
      case 'culture':
        return (
          <CultureView
            cultureView={cultureView}
            setCultureView={setCultureView}
            darkMode={darkMode}
          />
        );
      case 'health':
        return (
          <HealthView
            healthView={healthView}
            setHealthView={setHealthView}
            darkMode={darkMode}
          />
        );
      case 'path':
        return (
          <PathfinderView
            pathfinderView={pathfinderView}
            setPathfinderView={setPathfinderView}
            darkMode={darkMode}
          />
        );
      case 'settings':
        return (
          <SettingsView
            settingsView={settingsView}
            setSettingsView={setSettingsView}
            darkMode={darkMode}
          />
        );
      default:
        return null;
    }
  }, [
    currentCategory,
    diaryView,
    setDiaryView,
    accountView,
    setAccountView,
    cultureView,
    setCultureView,
    healthView,
    setHealthView,
    pathfinderView,
    setPathfinderView,
    settingsView,
    setSettingsView,
    selectedDate,
    setSelectedDate,
    currentMonth,
    setCurrentMonth,
    events,
    setEvents,
    tasks,
    setTasks,
    diaries,
    setDiaries,
    darkMode,
  ]);

  return (
    <MainLayout {...hookData}>
      {categoryContent}
    </MainLayout>
  );
};

