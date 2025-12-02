import React, { useEffect, useRef, memo, useState, useMemo } from 'react';
import { ChatMessage } from '../molecules';
import { Interaction } from '../types';
import { useStore } from '../../store';
import { fetchUserById } from '../../app/hooks/useUserApi';

interface ChatContainerProps {
  interactions: Interaction[];
  darkMode?: boolean;
}

export const ChatContainer: React.FC<ChatContainerProps> = memo(({
  interactions,
  darkMode = false,
}) => {
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const user = useStore((state) => state.user?.user);
  const [nickname, setNickname] = useState<string>('회원');

  // 사용자 정보가 있으면 API에서 최신 닉네임 가져오기
  useEffect(() => {
    const loadNickname = async () => {
      if (user?.id) {
        try {
          const userInfo = await fetchUserById(user.id);
          if (userInfo?.nickname || userInfo?.name) {
            const cleanNickname = String(userInfo.nickname || userInfo.name).trim();
            // 깨진 문자 필터링 (한글, 영어, 숫자, 공백만 허용)
            const validNickname = cleanNickname.replace(/[^\uAC00-\uD7A3a-zA-Z0-9\s]/g, '');
            if (validNickname.length > 0) {
              setNickname(validNickname);
            } else {
              setNickname('회원');
            }
          }
        } catch (err) {
          console.error('[ChatContainer] 닉네임 로드 실패:', err);
          // 에러 시 기본값 사용
          setNickname('회원');
        }
      } else {
        setNickname('회원');
      }
    };

    loadNickname();
  }, [user?.id]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [interactions]);

  // 같은 날짜의 메시지 그룹핑
  const groupedInteractions = useMemo(() => {
    const groups: { date: string; interactions: Interaction[] }[] = [];
    let currentGroup: { date: string; interactions: Interaction[] } | null = null;

    interactions.forEach((interaction) => {
      if (!currentGroup || currentGroup.date !== interaction.date) {
        currentGroup = {
          date: interaction.date,
          interactions: [interaction],
        };
        groups.push(currentGroup);
      } else {
        currentGroup.interactions.push(interaction);
      }
    });

    return groups;
  }, [interactions]);

  return (
    <div
      ref={chatContainerRef}
      className={`flex-1 overflow-y-auto ${darkMode ? 'bg-[#0a0a0a]' : 'bg-[#e8e2d5]'}`}
      style={{ 
        WebkitOverflowScrolling: 'touch',
        scrollBehavior: 'smooth'
      }}
    >
      <div className="pl-3 pr-3 md:pl-4 md:pr-4 lg:pl-6 lg:pr-6 py-4 md:py-5 lg:py-6 min-h-full flex flex-col">
        {interactions.length === 0 ? (
          <div className="flex-1 flex items-center justify-center animate-fade-in">
            <div className="text-center px-4 max-w-md">
              <div className={`text-6xl mb-4 animate-bounce ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>📔</div>
              <h2 className={`text-xl md:text-2xl font-semibold mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                {nickname}님, 어서오세요! ✨
              </h2>
              <p className={`text-sm md:text-base leading-relaxed ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                오늘 하루의 생각과 감정을 자유롭게 기록해보세요.
              </p>
            </div>
          </div>
        ) : (
          groupedInteractions.map((group, groupIndex) => (
            <div key={group.date} className="space-y-4 mb-6 last:mb-0">
              {group.interactions.map((interaction, index) => (
                <ChatMessage
                  key={interaction.id}
                  interaction={interaction}
                  darkMode={darkMode}
                  isFirstInGroup={index === 0}
                />
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
});

