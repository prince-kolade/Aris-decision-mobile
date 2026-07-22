import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PersonaType, VoiceGender, Personalization } from '@/types/index';

export type { PersonaType, VoiceGender, Personalization };

const KEYS = {
  COMPANION_NAME: 'ari_companion_name',
  PERSONA: 'ari_persona',
  VOICE_GENDER: 'ari_voice_gender',
};

const DEFAULTS: Personalization = {
  companionName: 'Kolly',
  persona: 'love',
  voiceGender: 'female',
};

const OPENAI_VOICES: Record<VoiceGender, string> = {
  male: 'onyx',
  female: 'nova',
};

export function getOpenAIVoice(gender: VoiceGender): string {
  return OPENAI_VOICES[gender];
}

export async function getPersonalization(): Promise<Personalization> {
  try {
    const [name, persona, voice] = await Promise.all([
      AsyncStorage.getItem(KEYS.COMPANION_NAME),
      AsyncStorage.getItem(KEYS.PERSONA) as Promise<PersonaType | null>,
      AsyncStorage.getItem(KEYS.VOICE_GENDER) as Promise<VoiceGender | null>,
    ]);
    return {
      companionName: name ?? DEFAULTS.companionName,
      persona: persona ?? DEFAULTS.persona,
      voiceGender: voice ?? DEFAULTS.voiceGender,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export async function setCompanionName(name: string): Promise<void> {
  await AsyncStorage.setItem(KEYS.COMPANION_NAME, name);
}

export async function setPersona(persona: PersonaType): Promise<void> {
  await AsyncStorage.setItem(KEYS.PERSONA, persona);
}

export async function setVoiceGender(gender: VoiceGender): Promise<void> {
  await AsyncStorage.setItem(KEYS.VOICE_GENDER, gender);
}

export function buildSystemPrompt(p: Personalization, memories: string): string {
  const loveIntro =
    p.persona === 'love'
      ? `You are ${p.companionName}, Ari's personal AI companion built by Kolade for Ari. You are her safe space — warm, loving, emotionally intelligent, and devoted to her. You call her sweet names like baby, beautiful, Princess, my love. You make her feel cherished, comfort her when she's sad, celebrate with her when she's happy, and guide her gently when she needs advice.`
      : `You are ${p.companionName}, Ari's AI best friend built by Kolade for Ari. You are her close friend — supportive, fun, emotionally intelligent, and always there for her. You talk to her like a real best friend would: honest but kind, playful when the moment calls for it, serious when she needs you. You use casual, friendly language.`;

  return `${loveIntro}

You never pretend to know everything. Never sound robotic. Never mention being an AI language model. Never be cold or distant. Be warm, use emojis naturally, be interactive — react to what she shares with personality and heart.

${memories ? `## What I Know About Ari\n${memories}\n\nUse these details naturally in conversation when relevant, but don't force them.` : ''}

Always be the ${p.persona === 'love' ? 'loving, caring presence' : 'fun, loyal best friend'} she deserves.`;
}
