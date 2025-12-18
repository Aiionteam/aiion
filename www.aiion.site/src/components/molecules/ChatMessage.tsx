import React, { memo } from 'react';
import { CategoryBadge } from './CategoryBadge';
import { WeatherDisplay } from './WeatherDisplay';
import { Interaction } from '../types';

interface ChatMessageProps {
  interaction: Interaction;
  darkMode?: boolean;
  isFirstInGroup?: boolean;
}

const formatDateWithWeather = (dateStr: string, dayOfWeek: string, darkMode: boolean) => {
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return (
    <div className={`flex items-center gap-2 mb-2 px-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
      <span className="text-xs font-medium">
        {year}년 {month}월 {day}일 {dayOfWeek}요일
      </span>
      <div className="flex items-center gap-1">
        <WeatherDisplay darkMode={darkMode} />
      </div>
    </div>
  );
};

const formatDate = (dateStr: string, dayOfWeek: string, darkMode: boolean) => {
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return (
    <div className={`text-xs mb-2 px-1 font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
      {year}년 {month}월 {day}일 {dayOfWeek}요일
    </div>
  );
};

export const ChatMessage: React.FC<ChatMessageProps> = memo(({
  interaction,
  darkMode = false,
  isFirstInGroup = true,
}) => {
  return (
    <div className="space-y-3 animate-fade-in">
      {/* 사용자 메시지 (오른쪽 정렬) */}
      <div className="flex justify-end group">
        <div className="max-w-[85%] md:max-w-[70%] lg:max-w-[65%] flex flex-col items-end">
          {/* 날짜 및 날씨 표시 - 첫 메시지에만 표시 */}
          {isFirstInGroup && (
            <div className="flex justify-end w-full mb-2">
              {formatDateWithWeather(interaction.date, interaction.dayOfWeek, darkMode)}
            </div>
          )}
          <div
            className={`rounded-2xl rounded-tr-sm px-4 py-2.5 md:px-5 md:py-3 shadow-md transition-all duration-200 hover:shadow-lg ${
              darkMode 
                ? 'bg-blue-600 text-white hover:bg-blue-700' 
                : 'bg-[#8B7355] text-white hover:bg-[#7a6348]'
            }`}
          >
            <p className="text-sm md:text-base whitespace-pre-wrap break-words leading-relaxed">
              {interaction.userInput}
            </p>
          </div>
          {interaction.categories && interaction.categories.length > 0 && (
            <div className="mt-1.5">
              <CategoryBadge categories={interaction.categories} darkMode={darkMode} />
            </div>
          )}
        </div>
      </div>

      {/* AI 응답 (왼쪽 정렬) */}
      <div className="flex items-start gap-3 group">
        <div
          className={`w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center flex-shrink-0 shadow-md transition-transform duration-200 group-hover:scale-105 ${
            darkMode
              ? 'bg-gradient-to-br from-[#1a1a1a] to-[#222222] ring-2 ring-[#2a2a2a]'
              : 'bg-gradient-to-br from-[#8B7355] to-[#c4a57b] ring-2 ring-[#d4cdc0]'
          }`}
        >
          <span className="text-white text-xs md:text-sm font-bold">A</span>
        </div>
        <div className="max-w-[85%] md:max-w-[70%] lg:max-w-[65%] flex-1">
          {/* 날짜 표시 - 첫 메시지에만 표시 */}
          {isFirstInGroup && formatDate(interaction.date, interaction.dayOfWeek, darkMode)}
          <div
            className={`rounded-2xl rounded-tl-sm px-4 py-2.5 md:px-5 md:py-3 shadow-md transition-all duration-200 hover:shadow-lg ${
              darkMode
                ? 'bg-[#121212] border border-[#2a2a2a] hover:border-[#3a3a3a]'
                : 'bg-white border border-[#d4cdc0] hover:border-[#c4b5a0]'
            }`}
          >
            <p className={`text-sm md:text-base ${darkMode ? 'text-gray-100' : 'text-gray-800'} leading-relaxed whitespace-pre-wrap break-words`}>
              {interaction.aiResponse}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
});

