/**
 * 파싱 유틸리티 함수
 */

/**
 * 카테고리 키워드 추출 (일기, 캘린더, 건강 등)
 */
export const extractCategories = (text: string): string[] => {
  const categories: string[] = [];

  // 일기 관련
  if (
    text.includes('일기') ||
    text.includes('하루') ||
    text.includes('오늘') ||
    text.includes('감정') ||
    text.includes('기분') ||
    text.includes('생각')
  ) {
    categories.push('일기');
  }

  // 캘린더 관련
  if (
    text.includes('일정') ||
    text.includes('약속') ||
    text.includes('회의') ||
    text.includes('모임') ||
    text.includes('스케줄') ||
    text.includes('예약') ||
    text.includes('월') ||
    text.includes('일') ||
    text.includes('시') ||
    text.includes('오전') ||
    text.includes('오후') ||
    text.includes('내일') ||
    text.includes('다음주') ||
    text.includes('다음 달')
  ) {
    categories.push('캘린더');
  }

  // 건강 관련
  if (
    text.includes('운동') ||
    text.includes('걷기') ||
    text.includes('산책') ||
    text.includes('헬스') ||
    text.includes('요가') ||
    text.includes('달리기') ||
    text.includes('건강') ||
    text.includes('병원') ||
    text.includes('검진') ||
    text.includes('약') ||
    text.includes('복용') ||
    text.includes('인바디')
  ) {
    categories.push('건강');
  }

  // 문화 관련
  if (
    text.includes('문화') ||
    text.includes('영화') ||
    text.includes('공연') ||
    text.includes('여행') ||
    text.includes('파티') ||
    text.includes('친구') ||
    text.includes('콘서트') ||
    text.includes('전시') ||
    text.includes('뮤지컬') ||
    text.includes('연극') ||
    text.includes('카페') ||
    text.includes('맛집')
  ) {
    categories.push('문화');
  }

  // 가계 관련
  if (
    text.includes('원') ||
    text.includes('가격') ||
    text.includes('구매') ||
    text.includes('지출') ||
    text.includes('수입') ||
    text.includes('돈') ||
    text.includes('결제') ||
    text.includes('카드') ||
    text.includes('계좌') ||
    text.includes('세금') ||
    text.includes('예산') ||
    text.includes('저축')
  ) {
    categories.push('가계');
  }

  // 자기개발 관련
  if (
    text.includes('학습') ||
    text.includes('공부') ||
    text.includes('강의') ||
    text.includes('자기개발') ||
    text.includes('스킬') ||
    text.includes('능력') ||
    text.includes('커리어') ||
    text.includes('직무') ||
    text.includes('로드맵')
  ) {
    categories.push('자기개발');
  }

  return categories;
};

