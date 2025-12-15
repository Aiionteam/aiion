export interface Diary {
  id: string;
  date: string; // YYYY-MM-DD 형식
  title: string;
  content: string;
  emotion: string;
  emotionScore: number;
}

export type Category = "home" | "calendar" | "diary" | "health" | "culture" | "account" | "path" | "settings";

export interface MenuItem {
  id: Category;
  label: string;
  icon: string;
}

export type DiaryView = 'home' | 'write' | 'list' | 'detail' | 'analysis';
export type AccountView = 'home' | 'data' | 'daily' | 'monthly' | 'income' | 'tax';
export type SettingsView = 'home' | 'profile';
export type CultureView = 'home' | 'travel' | 'movie' | 'performance' | 'records' | 'wishlist';

export type HealthView = 'home' | 'health' | 'exercise' | 'exercise-detail' | 'medication' | 'sleep' | 'nutrition' | 'records' | 'scan';
export type PathfinderView = 'home' | 'map' | 'search' | 'favorites' | 'learning' | 'new-learning' | 'career' | 'roadmap';

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
  text?: string;
  date: string;
  time?: string;
  description?: string;
  isAllDay?: boolean; // 하루종일 이벤트 여부
  alarmOn?: boolean; // 알람 활성화 여부
  notification?: boolean; // 알림 활성화 여부
}

export interface Task {
  id: string;
  text?: string;
  date: string;
  completed: boolean;
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
