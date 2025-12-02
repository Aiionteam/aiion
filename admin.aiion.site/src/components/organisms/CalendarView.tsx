import React, { useState } from 'react';
import { Button, Input } from '../atoms';
import { Event, Task, Diary } from '../types';
import { getLocalDateStr } from '../../lib';
import {
  addEventService,
  addTaskService,
  toggleAlarmService,
  deleteItemService,
} from '../../app/services/calendarService';

interface CalendarViewProps {
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  currentMonth: Date;
  setCurrentMonth: (date: Date) => void;
  events: Event[];
  setEvents: (events: Event[]) => void;
  tasks: Task[];
  setTasks: (tasks: Task[] | ((prev: Task[]) => Task[])) => void;
  diaries?: Diary[];
  darkMode?: boolean;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  selectedDate,
  setSelectedDate,
  currentMonth,
  setCurrentMonth,
  events,
  setEvents,
  tasks,
  setTasks,
  diaries = [],
  darkMode = false,
}) => {
  const [newEventText, setNewEventText] = useState('');
  const [newEventTime, setNewEventTime] = useState('');
  const [isAllDay, setIsAllDay] = useState(false);
  const [showTimeSelector, setShowTimeSelector] = useState(false);
  const [newTaskText, setNewTaskText] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'event' | 'task'; id: string } | null>(null);

  const handleAddEvent = async () => {
    const result = await addEventService({
      text: newEventText,
      time: newEventTime,
      isAllDay: isAllDay,
      selectedDate: selectedDate,
      existingEvents: events,
    });

    if (!result.success) {
      alert(result.errorMessage);
      return;
    }

    if (result.event) {
      setEvents([...events, result.event]);
      setNewEventText('');
      setNewEventTime('');
      setIsAllDay(false);
      setShowTimeSelector(false);
    }
  };

  const handleAddTask = async () => {
    const result = await addTaskService({
      text: newTaskText,
      selectedDate: selectedDate,
      existingTasks: tasks,
    });

    if (!result.success) {
      alert(result.errorMessage);
      return;
    }

    if (result.task) {
      setTasks([...tasks, result.task]);
      setNewTaskText('');
    }
  };

  const handleToggleAlarm = async (eventId: string) => {
    const updatedEvents = await toggleAlarmService({
      eventId,
      events,
    });
    setEvents(updatedEvents);
  };

  const handleDeleteTask = (taskId: string) => {
    const updatedTasks = tasks.filter(t => t.id !== taskId);
    setTasks(updatedTasks);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    
    const result = await deleteItemService({
      type: deleteTarget.type,
      id: deleteTarget.id,
      events,
      tasks,
    });
    
    setEvents(result.events);
    setTasks(result.tasks);
    setDeleteTarget(null);
  };

  // 일정을 시간순으로 정렬 (하루종일이 맨 위)
  const selectedDateStr = getLocalDateStr(selectedDate);
  const sortedEvents = [...events]
    .filter(e => e.date === selectedDateStr)
    .sort((a, b) => {
      if (a.isAllDay && !b.isAllDay) return -1;
      if (!a.isAllDay && b.isAllDay) return 1;
      if (a.isAllDay && b.isAllDay) return 0;
      return (a.time || '').localeCompare(b.time || '');
    });

  // 선택한 날짜의 할 일 목록
  const selectedDateTasks = tasks.filter(t => t.date === selectedDateStr);

  return (
    <div className={`flex-1 overflow-y-auto ${darkMode ? 'bg-[#0a0a0a]' : 'bg-[#e8e2d5]'}`} style={{ WebkitOverflowScrolling: 'touch' }}>
      <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-4">
        {/* 종합 분석 카드 */}
        <div className={`rounded-2xl border-2 p-6 shadow-lg ${
          darkMode ? 'bg-[#121212] border-[#2a2a2a]' : 'bg-white border-[#8B7355]'
        }`}>
          <h2 className={`text-xl font-bold mb-3 text-center border-b-2 pb-2 ${
            darkMode ? 'text-white border-[#2a2a2a]' : 'text-gray-900 border-[#d4c4a8]'
          }`}>
            📊 일정 알림 보드
          </h2>
          <div className={`text-center py-2 text-sm ${
            darkMode ? 'text-gray-400' : 'text-gray-500'
          }`}>
            {events.length === 0 
              ? '이번 주 일정이 없습니다. 첫 일정을 추가해보세요!'
              : `총 ${events.length}개의 일정이 등록되었습니다.`}
          </div>
        </div>

        {/* 캘린더 */}
        <div className={`rounded-2xl border-2 shadow-lg p-6 ${
          darkMode ? 'bg-[#121212] border-[#2a2a2a]' : 'bg-white border-[#8B7355]'
        }`}>
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() =>
                setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
              }
              className={`px-4 py-2 text-2xl rounded-lg transition-colors ${
                darkMode 
                  ? 'text-gray-300 hover:bg-[#1a1a1a]' 
                  : 'text-gray-700 hover:bg-[#f5f1e8]'
              }`}
            >
              ←
            </button>
            <div className="text-center">
              <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>📅 캘린더</h2>
              <p className={`text-lg mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {currentMonth.getFullYear()}년 {currentMonth.getMonth() + 1}월
              </p>
            </div>
            <button
              onClick={() =>
                setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
              }
              className={`px-4 py-2 text-2xl rounded-lg transition-colors ${
                darkMode 
                  ? 'text-gray-300 hover:bg-[#1a1a1a]' 
                  : 'text-gray-700 hover:bg-[#f5f1e8]'
              }`}
            >
              →
            </button>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {['일', '월', '화', '수', '목', '금', '토'].map((day) => (
              <div key={day} className={`text-center text-base font-bold py-3 ${
                day === '일' ? 'text-red-500' : darkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                {day}
              </div>
            ))}
            {Array.from({ length: new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay() }).map((_, index) => (
              <div key={`empty-${index}`} className="p-4"></div>
            ))}
            {Array.from({ length: new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate() }).map((_, index) => {
              const day = index + 1;
              const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
              const dateStr = getLocalDateStr(date);
              const todayStr = getLocalDateStr(new Date());
              const isToday = dateStr === todayStr;
              const isSelected = dateStr === getLocalDateStr(selectedDate);
              const hasEvents = events.some((e) => e.date === dateStr);
              const hasDiary = diaries.some((d) => d.date === dateStr);
              const hasTasks = tasks.some((t) => t.date === dateStr);
              const dayOfWeek = date.getDay();

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDate(date)}
                  className={`p-4 rounded-lg text-base font-medium transition-all min-h-[60px] flex flex-col items-center justify-center relative ${
                    isSelected
                      ? darkMode
                        ? 'bg-[#1a1a1a] text-white scale-105'
                        : 'bg-[#8B7355] text-white scale-105'
                      : isToday
                      ? darkMode
                        ? 'bg-[#1a1a1a] text-white font-bold ring-2 ring-[#333333]'
                        : 'bg-[#d4cdc0] text-gray-900 font-bold ring-2 ring-[#8B7355]'
                      : darkMode
                      ? 'hover:bg-[#1a1a1a] text-gray-300'
                      : 'hover:bg-[#f5f1e8] text-gray-700'
                  } ${dayOfWeek === 0 && !isSelected ? 'text-red-500' : ''}`}
                >
                  <span className={isSelected ? 'text-white' : ''}>{day}</span>
                  <div className="flex gap-1 mt-1">
                    {hasEvents && (
                      <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                    )}
                    {hasDiary && (
                      <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                    )}
                    {hasTasks && (
                      <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 일정 목록 */}
        <div className={`rounded-2xl border-2 shadow-lg p-6 ${
          darkMode ? 'bg-[#121212] border-[#2a2a2a]' : 'bg-white border-[#8B7355]'
        }`}>
          <h3 className={`text-xl font-bold mb-4 pb-3 border-b-2 ${
            darkMode ? 'text-white border-[#2a2a2a]' : 'text-gray-900 border-[#d4c4a8]'
          }`}>
            📋 {selectedDate.getFullYear()}/{selectedDate.getMonth() + 1}월/{selectedDate.getDate()}일
          </h3>

          {/* 일정 입력 */}
          <div className={`mb-6 p-3 sm:p-4 rounded-xl ${
            darkMode ? 'bg-[#1a1a1a]' : 'bg-[#f5f1e8]'
          }`}>
            <input
              type="text"
              value={newEventText}
              onChange={(e) => setNewEventText(e.target.value.slice(0, 20))}
              placeholder="일정을 입력하세요 (최대 20자)"
              className={`w-full px-4 py-3 border-2 rounded-lg mb-3 focus:outline-none ${
                darkMode
                  ? 'bg-[#121212] border-[#2a2a2a] text-white placeholder-gray-400 focus:border-[#333333]'
                  : 'bg-white border-[#d4cdc0] text-gray-900 focus:border-[#8B7355]'
              }`}
              maxLength={20}
              onTouchStart={(e) => e.stopPropagation()}
              onTouchMove={(e) => e.stopPropagation()}
            />
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 mb-3">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowTimeSelector(!showTimeSelector);
                }}
                onTouchStart={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowTimeSelector(!showTimeSelector);
                }}
                className={`flex-1 min-h-[44px] px-4 py-2.5 border-2 rounded-lg transition-colors touch-manipulation ${
                  darkMode
                    ? 'bg-[#121212] border-[#2a2a2a] text-gray-300 active:border-[#333333] active:bg-[#1a1a1a]'
                    : 'bg-white border-[#d4cdc0] text-gray-900 active:border-[#8B7355] active:bg-[#f5f1e8]'
                }`}
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                {newEventTime || '시간 설정'}
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsAllDay(!isAllDay);
                  if (!isAllDay) setNewEventTime('');
                }}
                onTouchStart={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsAllDay(!isAllDay);
                  if (!isAllDay) setNewEventTime('');
                }}
                className={`min-h-[44px] px-6 py-2.5 rounded-lg transition-colors touch-manipulation ${
                  isAllDay 
                    ? darkMode
                      ? 'bg-[#1a1a1a] text-white active:bg-[#222222]'
                      : 'bg-[#8B7355] text-white active:bg-[#6d5943]'
                    : darkMode
                    ? 'bg-[#121212] border-2 border-[#2a2a2a] text-gray-300 active:border-[#333333] active:bg-[#1a1a1a]'
                    : 'bg-white border-2 border-[#d4cdc0] text-gray-900 active:border-[#8B7355] active:bg-[#f5f1e8]'
                }`}
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                하루종일
              </button>
            </div>

            {showTimeSelector && !isAllDay && (
              <div className={`mb-3 p-3 rounded-lg border-2 ${
                darkMode ? 'bg-[#121212] border-[#2a2a2a]' : 'bg-white border-[#d4cdc0]'
              }`}>
                <input
                  type="time"
                  value={newEventTime}
                  onChange={(e) => setNewEventTime(e.target.value)}
                  onTouchStart={(e) => e.stopPropagation()}
                  onTouchMove={(e) => e.stopPropagation()}
                  className={`w-full px-3 py-2 text-lg focus:outline-none min-h-[44px] ${
                    darkMode ? 'bg-[#121212] text-white' : 'bg-white text-gray-900'
                  }`}
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                />
              </div>
            )}

            <Button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleAddEvent();
              }}
              onTouchStart={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (newEventText.trim() && (isAllDay || newEventTime)) {
                  handleAddEvent();
                }
              }}
              className="w-full py-3 text-lg min-h-[44px] touch-manipulation"
              style={{ WebkitTapHighlightColor: 'transparent' }}
              disabled={!newEventText.trim() || (!isAllDay && !newEventTime)}
            >
              완료
            </Button>
            <p className="text-xs text-gray-500 mt-2 text-center">
              일정 저장: {events.filter(e => e.date === selectedDateStr).length}/100 | 휴지통 버튼을 눌러 삭제
            </p>
          </div>

          {/* 일정 리스트 */}
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {sortedEvents.map((event) => (
              <div
                key={event.id}
                className={`p-3 sm:p-4 rounded-xl border-2 transition-all ${
                  darkMode
                    ? 'bg-gradient-to-br from-[#1a1a1a] to-[#121212] border-[#2a2a2a] hover:border-[#333333]'
                    : 'bg-gradient-to-br from-white to-[#f5f1e8] border-[#d4cdc0] hover:border-[#8B7355]'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap ${
                        darkMode ? 'bg-[#1a1a1a] text-white' : 'bg-[#8B7355] text-white'
                      }`}>
                        {event.isAllDay ? '하루종일' : event.time}
                      </span>
                      {event.isAllDay && (
                        <span className={`text-xs whitespace-nowrap ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>00:00부터 1시간마다 알림</span>
                      )}
                    </div>
                    <div className={`font-medium text-base sm:text-lg break-words ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>{event.text}</div>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleToggleAlarm(event.id);
                      }}
                      onTouchStart={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onTouchEnd={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleToggleAlarm(event.id);
                      }}
                      className={`min-h-[44px] min-w-[80px] px-3 sm:px-4 py-2 rounded-lg transition-colors whitespace-nowrap touch-manipulation ${
                        event.alarmOn
                          ? darkMode
                            ? 'bg-[#1a1a1a] text-white active:bg-[#222222]'
                            : 'bg-[#8B7355] text-white active:bg-[#6d5943]'
                          : darkMode
                          ? 'bg-[#0a0a0a] text-gray-400 active:bg-[#1a1a1a]'
                          : 'bg-gray-300 text-gray-600 active:bg-gray-400'
                      }`}
                      style={{ WebkitTapHighlightColor: 'transparent' }}
                    >
                      알림 {event.alarmOn ? 'ON' : 'OFF'}
                    </button>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDeleteTarget({ type: 'event', id: event.id });
                      }}
                      onTouchStart={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onTouchEnd={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDeleteTarget({ type: 'event', id: event.id });
                      }}
                      className="min-h-[44px] min-w-[44px] p-2 text-red-500 active:bg-red-50 rounded-lg transition-colors touch-manipulation flex items-center justify-center"
                      title="삭제"
                      style={{ WebkitTapHighlightColor: 'transparent' }}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {sortedEvents.length === 0 && (
              <div className={`text-center py-12 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                <p className="text-lg">일정이 없습니다</p>
                <p className="text-sm mt-2">위에서 일정을 추가해보세요!</p>
              </div>
            )}
          </div>
        </div>

        {/* 선택한 날짜의 할 일 */}
        <div className={`rounded-2xl border-2 shadow-lg p-6 ${
          darkMode ? 'bg-[#121212] border-[#2a2a2a]' : 'bg-white border-[#8B7355]'
        }`}>
          <h3 className={`text-xl font-bold mb-4 pb-3 border-b-2 ${
            darkMode ? 'text-white border-[#2a2a2a]' : 'text-gray-900 border-[#d4c4a8]'
          }`}>
            ✅ {selectedDate.getFullYear()}년 {selectedDate.getMonth() + 1}월 {selectedDate.getDate()}일 할 일
          </h3>

          <div className="mb-4 flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={newTaskText}
              onChange={(e) => setNewTaskText(e.target.value.slice(0, 20))}
              onKeyPress={(e) => e.key === 'Enter' && handleAddTask()}
              onTouchStart={(e) => e.stopPropagation()}
              onTouchMove={(e) => e.stopPropagation()}
              placeholder="할 일을 입력하세요 (최대 20자)"
              className={`flex-1 px-4 py-3 border-2 rounded-lg focus:outline-none min-h-[44px] ${
                darkMode
                  ? 'bg-[#1a1a1a] border-[#2a2a2a] text-white placeholder-gray-400 focus:border-[#333333]'
                  : 'border-[#d4cdc0] focus:border-[#8B7355]'
              }`}
              maxLength={20}
              style={{ WebkitTapHighlightColor: 'transparent' }}
            />
            <Button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleAddTask();
              }}
              onTouchStart={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (newTaskText.trim()) {
                  handleAddTask();
                }
              }}
              className="px-6 min-h-[44px] touch-manipulation"
              style={{ WebkitTapHighlightColor: 'transparent' }}
              disabled={!newTaskText.trim()}
            >
              추가
            </Button>
          </div>
          <p className="text-xs text-gray-500 mb-3 text-center">
            할 일 저장: {selectedDateTasks.length}/100 | 체크 버튼을 눌러 삭제
          </p>

          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {selectedDateTasks.map((task) => (
              <div
                key={task.id}
                className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                  darkMode
                    ? 'bg-[#1a1a1a] active:bg-[#222222]'
                    : 'bg-[#f5f1e8] active:bg-[#e8dcc8]'
                }`}
              >
                <span className={`flex-1 break-words ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>{task.text}</span>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleDeleteTask(task.id);
                  }}
                  onTouchStart={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleDeleteTask(task.id);
                  }}
                  className={`min-h-[44px] min-w-[44px] border-2 rounded transition-colors flex items-center justify-center text-sm font-bold flex-shrink-0 touch-manipulation ${
                    darkMode
                      ? 'border-[#2a2a2a] active:bg-[#1a1a1a] active:text-white'
                      : 'border-[#8B7355] active:bg-[#8B7355] active:text-white'
                  }`}
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                  ✓
                </button>
              </div>
            ))}
            {selectedDateTasks.length === 0 && (
              <p className={`text-center py-8 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>할 일이 없습니다</p>
            )}
          </div>
        </div>

        {/* 삭제 확인 모달 */}
        {deleteTarget && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className={`rounded-2xl p-8 max-w-sm mx-4 ${
              darkMode ? 'bg-[#121212]' : 'bg-white'
            }`}>
              <h3 className={`text-xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>삭제하시겠습니까?</h3>
              <div className="flex gap-3">
                <Button
                  onClick={confirmDelete}
                  className="flex-1 bg-red-500 hover:bg-red-600"
                >
                  Yes
                </Button>
                <Button
                  onClick={() => setDeleteTarget(null)}
                  variant="secondary"
                  className="flex-1"
                >
                  No
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
