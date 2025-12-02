export interface Diary {
  id: string;
  date: string; // YYYY-MM-DD 형식
  title: string;
  content: string;
  emotion: string;
  emotionScore: number;
}

// 카테고리 관련 타입 제거됨 (어드민 프론트엔드)

export interface Interaction {
  id: string;
  date: string;
  dayOfWeek: string;
  userInput: string;
  categories: string[];
  aiResponse: string;
}

export interface Event {
  id: string;
  title?: string; // 옵셔널로 변경 (text를 사용할 수도 있음)
  text?: string; // text 속성 추가
  date: string;
  time?: string;
  description?: string;
  isAllDay?: boolean; // 하루종일 이벤트 여부
  alarmOn?: boolean; // 알람 활성화 여부
  notification?: boolean; // 알림 활성화 여부
}

export interface Task {
  id: string;
  title?: string; // 옵셔널로 변경 (text를 사용할 수도 있음)
  text?: string; // text 속성 추가
  date: string;
  completed: boolean;
  alarm?: boolean;
  alarmTime?: string;
}

export interface Transaction {
  id: string;
  title: string;
  date: string;
  totalAmount: number;
}

// Web Speech API 타입 정의
export interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  serviceURI: string;
  grammars: SpeechGrammarList;
  onaudiostart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onaudioend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
  onnomatch: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onsoundstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onsoundend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onspeechstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onspeechend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  abort(): void;
  start(): void;
  stop(): void;
}

export interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

export interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
  readonly message: string;
}

export interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

export interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

export interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

export interface SpeechGrammarList {
  readonly length: number;
  item(index: number): SpeechGrammar;
  addFromURI(src: string, weight?: number): void;
  addFromString(string: string, weight?: number): void;
  [index: number]: SpeechGrammar;
}

export interface SpeechGrammar {
  src: string;
  weight: number;
}

declare global {
  interface Window {
    SpeechRecognition: {
      new (): SpeechRecognition;
    };
    webkitSpeechRecognition: {
      new (): SpeechRecognition;
    };
  }
}
