/**
 * 날짜 유틸리티 함수
 */

/**
 * 로컬 날짜를 YYYY-MM-DD 형식으로 변환 (타임존 이슈 방지)
 */
export const getLocalDateStr = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * 요일 이름 반환
 */
export const getDayOfWeek = (date: Date, format: 'short' | 'long' = 'short'): string => {
  const dayNames =
    format === 'short'
      ? ['일', '월', '화', '수', '목', '금', '토']
      : ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
  return dayNames[date.getDay()];
};

/**
 * 날짜 문자열을 Date 객체로 변환
 */
export const parseDateStr = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

/**
 * 두 날짜 사이의 일수 계산
 */
export const daysBetween = (date1: Date, date2: Date): number => {
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.round(Math.abs((date1.getTime() - date2.getTime()) / oneDay));
};

