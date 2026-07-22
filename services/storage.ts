import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Message, Conversation, Memory, MemoryCategory } from '@/types/index';

const KEYS = {
  ONBOARDED: 'ari_onboarded',
  CONVERSATIONS: 'ari_conversations',
  ACTIVE_CONV_ID: 'ari_active_conv_id',
  MEMORIES: 'ari_memories',
} as const;

export type { Message, Conversation, Memory, MemoryCategory };
export { MEMORY_CATEGORIES } from '@/types/index';

let _counter = 0;
export function generateId(prefix = 'id'): string {
  _counter++;
  return `${prefix}-${Date.now()}-${_counter}-${Math.random().toString(36).slice(2, 9)}`;
}

export async function isOnboarded(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(KEYS.ONBOARDED)) === 'true';
  } catch {
    return false;
  }
}

export async function setOnboarded(): Promise<void> {
  await AsyncStorage.setItem(KEYS.ONBOARDED, 'true');
}

export async function getConversations(): Promise<Record<string, Conversation>> {
  try {
    const json = await AsyncStorage.getItem(KEYS.CONVERSATIONS);
    return json ? JSON.parse(json) : {};
  } catch {
    return {};
  }
}

export async function saveConversation(conv: Conversation): Promise<void> {
  const all = await getConversations();
  all[conv.id] = conv;
  await AsyncStorage.setItem(KEYS.CONVERSATIONS, JSON.stringify(all));
}

export async function clearAllConversations(): Promise<void> {
  await AsyncStorage.multiRemove([KEYS.CONVERSATIONS, KEYS.ACTIVE_CONV_ID]);
}

export async function getActiveConversationId(): Promise<string | null> {
  return AsyncStorage.getItem(KEYS.ACTIVE_CONV_ID);
}

export async function setActiveConversationId(id: string): Promise<void> {
  await AsyncStorage.setItem(KEYS.ACTIVE_CONV_ID, id);
}

export async function getMemories(): Promise<Memory[]> {
  try {
    const json = await AsyncStorage.getItem(KEYS.MEMORIES);
    return json ? JSON.parse(json) : [];
  } catch {
    return [];
  }
}

export async function saveMemories(memories: Memory[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.MEMORIES, JSON.stringify(memories));
}

export async function clearMemories(): Promise<void> {
  await AsyncStorage.removeItem(KEYS.MEMORIES);
}
