"use client";

import React, { useState, useRef, useEffect } from "react";
import { sendChatMessage, ChatMessage, checkChatServerHealth } from "@/lib/api/chat";
import { useLoginStore } from "@/store";
import { getUserIdFromToken } from "@/lib/api/auth";
import { WeatherForecast } from "./WeatherForecast";
import { TitanicPassengers } from "./TitanicPassengers";
import { useRouter } from "next/navigation";
// 직접 감정 분석 호출 제거 - 일기 저장 시 백엔드에서 자동 분석

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

// localStorage 키 생성 (사용자별)
const getChatMessagesKey = (userId: string | null): string => {
  if (!userId) return "chat_messages_anonymous";
  return `chat_messages_${userId}`;
};

// localStorage에서 메시지 복원 (사용자별)
const loadMessagesFromStorage = (userId: string | null): Message[] => {
  if (typeof window === "undefined") return [];
  
  try {
    const key = getChatMessagesKey(userId);
    const stored = localStorage.getItem(key);
    if (!stored) return [];
    
    const parsed = JSON.parse(stored);
    // timestamp를 Date 객체로 변환
    return parsed.map((msg: any) => ({
      ...msg,
      timestamp: new Date(msg.timestamp),
    }));
  } catch (error) {
    console.error("Failed to load messages from storage:", error);
    return [];
  }
};

// localStorage에 메시지 저장 (사용자별)
const saveMessagesToStorage = (messages: Message[], userId: string | null): void => {
  if (typeof window === "undefined") return;
  
  try {
    const key = getChatMessagesKey(userId);
    // Date 객체를 문자열로 변환하여 저장
    const serialized = messages.map((msg) => ({
      ...msg,
      timestamp: msg.timestamp.toISOString(),
    }));
    localStorage.setItem(key, JSON.stringify(serialized));
  } catch (error) {
    console.error("Failed to save messages to storage:", error);
  }
};

export const ChatInterface: React.FC = () => {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serverStatus, setServerStatus] = useState<"checking" | "online" | "offline" | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { logout, isAuthenticated } = useLoginStore();

  // 사용자 ID 가져오기
  const userId = getUserIdFromToken();

  // 컴포넌트 마운트 시 localStorage에서 메시지 복원 (사용자별)
  useEffect(() => {
    const savedMessages = loadMessagesFromStorage(userId);
    if (savedMessages.length > 0) {
      setMessages(savedMessages);
    }
  }, [userId]);

  // 메시지가 변경될 때마다 localStorage에 저장 (사용자별)
  useEffect(() => {
    if (messages.length > 0) {
      saveMessagesToStorage(messages, userId);
    }
  }, [messages, userId]);

  // 메시지가 추가될 때마다 스크롤을 맨 아래로
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 입력 필드 포커스 유지
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // 로딩 상태가 변경될 때마다 포커스 유지
  useEffect(() => {
    if (!isLoading && inputRef.current) {
      // 약간의 지연 후 포커스 복원 (DOM 업데이트 후)
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 10);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  // 서버 상태 확인
  useEffect(() => {
    const checkServer = async () => {
      setServerStatus("checking");
      try {
        const isOnline = await checkChatServerHealth();
        setServerStatus(isOnline ? "online" : "offline");
      } catch (error) {
        // 에러 발생 시 오프라인으로 표시
        setServerStatus("offline");
      }
    };
    
    checkServer();
    
    // 주기적으로 서버 상태 확인 (30초마다)
    const interval = setInterval(checkServer, 30000);
    return () => clearInterval(interval);
  }, []);

  // 일기 내용 추출 함수
  const extractDiaryContent = (messages: Message[]): string | null => {
    // 최근 메시지들에서 일기 형식 찾기 ([날짜] 일기 제목 내용)
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg.role === "user" && msg.content.includes("일기")) {
        const content = msg.content;
        
        // 일기 형식 1: [날짜] 일기 제목 내용
        const diaryMatch1 = content.match(/\[.*?\]\s*일기\s+(.+?)(?:\n|$)/s);
        if (diaryMatch1) {
          const afterTitle = diaryMatch1[1];
          // 제목 다음 줄부터 내용 추출
          const lines = afterTitle.split('\n');
          if (lines.length > 1) {
            return lines.slice(1).join('\n').trim();
          }
          return afterTitle.trim();
        }
        
        // 일기 형식 2: 일기 제목이 있는 경우
        const lines = content.split('\n');
        const diaryIndex = lines.findIndex(line => line.includes('일기'));
        if (diaryIndex >= 0) {
          // 일기 라인 다음부터 내용 추출
          const afterDiaryLine = lines.slice(diaryIndex + 1).join('\n').trim();
          if (afterDiaryLine) {
            return afterDiaryLine;
          }
        }
        
        // 일기 형식 3: 일기 키워드가 포함된 전체 내용
        if (content.length > 10) {
          return content;
        }
      }
    }
    return null;
  };

  // 기분 관련 질문 감지
  const isMoodQuestion = (message: string): boolean => {
    const moodKeywords = ['기분', '감정', '느낌', '어떤 기분', '어떤 감정', '어떤 느낌'];
    return moodKeywords.some(keyword => message.includes(keyword));
  };

  // 감정 라벨을 한글로 변환
  const getEmotionLabelKorean = (label: string): string => {
    const labelMap: Record<string, string> = {
      '평가불가': '평범',
      '기쁨': '기쁨',
      '슬픔': '슬픔',
      '분노': '분노',
      '두려움': '두려움',
      '혐오': '혐오',
      '놀람': '놀람',
      '신뢰': '신뢰',
      '기대': '기대',
      '불안': '불안',
      '안도': '안도',
      '후회': '후회',
      '그리움': '그리움',
      '감사': '감사',
      '외로움': '외로움',
    };
    return labelMap[label] || label;
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setError(null);
    
    // 포커스를 즉시 유지
    if (inputRef.current) {
      inputRef.current.focus();
    }

    // 사용자 메시지 추가
    const newUserMessage: Message = {
      role: "user",
      content: userMessage,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, newUserMessage]);

    setIsLoading(true);

    try {
      // 기분 관련 질문 처리 - 직접 감정 분석 호출 제거
      // 감정 분석은 일기를 저장할 때 백엔드에서 자동으로 수행됩니다.
      let emotionAnalysis: string = "";
      if (isMoodQuestion(userMessage)) {
        emotionAnalysis = `\n\n📊 감정 분석:\n일기를 저장하면 자동으로 감정 분석 결과를 확인할 수 있습니다.`;
      }

      // 대화 히스토리 생성 (백엔드 API 형식에 맞춤)
      const conversationHistory = messages.map((msg) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      }));

      const response = await sendChatMessage({
        message: userMessage,
        model: "gpt-3.5-turbo",
        system_message: "You are a helpful assistant. Respond in Korean.",
        conversation_history: conversationHistory,
      });

      // 응답 메시지에 감정 분석 결과 추가
      const responseContent = response.message || response.response || "응답을 받을 수 없었습니다.";
      const finalContent = emotionAnalysis ? responseContent + emotionAnalysis : responseContent;

      // 응답 메시지 추가
      const assistantMessage: Message = {
        role: "assistant",
        content: finalContent,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      console.error("Chat error:", err);
      
      // 사용자 친화적인 에러 메시지 추출
      let errorMessage = "메시지를 전송하는 중 오류가 발생했습니다.";
      let errorTitle = "오류 발생";
      
      if (err.userMessage) {
        errorMessage = err.userMessage;
      } else if (err.response?.data?.detail) {
        const detail = err.response.data.detail;
        
        // OpenAI 할당량 초과 에러
        if (typeof detail === 'string' && (
          detail.includes('insufficient_quota') || 
          detail.includes('quota') || 
          detail.includes('exceeded your current quota')
        )) {
          errorTitle = "API 할당량 초과";
          errorMessage = "OpenAI API 사용 할당량이 초과되었습니다.\n\n관리자에게 문의하여 API 할당량을 확인하거나 결제 정보를 업데이트해주세요.";
        }
        // OpenAI API 키 에러
        else if (typeof detail === 'string' && detail.includes('API key')) {
          errorTitle = "API 키 오류";
          errorMessage = "OpenAI API 키가 설정되지 않았습니다.\n\n관리자에게 문의하여 API 키 설정을 확인해주세요.";
        }
        // 기타 OpenAI 에러
        else if (typeof detail === 'string' && detail.includes('OpenAI')) {
          errorTitle = "OpenAI API 오류";
          errorMessage = detail;
        }
        else {
          errorMessage = typeof detail === 'string' ? detail : JSON.stringify(detail);
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      
      // 에러 메시지도 표시
      const errorMsg: Message = {
        role: "assistant",
        content: `❌ ${errorTitle}\n\n${errorMessage}\n\n${err.code === "OPENAI_QUOTA_EXCEEDED" ? "관리자에게 문의해주세요." : "잠시 후 다시 시도해주세요."}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
      // 포커스 복원을 다음 이벤트 루프에서 수행하여 확실히 적용
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      handleSend();
    }
  };

  const handleLogout = async () => {
    if (window.confirm("로그아웃 하시겠습니까?")) {
      await logout();
    }
  };

  const handleClearChat = () => {
    if (window.confirm("대화를 초기화하시겠습니까?")) {
      setMessages([]);
      setError(null);
      // localStorage에서도 삭제 (사용자별)
      if (typeof window !== "undefined") {
        const key = getChatMessagesKey(userId);
        localStorage.removeItem(key);
      }
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Weather Forecast Bar */}
      <div className="w-full border-b border-gray-200 bg-gray-50">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
          {/* Left: 중기예보 */}
          <WeatherForecast position="left" />
          
          {/* Right: 단기예보 */}
          <WeatherForecast position="right" />
        </div>
      </div>

      {/* Header */}
      <header className="w-full border-b border-gray-200 bg-white">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <img 
              src="/aiionlogo.png" 
              alt="AIion Logo" 
              className="w-12 h-12 object-contain"
            />
            {/* Server Status Indicator */}
            {serverStatus && (
              <div className="flex items-center gap-2 ml-4">
                {serverStatus === "checking" && (
                  <span className="text-xs text-gray-500">서버 확인 중...</span>
                )}
                {serverStatus === "online" && (
                  <span className="flex items-center gap-1 text-xs text-green-600">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    서버 연결됨
                  </span>
                )}
                {serverStatus === "offline" && (
                  <span className="flex items-center gap-1 text-xs text-red-600">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    서버 연결 안 됨
                  </span>
                )}
              </div>
            )}
          </div>

          {/* User Menu */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/diaries")}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              title="일기 리스트"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
              </svg>
              <span>일기 리스트</span>
            </button>
            {messages.length > 0 && (
              <button
                onClick={handleClearChat}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                title="대화 초기화"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 6h18" />
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                </svg>
                <span>초기화</span>
              </button>
            )}
            {isAuthenticated && (
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <span>개인</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-6 py-8 relative">
        {/* Titanic Passengers Info - Left Top */}
        <TitanicPassengers />
        <div className="max-w-4xl mx-auto">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-20">
            <img 
              src="/aiionlogo.png" 
              alt="AIion Logo" 
              className="w-24 h-24 object-contain mb-4"
            />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">무엇을 알고 싶으세요?</h2>
              <p className="text-gray-500">질문을 입력하면 AI가 답변해드립니다.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      msg.role === "user"
                        ? "bg-gray-900 text-white"
                        : "bg-gray-100 text-gray-900"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-2xl px-4 py-3">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 bg-white">
        <div className="max-w-4xl mx-auto px-6 py-6">
          {/* Action Buttons */}
          <div className="flex gap-3 mb-4 flex-wrap">
            <button className="flex items-center gap-2 px-4 py-2 rounded-full border border-gray-300 hover:bg-gray-50 transition-colors text-sm">
              <div className="w-4 h-4 rounded-full bg-black" />
              <span>DeepSearch</span>
            </button>
            <button className="flex items-center gap-2 px-4 py-2 rounded-full border border-gray-300 hover:bg-gray-50 transition-colors text-sm">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <line x1="9" y1="3" x2="9" y2="21" />
                <line x1="3" y1="9" x2="21" y2="9" />
                <line x1="12" y1="3" x2="12" y2="21" />
              </svg>
              <span>Create Image</span>
            </button>
            <button className="flex items-center gap-2 px-4 py-2 rounded-full border border-gray-300 hover:bg-gray-50 transition-colors text-sm">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" />
              </svg>
              <span>최근 뉴스</span>
            </button>
            <button className="flex items-center gap-2 px-4 py-2 rounded-full border border-gray-300 hover:bg-gray-50 transition-colors text-sm">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3Z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
              <span>음성</span>
            </button>
          </div>

          {/* Input Field */}
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleSend(e);
            }} 
            className="relative"
          >
            <div className="flex items-center gap-3 bg-white border-2 border-gray-300 rounded-2xl px-4 py-3 focus-within:border-gray-900 transition-colors">
              {/* Paperclip Icon */}
              <button
                type="button"
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="파일 첨부"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                </svg>
              </button>

              {/* Input */}
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="무엇을 알고 싶으세요?"
                className="flex-1 outline-none text-gray-900 placeholder-gray-400 bg-transparent"
                readOnly={isLoading}
                autoFocus
              />

              {/* Auto Dropdown & Mic Button */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  <span>자동</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
                <button
                  type="button"
                  className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center hover:bg-gray-800 transition-colors"
                  aria-label="음성 입력"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3Z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" y1="19" x2="12" y2="23" />
                    <line x1="8" y1="23" x2="16" y2="23" />
                  </svg>
                </button>
              </div>
            </div>

            {error && (
              <div className="mt-2 text-sm text-red-600 px-4">{error}</div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

