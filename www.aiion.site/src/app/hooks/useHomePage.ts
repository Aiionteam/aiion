import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Interaction,
  Category,
  MenuItem,
  SpeechRecognition,
  DiaryView as DiaryViewType,
  AccountView as AccountViewType,
  CultureView as CultureViewType,
  HealthView as HealthViewType,
  PathfinderView as PathfinderViewType,
  SettingsView as SettingsViewType,
  Event,
  Task,
  Diary,
} from '../../components/types';
import { getLocalDateStr, parseJSONResponse } from '../../lib';
import { useDiaries } from './useDiary';
import { useCreateDiary } from './useDiary';
import { useStore } from '../../store';
import { aiGatewayClient } from '../../lib';
import { GATEWAY_CONFIG } from '../../lib/constants/endpoints';
import { fetchEventsByUserId, fetchTasksByUserId } from './useCalendarApi';

export const useHomePage = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [avatarMode, setAvatarMode] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [micAvailable, setMicAvailable] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  // 사용자별 localStorage 키 생성
  const getStorageKey = (userId?: number): string => {
    if (userId) {
      return `chat_interactions_${userId}`;
    }
    // 로그인하지 않은 경우 임시 키 사용 (로그인 후 사용자별로 분리됨)
    return 'chat_interactions_guest';
  };

  // localStorage에서 대화 내용 복원 (사용자별)
  const loadInteractionsFromStorage = (userId?: number): Interaction[] => {
    if (typeof window === 'undefined') return [];
    try {
      const storageKey = getStorageKey(userId);
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        // 유효성 검사: 배열이고 Interaction 형식인지 확인
        if (Array.isArray(parsed) && parsed.length > 0) {
          // 최근 100개만 유지 (성능 고려)
          return parsed.slice(-100);
        }
      }
    } catch (error) {
      console.error('[useHomePage] localStorage에서 대화 내용 복원 실패:', error);
    }
    return [];
  };

  // localStorage에 대화 내용 저장 (사용자별)
  const saveInteractionsToStorage = (interactionsToSave: Interaction[], userId?: number) => {
    if (typeof window === 'undefined') return;
    try {
      const storageKey = getStorageKey(userId);
      // 최근 100개만 저장 (성능 고려)
      const toStore = interactionsToSave.slice(-100);
      localStorage.setItem(storageKey, JSON.stringify(toStore));
    } catch (error) {
      console.error('[useHomePage] localStorage에 대화 내용 저장 실패:', error);
    }
  };

  // 사용자 정보 가져오기
  const user = useStore((state) => state.user?.user);
  
  // 사용자별 대화 내용 로드 (사용자 변경 시 자동 업데이트)
  const [interactions, setInteractions] = useState<Interaction[]>(() => loadInteractionsFromStorage(user?.id));
  const [currentCategory, setCurrentCategory] = useState<Category>('home');

  // 카테고리별 뷰 상태
  const [diaryView, setDiaryView] = useState<DiaryViewType>('home');
  const [accountView, setAccountView] = useState<AccountViewType>('home');
  const [cultureView, setCultureView] = useState<CultureViewType>('home');
  const [healthView, setHealthView] = useState<HealthViewType>('home');
  const [pathfinderView, setPathfinderView] = useState<PathfinderViewType>('home');
  const [settingsView, setSettingsView] = useState<SettingsViewType>('home');

  // Calendar 관련 상태
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [events, setEvents] = useState<Event[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  // Diary 관련 상태 - React Query 사용 (JWT 토큰 기반 사용자별 일기 조회)
  // /diary/diaries/user 엔드포인트로 JWT 토큰에서 userId를 자동 추출하여 일기를 가져옴
  console.log('[useHomePage] user 정보 확인:', { 
    user, 
    userId: user?.id, 
    userType: typeof user?.id,
    userString: JSON.stringify(user),
    willUseToken: true // JWT 토큰 기반 조회
  });
  // userId 파라미터를 전달하지 않으면 백엔드에서 토큰에서 자동 추출
  const { data: diariesData = [], isLoading: diariesLoading, error: diariesError, isSuccess: diariesSuccess } = useDiaries();
  
  // 일기 저장 Mutation
  const createDiaryMutation = useCreateDiary();
  console.log('[useHomePage] diariesData:', {
    userId: user?.id,
    length: diariesData?.length,
    isLoading: diariesLoading,
    isSuccess: diariesSuccess,
    error: diariesError,
    data: diariesData?.slice(0, 3) // 처음 3개만 로그
  });
  
  const [diaries, setDiaries] = useState<Diary[]>([]);
  
  // React Query에서 가져온 데이터를 로컬 상태에 동기화
  useEffect(() => {
    console.log('[useHomePage] diariesData 변경:', {
      length: diariesData?.length,
      isLoading: diariesLoading,
      isError: diariesError,
      isSuccess: diariesSuccess,
      data: diariesData?.slice(0, 3) // 처음 3개만 로그
    });
    
    // 로딩 중이면 기존 데이터 유지 (빈 배열로 초기화하지 않음)
    if (diariesLoading) {
      console.log('[useHomePage] 로딩 중... (기존 데이터 유지)');
      return;
    }
    
    // 에러 발생 시에도 기존 데이터 유지 (빈 배열로 초기화하지 않음)
    if (diariesError) {
      console.error('[useHomePage] 에러 발생:', diariesError);
      // 에러가 발생해도 기존 데이터는 유지
      if (diaries.length === 0) {
        console.log('[useHomePage] 기존 데이터가 없어서 빈 배열 유지');
      }
      return;
    }
    
    // 데이터가 있으면 설정
    if (diariesData && Array.isArray(diariesData) && diariesData.length > 0) {
      console.log('[useHomePage] 일기 데이터 설정:', diariesData.length, '개', diariesData.slice(0, 3));
      setDiaries(diariesData);
    } else if (diariesData && !Array.isArray(diariesData)) {
      // 단일 객체인 경우 배열로 변환
      console.log('[useHomePage] 단일 객체를 배열로 변환:', diariesData);
      setDiaries([diariesData]);
    } else if (diariesSuccess && Array.isArray(diariesData) && diariesData.length === 0) {
      // 성공했지만 데이터가 없는 경우에만 빈 배열 설정
      console.log('[useHomePage] API 호출 성공했지만 데이터 없음, 빈 배열로 설정');
      setDiaries([]);
    } else if (!diariesLoading && !diariesSuccess && diaries.length === 0) {
      // 로딩이 끝났고 성공도 아니고 기존 데이터도 없으면 빈 배열 유지
      console.log('[useHomePage] 로딩 완료, 성공 아님, 기존 데이터 없음 - 빈 배열 유지');
    }
    // 그 외의 경우 (로딩 중이거나 아직 성공하지 않은 경우)는 기존 데이터 유지
  }, [diariesData, diariesLoading, diariesError, diariesSuccess, diaries.length]);

  // Calendar 데이터 로드 (사용자 로그인 시)
  useEffect(() => {
    const loadCalendarData = async () => {
      if (!user?.id) {
        console.log('[useHomePage] 사용자 미로그인, 캘린더 데이터 로드 스킵');
        return;
      }

      try {
        console.log('[useHomePage] 캘린더 데이터 로드 시작:', user.id);
        
        // 일정 목록 로드 (JWT 토큰 기반 조회)
        const loadedEvents = await fetchEventsByUserId(undefined);
        console.log('[useHomePage] 로드된 일정:', loadedEvents.length, '개');
        setEvents(loadedEvents);

        // 할 일 목록 로드 (JWT 토큰 기반 조회 - 캘린더에 색상 점 표시를 위해)
        const loadedTasks = await fetchTasksByUserId(undefined);
        console.log('[useHomePage] 로드된 할 일:', loadedTasks.length, '개');
        setTasks(loadedTasks);
      } catch (error) {
        console.error('[useHomePage] 캘린더 데이터 로드 실패:', error);
      }
    };

    loadCalendarData();
  }, [user?.id]); // user.id가 변경될 때만 실행

  const menuItems: MenuItem[] = [
    { id: 'home' as Category, label: 'Home', icon: '🏠' },
    { id: 'calendar' as Category, label: 'Calendar', icon: '📅' },
    { id: 'diary' as Category, label: 'Diary', icon: '📔' },
    { id: 'health' as Category, label: 'Health Care', icon: '🏥' },
    { id: 'culture' as Category, label: 'Culture', icon: '🎭' },
    { id: 'account' as Category, label: 'Account', icon: '💰' },
    { id: 'path' as Category, label: 'Path Finder', icon: '🗺️' },
    { id: 'settings' as Category, label: 'Settings', icon: '⚙️' },
  ];

  // 마이크 권한 확인
  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      setMicAvailable(true);
    } else if (typeof window !== 'undefined' && 'SpeechRecognition' in window) {
      setMicAvailable(true);
    }
  }, []);

  // 음성 인식 초기화
  useEffect(() => {
    if (avatarMode && micAvailable) {
      const SpeechRecognitionClass =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognitionClass) {
        const recognition = new SpeechRecognitionClass();
        recognition.lang = 'ko-KR';
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onstart = () => {
          setIsListening(true);
        };

        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setInputText(transcript);
          setIsListening(false);

          setTimeout(() => {
            handleSubmit(transcript);
          }, 500);
        };

        recognition.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);

          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }
          timeoutRef.current = setTimeout(() => {
            if (inputText.trim()) {
              handleSubmit(inputText);
            }
            setIsListening(false);
          }, 3000);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [avatarMode, micAvailable]);

  // 아바타 모드에서 자동으로 음성 인식 시작
  useEffect(() => {
    if (avatarMode && micAvailable && recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start();

        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
          if (recognitionRef.current) {
            recognitionRef.current.stop();
            const currentText = inputText;
            if (currentText.trim()) {
              handleSubmit(currentText);
            } else {
              handleSubmit('');
            }
            setIsListening(false);
          }
        }, 3000);
      } catch (error) {
        console.error('Failed to start recognition:', error);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [avatarMode]);

  const speakResponse = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ko-KR';
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleMicClick = useCallback(() => {
    if (avatarMode) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      setIsListening(false);
      setAvatarMode(false);
    } else {
      setAvatarMode(true);
    }
  }, [avatarMode]);

  const handleSubmit = useCallback(async (text?: string) => {
    const submitText = text || inputText;
    if (!submitText.trim() && !text) {
      return;
    }

    setLoading(true);
    setInputText('');

    const today = new Date();
    const dateStr = getLocalDateStr(today);
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    const dayOfWeek = dayNames[today.getDay()];

    // TODO: 나중에 AI 라우팅으로 카테고리 자동 분류 예정
    // 현재는 카테고리 자동 분류 기능 비활성화
    const categories: string[] = [];

    // 일기 검색 관련 키워드 감지
    const diarySearchKeywords = [
      '일기 검색', '내 일기', '일기 찾기', '일기 조회', '일기 보기',
      '일기 리스트', '일기 목록', '일기 확인', '일기 보여줘',
      '일기 검색해줘', '일기 찾아줘', '일기 알려줘'
    ];
    
    // 일기 작성 관련 키워드 감지
    const diaryWriteKeywords = [
      '일기 쓰기', '일기 작성', '일기 저장', '일기 쓰자', '일기 적자',
      '일기 남기기', '일기 기록', '일기 남겨', '일기 적어', '일기 써'
    ];
    
    // 날씨 관련 키워드 감지 (더 많은 키워드 추가)
    const weatherKeywords = [
      '날씨', '예보', '기온', '온도', '비', '눈', '맑음', '흐림',
      '중기예보', '단기예보', '날씨 알려줘', '날씨 어때', '날씨는',
      '오늘 날씨', '내일 날씨', '모레 날씨', '주간 날씨',
      '날씨정보', '날씨 정보', '오늘의 날씨', '오늘의날씨', '날씨알려줘',
      '기상', '강수', '습도', '바람', '미세먼지', '황사', '대기질'
    ];
    
    // 축구 관련 키워드 감지 (더 많은 키워드 추가)
    const soccerKeywords = [
      '축구', '선수', '팀', '경기', '일정', '경기장', '스타디움', '스타디엄',
      '손흥민', '이강인', '황희찬', '김민재', '조규성', '황의조', '김민성', '김규호',
      'K리그', 'K리그1', 'K리그2', '프리미어리그', '프리미어', 'EPL', 'k리그',
      '챔피언스리그', 'UEFA', '월드컵', '아시안컵',
      '토트넘', '맨유', '맨체스터', '리버풀', '첼시', '아스널', '맨시티',
      '레알마드리드', '바르셀로나', '바이에른', '도르트문트',
      '서울', '수원', '전북', '포항', '울산', '인천', '부산', '대구', '광주',
      '축구선수', '축구팀', '축구경기', '축구일정'
    ];
    
    const submitTextLower = submitText.toLowerCase();
    const hasDiarySearchKeyword = diarySearchKeywords.some(keyword => 
      submitTextLower.includes(keyword.toLowerCase())
    );
    const hasDiaryWriteKeyword = diaryWriteKeywords.some(keyword => 
      submitTextLower.includes(keyword.toLowerCase())
    );
    const hasWeatherKeyword = weatherKeywords.some(keyword => 
      submitTextLower.includes(keyword.toLowerCase())
    );
    const hasSoccerKeyword = soccerKeywords.some(keyword => 
      submitTextLower.includes(keyword.toLowerCase())
    );
    
    console.log('[useHomePage] 🔍 키워드 감지 체크:', {
      입력텍스트: submitText,
      소문자변환: submitTextLower,
      일기검색감지: hasDiarySearchKeyword,
      일기작성감지: hasDiaryWriteKeyword,
      날씨감지: hasWeatherKeyword,
      축구감지: hasSoccerKeyword
    });

    let aiResponse = ''; // 기본값은 빈 문자열로 설정

    // 일기 검색 키워드가 있으면 9000 포트 백엔드 API로 일기 조회
    if (hasDiarySearchKeyword) {
      console.log('[useHomePage] 📔 일기 검색 키워드 감지:', submitText);
      
      try {
        // 9000 포트 AI 게이트웨이를 통해 일기 목록 조회
        const diariesResponse = await aiGatewayClient.getDiaries();
        
        if (diariesResponse.error) {
          aiResponse = `일기 목록을 가져오는데 실패했습니다: ${diariesResponse.error}`;
        } else if (diariesResponse.data && Array.isArray(diariesResponse.data) && diariesResponse.data.length > 0) {
          // 검색어 추출 (일기 검색 키워드 제거)
          let searchKeyword = submitText;
          const foundKeyword = diarySearchKeywords.find(keyword => 
            submitTextLower.includes(keyword.toLowerCase())
          );
          if (foundKeyword) {
            searchKeyword = submitText.replace(new RegExp(foundKeyword, 'gi'), '').trim();
          }
          
          // 일기 데이터에서 검색 (제목, 내용에서 검색)
          let filteredDiaries = diariesResponse.data;
          if (searchKeyword && searchKeyword.length > 0) {
            const keywordLower = searchKeyword.toLowerCase();
            filteredDiaries = diariesResponse.data.filter((diary: any) => {
              const title = (diary.title || '').toLowerCase();
              const content = (diary.content || diary.text || '').toLowerCase();
              const date = (diary.date || diary.diaryDate || '').toLowerCase();
              return title.includes(keywordLower) || content.includes(keywordLower) || date.includes(keywordLower);
            });
          }
          
          // 최신순으로 정렬
          const sortedDiaries = [...filteredDiaries].sort((a: any, b: any) => {
            const dateA = new Date(a.date || a.diaryDate || 0).getTime();
            const dateB = new Date(b.date || b.diaryDate || 0).getTime();
            return dateB - dateA;
          });
          
          // 최대 10개만 표시
          const displayDiaries = sortedDiaries.slice(0, 10);
          
          if (displayDiaries.length > 0) {
            let diaryResponse = `📔 일기 검색 결과 (총 ${filteredDiaries.length}개, 최근 ${displayDiaries.length}개 표시)\n\n`;
            
            displayDiaries.forEach((diary: any, index: number) => {
              const dateStr = diary.date || diary.diaryDate || '';
              const dateObj = dateStr ? new Date(dateStr) : new Date();
              const formattedDate = `${dateObj.getFullYear()}년 ${dateObj.getMonth() + 1}월 ${dateObj.getDate()}일`;
              const content = diary.content || diary.text || '';
              const contentPreview = content.length > 100 ? content.substring(0, 100) + '...' : content;
              
              diaryResponse += `${index + 1}. ${diary.title || '제목 없음'}\n`;
              diaryResponse += `   📅 날짜: ${formattedDate}\n`;
              diaryResponse += `   ${diary.emotion || '😊'} ${contentPreview}\n\n`;
            });
            
            if (filteredDiaries.length > 10) {
              diaryResponse += `... 외 ${filteredDiaries.length - 10}개의 일기가 더 있습니다.`;
            }
            
            aiResponse = diaryResponse;
          } else {
            if (searchKeyword && searchKeyword.length > 0) {
              aiResponse = `"${searchKeyword}"에 대한 일기를 찾을 수 없습니다. 현재 총 ${diariesResponse.data.length}개의 일기가 있습니다.`;
            } else {
              aiResponse = `현재 작성된 일기가 없습니다. 일기를 작성해보세요!`;
            }
          }
        } else {
          aiResponse = `현재 작성된 일기가 없습니다. 일기를 작성해보세요!`;
        }
      } catch (error) {
        console.error('[useHomePage] ❌ 일기 검색 중 오류:', error);
        aiResponse = `일기 검색 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`;
      }
    }
    // 축구 관련 검색어가 있으면 soccer-service API 호출
    else if (hasSoccerKeyword) {
      try {
        console.log('[useHomePage] ⚽ 축구 관련 검색어 감지:', submitText);
        
        // Gateway를 통한 API 호출 (CORS 연결)
        const gatewayUrl = GATEWAY_CONFIG.BASE_URL;
        
        // 검색어 추출 (축구 관련 키워드만 추출)
        let searchKeyword = submitText;
        // 검색어에서 축구 관련 키워드 추출
        const foundKeyword = soccerKeywords.find(keyword => 
          submitText.toLowerCase().includes(keyword.toLowerCase())
        );
        if (foundKeyword) {
          // 키워드 주변 텍스트 추출 (예: "손흥민 정보" -> "손흥민")
          const keywordIndex = submitText.toLowerCase().indexOf(foundKeyword.toLowerCase());
          if (keywordIndex >= 0) {
            // 키워드 앞뒤로 최대 10자 추출
            const start = Math.max(0, keywordIndex - 10);
            const end = Math.min(submitText.length, keywordIndex + foundKeyword.length + 10);
            searchKeyword = submitText.substring(start, end).trim();
          }
        }
        
        // Gateway 라우팅: /soccer/** → soccer-service:8085
        const apiUrl = `${gatewayUrl}/soccer/soccer/findByWord?keyword=${encodeURIComponent(searchKeyword)}`;
        console.log('[useHomePage] 🔗 API 호출 URL:', apiUrl);
        console.log('[useHomePage] 🔍 검색 키워드:', searchKeyword);
        
        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          mode: 'cors',
        });

        console.log('[useHomePage] 📡 API 응답 상태:', response.status, response.statusText);

        if (response.ok) {
          // 최적화된 JSON 파싱 사용
          const { data: result, error: parseError } = await parseJSONResponse(response);
          
          if (parseError) {
            console.error('[useHomePage] ❌ JSON 파싱 오류:', parseError);
            aiResponse = `데이터를 처리하는 중 오류가 발생했습니다: ${parseError}`;
            setLoading(false);
            return;
          }
          
          console.log('[useHomePage] ✅ API 응답 데이터:', result);

          // Code 또는 code 모두 체크 (대소문자 구분 없이)
          const responseCode = result.Code || result.code || 200;
          console.log('[useHomePage] 📊 응답 코드:', responseCode);

          if (responseCode === 200 && result.data) {
            const data = result.data;
            const totalCount = data.totalCount || 0;
            const results = data.results || {};

            // AI 응답 생성
            let detailedResponse = `🔍 축구 검색 결과 (총 ${totalCount}개)\n\n`;

            if (results.players && results.players.length > 0) {
              detailedResponse += `⚽ 선수 정보 (${results.players.length}개):\n`;
              results.players.slice(0, 3).forEach((player: any, index: number) => {
                detailedResponse += `${index + 1}. ${player.player_name || '알 수 없음'}`;
                if (player.team_name) detailedResponse += ` (${player.team_name})`;
                if (player.position) detailedResponse += ` - ${player.position}`;
                detailedResponse += '\n';
              });
              if (results.players.length > 3) {
                detailedResponse += `   ... 외 ${results.players.length - 3}명\n`;
              }
              detailedResponse += '\n';
            }

            if (results.teams && results.teams.length > 0) {
              detailedResponse += `🏆 팀 정보 (${results.teams.length}개):\n`;
              results.teams.slice(0, 3).forEach((team: any, index: number) => {
                detailedResponse += `${index + 1}. ${team.team_name || '알 수 없음'}`;
                if (team.city) detailedResponse += ` (${team.city})`;
                detailedResponse += '\n';
              });
              if (results.teams.length > 3) {
                detailedResponse += `   ... 외 ${results.teams.length - 3}개 팀\n`;
              }
              detailedResponse += '\n';
            }

            if (results.stadiums && results.stadiums.length > 0) {
              detailedResponse += `🏟️ 경기장 정보 (${results.stadiums.length}개):\n`;
              results.stadiums.slice(0, 3).forEach((stadium: any, index: number) => {
                detailedResponse += `${index + 1}. ${stadium.stadium_name || '알 수 없음'}`;
                if (stadium.city) detailedResponse += ` (${stadium.city})`;
                detailedResponse += '\n';
              });
              if (results.stadiums.length > 3) {
                detailedResponse += `   ... 외 ${results.stadiums.length - 3}개 경기장\n`;
              }
              detailedResponse += '\n';
            }

            if (results.schedules && results.schedules.length > 0) {
              detailedResponse += `📅 일정 정보 (${results.schedules.length}개):\n`;
              results.schedules.slice(0, 3).forEach((schedule: any, index: number) => {
                detailedResponse += `${index + 1}. ${schedule.home_team || '알 수 없음'} vs ${schedule.away_team || '알 수 없음'}`;
                if (schedule.match_date) detailedResponse += ` (${schedule.match_date})`;
                detailedResponse += '\n';
              });
              if (results.schedules.length > 3) {
                detailedResponse += `   ... 외 ${results.schedules.length - 3}개 일정\n`;
              }
            }

            if (totalCount === 0) {
              detailedResponse = result.message || '검색 결과가 없습니다.';
            }

            aiResponse = detailedResponse;
          } else {
            console.warn('[useHomePage] ⚠️ API 응답 코드가 200이 아니거나 데이터가 없음:', result);
            const responseCode = result.Code || result.code || '알 수 없음';
            aiResponse = result.message || `축구 정보를 가져오는데 실패했습니다. (코드: ${responseCode})`;
            
            // 데이터가 없어도 메시지는 표시
            if (result.message) {
              aiResponse = result.message;
            }
          }
        } else {
          const errorText = await response.text();
          console.error('[useHomePage] ❌ API 호출 실패:', {
            status: response.status,
            statusText: response.statusText,
            error: errorText
          });
          aiResponse = `축구 정보를 가져오는데 실패했습니다. (상태: ${response.status})`;
        }
      } catch (error) {
        console.error('[useHomePage] ❌ API 호출 중 오류:', error);
        if (error instanceof Error) {
          console.error('[useHomePage] 오류 상세:', error.message, error.stack);
        }
        aiResponse = `축구 정보를 조회하는 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`;
      }
    }
    // 일기 작성 키워드가 있으면 일기 저장
    else if (hasDiaryWriteKeyword) {
      console.log('[useHomePage] ✍️ 일기 작성 키워드 감지:', submitText);
      
      try {
        if (!user?.id) {
          aiResponse = '일기를 저장하려면 먼저 로그인해주세요.';
          setLoading(false);
          return;
        }

        // 일기 내용 추출 (키워드 제거)
        let diaryContent = submitText;
        const foundKeyword = diaryWriteKeywords.find(keyword => 
          submitTextLower.includes(keyword.toLowerCase())
        );
        if (foundKeyword) {
          diaryContent = submitText.replace(new RegExp(foundKeyword, 'gi'), '').trim();
        }

        // 제목과 내용 추출 (첫 줄은 제목, 나머지는 내용)
        const lines = diaryContent.split('\n').filter(line => line.trim());
        const diaryTitle = lines[0]?.trim() || dateStr + '의 일기';
        const diaryText = lines.slice(1).join('\n').trim() || diaryContent.trim() || '';

        if (!diaryText && !diaryTitle) {
          aiResponse = '일기 내용을 입력해주세요.';
          setLoading(false);
          return;
        }

        // 일기 객체 생성
        const newDiary: Diary = {
          id: Date.now().toString(),
          date: dateStr,
          title: diaryTitle,
          content: diaryText || diaryTitle,
          emotion: '😊',
          emotionScore: 0.5,
        };

        console.log('[useHomePage] 📝 일기 저장 시작:', newDiary);

        // 9000 포트 AI 게이트웨이를 통해 일기 저장
        const diaryResponse = await aiGatewayClient.createDiary({
          diaryDate: newDiary.date,
          title: newDiary.title,
          content: newDiary.content,
          userId: user.id,
        });

        if (diaryResponse.error || !diaryResponse.data) {
          aiResponse = `일기 저장에 실패했습니다: ${diaryResponse.error || '알 수 없는 오류'}`;
          console.error('[useHomePage] ❌ 일기 저장 실패:', diaryResponse.error);
        } else {
          // 저장된 일기 데이터 변환
          const savedDiaryData = diaryResponse.data;
          const savedDiary: Diary = {
            id: savedDiaryData.id?.toString() || Date.now().toString(),
            date: savedDiaryData.createdAt || newDiary.date,
            title: savedDiaryData.content?.substring(0, 50) || newDiary.title,
            content: savedDiaryData.content || newDiary.content,
            emotion: '😊',
            emotionScore: 0.5,
          };
          
          // 저장된 일기를 로컬 상태에도 추가
          setDiaries(prev => {
            const existingIndex = prev.findIndex(d => d.id === savedDiary.id);
            if (existingIndex >= 0) {
              const updated = [...prev];
              updated[existingIndex] = savedDiary;
              return updated;
            }
            return [savedDiary, ...prev].sort((a, b) => 
              new Date(b.date).getTime() - new Date(a.date).getTime()
            );
          });
          
          // 일반 게이트웨이(8080)에도 저장 (백업용)
          try {
            await createDiaryMutation.mutateAsync(newDiary);
          } catch (backupError) {
            console.warn('[useHomePage] 백업 저장 실패 (무시):', backupError);
          }
          
          aiResponse = `✅ 일기가 저장되었습니다!\n\n제목: ${newDiary.title}\n날짜: ${newDiary.date}`;
          console.log('[useHomePage] ✅ 일기 저장 성공 (9000 포트)');
        }
      } catch (error) {
        console.error('[useHomePage] ❌ 일기 저장 중 오류:', error);
        aiResponse = `일기 저장 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`;
      }
    }
    // 날씨 키워드가 있으면 날씨 API 호출
    else if (hasWeatherKeyword) {
      console.log('[useHomePage] 🌤️ 날씨 키워드 감지:', submitText);
      
      try {
        // 단기예보 키워드 확인
        // 단기예보: 오늘부터 3일 후까지의 날씨
        const shortForecastKeywords = [
          '단기예보', '단기날씨', 
          '오늘 날씨', '내일 날씨', '모레 날씨',
          '오늘날씨', '내일날씨', '모레날씨',
          '오늘의 날씨', '내일의 날씨',
          '지금 날씨', '현재 날씨'
        ];
        const isShortForecast = shortForecastKeywords.some(keyword => 
          submitTextLower.includes(keyword.toLowerCase())
        );
        
        // 중기예보 키워드 확인
        // 중기예보: 4일 후부터의 날씨 (주간 예보)
        const midForecastKeywords = [
          '중기예보', '중기날씨',
          '주간 날씨', '주간예보', '주간 날씨',
          '일주일 날씨', '일주일예보',
          '주간 날씨', '주간 예보'
        ];
        const isMidForecast = midForecastKeywords.some(keyword => 
          submitTextLower.includes(keyword.toLowerCase())
        );
        
        // 지역명 추출 시도 (서울, 인천 등)
        const regions = ['서울', '인천', '대전', '대구', '광주', '부산', '울산', '제주', '강릉'];
        let regionName = '서울'; // 기본값
        for (const region of regions) {
          if (submitText.includes(region)) {
            regionName = region;
            break;
          }
        }

        // 지역 좌표 매핑 (단기예보용)
        const regionCoordinates: Record<string, { nx: number; ny: number }> = {
          '서울': { nx: 60, ny: 127 },
          '인천': { nx: 55, ny: 124 },
          '대전': { nx: 67, ny: 100 },
          '대구': { nx: 89, ny: 90 },
          '광주': { nx: 58, ny: 74 },
          '부산': { nx: 98, ny: 76 },
          '울산': { nx: 102, ny: 84 },
          '제주': { nx: 52, ny: 38 },
          '강릉': { nx: 92, ny: 131 }
        };
        
        const coordinates = regionCoordinates[regionName] || regionCoordinates['서울'];
        
        // 단기예보가 명시적으로 요청되었거나, 중기예보가 명시되지 않은 경우 단기예보 사용
        let weatherResponse;
        let weatherData;
        
        // 로직: 중기예보가 명시되면 중기예보, 그 외에는 단기예보 (기본값)
        if (isMidForecast) {
          // 단기예보 조회 (기본값)
          console.log('[useHomePage] 단기예보 조회:', regionName, coordinates);
          weatherResponse = await aiGatewayClient.getShortForecast({
            nx: coordinates.nx,
            ny: coordinates.ny,
            dataType: 'JSON',
            numOfRows: 100
          });
          
          if (weatherResponse.error) {
            // 연결 실패 시 친절한 메시지
            if (weatherResponse.error.includes('Failed to fetch') || 
                weatherResponse.error.includes('CONNECTION_REFUSED') ||
                weatherResponse.error.includes('ERR_CONNECTION_REFUSED')) {
              aiResponse = `❌ 날씨 서버에 연결할 수 없습니다.\n\n확인 사항:\n1. AI 서버(9000 포트)가 실행 중인지 확인해주세요\n2. http://localhost:9000/health 에 접속 가능한지 확인해주세요\n\n에러: ${weatherResponse.error}`;
            } else {
              aiResponse = `단기예보 정보를 가져오는데 실패했습니다: ${weatherResponse.error}`;
            }
          } else if (weatherResponse.data) {
            weatherData = weatherResponse.data;
            // 단기예보 포맷팅
            aiResponse = `🌤️ ${regionName} 단기예보\n\n`;
            
            // 단기예보 데이터 파싱
            if (weatherData?.response?.body?.items) {
              let items: any[] = [];
              
              // items 구조에 따라 파싱
              if (weatherData.response.body.items.item) {
                items = Array.isArray(weatherData.response.body.items.item)
                  ? weatherData.response.body.items.item
                  : [weatherData.response.body.items.item];
              } else if (Array.isArray(weatherData.response.body.items)) {
                items = weatherData.response.body.items;
              }
              
              if (items.length > 0) {
                // 요청된 날짜 계산 (오늘, 내일, 모레)
                const now = new Date();
                let targetDate = new Date(now);
                
                // "내일 날씨" 또는 "모레 날씨" 키워드 확인
                if (submitTextLower.includes('내일')) {
                  targetDate.setDate(now.getDate() + 1);
                } else if (submitTextLower.includes('모레')) {
                  targetDate.setDate(now.getDate() + 2);
                }
                // 기본값은 오늘
                
                const targetDateStr = targetDate.toISOString().split('T')[0].replace(/-/g, '');
                
                // 요청된 날짜의 예보 필터링
                const targetItems = items.filter((item: any) => {
                  const itemDate = item.fcstDate;
                  return itemDate === targetDateStr;
                });
                
                if (targetItems.length === 0) {
                  // 요청된 날짜의 데이터가 없으면 전체 데이터에서 가장 가까운 날짜 찾기
                  const allDates = [...new Set(items.map((item: any) => item.fcstDate))].sort();
                  const targetIndex = allDates.indexOf(targetDateStr);
                  
                  if (targetIndex >= 0 && targetIndex < allDates.length - 1) {
                    // 다음 날짜가 있으면 그 날짜 사용
                    const nextDate = allDates[targetIndex + 1];
                    const nextDateItems = items.filter((item: any) => item.fcstDate === nextDate);
                    if (nextDateItems.length > 0) {
                      targetItems.push(...nextDateItems);
                    }
                  }
                }
                
                // 날짜 표시 텍스트
                let dateLabel = '오늘';
                if (submitTextLower.includes('내일')) {
                  dateLabel = '내일';
                } else if (submitTextLower.includes('모레')) {
                  dateLabel = '모레';
                }
                
                if (targetItems.length === 0) {
                  aiResponse += `${dateLabel} 날씨 정보를 찾을 수 없습니다.`;
                } else {
                  // 온도 데이터 수집 (최고/최저 기온 찾기)
                  const tempItems = targetItems.filter((item: any) => item.category === 'TMP');
                  const tempValues = tempItems.map((item: any) => parseInt(item.fcstValue || 0)).filter(v => !isNaN(v));
                  
                  // 하늘 상태 데이터 (낮 시간대 우선: 12시~18시)
                  const skyItems = targetItems.filter((item: any) => item.category === 'SKY');
                  const daySkyItems = skyItems.filter((item: any) => {
                    const hour = item.fcstTime ? parseInt(item.fcstTime.substring(0, 2)) : 0;
                    return hour >= 12 && hour <= 18;
                  });
                  const skyItem = daySkyItems.length > 0 ? daySkyItems[0] : skyItems[0];
                  
                  // 강수 형태 데이터 (낮 시간대 우선)
                  const ptyItems = targetItems.filter((item: any) => item.category === 'PTY');
                  const dayPtyItems = ptyItems.filter((item: any) => {
                    const hour = item.fcstTime ? parseInt(item.fcstTime.substring(0, 2)) : 0;
                    return hour >= 12 && hour <= 18;
                  });
                  const ptyItem = dayPtyItems.length > 0 ? dayPtyItems[0] : ptyItems[0];
                  
                  const skyMap: Record<string, string> = {
                    '1': '맑음',
                    '3': '구름많음',
                    '4': '흐림'
                  };
                  
                  const ptyMap: Record<string, string> = {
                    '0': '',
                    '1': '🌧️ 비',
                    '2': '🌨️ 비/눈',
                    '3': '❄️ 눈',
                    '4': '🌦️ 소나기'
                  };
                  
                  // 기온 정보 표시
                  if (tempValues.length > 0) {
                    const minTemp = Math.min(...tempValues);
                    const maxTemp = Math.max(...tempValues);
                    if (minTemp === maxTemp) {
                      aiResponse += `${dateLabel} 기온: ${minTemp}°C\n`;
                    } else {
                      aiResponse += `${dateLabel} 기온: ${minTemp}°C ~ ${maxTemp}°C\n`;
                    }
                  }
                  
                  // 하늘 상태 표시
                  if (skyItem?.fcstValue) {
                    aiResponse += `하늘 상태: ${skyMap[skyItem.fcstValue] || skyItem.fcstValue}\n`;
                  }
                  
                  // 강수 형태 표시
                  if (ptyItem?.fcstValue && ptyItem.fcstValue !== '0') {
                    aiResponse += `강수 형태: ${ptyMap[ptyItem.fcstValue] || ''}\n`;
                  }
                  
                  // 데이터가 하나도 없으면
                  if (tempValues.length === 0 && !skyItem && (!ptyItem || ptyItem.fcstValue === '0')) {
                    aiResponse += `${dateLabel} 날씨 정보를 찾을 수 없습니다.`;
                  }
                }
              } else {
                aiResponse += '단기예보 데이터가 없습니다.';
              }
            } else {
              aiResponse += '단기예보 응답 형식이 올바르지 않습니다.';
            }
          } else {
            aiResponse = '단기예보 정보를 가져올 수 없습니다. 응답 데이터가 없습니다.';
          }
        } else if (isMidForecast) {
          // 중기예보 조회
          console.log('[useHomePage] 중기예보 조회:', regionName);
          weatherResponse = await aiGatewayClient.getMidForecast({
            regionName,
            dataType: 'JSON',
          });

          if (weatherResponse.error) {
            // 연결 실패 시 친절한 메시지
            if (weatherResponse.error.includes('Failed to fetch') || 
                weatherResponse.error.includes('CONNECTION_REFUSED') ||
                weatherResponse.error.includes('ERR_CONNECTION_REFUSED')) {
              aiResponse = `❌ 날씨 서버에 연결할 수 없습니다.\n\n확인 사항:\n1. AI 서버(9000 포트)가 실행 중인지 확인해주세요\n2. http://localhost:9000/health 에 접속 가능한지 확인해주세요\n\n에러: ${weatherResponse.error}`;
            } else {
              aiResponse = `중기예보 정보를 가져오는데 실패했습니다: ${weatherResponse.error}`;
            }
          } else if (weatherResponse.data) {
            weatherData = weatherResponse.data;
            // 날씨 정보 포맷팅
            aiResponse = `🌤️ ${regionName} 중기예보\n\n`;
            
            // 응답 구조 파싱 (문서에 따른 구조)
            let weatherItem = null;
            
            // 구조 1: response.body.items.item (배열)
            if (weatherData.response?.body?.items?.item && Array.isArray(weatherData.response.body.items.item)) {
              weatherItem = weatherData.response.body.items.item[0];
            }
            // 구조 2: response.body.items (직접 배열)
            else if (weatherData.response?.body?.items && Array.isArray(weatherData.response.body.items)) {
              weatherItem = weatherData.response.body.items[0];
            }
            // 구조 3: items[0] (직접 접근)
            else if (weatherData.response?.body?.items?.[0]) {
              weatherItem = weatherData.response.body.items[0];
            }
            
            if (weatherItem) {
              // 날씨 정보 추출 (문서에 따른 필드명)
              const wfSv = weatherItem.wfSv || weatherItem.wf || '정보 없음';
              const taMin = weatherItem.taMin || weatherItem.minTemp || '정보 없음';
              const taMax = weatherItem.taMax || weatherItem.maxTemp || '정보 없음';
              
              aiResponse += `날씨: ${wfSv}\n`;
              if (taMin !== '정보 없음') aiResponse += `최저기온: ${taMin}°C\n`;
              if (taMax !== '정보 없음') aiResponse += `최고기온: ${taMax}°C\n`;
              
              // 추가 정보가 있으면 표시
              if (weatherItem.ta) {
                aiResponse += `현재기온: ${weatherItem.ta}°C\n`;
              }
            } else {
              // 응답 구조가 예상과 다른 경우 원본 데이터 표시
              aiResponse += '날씨 정보를 파싱할 수 없습니다.\n';
              aiResponse += `(응답 구조를 확인 중입니다...)`;
              console.log('[useHomePage] 날씨 응답 구조:', weatherData);
            }
          } else {
            aiResponse = '중기예보 정보를 가져올 수 없습니다. 응답 데이터가 없습니다.';
          }
        }
      } catch (error) {
        console.error('[useHomePage] ❌ 날씨 조회 중 오류:', error);
        const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
        
        // 연결 실패 에러 감지
        if (errorMessage.includes('Failed to fetch') || 
            errorMessage.includes('CONNECTION_REFUSED') ||
            errorMessage.includes('ERR_CONNECTION_REFUSED') ||
            errorMessage.includes('NetworkError')) {
          aiResponse = `❌ 날씨 서버에 연결할 수 없습니다.\n\n확인 사항:\n1. AI 서버(9000 포트)가 실행 중인지 확인해주세요\n2. http://localhost:9000/health 에 접속 가능한지 확인해주세요\n3. Docker를 사용한다면: docker-compose up -d\n\n에러: ${errorMessage}`;
        } else {
          aiResponse = `날씨 정보를 조회하는 중 오류가 발생했습니다: ${errorMessage}`;
        }
      }
    }
    // 일반 질문이면 AI 챗봇 호출 (일기 내용을 컨텍스트로 포함)
    else {
      console.log('[useHomePage] 💬 일반 질문으로 AI 챗봇 호출:', submitText);
      
      try {
        // 최근 일기 3개만 컨텍스트로 준비 (성능 최적화)
        const recentDiaries = diaries
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, 3);  // 5개에서 3개로 감소

        // 일기 내용을 시스템 메시지에 포함 (간소화)
        let systemMessage = 'You are a helpful assistant. Respond in Korean.';
        if (recentDiaries.length > 0) {
          const diaryContext = recentDiaries.map((diary, idx) => 
            `${idx + 1}. [${diary.date}] ${diary.title}: ${diary.content.substring(0, 100)}`  // 200자에서 100자로 감소
          ).join('\n');
          systemMessage += `\n\n사용자의 최근 일기:\n${diaryContext}\n\n위 일기 내용을 참고하여 답변해주세요.`;
        }

        // 대화 히스토리 준비 (3개로 제한 - 성능 최적화)
        const conversationHistory = interactions.slice(-3).map(interaction => [  // 5개에서 3개로 감소
          { role: 'user' as const, content: interaction.userInput },
          { role: 'assistant' as const, content: interaction.aiResponse },
        ]).flat();

        // JWT 토큰 가져오기 (일기 검색 시 필요)
        const jwtToken = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
        
        // AI 챗봇 호출
        const chatResponse = await aiGatewayClient.sendChat({
          message: submitText,
          model: 'gpt-4-turbo',  // 백엔드 기본값과 일치
          system_message: systemMessage,
          conversation_history: conversationHistory as any,
          userId: user?.id, // 사용자 ID 전달 (일기 검색 시 필요)
          jwtToken: jwtToken || undefined, // JWT 토큰 전달 (userId가 없을 때 사용)
        });

        if (chatResponse.error || !chatResponse.data) {
          aiResponse = chatResponse.error || 'AI 응답을 받을 수 없습니다.';
        } else if (chatResponse.data.status === 'error') {
          aiResponse = chatResponse.data.message || 'AI 처리 중 오류가 발생했습니다.';
        } else {
          aiResponse = chatResponse.data.message || '응답을 생성할 수 없습니다.';
          
          // 일기 검색 요청인지 확인 (일기 저장하지 않음)
          const isDiarySearchRequest = submitTextLower.includes('일기') && (
            submitTextLower.includes('찾아') || 
            submitTextLower.includes('검색') || 
            submitTextLower.includes('조회') || 
            submitTextLower.includes('보여') || 
            submitTextLower.includes('알려') || 
            submitTextLower.includes('에서')
          );
          
          // 일기 검색 요청이 아니고, 분류 결과가 일기인 경우에만 저장
          // "일기" 키워드만으로는 저장하지 않음 (나중에 AI 라우터가 처리)
          if (!isDiarySearchRequest && chatResponse.data.classification && chatResponse.data.classification.category === '일기') {
            console.log('[useHomePage] 📝 일기 분류 감지 - 일기 저장 시도');
            
            try {
              // 분류 정보가 있으면 그 데이터 사용, 없으면 입력 텍스트를 일기로 저장
              const diaryContent = chatResponse.data.classification?.data?.content || submitText;
              const diaryMood = chatResponse.data.classification?.data?.mood || null;
              const diaryEvents = chatResponse.data.classification?.data?.events || [];
              const diaryKeywords = chatResponse.data.classification?.data?.keywords || [];
              const diaryDate = chatResponse.data.classification?.data?.date || dateStr;
              
              if (!user) {
                aiResponse = '일기를 저장하려면 먼저 로그인해주세요.';
              } else {
                const newDiary: Diary = {
                  id: Date.now().toString(),
                  date: diaryDate,
                  title: diaryContent.substring(0, 50) || '일기',
                  content: diaryContent,
                  emotion: diaryMood || '보통',
                  emotionScore: 0.5,
                };
                
                console.log('[useHomePage] 📝 일기 저장 시작:', newDiary);
                
                // 일기 저장 API 호출
                const diaryResponse = await createDiaryMutation.mutateAsync(newDiary);
                
                if (diaryResponse.error) {
                  aiResponse = `일기 저장에 실패했습니다: ${diaryResponse.error || '알 수 없는 오류'}`;
                  console.error('[useHomePage] ❌ 일기 저장 실패:', diaryResponse.error);
                } else {
                  aiResponse = `✅ 일기가 저장되었습니다!\n\n제목: ${newDiary.title}\n날짜: ${newDiary.date}`;
                  console.log('[useHomePage] ✅ 일기 저장 성공');
                }
              }
            } catch (error) {
              console.error('[useHomePage] ❌ 일기 저장 중 오류:', error);
              // 일기 저장 실패해도 AI 응답은 유지
            }
          } else if (chatResponse.data.classification) {
            const classification = chatResponse.data.classification;
            console.log('[useHomePage] ✅ 분류 정보:', {
              category: classification.category,
              confidence: classification.confidence,
              data: classification.data,
              입력텍스트: submitText,
              날씨키워드감지: hasWeatherKeyword,
            });
            
            // 다른 카테고리는 로그만 기록 (자동 저장하지 않음)
            if (classification.confidence >= 0.7) {
              console.log('[useHomePage] 📋 높은 신뢰도의 분류:', classification.category);
            } else {
              console.warn('[useHomePage] ⚠️ 낮은 신뢰도의 분류 - 무시:', {
                category: classification.category,
                confidence: classification.confidence,
              });
            }
          }
        }
      } catch (error) {
        console.error('[useHomePage] ❌ AI 챗봇 호출 중 오류:', error);
        aiResponse = `AI 챗봇과 통신하는 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`;
      }
    }

    const newInteraction: Interaction = {
      id: Date.now().toString(),
      date: dateStr,
      dayOfWeek: dayOfWeek,
      userInput: submitText,
      categories: categories.length > 0 ? categories : [],
      aiResponse: aiResponse,
    };

    const updatedInteractions = [...interactions, newInteraction];
    setInteractions(updatedInteractions);
    
    // localStorage에 저장 (사용자별)
    saveInteractionsToStorage(updatedInteractions, user?.id);
    
    setLoading(false);

    if (avatarMode) {
      speakResponse(newInteraction.aiResponse);
    }
  }, [inputText, avatarMode, interactions, diaries, user, createDiaryMutation]);

  // 사용자 변경 시 해당 사용자의 대화 내용 로드
  useEffect(() => {
    const userInteractions = loadInteractionsFromStorage(user?.id);
    setInteractions(userInteractions);
    console.log('[useHomePage] 사용자 변경 - 대화 내용 로드:', {
      userId: user?.id,
      interactionsCount: userInteractions.length
    });
  }, [user?.id]);

  // interactions 변경 시 localStorage에 저장 (추가 안전장치)
  useEffect(() => {
    if (interactions.length > 0) {
      saveInteractionsToStorage(interactions, user?.id);
    } else {
      // 대화가 모두 삭제된 경우 localStorage도 비우기
      if (typeof window !== 'undefined') {
        try {
          const storageKey = getStorageKey(user?.id);
          localStorage.removeItem(storageKey);
        } catch (error) {
          console.error('[useHomePage] localStorage에서 대화 내용 삭제 실패:', error);
        }
      }
    }
  }, [interactions, user?.id]);

  // 카테고리 변경 시 뷰 리셋
  useEffect(() => {
    setDiaryView('home');
    setAccountView('home');
    setCultureView('home');
    setHealthView('home');
    setPathfinderView('home');
    setSettingsView('home');
  }, [currentCategory]);

  return {
    // State
    sidebarOpen,
    setSidebarOpen,
    darkMode,
    setDarkMode,
    inputText,
    setInputText,
    loading,
    avatarMode,
    isListening,
    micAvailable,
    interactions,
    currentCategory,
    setCurrentCategory,
    menuItems,

    // 카테고리별 뷰 상태
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

    // Calendar 상태
    selectedDate,
    setSelectedDate,
    currentMonth,
    setCurrentMonth,
    events,
    setEvents,
    tasks,
    setTasks,

    // Diary 상태
    diaries,
    setDiaries,

    // Handlers
    handleMicClick,
    handleSubmit,
  };
};

