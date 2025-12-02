/**
 * AI 게이트웨이 API를 위한 React Hooks
 * 
 * 백엔드 가이드 문서 기반으로 작성된 AI 서버 (localhost:9000) 전용 React Hooks
 */

import { useState, useCallback } from 'react';
import { aiGatewayClient, type ChatRequest, type ChatResponse, type ChatMessage, type Classification } from '../../lib';

// ============================================================================
// 챗봇 Hook
// ============================================================================

export function useChatbot() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationHistory, setConversationHistory] = useState<ChatMessage[]>([]);
  const [lastClassification, setLastClassification] = useState<Classification | null>(null);

  const sendMessage = useCallback(async (
    message: string,
    options?: {
      model?: string;
      system_message?: string;
    }
  ): Promise<string | null> => {
    setLoading(true);
    setError(null);

    try {
      const request: ChatRequest = {
        message,
        model: options?.model || 'gpt-3.5-turbo',
        system_message: options?.system_message || 'You are a helpful assistant. Respond in Korean.',
        conversation_history: conversationHistory,
      };

      const response = await aiGatewayClient.sendChat(request);

      if (response.error || !response.data) {
        const errorMsg = response.error || 'AI 응답을 받을 수 없습니다.';
        setError(errorMsg);
        return null;
      }

      if (response.data.status === 'error') {
        setError(response.data.message || 'AI 처리 중 오류가 발생했습니다.');
        return null;
      }

      const assistantMessage = response.data.message;

      // 분류 정보 처리 (있으면 저장)
      if (response.data.classification) {
        setLastClassification(response.data.classification);
      } else {
        setLastClassification(null);
      }

      // 대화 히스토리 업데이트
      setConversationHistory((prev) => [
        ...prev,
        { role: 'user', content: message },
        { role: 'assistant', content: assistantMessage },
      ]);

      return assistantMessage;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [conversationHistory]);

  const clearHistory = useCallback(() => {
    setConversationHistory([]);
    setError(null);
    setLastClassification(null);
  }, []);

  return {
    sendMessage,
    clearHistory,
    loading,
    error,
    conversationHistory,
    lastClassification, // 분류 정보 추가
  };
}

// ============================================================================
// 날씨 Hook
// ============================================================================

export function useWeatherForecast() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getMidForecast = useCallback(async (regionName: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await aiGatewayClient.getMidForecast({
        regionName,
        dataType: 'JSON',
      });

      if (response.error) {
        setError(response.error);
        return null;
      }

      return response.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '날씨 정보를 가져올 수 없습니다.';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const getShortForecast = useCallback(async (nx: number, ny: number) => {
    setLoading(true);
    setError(null);

    try {
      const response = await aiGatewayClient.getShortForecast({
        nx,
        ny,
        dataType: 'JSON',
      });

      if (response.error) {
        setError(response.error);
        return null;
      }

      return response.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '날씨 정보를 가져올 수 없습니다.';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const getRegions = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await aiGatewayClient.getWeatherRegions();

      if (response.error) {
        setError(response.error);
        return null;
      }

      return response.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '지역 목록을 가져올 수 없습니다.';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    getMidForecast,
    getShortForecast,
    getRegions,
    loading,
    error,
  };
}

// ============================================================================
// 크롤러 Hook
// ============================================================================

export function useCrawler() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getBugsMusic = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await aiGatewayClient.getBugsMusic();

      if (response.error) {
        setError(response.error);
        return null;
      }

      return response.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '벅스 차트를 가져올 수 없습니다.';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const getNetflix = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await aiGatewayClient.getNetflix();

      if (response.error) {
        setError(response.error);
        return null;
      }

      return response.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Netflix 목록을 가져올 수 없습니다.';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const getMovies = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await aiGatewayClient.getMovies();

      if (response.error) {
        setError(response.error);
        return null;
      }

      return response.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '영화 목록을 가져올 수 없습니다.';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const getDanawaTV = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await aiGatewayClient.getDanawaTV();

      if (response.error) {
        setError(response.error);
        return null;
      }

      return response.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '다나와 TV 목록을 가져올 수 없습니다.';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    getBugsMusic,
    getNetflix,
    getMovies,
    getDanawaTV,
    loading,
    error,
  };
}

// ============================================================================
// Health Check Hook
// ============================================================================

export function useAIGatewayHealth() {
  const [isHealthy, setIsHealthy] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkHealth = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await aiGatewayClient.healthCheck();

      if (response.error) {
        setError(response.error);
        setIsHealthy(false);
        return false;
      }

      const healthy = response.data?.status === 'healthy';
      setIsHealthy(healthy);
      return healthy;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Health check 실패';
      setError(errorMessage);
      setIsHealthy(false);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    isHealthy,
    checkHealth,
    loading,
    error,
  };
}

