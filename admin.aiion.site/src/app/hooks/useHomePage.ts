import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Interaction,
  SpeechRecognition,
  Diary,
} from '../../components/types';
import { getLocalDateStr, parseJSONResponse } from '../../lib';
import { useAllDiaries } from './useDiary';
import { useCreateDiary } from './useDiary';
import { useStore } from '../../store';
import { aiGatewayClient } from '../../lib';

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
  const [interactions, setInteractions] = useState<Interaction[]>([]);

  // Diary 관련 상태 - React Query 사용 (전체 일기 조회만 사용)
  // /diary/diaries 엔드포인트로 전체 일기를 한 번에 가져옴
  const { data: diariesData = [], isLoading: diariesLoading, error: diariesError, isSuccess: diariesSuccess } = useAllDiaries();
  
  // 일기 저장 Mutation
  const createDiaryMutation = useCreateDiary();
  
  // 사용자 정보 가져오기
  const user = useStore((state) => state.user?.user);
  console.log('[useHomePage] diariesData:', {
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
        
        // Gateway를 통한 API 호출
        const gatewayUrl = process.env.NEXT_PUBLIC_API_GATEWAY_URL || 
                          process.env.NEXT_PUBLIC_API_BASE_URL || 
                          'http://localhost:8080';
        
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
        // 지역명 추출 시도 (서울, 인천 등)
        const regions = ['서울', '인천', '대전', '대구', '광주', '부산', '울산', '제주', '강릉'];
        let regionName = '서울'; // 기본값
        for (const region of regions) {
          if (submitText.includes(region)) {
            regionName = region;
            break;
          }
        }

        // 중기예보 조회
        const weatherResponse = await aiGatewayClient.getMidForecast({
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
            aiResponse = `날씨 정보를 가져오는데 실패했습니다: ${weatherResponse.error}`;
          }
        } else if (weatherResponse.data) {
          const weatherData = weatherResponse.data;
          // 날씨 정보 포맷팅
          aiResponse = `🌤️ ${regionName} 날씨 정보\n\n`;
          
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
          aiResponse = '날씨 정보를 가져올 수 없습니다. 응답 데이터가 없습니다.';
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
        // 최근 일기 5개를 컨텍스트로 준비
        const recentDiaries = diaries
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, 5);

        // 일기 내용을 시스템 메시지에 포함
        let systemMessage = 'You are a helpful assistant. Respond in Korean.';
        if (recentDiaries.length > 0) {
          const diaryContext = recentDiaries.map((diary, idx) => 
            `${idx + 1}. [${diary.date}] ${diary.title}: ${diary.content.substring(0, 200)}`
          ).join('\n');
          systemMessage += `\n\n사용자의 최근 일기 내용:\n${diaryContext}\n\n위 일기 내용을 참고하여 답변해주세요.`;
        }

        // 대화 히스토리 준비
        const conversationHistory = interactions.slice(-5).map(interaction => [
          { role: 'user' as const, content: interaction.userInput },
          { role: 'assistant' as const, content: interaction.aiResponse },
        ]).flat();

        // AI 챗봇 호출
        const chatResponse = await aiGatewayClient.sendChat({
          message: submitText,
          model: 'gpt-3.5-turbo',
          system_message: systemMessage,
          conversation_history: conversationHistory as any,
        });

        if (chatResponse.error || !chatResponse.data) {
          aiResponse = chatResponse.error || 'AI 응답을 받을 수 없습니다.';
        } else if (chatResponse.data.status === 'error') {
          aiResponse = chatResponse.data.message || 'AI 처리 중 오류가 발생했습니다.';
        } else {
          aiResponse = chatResponse.data.message || '응답을 생성할 수 없습니다.';
          
          // 분류 정보 처리 (있는 경우)
          // ⚠️ 중요: 분류 정보가 있어도 키워드 기반 로직이 우선순위가 높습니다
          // 날씨 키워드가 있는데 일기로 분류되면 날씨 처리를 유지해야 합니다
          if (chatResponse.data.classification) {
            const classification = chatResponse.data.classification;
            console.log('[useHomePage] ✅ 분류 정보:', {
              category: classification.category,
              confidence: classification.confidence,
              data: classification.data,
              입력텍스트: submitText,
              날씨키워드감지: hasWeatherKeyword,
            });
            
            // ⚠️ 분류 정보만으로는 자동 저장/삭제하지 않음
            // 신뢰도가 낮거나 키워드와 불일치하면 무시
            // 신뢰도가 0.7 이상이고 키워드와 일치할 때만 로그만 기록
            if (classification.confidence >= 0.7) {
              console.log('[useHomePage] 📋 높은 신뢰도의 분류:', classification.category);
              // 단순 로그만 - 자동 처리하지 않음
            } else {
              console.warn('[useHomePage] ⚠️ 낮은 신뢰도의 분류 - 무시:', {
                category: classification.category,
                confidence: classification.confidence,
              });
            }
            
            // ⚠️ 키워드 기반 처리와 분류 정보가 충돌하는 경우 키워드 우선
            if (hasWeatherKeyword && classification.category === '일기') {
              console.warn('[useHomePage] ⚠️ 날씨 키워드가 있는데 일기로 분류됨 - 분류 정보 무시하고 날씨 처리 유지');
              // 날씨 처리는 이미 위에서 완료됨, 분류 정보는 무시
            }
            
            // ⚠️ 분류 정보만으로는 절대 자동 저장/삭제하지 않음
            // 사용자가 명시적으로 요청한 경우(키워드 있음)에만 처리
            // 분류 정보는 참고용일 뿐, 자동 실행되는 작업 없음
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

    setInteractions(prev => [...prev, newInteraction]);
    setLoading(false);

    if (avatarMode) {
      speakResponse(newInteraction.aiResponse);
    }
  }, [inputText, avatarMode, interactions, diaries, user, createDiaryMutation]);


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

    // Handlers
    handleMicClick,
    handleSubmit,
  };
};

