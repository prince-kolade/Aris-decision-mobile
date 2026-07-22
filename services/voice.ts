import { Platform } from 'react-native';

export type VoiceProvider = 'groq' | 'system';

export interface VoiceConfig {
  provider: VoiceProvider;
  apiKey?: string;
  model?: string;
}

interface VoiceService {
  readonly name: string;
  isAvailable(): boolean;
  requestPermission(): Promise<boolean>;
  startRecording(): Promise<void>;
  stopRecording(): Promise<{ uri: string; durationMs: number } | null>;
  playAudio(uri: string): Promise<void>;
  stopPlayback(): Promise<void>;
  transcribe(audioUri: string): Promise<string>;
  speak(text: string, onDone?: () => void): Promise<void>;
  listenOnce(silenceMs?: number): Promise<string | null>;
}

let currentService: VoiceService | null = null;

const defaultConfig: VoiceConfig = {
  provider: 'groq',
  model: 'whisper-large-v3',
};

const GROQ_API_KEY = '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';

export function configureVoice(config: Partial<VoiceConfig>): void {
  const merged = { ...defaultConfig, ...config };
  currentService = createGroqVoiceService(merged);
}

export function getVoiceService(): VoiceService {
  if (!currentService) {
    configureVoice({});
  }
  return currentService!;
}

const IS_WEB = Platform.OS === 'web';
const GROQ_WHISPER_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';

function createGroqVoiceService(config: VoiceConfig): VoiceService {
  return {
    name: 'groq',

    isAvailable(): boolean {
      return true;
    },

    async requestPermission(): Promise<boolean> {
      try {
        const { Audio } = require('expo-av');
        const perm = await Audio.requestPermissionsAsync();
        return perm.granted;
      } catch {
        return true;
      }
    },

    async startRecording(): Promise<void> {
      const { Audio } = require('expo-av');
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );
      (global as any).__ariRecording = recording;
    },

    async stopRecording(): Promise<{ uri: string; durationMs: number } | null> {
      const recording = (global as any).__ariRecording;
      if (!recording) return null;

      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      const durationMs = (await recording.getStatusAsync()).durationMillis ?? 0;
      (global as any).__ariRecording = null;
      return uri ? { uri, durationMs } : null;
    },

    async playAudio(uri: string): Promise<void> {
      if (uri.startsWith('data:') || uri.startsWith('file:') || uri.startsWith('http')) {
        const { Audio } = require('expo-av');
        const { sound } = await Audio.Sound.createAsync({ uri });
        await sound.playAsync();
        (global as any).__ariSound = sound;
      }
    },

    async stopPlayback(): Promise<void> {
      if (IS_WEB) speechSynthesis.cancel();
      const sound = (global as any).__ariSound;
      if (sound) {
        try {
          await sound.stopAsync();
          await sound.unloadAsync();
        } catch {}
        (global as any).__ariSound = null;
      }
    },

    async transcribe(audioUri: string): Promise<string> {
      const formData = new FormData();
      if (IS_WEB) {
        const blob = await fetch(audioUri).then((r) => r.blob());
        formData.append('file', blob, 'recording.webm');
      } else {
        formData.append('file', {
          uri: audioUri,
          type: 'audio/m4a',
          name: 'recording.m4a',
        } as any);
      }
      formData.append('model', 'whisper-large-v3');

      const response = await fetch(GROQ_WHISPER_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${GROQ_API_KEY}` },
        body: formData,
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Transcription error ${response.status}: ${errText}`);
      }

      const data = await response.json();
      return data.text ?? '';
    },

    async speak(text: string, onDone?: () => void): Promise<void> {
      if (IS_WEB) {
        if (speechSynthesis.getVoices().length === 0) {
          await new Promise<void>((resolve) => {
            speechSynthesis.onvoiceschanged = () => resolve();
            setTimeout(resolve, 2000);
          });
        }
        return new Promise((resolve, reject) => {
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.rate = 0.9;
          utterance.pitch = 1.05;
          utterance.onend = () => {
            resolve();
            onDone?.();
          };
          utterance.onerror = (e) => reject(e);
          speechSynthesis.speak(utterance);
        });
      }

      const { Speech } = require('expo-speech');
      return new Promise((resolve, reject) => {
        Speech.speak(text, {
          rate: 0.5,
          onDone: () => {
            resolve();
            onDone?.();
          },
          onError: (e: any) => reject(e),
        });
      });
    },

    async listenOnce(silenceMs = 1500): Promise<string | null> {
      if (IS_WEB && typeof (window as any).webkitSpeechRecognition !== 'undefined') {
        return new Promise((resolve) => {
          const SpeechRecognition = (window as any).webkitSpeechRecognition;
          const recognition = new SpeechRecognition();
          recognition.continuous = false;
          recognition.interimResults = false;
          recognition.lang = 'en-US';

          let timer: any = null;

          recognition.onresult = (event: any) => {
            if (timer) clearTimeout(timer);
            timer = setTimeout(() => {
              try {
                recognition.stop();
              } catch {}
              const result = event.results[event.results.length - 1];
              const text = result[0].transcript.trim();
              resolve(text || null);
            }, silenceMs);
          };

          recognition.onerror = () => {
            resolve(null);
          };

          recognition.onend = () => {
            if (timer) clearTimeout(timer);
          };

          recognition.start();
        });
      }

      await this.startRecording();
      await new Promise((r) => setTimeout(r, 8000));
      const result = await this.stopRecording();
      if (!result || result.durationMs < 500) return null;
      return this.transcribe(result.uri);
    },
  };
}
