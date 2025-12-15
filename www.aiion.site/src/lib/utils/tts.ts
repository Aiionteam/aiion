/**
 * TTS (Text-to-Speech) 유틸리티
 * 여러 TTS 서비스를 지원하는 통합 인터페이스
 */

export type TTSService = 'web' | 'google' | 'azure' | 'clova';

export interface TTSOptions {
  service?: TTSService;
  voice?: string;
  speed?: number;
  pitch?: number;
  volume?: number;
  language?: string;
}

/**
 * Web Speech API를 사용한 TTS (기본)
 */
export const speakWithWebTTS = (
  text: string,
  options: TTSOptions = {}
): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!('speechSynthesis' in window)) {
      reject(new Error('Speech synthesis is not supported'));
      return;
    }

    // 기존 발화 중지
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    // 옵션 적용
    if (options.voice) {
      const voices = window.speechSynthesis.getVoices();
      const selectedVoice = voices.find(v => v.name === options.voice);
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }
    }
    
    utterance.rate = options.speed || 1.0;
    utterance.pitch = options.pitch || 1.0;
    utterance.volume = options.volume || 1.0;
    utterance.lang = options.language || 'ko-KR';

    utterance.onend = () => resolve();
    utterance.onerror = (error) => reject(error);

    window.speechSynthesis.speak(utterance);
  });
};

/**
 * Google Cloud TTS API를 사용한 TTS
 * (준비 완료, 환경변수 설정 시 사용 가능)
 */
export const speakWithGoogleTTS = async (
  text: string,
  options: TTSOptions = {}
): Promise<void> => {
  try {
    // Next.js API Route 호출
    const response = await fetch('/api/tts/google', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        language: options.language || 'ko-KR',
        voice: options.voice || 'ko-KR-Standard-A',
        speed: options.speed || 1.0,
        pitch: options.pitch || 0,
      }),
    });

    if (!response.ok) {
      throw new Error('TTS API 호출 실패');
    }

    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);

    return new Promise((resolve, reject) => {
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        resolve();
      };
      audio.onerror = reject;
      audio.play();
    });
  } catch (error) {
    console.error('Google TTS 실패:', error);
    // Fallback to Web TTS
    return speakWithWebTTS(text, options);
  }
};

/**
 * Azure Speech Service를 사용한 TTS
 * (준비 완료, 환경변수 설정 시 사용 가능)
 */
export const speakWithAzureTTS = async (
  text: string,
  options: TTSOptions = {}
): Promise<void> => {
  try {
    // Next.js API Route 호출
    const response = await fetch('/api/tts/azure', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        language: options.language || 'ko-KR',
        voice: options.voice || 'ko-KR-InJoonNeural',
        speed: options.speed || 1.0,
        pitch: options.pitch || 0,
      }),
    });

    if (!response.ok) {
      throw new Error('Azure TTS API 호출 실패');
    }

    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);

    return new Promise((resolve, reject) => {
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        resolve();
      };
      audio.onerror = reject;
      audio.play();
    });
  } catch (error) {
    console.error('Azure TTS 실패:', error);
    return speakWithWebTTS(text, options);
  }
};

/**
 * CLOVA Voice를 사용한 TTS
 * (준비 완료, 환경변수 설정 시 사용 가능)
 */
export const speakWithClovaTTS = async (
  text: string,
  options: TTSOptions = {}
): Promise<void> => {
  try {
    // Next.js API Route 호출
    const response = await fetch('/api/tts/clova', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        voice: options.voice || 'nara',
        speed: options.speed || 0,
        pitch: options.pitch || 0,
        volume: options.volume || 0,
      }),
    });

    if (!response.ok) {
      throw new Error('CLOVA TTS API 호출 실패');
    }

    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);

    return new Promise((resolve, reject) => {
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        resolve();
      };
      audio.onerror = reject;
      audio.play();
    });
  } catch (error) {
    console.error('CLOVA TTS 실패:', error);
    return speakWithWebTTS(text, options);
  }
};

/**
 * 통합 TTS 함수
 */
export const speakText = async (
  text: string,
  options: TTSOptions = {}
): Promise<void> => {
  const service = options.service || 'web';

  switch (service) {
    case 'google':
      return speakWithGoogleTTS(text, options);
    case 'azure':
      return speakWithAzureTTS(text, options);
    case 'clova':
      return speakWithClovaTTS(text, options);
    case 'web':
    default:
      return speakWithWebTTS(text, options);
  }
};

/**
 * TTS 중지
 */
export const stopTTS = () => {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
};

