import React, { memo } from 'react';
// CategoryBadge 제거됨 (어드민 프론트엔드)
import { Interaction } from '../types';

interface ChatMessageProps {
  interaction: Interaction;
  darkMode?: boolean;
}

export const ChatMessage: React.FC<ChatMessageProps> = memo(({
  interaction,
  darkMode = false,
}) => {
  return (
    <div className="space-y-2">
      {/* 사용자 메시지 (오른쪽 정렬) */}
      <div className="flex justify-end">
        <div className="max-w-[85%] md:max-w-[70%]">
          <div
            className={`rounded-2xl rounded-tr-sm px-3 py-2 md:px-4 md:py-2 shadow-sm ${
              darkMode ? 'bg-blue-600 text-white' : 'bg-[#8B7355] text-white'
            }`}
          >
            <p className="text-sm md:text-sm whitespace-pre-wrap break-words leading-relaxed">
              {interaction.userInput}
            </p>
          </div>
        </div>
      </div>

      {/* AI 응답 (왼쪽 정렬) */}
      <div className="flex items-start gap-2">
        <div
          className={`w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
            darkMode
              ? 'bg-gradient-to-br from-[#1a1a1a] to-[#222222]'
              : 'bg-gradient-to-br from-[#8B7355] to-[#c4a57b]'
          }`}
        >
          <span className="text-white text-xs font-bold">A</span>
        </div>
        <div className="max-w-[85%] md:max-w-[70%]">
          <div
            className={`rounded-2xl rounded-tl-sm px-3 py-2 md:px-4 md:py-2 shadow-sm ${
              darkMode
                ? 'bg-[#121212] border border-[#2a2a2a]'
                : 'bg-white border border-[#d4cdc0]'
            }`}
          >
            <p className={`text-sm md:text-sm ${darkMode ? 'text-gray-100' : 'text-gray-800'} leading-relaxed`}>
              {interaction.aiResponse}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
});

