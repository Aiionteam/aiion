import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Button, Input } from '../atoms';
import { DiaryView as DiaryViewType, Diary } from '../types';
import { useCreateDiary, useUpdateDiary, useDeleteDiary } from '../../app/hooks/useDiary';
import {
  saveDiaryService,
  deleteDiaryService,
  validateDiaryForm,
} from '../../app/services/diaryService';
import { useStore } from '../../store';
import { fetchUserById } from '../../app/hooks/useUserApi';

interface DiaryViewProps {
  diaryView: DiaryViewType;
  setDiaryView: (view: DiaryViewType) => void;
  diaries: Diary[];
  setDiaries: (diaries: Diary[] | ((prev: Diary[]) => Diary[])) => void;
  darkMode?: boolean;
}

// 일기 행 클릭 핸들러를 메모이제이션하기 위한 함수
const DiaryViewComponent: React.FC<DiaryViewProps> = ({
  diaryView,
  setDiaryView,
  diaries,
  setDiaries,
  darkMode = false,
}) => {
  // 사용자 정보 가져오기
  const user = useStore((state) => state.user?.user);
  const [nickname, setNickname] = useState<string>('회원');

  // API에서 최신 닉네임 가져오기
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
          console.error('[DiaryView] 닉네임 로드 실패:', err);
          setNickname('회원');
        }
      } else {
        setNickname('회원');
      }
    };

    loadNickname();
  }, [user?.id]);
  
  // 디버깅: diaries prop 확인
  console.log('[DiaryView] 렌더링:', {
    diaryView,
    diariesLength: diaries?.length,
    diaries: diaries?.slice(0, 3), // 처음 3개만 로그
    isArray: Array.isArray(diaries)
  });
  
  const [selectedDiary, setSelectedDiary] = useState<Diary | null>(null);
  const [newDiaryTitle, setNewDiaryTitle] = useState('');
  const [newDiaryContent, setNewDiaryContent] = useState('');
  const [selectedEmotion, setSelectedEmotion] = useState('😊');
  // 이전 뷰를 추적하여 뒤로가기 시 올바른 뷰로 돌아가기
  const [previousView, setPreviousView] = useState<DiaryViewType>('home');
  
  // 디버깅: diaries 상태 확인
  console.log('[DiaryView] 현재 diaries:', diaries?.length, '개', diaries);
  const [selectedDate, setSelectedDate] = useState({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    day: new Date().getDate(),
    dayOfWeek: ['일', '월', '화', '수', '목', '금', '토'][new Date().getDay()]
  });
  const [errorMessage, setErrorMessage] = useState('');
  
  // React Query Mutations
  const createDiaryMutation = useCreateDiary();
  const updateDiaryMutation = useUpdateDiary();
  const deleteDiaryMutation = useDeleteDiary();
  
  // 삭제 확인 모달 상태
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // 일기 행 클릭 핸들러 메모이제이션
  const handleDiaryClick = useCallback((diary: Diary) => {
    // 수정 모드로 진입: 기존 일기 데이터를 로드
    setSelectedDiary(diary);
    setNewDiaryTitle(diary.title);
    setNewDiaryContent(diary.content);
    setSelectedEmotion(diary.emotion);
    
    // 날짜 파싱
    const dateParts = diary.date.split('-');
    const dateObj = new Date(diary.date);
    setSelectedDate({
      year: parseInt(dateParts[0]),
      month: parseInt(dateParts[1]),
      day: parseInt(dateParts[2]),
      dayOfWeek: ['일', '월', '화', '수', '목', '금', '토'][dateObj.getDay()]
    });
    
    // 현재 뷰를 이전 뷰로 저장하고 write 뷰로 이동
    setPreviousView(diaryView);
    setDiaryView('write');
  }, [setDiaryView, diaryView]);

  // 일기 리스트 렌더링 최적화: 날짜 파싱 결과 메모이제이션 및 최신순 정렬
  const processedDiaries = useMemo(() => {
    return diaries
      .map((diary) => {
        const dateObj = new Date(diary.date);
        return {
          ...diary,
          year: dateObj.getFullYear(),
          month: dateObj.getMonth() + 1,
          day: dateObj.getDate(),
          dayOfWeek: ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'][dateObj.getDay()],
          dateTimestamp: dateObj.getTime(), // 정렬을 위한 타임스탬프
        };
      })
      .sort((a, b) => {
        // 날짜 내림차순 정렬 (최신순)
        return b.dateTimestamp - a.dateTimestamp;
      });
  }, [diaries]);

  // Home 뷰
  if (diaryView === 'home') {
    return (
      <div className={`flex-1 flex flex-col ${darkMode ? 'bg-[#0a0a0a]' : ''}`}>
        <div className="flex-1 overflow-y-auto p-4 md:p-6" style={{ WebkitOverflowScrolling: 'touch' }}>
          <div className="max-w-4xl mx-auto space-y-4">
            <div className="text-center py-4">
              <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>일기</h1>
            </div>

            <div className={`rounded-2xl border-2 p-8 shadow-lg ${
              darkMode 
                ? 'bg-[#121212] border-[#2a2a2a]' 
                : 'bg-white border-[#8B7355]'
            }`}>
              <h2 className={`text-2xl font-bold mb-4 text-center border-b-2 pb-3 ${
                darkMode 
                  ? 'text-white border-[#2a2a2a]' 
                  : 'text-gray-900 border-[#d4c4a8]'
              }`}>
                📊 종합감정 분석
              </h2>
              <div className={`leading-relaxed text-sm ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                <p className={`text-center py-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {diaries.length === 0 
                    ? `${nickname}님, 아직 작성된 일기가 없습니다. 첫 일기를 작성해보세요!`
                    : `${nickname}님, 총 ${diaries.length}개의 일기가 작성되었습니다.`}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <Button
                onClick={() => {
                  // 새 일기 작성 모드: 상태 초기화
                  setSelectedDiary(null);
                  setNewDiaryTitle('');
                  setNewDiaryContent('');
                  setSelectedEmotion('😊');
                  setSelectedDate({
                    year: new Date().getFullYear(),
                    month: new Date().getMonth() + 1,
                    day: new Date().getDate(),
                    dayOfWeek: ['일', '월', '화', '수', '목', '금', '토'][new Date().getDay()]
                  });
                  setErrorMessage('');
                  setDiaryView('write');
                }}
                className={`rounded-2xl border-2 p-12 hover:shadow-lg hover:scale-105 transition-all duration-200 ${
                  darkMode
                    ? 'bg-gradient-to-br from-[#1a1a1a] to-[#121212] border-[#2a2a2a]'
                    : 'bg-gradient-to-br from-white to-[#f5f0e8] border-[#8B7355]'
                }`}
              >
                <div className="flex flex-col items-center space-y-3">
                  <span className="text-4xl">✍️</span>
                  <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>일기쓰기</p>
                </div>
              </Button>
              <Button
                onClick={() => setDiaryView('list')}
                className={`rounded-2xl border-2 p-12 hover:shadow-lg hover:scale-105 transition-all duration-200 ${
                  darkMode
                    ? 'bg-gradient-to-br from-[#1a1a1a] to-[#121212] border-[#2a2a2a]'
                    : 'bg-gradient-to-br from-white to-[#f5f0e8] border-[#8B7355]'
                }`}
              >
                <div className="flex flex-col items-center space-y-3">
                  <span className="text-4xl">📋</span>
                  <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>일기리스트</p>
                </div>
              </Button>
            </div>

            <Button
              onClick={() => setDiaryView('analysis')}
              className={`w-full rounded-2xl border-2 p-12 hover:shadow-lg hover:scale-105 transition-all duration-200 ${
                darkMode
                  ? 'bg-gradient-to-br from-[#1a1a1a] to-[#121212] border-[#2a2a2a]'
                  : 'bg-gradient-to-br from-white to-[#f5f0e8] border-[#8B7355]'
              }`}
            >
              <div className="flex flex-col items-center space-y-3">
                <span className="text-4xl">📈</span>
                <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>감정분석 그래프</p>
              </div>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const handleSave = async () => {
    console.log('[DiaryView] handleSave 호출');
    
    // 서비스를 통한 유효성 검사
    const validation = validateDiaryForm({
      year: selectedDate.year,
      month: selectedDate.month,
      day: selectedDate.day,
      title: newDiaryTitle,
      content: newDiaryContent,
      emotion: selectedEmotion,
    });

    if (!validation.isValid) {
      console.log('[DiaryView] 유효성 검사 실패:', validation.errorMessage);
      setErrorMessage(validation.errorMessage);
      return;
    }

    // 서비스를 통한 저장 처리
    const result = await saveDiaryService({
      formData: {
        year: selectedDate.year,
        month: selectedDate.month,
        day: selectedDate.day,
        title: newDiaryTitle,
        content: newDiaryContent,
        emotion: selectedEmotion,
      },
      selectedDiary,
      createDiaryMutation,
      updateDiaryMutation,
    });

    if (result.success) {
      // 저장 성공 시 상태 초기화 및 일기 홈으로 즉시 이동
      setNewDiaryTitle('');
      setNewDiaryContent('');
      setSelectedEmotion('😊');
      setSelectedDiary(null);
      setErrorMessage('');
      
      // 일기 홈으로 즉시 이동 (저장 성공 후 항상 홈으로)
      setDiaryView('home');
      console.log('[DiaryView] ✅ 저장 성공, 일기 홈으로 이동 완료');
    } else {
      // 에러 발생 시에는 write 뷰에 머물러서 에러 메시지를 볼 수 있도록 함
      setErrorMessage(result.errorMessage || '일기를 저장하는데 실패했습니다.');
    }
  };

  const handleDelete = async () => {
    if (!selectedDiary) return;
    
    // 서비스를 통한 삭제 처리
    const result = await deleteDiaryService({
      selectedDiary,
      deleteDiaryMutation,
    });

    if (result.success) {
      // 삭제 성공 시 상태 초기화 및 이전 뷰로 이동
      setSelectedDiary(null);
      setShowDeleteConfirm(false);
      setDiaries(prev => prev.filter(d => d.id !== selectedDiary.id));
      setDiaryView(previousView === 'list' ? 'list' : 'home');
      console.log('[DiaryView] 삭제 성공');
    } else {
      // 에러 발생 시
      setErrorMessage(result.errorMessage || '일기를 삭제하는데 실패했습니다.');
      setShowDeleteConfirm(false);
    }
  };

  // Write 뷰
  if (diaryView === 'write') {
    return (
      <div className={`flex-1 flex flex-col overflow-hidden ${
        darkMode 
          ? 'bg-gradient-to-br from-[#121212] to-[#0a0a0a]' 
          : 'bg-gradient-to-br from-[#f5f1e8] to-[#e8dcc8]'
      }`}>
        {/* 상단 헤더 - 뒤로가기 + 날짜 */}
        <div className={`sticky top-0 z-10 border-b shadow-sm overflow-hidden ${
          darkMode ? 'bg-[#121212] border-[#2a2a2a]' : 'bg-white border-[#d4c4a8]'
        }`}>
          <div className="max-w-5xl mx-auto p-2 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-4 overflow-hidden">
              <button
                onClick={() => {
                  setNewDiaryTitle('');
                  setNewDiaryContent('');
                  setSelectedDiary(null);
                  setSelectedEmotion('😊');
                  setErrorMessage('');
                  // 이전 뷰로 돌아가기 (리스트에서 왔으면 리스트로, 홈에서 왔으면 홈으로)
                  setDiaryView(previousView);
                }}
                className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg transition-colors flex-shrink-0 ${
                  darkMode
                    ? 'text-gray-300 hover:text-white hover:bg-[#1a1a1a]'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-[#f5f1e8]'
                }`}
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div 
                className="flex items-center gap-1 sm:gap-2 bg-gradient-to-r from-[#8B7355] to-[#6d5943] text-white px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg shadow-sm flex-1 min-w-0"
                style={{ 
                  touchAction: 'none',
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                  WebkitTapHighlightColor: 'transparent'
                }}
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <input
                  type="number"
                  value={selectedDate.year}
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    if (!isNaN(value) && value >= 1000 && value <= 9999) {
                      const date = new Date(value, selectedDate.month - 1, selectedDate.day);
                      const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
                      setSelectedDate({
                        ...selectedDate,
                        year: value,
                        dayOfWeek: dayNames[date.getDay()]
                      });
                      setErrorMessage('');
                    } else if (e.target.value === '') {
                      setSelectedDate({...selectedDate, year: new Date().getFullYear()});
                    }
                  }}
                  onTouchStart={(e) => e.stopPropagation()}
                  onTouchMove={(e) => e.stopPropagation()}
                  min={1000}
                  max={9999}
                  className="w-12 sm:w-16 bg-transparent text-center focus:outline-none text-white font-medium text-sm sm:text-base"
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                />
                <span className="text-white/80 text-xs sm:text-sm">/</span>
                <input
                  type="number"
                  value={selectedDate.month}
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    if (!isNaN(value) && value >= 1 && value <= 12) {
                      const maxDay = new Date(selectedDate.year, value, 0).getDate();
                      const newDay = selectedDate.day > maxDay ? maxDay : selectedDate.day;
                      const date = new Date(selectedDate.year, value - 1, newDay);
                      const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
                      setSelectedDate({
                        ...selectedDate,
                        month: value,
                        day: newDay,
                        dayOfWeek: dayNames[date.getDay()]
                      });
                      setErrorMessage('');
                    } else if (e.target.value === '') {
                      setSelectedDate({...selectedDate, month: new Date().getMonth() + 1});
                    }
                  }}
                  onTouchStart={(e) => e.stopPropagation()}
                  onTouchMove={(e) => e.stopPropagation()}
                  min={1}
                  max={12}
                  className="w-8 sm:w-10 bg-transparent text-center focus:outline-none text-white font-medium text-sm sm:text-base"
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                />
                <span className="text-white/80 text-xs sm:text-sm">/</span>
                <input
                  type="number"
                  value={selectedDate.day}
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    const maxDay = new Date(selectedDate.year, selectedDate.month, 0).getDate();
                    if (!isNaN(value) && value >= 1 && value <= maxDay) {
                      const date = new Date(selectedDate.year, selectedDate.month - 1, value);
                      const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
                      setSelectedDate({
                        ...selectedDate,
                        day: value,
                        dayOfWeek: dayNames[date.getDay()]
                      });
                      setErrorMessage('');
                    } else if (e.target.value === '') {
                      setSelectedDate({...selectedDate, day: new Date().getDate()});
                    }
                  }}
                  onTouchStart={(e) => e.stopPropagation()}
                  onTouchMove={(e) => e.stopPropagation()}
                  min={1}
                  max={31}
                  className="w-8 sm:w-10 bg-transparent text-center focus:outline-none text-white font-medium text-sm sm:text-base"
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                />
                <select
                  value={selectedDate.dayOfWeek}
                  onChange={(e) => {
                    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
                    const currentDate = new Date(selectedDate.year, selectedDate.month - 1, selectedDate.day);
                    const currentDayOfWeek = currentDate.getDay();
                    const targetDayOfWeek = dayNames.indexOf(e.target.value);
                    const diff = targetDayOfWeek - currentDayOfWeek;
                    const newDate = new Date(currentDate);
                    newDate.setDate(currentDate.getDate() + diff);
                    const maxDay = new Date(newDate.getFullYear(), newDate.getMonth() + 1, 0).getDate();
                    const adjustedDay = Math.min(newDate.getDate(), maxDay);
                    setSelectedDate({
                      ...selectedDate,
                      day: adjustedDay,
                      month: newDate.getMonth() + 1,
                      year: newDate.getFullYear(),
                      dayOfWeek: e.target.value
                    });
                  }}
                  onTouchStart={(e) => e.stopPropagation()}
                  onTouchMove={(e) => e.stopPropagation()}
                  className="bg-transparent focus:outline-none text-white font-medium cursor-pointer text-xs sm:text-sm flex-shrink-0 ml-1 sm:ml-0"
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                  {['일', '월', '화', '수', '목', '금', '토'].map(day => (
                    <option key={day} value={day} className="bg-[#8B7355] text-white">{`${day}요일`}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* 메인 컨텐츠 */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto">
            <div className={`rounded-xl shadow-lg border overflow-hidden ${
              darkMode ? 'bg-[#121212] border-[#2a2a2a]' : 'bg-white border-[#d4c4a8]'
            }`}>
              {/* 제목 입력 */}
              <div className={`p-6 border-b ${darkMode ? 'border-[#2a2a2a]' : 'border-[#d4c4a8]'}`}>
                <div className="flex items-center gap-3 mb-2">
                  <svg className={`w-6 h-6 ${darkMode ? 'text-gray-400' : 'text-[#8B7355]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="오늘의 제목을 입력하세요..."
                    value={newDiaryTitle}
                    onChange={(e) => {
                      if (e.target.value.length <= 30) {
                        setNewDiaryTitle(e.target.value);
                        setErrorMessage('');
                      }
                    }}
                    maxLength={30}
                    className={`flex-1 text-2xl font-bold focus:outline-none ${
                      darkMode 
                        ? 'bg-[#121212] text-white placeholder-gray-500' 
                        : 'bg-white text-gray-900 placeholder-gray-400'
                    }`}
                  />
                  <span className="text-sm text-gray-400 whitespace-nowrap">
                    {newDiaryTitle.length}/30
                  </span>
                </div>
                {errorMessage && (
                  <p className="mt-2 text-sm text-red-600 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {errorMessage}
                  </p>
                )}
              </div>

              {/* 내용 입력 */}
              <div className="p-6">
                <textarea
                  placeholder="오늘 하루는 어땠나요? 자유롭게 기록해보세요..."
                  value={newDiaryContent}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value.length <= 9999) {
                      setNewDiaryContent(value);
                      setErrorMessage('');
                    } else {
                      setErrorMessage('텍스트가 너무 길어 저장할 수 없습니다.');
                    }
                  }}
                  maxLength={9999}
                  className={`w-full h-96 focus:outline-none resize-none leading-relaxed ${
                    darkMode
                      ? 'bg-[#121212] text-gray-200 placeholder-gray-500'
                      : 'bg-white text-gray-900 placeholder-gray-400'
                  }`}
                />
                <div className={`flex justify-between items-center mt-4 pt-4 border-t ${
                  darkMode ? 'border-[#2a2a2a]' : 'border-[#d4c4a8]'
                }`}>
                  <span className="text-sm text-gray-400">
                    {newDiaryContent.length}/9999 자
                  </span>
                  <div className="flex items-center gap-3">
                    {/* 삭제 버튼 - 기존 일기를 수정하는 경우에만 표시 */}
                    {selectedDiary && (
                      <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className={`flex items-center gap-2 px-4 py-3 font-medium rounded-lg hover:shadow-lg transition-all ${
                          darkMode
                            ? 'bg-red-900/30 hover:bg-red-900/50 text-red-400 border border-red-800/50'
                            : 'bg-red-50 hover:bg-red-100 text-red-600 border border-red-200'
                        }`}
                        title="일기 삭제"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        <span className="hidden sm:inline">삭제</span>
                      </button>
                    )}
                    <button
                      onClick={handleSave}
                      disabled={!newDiaryTitle.trim()}
                      className={`flex items-center gap-2 px-6 py-3 font-medium rounded-lg hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all ${
                        darkMode
                          ? 'bg-gradient-to-r from-[#1a1a1a] to-[#121212] text-white'
                          : 'bg-gradient-to-r from-[#8B7355] to-[#6d5943] text-white'
                      }`}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {selectedDiary ? '수정하기' : '저장하기'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* 삭제 확인 모달 */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className={`rounded-2xl p-6 max-w-md w-full mx-4 shadow-xl ${
              darkMode ? 'bg-[#1a1a1a] border border-[#2a2a2a]' : 'bg-white border border-[#d4c4a8]'
            }`}>
              <div className="flex items-center gap-3 mb-4">
                <div className={`p-3 rounded-full ${
                  darkMode ? 'bg-red-900/30' : 'bg-red-50'
                }`}>
                  <svg className={`w-6 h-6 ${darkMode ? 'text-red-400' : 'text-red-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    일기를 삭제하시겠습니까?
                  </h3>
                </div>
              </div>
              <p className={`text-sm mb-6 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                삭제된 일기는 복구할 수 없습니다. 정말 삭제하시겠습니까?
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className={`px-5 py-2.5 rounded-lg transition-colors font-medium ${
                    darkMode
                      ? 'text-gray-300 hover:text-white hover:bg-[#2a2a2a]'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  취소
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleteDiaryMutation.isPending}
                  className={`px-5 py-2.5 rounded-lg transition-colors font-medium ${
                    darkMode
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : 'bg-red-600 hover:bg-red-700 text-white'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {deleteDiaryMutation.isPending ? '삭제 중...' : '삭제하기'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // List 뷰
  if (diaryView === 'list') {
    return (
      <div className={`flex-1 flex flex-col overflow-hidden ${
        darkMode ? 'bg-[#0a0a0a]' : 'bg-[#f5f1e8]'
      }`}>
        <div className={`sticky top-0 z-10 border-b shadow-sm p-4 ${
          darkMode ? 'bg-[#121212] border-[#2a2a2a]' : 'bg-white border-[#d4c4a8]'
        }`}>
          <div className="max-w-5xl mx-auto flex items-center gap-4">
            <button
              onClick={() => setDiaryView('home')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                darkMode
                  ? 'text-gray-300 hover:text-white hover:bg-[#1a1a1a]'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-[#f5f1e8]'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>일기 리스트</h1>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-5xl mx-auto">
            <div className={`rounded-lg border-2 shadow-lg overflow-hidden ${
              darkMode ? 'bg-[#121212] border-[#2a2a2a]' : 'bg-white border-[#8B7355]'
            }`}>
              {/* 테이블 */}
              {!diaries || !Array.isArray(diaries) || diaries.length === 0 ? (
                <div className="p-8">
                  <p className={`text-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {diaries === undefined 
                      ? '일기를 불러오는 중...' 
                      : `작성된 일기가 없습니다. (diaries: ${diaries ? (Array.isArray(diaries) ? diaries.length : 'not array') : 'null'})`}
                  </p>
                </div>
              ) : (
                <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
                  <table className="w-full">
                    <tbody>
                      {processedDiaries.map((diary) => {
                        return (
                          <tr
                            key={diary.id}
                            className={`border-b cursor-pointer transition-colors last:border-b-0 ${
                              darkMode
                                ? 'border-[#2a2a2a] hover:bg-[#1a1a1a]'
                                : 'border-[#d4c4a8] hover:bg-[#f5f1e8]'
                            }`}
                            onClick={() => handleDiaryClick(diary)}
                          >
                            <td className={`border-r p-4 ${darkMode ? 'border-[#2a2a2a]' : 'border-[#d4c4a8]'}`}>
                              <div className="flex items-center gap-2">
                                <span className={`text-sm font-medium ${
                                  darkMode ? 'text-gray-400' : 'text-[#8B7355]'
                                }`}>제목:</span>
                                <span className={darkMode ? 'text-gray-200' : 'text-gray-900'}>
                                  {diary.title.length > 40 ? `${diary.title.substring(0, 40)}...` : diary.title}
                                </span>
                              </div>
                            </td>
                            <td className={`border-r p-4 text-center w-24 ${darkMode ? 'border-[#2a2a2a]' : 'border-[#d4c4a8]'}`}>
                              <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>{diary.year}</span>
                            </td>
                            <td className={`border-r p-4 text-center w-20 ${darkMode ? 'border-[#2a2a2a]' : 'border-[#d4c4a8]'}`}>
                              <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>{diary.month}</span>
                            </td>
                            <td className={`border-r p-4 text-center w-20 ${darkMode ? 'border-[#2a2a2a]' : 'border-[#d4c4a8]'}`}>
                              <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>{diary.day}</span>
                            </td>
                            <td className="p-4 text-center w-28">
                              <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>{diary.dayOfWeek}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Detail 뷰
  if (diaryView === 'detail' && selectedDiary) {
    return (
      <div className={`flex-1 flex flex-col overflow-hidden ${
        darkMode ? 'bg-[#0a0a0a]' : 'bg-[#f5f1e8]'
      }`}>
        <div className={`sticky top-0 z-10 border-b shadow-sm p-4 ${
          darkMode ? 'bg-[#121212] border-[#2a2a2a]' : 'bg-white border-[#d4c4a8]'
        }`}>
          <div className="max-w-4xl mx-auto flex items-center gap-4">
            <div className="flex items-center gap-4 flex-1">
              <button
                onClick={() => {
                  setSelectedDiary(null);
                  // 이전 뷰로 돌아가기 (리스트에서 왔으면 리스트로)
                  setDiaryView(previousView === 'list' ? 'list' : 'home');
                }}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                  darkMode
                    ? 'text-gray-300 hover:text-white hover:bg-[#1a1a1a]'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-[#f5f1e8]'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>일기 상세</h1>
            </div>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ml-auto ${
                darkMode
                  ? 'text-red-400 hover:text-red-300 hover:bg-[#2a1a1a] border border-red-500/30'
                  : 'text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-300'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span className="font-medium">삭제</span>
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto space-y-4">

            <div className={`rounded-2xl border-2 p-8 shadow-lg ${
              darkMode ? 'bg-[#121212] border-[#2a2a2a]' : 'bg-white border-[#8B7355]'
            }`}>
              <div className={`flex items-center gap-3 mb-4 pb-4 border-b-2 ${
                darkMode ? 'border-[#2a2a2a]' : 'border-[#d4c4a8]'
              }`}>
                <span className="text-4xl">{selectedDiary.emotion}</span>
                <div>
                  <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{selectedDiary.title}</h2>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{selectedDiary.date}</p>
                </div>
              </div>
              <div className={`leading-relaxed whitespace-pre-wrap ${
                darkMode ? 'text-gray-200' : 'text-gray-700'
              }`}>
                {selectedDiary.content}
              </div>
            </div>
          </div>
        </div>
        
        {/* 삭제 확인 모달 */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className={`rounded-2xl p-6 max-w-md w-full mx-4 ${
              darkMode ? 'bg-[#1a1a1a] border border-[#2a2a2a]' : 'bg-white border border-[#d4c4a8]'
            }`}>
              <h3 className={`text-xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                일기를 삭제하시겠습니까?
              </h3>
              <p className={`text-sm mb-6 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                삭제된 일기는 복구할 수 없습니다.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    darkMode
                      ? 'text-gray-300 hover:text-white hover:bg-[#2a2a2a]'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  취소
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleteDiaryMutation.isPending}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    darkMode
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : 'bg-red-600 hover:bg-red-700 text-white'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {deleteDiaryMutation.isPending ? '삭제 중...' : '삭제'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Analysis 뷰
  if (diaryView === 'analysis') {
    // 샘플 데이터
    const mbtiData = [
      { label: 'E vs I', value: 65 },
      { label: 'S vs N', value: 72 },
      { label: 'T vs F', value: 48 },
      { label: 'J vs P', value: 58 }
    ];

    const bigFiveData = [
      { label: '외향성', value: 52 },
      { label: '친화성', value: 75 },
      { label: '성실성', value: 68 },
      { label: '신경성', value: 45 },
      { label: '개방성', value: 62 }
    ];

    const weeklyData = [
      { day: '월', score: -0.5 },
      { day: '화', score: 0.3 },
      { day: '수', score: -0.2 },
      { day: '목', score: 0.5 },
      { day: '금', score: 0.8 },
      { day: '토', score: 0.6 },
      { day: '일', score: 0.2 }
    ];

    const monthlyData = [
      { date: '01월 17일', score: 0 },
      { date: '01월 27일', score: -0.3 },
      { date: '02월 07일', score: 0.5 },
      { date: '02월 17일', score: 0.2 },
      { date: '02월 27일', score: -0.2 },
      { date: '03월 07일', score: 0.7 },
      { date: '03월 17일', score: -0.4 },
      { date: '03월 27일', score: 0.4 }
    ];

    return (
      <div className={`flex-1 flex flex-col overflow-hidden ${
        darkMode ? 'bg-[#0a0a0a]' : 'bg-[#f5f1e8]'
      }`}>
        <div className={`sticky top-0 z-10 border-b shadow-sm p-4 ${
          darkMode ? 'bg-[#121212] border-[#2a2a2a]' : 'bg-white border-[#d4c4a8]'
        }`}>
          <div className="max-w-7xl mx-auto flex items-center gap-4">
            <button
              onClick={() => setDiaryView('home')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                darkMode
                  ? 'text-gray-300 hover:text-white hover:bg-[#1a1a1a]'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-[#f5f1e8]'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>감정 분석 그래프</h1>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* MBTI 그래프 */}
            <div className={`rounded-2xl border-2 p-6 shadow-lg ${
              darkMode ? 'bg-[#121212] border-[#2a2a2a]' : 'bg-white border-[#8B7355]'
            }`}>
              <h2 className={`text-xl font-bold text-center mb-6 border-b-2 pb-3 ${
                darkMode 
                  ? 'text-white border-[#2a2a2a]' 
                  : 'text-gray-900 border-[#d4c4a8]'
              }`}>MBTI</h2>
              <div className="space-y-4">
                {mbtiData.map((item, index) => (
                  <div key={index} className="flex items-center gap-4">
                    <div className={`w-20 text-sm font-medium ${
                      darkMode ? 'text-gray-300' : 'text-[#8B7355]'
                    }`}>{item.label}</div>
                    <div className={`flex-1 h-8 rounded relative ${
                      darkMode ? 'bg-[#1a1a1a]' : 'bg-[#f5f1e8]'
                    }`}>
                      <div
                        className={`h-full rounded transition-all ${
                          darkMode ? 'bg-[#333333]' : 'bg-[#8B7355]'
                        }`}
                        style={{ width: `${item.value}%` }}
                      ></div>
                    </div>
                    <div className={`w-12 text-sm text-right ${
                      darkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>{item.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* 빅 파이브 그래프 */}
            <div className={`rounded-2xl border-2 p-6 shadow-lg ${
              darkMode ? 'bg-[#121212] border-[#2a2a2a]' : 'bg-white border-[#8B7355]'
            }`}>
              <h2 className={`text-xl font-bold text-center mb-6 border-b-2 pb-3 ${
                darkMode 
                  ? 'text-white border-[#2a2a2a]' 
                  : 'text-gray-900 border-[#d4c4a8]'
              }`}>빅 파이브</h2>
              <div className="space-y-4">
                {bigFiveData.map((item, index) => (
                  <div key={index} className="flex items-center gap-4">
                    <div className={`w-20 text-sm font-medium ${
                      darkMode ? 'text-gray-300' : 'text-[#8B7355]'
                    }`}>{item.label}</div>
                    <div className={`flex-1 h-8 rounded relative ${
                      darkMode ? 'bg-[#1a1a1a]' : 'bg-[#f5f1e8]'
                    }`}>
                      <div
                        className={`h-full rounded transition-all ${
                          darkMode ? 'bg-[#333333]' : 'bg-[#8B7355]'
                        }`}
                        style={{ width: `${item.value}%` }}
                      ></div>
                    </div>
                    <div className={`w-12 text-sm text-right ${
                      darkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>{item.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* 감정 분석 그래프 */}
            <div className="flex flex-col gap-4 md:gap-6">
              {/* 주간 그래프 */}
              <div className={`rounded-2xl border-2 p-3 md:p-6 shadow-lg overflow-x-auto ${
                darkMode ? 'bg-[#121212] border-[#2a2a2a]' : 'bg-white border-[#8B7355]'
              }`}>
                <h2 className={`text-lg md:text-xl font-bold text-center mb-4 md:mb-6 border-b-2 pb-2 md:pb-3 ${
                  darkMode 
                    ? 'text-white border-[#2a2a2a]' 
                    : 'text-gray-900 border-[#d4c4a8]'
                }`}>감정 분석(주간)</h2>
                <div className="relative h-64 min-w-[320px]">
                  <svg className="w-full h-full" viewBox="0 0 400 250" preserveAspectRatio="xMidYMid meet" style={{ overflow: 'visible' }}>
                    {/* 격자선 */}
                    <line x1="50" y1="200" x2="380" y2="200" stroke={darkMode ? "#4b5563" : "#e5e7eb"} strokeWidth="1" />
                    <line x1="50" y1="150" x2="380" y2="150" stroke={darkMode ? "#4b5563" : "#e5e7eb"} strokeWidth="1" />
                    <line x1="50" y1="100" x2="380" y2="100" stroke={darkMode ? "#4b5563" : "#e5e7eb"} strokeWidth="1" />
                    <line x1="50" y1="50" x2="380" y2="50" stroke={darkMode ? "#4b5563" : "#e5e7eb"} strokeWidth="1" />
                    
                    {/* X축 */}
                    <line x1="50" y1="125" x2="380" y2="125" stroke={darkMode ? "#9ca3af" : "#374151"} strokeWidth="2" />
                    {/* Y축 */}
                    <line x1="50" y1="20" x2="50" y2="200" stroke={darkMode ? "#9ca3af" : "#374151"} strokeWidth="2" />
                    
                    {/* 데이터 선 */}
                    <polyline
                      fill="none"
                      stroke={darkMode ? "#9ca3af" : "#8B7355"}
                      strokeWidth="3"
                      points={weeklyData.map((item, i) => {
                        const x = 80 + (i * 45);
                        const y = 125 - (item.score * 100);
                        return `${x},${y}`;
                      }).join(' ')}
                    />
                    
                    {/* 데이터 포인트 */}
                    {weeklyData.map((item, i) => {
                      const x = 80 + (i * 45);
                      const y = 125 - (item.score * 100);
                      return (
                        <circle key={i} cx={x} cy={y} r="5" fill={darkMode ? "#9ca3af" : "#8B7355"} />
                      );
                    })}
                    
                    {/* X축 레이블 */}
                    {weeklyData.map((item, i) => (
                      <text key={i} x={80 + (i * 45)} y="220" textAnchor="middle" fontSize="11" fill={darkMode ? "#d1d5db" : "#374151"}>
                        {item.day}
                      </text>
                    ))}
                  </svg>
                </div>
              </div>

              {/* 월간 그래프 */}
              <div className={`rounded-2xl border-2 p-3 md:p-6 shadow-lg overflow-x-auto ${
                darkMode ? 'bg-[#121212] border-[#2a2a2a]' : 'bg-white border-[#8B7355]'
              }`}>
                <h2 className={`text-lg md:text-xl font-bold text-center mb-4 md:mb-6 border-b-2 pb-2 md:pb-3 ${
                  darkMode 
                    ? 'text-white border-[#2a2a2a]' 
                    : 'text-gray-900 border-[#d4c4a8]'
                }`}>감정 분석(월간)</h2>
                <div className="relative h-64 min-w-[320px]">
                  <svg className="w-full h-full" viewBox="0 0 400 250" preserveAspectRatio="xMidYMid meet" style={{ overflow: 'visible' }}>
                    {/* 격자선 */}
                    <line x1="50" y1="200" x2="380" y2="200" stroke={darkMode ? "#4b5563" : "#e5e7eb"} strokeWidth="1" />
                    <line x1="50" y1="150" x2="380" y2="150" stroke={darkMode ? "#4b5563" : "#e5e7eb"} strokeWidth="1" />
                    <line x1="50" y1="100" x2="380" y2="100" stroke={darkMode ? "#4b5563" : "#e5e7eb"} strokeWidth="1" />
                    <line x1="50" y1="50" x2="380" y2="50" stroke={darkMode ? "#4b5563" : "#e5e7eb"} strokeWidth="1" />
                    
                    {/* X축 */}
                    <line x1="50" y1="125" x2="380" y2="125" stroke={darkMode ? "#9ca3af" : "#374151"} strokeWidth="2" />
                    {/* Y축 */}
                    <line x1="50" y1="20" x2="50" y2="200" stroke={darkMode ? "#9ca3af" : "#374151"} strokeWidth="2" />
                    
                    {/* 데이터 선 */}
                    <polyline
                      fill="none"
                      stroke={darkMode ? "#9ca3af" : "#8B7355"}
                      strokeWidth="3"
                      points={monthlyData.map((item, i) => {
                        const x = 70 + (i * 40);
                        const y = 125 - (item.score * 100);
                        return `${x},${y}`;
                      }).join(' ')}
                    />
                    
                    {/* 데이터 포인트 */}
                    {monthlyData.map((item, i) => {
                      const x = 70 + (i * 40);
                      const y = 125 - (item.score * 100);
                      return (
                        <circle key={i} cx={x} cy={y} r="4" fill={darkMode ? "#9ca3af" : "#8B7355"} />
                      );
                    })}
                    
                    {/* X축 레이블 (간격을 두고 표시) */}
                    {monthlyData.map((item, i) => (
                      i % 2 === 0 && (
                        <text key={i} x={70 + (i * 40)} y="220" textAnchor="middle" fontSize="9" fill={darkMode ? "#d1d5db" : "#374151"}>
                          {item.date}
                        </text>
                      )
                    ))}
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

// 메모이제이션: props가 변경되지 않으면 재렌더링 방지
export const DiaryView = React.memo(DiaryViewComponent, (prevProps, nextProps) => {
  // props 비교 함수: true를 반환하면 재렌더링 안 함, false면 재렌더링
  return (
    prevProps.diaryView === nextProps.diaryView &&
    prevProps.darkMode === nextProps.darkMode &&
    prevProps.diaries === nextProps.diaries && // 배열 참조 비교
    prevProps.setDiaryView === nextProps.setDiaryView &&
    prevProps.setDiaries === nextProps.setDiaries
  );
});
