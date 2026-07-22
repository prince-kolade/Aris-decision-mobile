import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { streamGroqResponse, isDecisionMessage, DECISION_ADDON } from '@/services/groq';
import { configureVoice, getVoiceService } from '@/services/voice';
import type { PersonaType, VoiceGender } from '@/types/index';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';

type CallState = 'idle' | 'aiSpeaking' | 'listening' | 'processing' | 'ended';

interface CallMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  companionName: string;
  voiceGender: VoiceGender;
  persona: PersonaType;
  systemPrompt: string;
  onCallEnd?: (messages: CallMessage[]) => void;
}

export default function CallModal({
  visible,
  onClose,
  companionName,
  voiceGender,
  persona,
  systemPrompt,
  onCallEnd,
}: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [callState, setCallState] = useState<CallState>('idle');
  const [currentResponse, setCurrentResponse] = useState('');
  const abortRef = useRef<AbortController | null>(null);
  const runningRef = useRef(false);
  const callMessagesRef = useRef<CallMessage[]>([]);
  const pulse = useSharedValue(0.6);

  useEffect(() => {
    if (callState === 'listening' || callState === 'aiSpeaking') {
      pulse.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 500, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.3, { duration: 500, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        true,
      );
    } else {
      pulse.value = 0.6;
    }
  }, [callState]);

  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  const speakAi = useCallback(async (text: string) => {
    setCallState('aiSpeaking');
    try {
      const voice = getVoiceService();
      await voice.speak(text);
    } catch {}
  }, []);

  const stopSpeaking = useCallback(async () => {
    try {
      const voice = getVoiceService();
      await voice.stopPlayback();
    } catch {}
  }, []);

  const sendToAi = useCallback(
    async (transcript: string) => {
      if (!runningRef.current) return;

      const userMsg: CallMessage = { role: 'user', content: transcript };
      const updatedMessages = [...callMessagesRef.current, userMsg];
      callMessagesRef.current = updatedMessages;
      setCurrentResponse('');

      abortRef.current = new AbortController();
      const decision = isDecisionMessage(transcript);
      const decisionAddon = decision ? DECISION_ADDON : '';
      let full = '';

      try {
        setCallState('processing');
        await streamGroqResponse(
          updatedMessages,
          systemPrompt + decisionAddon,
          (chunk) => {
            full += chunk;
            setCurrentResponse(full);
          },
          abortRef.current.signal,
        );
      } catch {}

      if (!runningRef.current) return;

      if (full.trim()) {
        const aiMsg: CallMessage = { role: 'assistant', content: full };
        callMessagesRef.current = [...callMessagesRef.current, aiMsg];
        setCurrentResponse(full);
        await speakAi(full);
      }

      if (runningRef.current) listenLoop();
    },
    [systemPrompt, speakAi],
  );

  const listenLoop = useCallback(async () => {
    if (!runningRef.current) return;
    setCallState('listening');
    try {
      const voice = getVoiceService();
      const transcript = await voice.listenOnce();
      if (transcript && runningRef.current) {
        await sendToAi(transcript);
      } else if (runningRef.current) {
        listenLoop();
      }
    } catch {
      if (runningRef.current) listenLoop();
    }
  }, [sendToAi]);

  const startCall = useCallback(async () => {
    configureVoice({ provider: 'groq' });
    runningRef.current = true;
    callMessagesRef.current = [];
    setCurrentResponse('');

    const greeting = `${companionName} here. Hello Ari, what's up? What are you doing?`;
    const greetingMsg: CallMessage = { role: 'assistant', content: greeting };
    callMessagesRef.current = [greetingMsg];
    setCurrentResponse(greeting);

    await speakAi(greeting);
    if (runningRef.current) listenLoop();
  }, [companionName, speakAi, listenLoop]);

  const handleEndCall = useCallback(async () => {
    runningRef.current = false;
    abortRef.current?.abort();
    await stopSpeaking().catch(() => {});

    const finalMessages = callMessagesRef.current;
    onCallEnd?.(finalMessages);
    callMessagesRef.current = [];
    setCallState('idle');
    setCurrentResponse('');
    onClose();
  }, [onClose, onCallEnd, stopSpeaking]);

  const label = () => {
    switch (callState) {
      case 'aiSpeaking':
        return `${companionName} is speaking...`;
      case 'listening':
        return 'Listening...';
      case 'processing':
        return 'Processing...';
      default:
        return '';
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleEndCall}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <Text style={[styles.title, { color: colors.foreground }]}>
            {callState !== 'idle'
              ? `Talking to ${companionName}`
              : companionName}
          </Text>
        </View>

        <View style={styles.content}>
          {callState === 'idle' ? (
            <View style={styles.startSection}>
              <View
                style={[
                  styles.avatarCircle,
                  { backgroundColor: colors.primary + '20' },
                ]}
              >
                <Feather name="phone" size={36} color={colors.primary} />
              </View>
              <Text style={[styles.avatarName, { color: colors.foreground }]}>
                {companionName}
              </Text>
              <Text
                style={[styles.statusText, { color: colors.mutedForeground }]}
              >
                Tap to start a voice call
              </Text>
              <Pressable
                onPress={startCall}
                style={[styles.callStartBtn, { backgroundColor: colors.primary }]}
              >
                <Feather name="phone-call" size={22} color="#fff" />
              </Pressable>
            </View>
          ) : (
            <View style={styles.callActive}>
              <View
                style={[
                  styles.avatarCircle,
                  { backgroundColor: colors.primary + '20' },
                ]}
              >
                <Feather name="phone" size={36} color={colors.primary} />
              </View>
              <Text style={[styles.avatarName, { color: colors.foreground }]}>
                {companionName}
              </Text>

              <Animated.View style={[styles.waveform, pulseStyle]}>
                <View
                  style={[
                    styles.waveBar,
                    { backgroundColor: colors.primary },
                    { height: 30 },
                  ]}
                />
                <View
                  style={[
                    styles.waveBar,
                    { backgroundColor: colors.primary },
                    { height: 40 },
                  ]}
                />
                <View
                  style={[
                    styles.waveBar,
                    { backgroundColor: colors.primary },
                    { height: 50 },
                  ]}
                />
                <View
                  style={[
                    styles.waveBar,
                    { backgroundColor: colors.primary },
                    { height: 40 },
                  ]}
                />
                <View
                  style={[
                    styles.waveBar,
                    { backgroundColor: colors.primary },
                    { height: 30 },
                  ]}
                />
              </Animated.View>

              <Text
                style={[styles.listeningLabel, { color: colors.mutedForeground }]}
              >
                {label()}
              </Text>

              {currentResponse ? (
                <View
                  style={[
                    styles.responseCard,
                    { backgroundColor: colors.card, borderColor: colors.border },
                  ]}
                >
                  <Text
                    style={[styles.responseText, { color: colors.foreground }]}
                  >
                    {currentResponse}
                  </Text>
                </View>
              ) : null}

              <Pressable onPress={handleEndCall} style={styles.endCallBtn}>
                <Feather name="phone-off" size={20} color="#fff" />
                <Text style={styles.endCallText}>End Call</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  title: { fontSize: 20, fontFamily: 'Inter_700Bold' },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  startSection: { alignItems: 'center', gap: 20 },
  avatarCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarName: { fontSize: 24, fontFamily: 'Inter_700Bold' },
  statusText: { fontSize: 15, fontFamily: 'Inter_400Regular' },
  callStartBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  callActive: { alignItems: 'center', gap: 20 },
  waveform: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 60,
  },
  waveBar: { width: 5, borderRadius: 4 },
  listeningLabel: { fontSize: 14, fontFamily: 'Inter_500Medium' },
  responseCard: {
    width: '100%',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 8,
    maxHeight: 200,
  },
  responseText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    lineHeight: 22,
  },
  endCallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 28,
    backgroundColor: '#E53E3E',
    marginTop: 12,
  },
  endCallText: { color: '#fff', fontSize: 16, fontFamily: 'Inter_600SemiBold' },
});
