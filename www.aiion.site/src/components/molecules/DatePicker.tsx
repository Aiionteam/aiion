import React, { useRef, useEffect, useState } from 'react';

interface DatePickerProps {
  year: number;
  month: number;
  day: number;
  dayOfWeek: string;
  onChange: (year: number, month: number, day: number, dayOfWeek: string) => void;
  darkMode?: boolean;
}

export const DatePicker: React.FC<DatePickerProps> = ({
  year,
  month,
  day,
  dayOfWeek,
  onChange,
  darkMode = false,
}) => {
  // 해당 월의 마지막 날짜 계산
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month, 0).getDate();
  };

  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];

  // 데이터 배열 생성
  const years = Array.from({ length: 101 }, (_, i) => new Date().getFullYear() - 50 + i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const days = Array.from({ length: getDaysInMonth(year, month) }, (_, i) => i + 1);
  const dayOfWeeks = dayNames;

  // 각 피커의 ref
  const yearRef = useRef<HTMLDivElement>(null);
  const monthRef = useRef<HTMLDivElement>(null);
  const dayRef = useRef<HTMLDivElement>(null);
  const dayOfWeekRef = useRef<HTMLDivElement>(null);

  const itemHeight = 40;
  const visibleItems = 3; // 보이는 항목 수 (선택된 항목 + 위아래 각 1개)

  // 스크롤 위치 계산
  const scrollToIndex = (container: HTMLDivElement, index: number) => {
    const scrollTop = index * itemHeight - (container.clientHeight / 2 - itemHeight / 2);
    container.scrollTo({ top: Math.max(0, scrollTop), behavior: 'smooth' });
  };

  // 초기 스크롤 위치 설정
  useEffect(() => {
    const current = yearRef.current;
    if (current) {
      const yearIndex = years.indexOf(year);
      if (yearIndex >= 0) {
        scrollToIndex(current, yearIndex);
      }
    }
  }, []);

  useEffect(() => {
    const current = monthRef.current;
    if (current) {
      scrollToIndex(current, month - 1);
    }
  }, []);

  useEffect(() => {
    const current = dayRef.current;
    if (current) {
      scrollToIndex(current, day - 1);
    }
  }, [day, days.length]);

  useEffect(() => {
    const current = dayOfWeekRef.current;
    if (current) {
      const dayOfWeekIndex = dayNames.indexOf(dayOfWeek);
      if (dayOfWeekIndex >= 0) {
        scrollToIndex(current, dayOfWeekIndex);
      }
    }
  }, []);

  // 스크롤 이벤트 핸들러
  const handleScroll = (
    container: HTMLDivElement,
    items: (number | string)[],
    handler: (value: number | string) => void
  ) => {
    const scrollTop = container.scrollTop;
    const index = Math.round(scrollTop / itemHeight);
    if (index >= 0 && index < items.length) {
      const value = items[index];
      handler(value);
    }
  };

  // 변경 핸들러
  const handleYearChange = (newYear: number) => {
    const maxDay = getDaysInMonth(newYear, month);
    const newDay = day > maxDay ? maxDay : day;
    const date = new Date(newYear, month - 1, newDay);
    onChange(newYear, month, newDay, dayNames[date.getDay()]);
  };

  const handleMonthChange = (newMonth: number) => {
    const maxDay = getDaysInMonth(year, newMonth);
    const newDay = day > maxDay ? maxDay : day;
    const date = new Date(year, newMonth - 1, newDay);
    onChange(year, newMonth, newDay, dayNames[date.getDay()]);
  };

  const handleDayChange = (newDay: number) => {
    const date = new Date(year, month - 1, newDay);
    onChange(year, month, newDay, dayNames[date.getDay()]);
  };

  const handleDayOfWeekChange = (newDayOfWeek: string) => {
    const currentDate = new Date(year, month - 1, day);
    const currentDayOfWeek = currentDate.getDay();
    const targetDayOfWeek = dayNames.indexOf(newDayOfWeek);
    const diff = targetDayOfWeek - currentDayOfWeek;
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + diff);
    const maxDay = getDaysInMonth(newDate.getFullYear(), newDate.getMonth() + 1);
    const adjustedDay = Math.min(newDate.getDate(), maxDay);
    onChange(newDate.getFullYear(), newDate.getMonth() + 1, adjustedDay, newDayOfWeek);
  };

  // 피커 렌더링 함수
  const renderPicker = (
    ref: React.RefObject<HTMLDivElement | null>,
    items: (number | string)[],
    label: string,
    selectedValue: number | string,
    onChange: (value: number | string) => void,
    formatValue?: (value: number | string) => string
  ) => {
    const selectedIndex = items.indexOf(selectedValue);

    return (
      <div className="flex-1 flex flex-col items-center min-w-0">
        <div className="text-xs text-white/60 mb-1 font-medium">{label}</div>
        <div className="relative w-full h-24 overflow-hidden">
          {/* 선택 가이드 영역 */}
          <div className="absolute top-1/2 left-0 right-0 h-10 border-t-2 border-b-2 border-white/30 pointer-events-none transform -translate-y-1/2 z-10" />
          
          {/* 스크롤 컨테이너 */}
          <div
            ref={ref}
            onScroll={() => {
              if (ref.current) {
                handleScroll(ref.current, items, onChange);
              }
            }}
            className="w-full h-full overflow-y-auto snap-y snap-mandatory [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
            style={{
              scrollSnapType: 'y mandatory',
            }}
          >
            {/* 상단 패딩 */}
            <div style={{ height: `${(visibleItems - 1) / 2 * itemHeight}px` }} />
            
            {/* 항목들 */}
            {items.map((item, index) => {
              const isSelected = index === selectedIndex;
              const displayValue = formatValue ? formatValue(item) : String(item);
              
              return (
                <div
                  key={index}
                  className="snap-center cursor-pointer transition-all select-none"
                  style={{ height: `${itemHeight}px` }}
                  onClick={() => {
                    onChange(item);
                    if (ref.current) {
                      scrollToIndex(ref.current, index);
                    }
                  }}
                >
                  <div
                    className={`h-full flex items-center justify-center transition-all ${
                      isSelected
                        ? 'text-white font-bold text-lg scale-110'
                        : 'text-white/50 text-sm'
                    }`}
                  >
                    {displayValue}
                  </div>
                </div>
              );
            })}
            
            {/* 하단 패딩 */}
            <div style={{ height: `${(visibleItems - 1) / 2 * itemHeight}px` }} />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex items-center gap-1 sm:gap-2 bg-gradient-to-r from-[#8B7355] to-[#6d5943] text-white px-2 sm:px-4 py-2 sm:py-3 rounded-lg shadow-sm flex-1 min-w-0">
      <svg className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
      
      <div className="flex gap-1 sm:gap-2 items-center flex-1 min-w-0">
        {renderPicker(yearRef, years, '년', year, (value) => handleYearChange(value as number))}
        <div className="text-white/40 text-xs sm:text-sm flex-shrink-0">/</div>
        {renderPicker(monthRef, months, '월', month, (value) => handleMonthChange(value as number))}
        <div className="text-white/40 text-xs sm:text-sm flex-shrink-0">/</div>
        {renderPicker(dayRef, days, '일', day, (value) => handleDayChange(value as number))}
        <div className="text-white/40 text-xs sm:text-sm flex-shrink-0 ml-1">·</div>
        {renderPicker(dayOfWeekRef, dayOfWeeks, '요일', dayOfWeek, (value) => handleDayOfWeekChange(value as string), (dow) => `${dow}요일`)}
      </div>
    </div>
  );
};
