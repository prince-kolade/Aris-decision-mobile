export type ThemeMode = 'system' | 'light' | 'dark';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  isDecisionMode?: boolean;
  isError?: boolean;
}

export interface Conversation {
  id: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
  isDecision: boolean;
}

export type MemoryCategory =
  | 'Goals'
  | 'Projects'
  | 'Preferences'
  | 'People'
  | 'Habits'
  | 'Reminders'
  | 'Personal Information';

export const MEMORY_CATEGORIES: MemoryCategory[] = [
  'Goals',
  'Projects',
  'Preferences',
  'People',
  'Habits',
  'Reminders',
  'Personal Information',
];

export interface Memory {
  id: string;
  category: MemoryCategory;
  title: string;
  description: string;
  createdAt: number;
}

export type PersonaType = 'love' | 'friend';
export type VoiceGender = 'male' | 'female';

export interface Personalization {
  companionName: string;
  persona: PersonaType;
  voiceGender: VoiceGender;
}
