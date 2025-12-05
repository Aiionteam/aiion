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
import { getLocalDateStr } from '../../lib';
import { useDiaries } from './useDiary';
import { useCreateDiary } from './useDiary';
import { useStore } from '../../store';
import { aiGatewayClient } from '../../lib';
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

    let aiResponse = ''; // 기본값은 빈 문자열로 설정
    let chatResponse: any = null; // 챗봇 응답 변수 (스코프 밖에서도 사용)

    // ✅ 모든 요청을 챗봇으로 전달 (키워드 감지 로직 제거)
    // 챗봇이 키워드를 감지하고 적절한 쿼리를 실행하여 결과를 반환
    console.log('[useHomePage] 💬 모든 요청을 챗봇으로 전달:', submitText);
    
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
      
      // ✅ 모든 요청을 챗봇으로 전달
      // 챗봇이 키워드를 감지하고 적절한 쿼리(일기 검색, 날씨 조회 등)를 실행하여 결과를 반환
      console.log('[useHomePage] 💬 챗봇으로 요청 전송:', submitText);
      
      chatResponse = await aiGatewayClient.sendChat({
        message: submitText,
        model: 'gpt-4-turbo',  // 백엔드 기본값과 일치
        system_message: systemMessage,
        conversation_history: conversationHistory as any,
        userId: user?.id, // 사용자 ID 전달 (일기 검색 시 필요)
        jwtToken: jwtToken || undefined, // JWT 토큰 전달 (userId가 없을 때 사용)
      });

        console.log('[useHomePage] 💬 챗봇 응답 받음:', {
          error: chatResponse.error,
          hasData: !!chatResponse.data,
          data: chatResponse.data,
          message: chatResponse.data?.message,
          status: chatResponse.status
        });

        // 응답 처리
        if (chatResponse.error) {
          aiResponse = chatResponse.error || 'AI 응답을 받을 수 없습니다.';
          console.error('[useHomePage] ❌ 챗봇 응답 에러:', chatResponse.error);
        } else if (!chatResponse.data) {
          aiResponse = 'AI 응답 데이터가 없습니다.';
          console.error('[useHomePage] ❌ 챗봇 응답 데이터 없음');
        } else if (chatResponse.data.message) {
          // ✅ 메시지가 있으면 먼저 설정
          aiResponse = chatResponse.data.message;
          console.log('[useHomePage] ✅ 챗봇 응답 메시지:', aiResponse.substring(0, 100));
        } else {
          aiResponse = '응답을 생성할 수 없습니다.';
          console.error('[useHomePage] ❌ 챗봇 응답 메시지 없음:', chatResponse.data);
        }

        // ✅ 일기 저장 로직 (분류 결과가 일기인 경우에만 저장)
        if (chatResponse.data && !chatResponse.error) {
          // 분류 결과가 일기인 경우에만 저장
          if (chatResponse.data.classification && chatResponse.data.classification.category === '일기') {
            console.log('[useHomePage] 📝 일기 분류 감지 - 일기 저장 시도');
            
            try {
              // 분류 정보가 있으면 그 데이터 사용, 없으면 입력 텍스트를 일기로 저장
              const diaryContent = chatResponse.data.classification?.data?.content || submitText;
              const diaryMood = chatResponse.data.classification?.data?.mood || null;
              const diaryEvents = chatResponse.data.classification?.data?.events || [];
              const diaryKeywords = chatResponse.data.classification?.data?.keywords || [];
              const diaryDate = chatResponse.data.classification?.data?.date || dateStr;
              
              if (!user) {
                // 로그인하지 않았으면 원래 AI 응답 유지 (일기 저장 메시지로 덮어쓰지 않음)
                console.log('[useHomePage] ⚠️ 일기 저장 스킵: 로그인 필요');
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
                try {
                  const diaryResponse = await createDiaryMutation.mutateAsync(newDiary);
                  // 일기 저장 성공 시 메시지 추가
                  aiResponse = `${aiResponse}\n\n✅ 일기가 저장되었습니다!`;
                  console.log('[useHomePage] ✅ 일기 저장 성공:', diaryResponse);
                } catch (diaryError) {
                  // 일기 저장 실패해도 원래 AI 응답은 유지
                  console.error('[useHomePage] ❌ 일기 저장 실패:', diaryError);
                }
              }
            } catch (error) {
              console.error('[useHomePage] ❌ 일기 저장 중 오류:', error);
              // 일기 저장 실패해도 원래 AI 응답은 유지
            }
          } else if (chatResponse.data.classification) {
            const classification = chatResponse.data.classification;
            console.log('[useHomePage] ✅ 분류 정보:', {
              category: classification.category,
              confidence: classification.confidence,
              data: classification.data,
              입력텍스트: submitText,
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

    // ✅ aiResponse가 빈 문자열이면 경고 로그 출력
    if (!aiResponse || aiResponse.trim() === '') {
      console.warn('[useHomePage] ⚠️ aiResponse가 비어있습니다!', {
        submitText,
        chatResponse: chatResponse ? {
          error: chatResponse.error,
          hasData: !!chatResponse.data,
          message: chatResponse.data?.message
        } : null
      });
      // 빈 응답 대신 기본 메시지 설정
      aiResponse = '응답을 받지 못했습니다. 다시 시도해주세요.';
    }

    const newInteraction: Interaction = {
      id: Date.now().toString(),
      date: dateStr,
      dayOfWeek: dayOfWeek,
      userInput: submitText,
      categories: categories.length > 0 ? categories : [],
      aiResponse: aiResponse,
    };

    console.log('[useHomePage] 📝 새 Interaction 생성:', {
      id: newInteraction.id,
      userInput: newInteraction.userInput.substring(0, 50),
      aiResponse: newInteraction.aiResponse.substring(0, 100),
      aiResponseLength: newInteraction.aiResponse.length
    });

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

