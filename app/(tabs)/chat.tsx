import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ChatBubble from '@/components/ChatBubble';
import TypingIndicator from '@/components/TypingIndicator';
import CallModal from '@/components/CallModal';
import ConfirmModal from '@/components/ConfirmModal';
import AriLogo from '@/components/AriLogo';
import LoveBackground from '@/components/LoveBackground';
import { isDecisionMessage, streamGroqResponse, DECISION_ADDON } from '@/services/groq';
import { configureVoice, getVoiceService } from '@/services/voice';
import { useMemory } from '@/context/MemoryContext';
import { extractMemories, normalizeTitle } from '@/services/memoryExtractor';
import {
  type Message,
  generateId,
  getActiveConversationId,
  getConversations,
  saveConversation,
  setActiveConversationId,
} from '@/services/storage';
import {
  getPersonalization,
  buildSystemPrompt,
  type Personalization,
} from '@/services/personalization';

const TAB_BAR_HEIGHT = Platform.OS === 'web' ? 84 : 80;
const SWEET_NAMES = [
  'beautiful',
  'pretty',
  'gorgeous',
  'cupcake',
  'baby',
  'love',
  'sweetheart',
  'darling',
  'Princess',
];

const GREETING_SOURCES = ['', 'Greetings from Kolade. ', 'Kolade sends his love. '];

function getGreeting(name: string): string {
  const hour = new Date().getHours();
  const sweet = SWEET_NAMES[Math.floor(Math.random() * SWEET_NAMES.length)];
  const source = GREETING_SOURCES[Math.floor(Math.random() * GREETING_SOURCES.length)];
  const time =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  return `${source}${time}, ${sweet}`;
}

function makeGreeting(companionName: string): Message {
  return {
    id: generateId('greeting'),
    role: 'assistant',
    content: `Hello, Ari.\n\nI'm ${companionName}, your duplicate.\n\nTell me, what's on your mind?`,
    timestamp: Date.now(),
  };
}

export default function ChatScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);
  const flatListRef = useRef<FlatList>(null);
  const initializedRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const { memories: savedMemories, addMemory } = useMemory();

  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState('');
  const [isDecision, setIsDecision] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [showTyping, setShowTyping] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [showCall, setShowCall] = useState(false);
  const [personalization, setPersonalization] =
    useState<Personalization | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);

  const sendScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(1);

  useEffect(() => {
    (async () => {
      const p = await getPersonalization();
      setPersonalization(p);
    })();
  }, []);

  const greetingText = useMemo(
    () => (personalization ? getGreeting(personalization.companionName) : ''),
    [personalization],
  );

  const memoriesContext = useMemo(() => {
    if (savedMemories.length === 0) return '';
    return savedMemories
      .map(
        (m) =>
          `- ${m.category}: ${m.title}${m.description ? ` — ${m.description}` : ''}`,
      )
      .join('\n');
  }, [savedMemories]);

  const systemPrompt = useMemo(() => {
    const p = personalization ?? {
      companionName: 'Ari',
      persona: 'love',
      voiceGender: 'female',
    };
    return buildSystemPrompt(p, memoriesContext);
  }, [personalization, memoriesContext]);

  useEffect(() => {
    loadOrCreateConversation();
  }, []);

  useEffect(() => {
    if (!isStreaming && messages.length > 0) {
      flatListRef.current?.scrollToIndex({ index: 0, animated: true });
    }
  }, [messages.length, isStreaming]);

  useEffect(() => {
    if (isRecording) {
      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(0.3, { duration: 600 }),
          withTiming(1, { duration: 600 }),
        ),
        -1,
        true,
      );
    } else {
      pulseOpacity.value = 1;
    }
  }, [isRecording]);

  async function loadOrCreateConversation() {
    setIsLoading(true);
    const activeId = await getActiveConversationId();
    if (activeId) {
      const convs = await getConversations();
      const conv = convs[activeId];
      if (conv && conv.messages.length > 0) {
        setConversationId(activeId);
        setMessages(conv.messages);
        setIsDecision(conv.isDecision);
        initializedRef.current = true;
        setIsLoading(false);
        return;
      }
    }
    await startNewConversation();
    setIsLoading(false);
  }

  async function startNewConversation() {
    const newId = generateId('conv');
    const name = personalization?.companionName ?? 'Ari';
    const greeting = makeGreeting(name);
    setConversationId(newId);
    setMessages([greeting]);
    setIsDecision(false);
    initializedRef.current = true;
    await setActiveConversationId(newId);
    await saveConversation({
      id: newId,
      messages: [greeting],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isDecision: false,
    });
  }

  const handleNewConversation = useCallback(async () => {
    if (isStreaming) {
      abortRef.current?.abort();
      setIsStreaming(false);
      setShowTyping(false);
    }
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    await startNewConversation();
  }, [isStreaming]);

  const handleMicPress = useCallback(async () => {
    configureVoice({ provider: 'groq' });

    if (isRecording) {
      setIsRecording(false);
      setIsTranscribing(true);
      try {
        const voice = getVoiceService();
        const result = await voice.stopRecording();
        if (result && result.durationMs > 500) {
          const transcript = await voice.transcribe(result.uri);
          if (transcript.trim()) setInputText(transcript);
        }
      } catch (e) {
        console.error('[Mic] Transcribe error:', e);
      } finally {
        setIsTranscribing(false);
      }
    } else {
      try {
        const voice = getVoiceService();
        const granted = await voice.requestPermission();
        if (!granted) return;
        await voice.startRecording();
        setIsRecording(true);
        try {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        } catch {}
      } catch (e) {
        console.error('[Mic] Start error:', e);
      }
    }
  }, [isRecording]);

  const doSend = useCallback(
    async (overriddenText?: string, retryMessages?: Message[]) => {
      const text = (overriddenText ?? inputText).trim();
      if (!text || isStreaming) return;

      setInputText('');
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
      sendScale.value = withSpring(0.9, {}, () => {
        sendScale.value = withSpring(1);
      });

      const decision = isDecisionMessage(text) || isDecision;
      if (decision && !isDecision) setIsDecision(true);

      const baseMessages = retryMessages ?? messages;
      const currentMessages = [...baseMessages];
      const userMsg: Message = {
        id: generateId('msg'),
        role: 'user',
        content: text,
        timestamp: Date.now(),
        isDecisionMode: decision,
      };

      if (!retryMessages)
        setMessages((prev) => [...prev, userMsg]);
      setIsStreaming(true);
      setShowTyping(true);

      abortRef.current = new AbortController();
      let fullContent = '';
      let assistantAdded = false;
      const assistantId = generateId('msg');

      try {
        const historyContent = currentMessages.map((m) => ({
          role: m.role,
          content: m.content,
        }));
        const chatHistory = [
          ...historyContent,
          { role: 'user', content: text },
        ];
        const decisionAddon = decision ? DECISION_ADDON : '';

        await streamGroqResponse(
          chatHistory,
          systemPrompt + decisionAddon,
          (chunk) => {
            fullContent += chunk;
            if (!assistantAdded) {
              setShowTyping(false);
              setMessages((prev) => [
                ...prev,
                {
                  id: assistantId,
                  role: 'assistant',
                  content: fullContent,
                  timestamp: Date.now(),
                },
              ]);
              assistantAdded = true;
            } else {
              setMessages((prev) => {
                const updated = [...prev];
                if (updated.length > 0) {
                  updated[updated.length - 1] = {
                    ...updated[updated.length - 1],
                    content: fullContent,
                  };
                }
                return updated;
              });
            }
          },
          abortRef.current.signal,
        );
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
        console.error('[Chat] Stream error:', err);
        setShowTyping(false);
        const errorMsg = err?.message?.includes('API key')
          ? 'API key issue. Check your Groq API key.'
          : 'I had trouble reaching you. Tap Retry, my love.';
        setMessages((prev) => [
          ...prev,
          {
            id: generateId('err'),
            role: 'assistant',
            content: errorMsg,
            timestamp: Date.now(),
            isError: true,
          },
        ]);
      } finally {
        setIsStreaming(false);
        setShowTyping(false);

        const msgs = retryMessages ?? messages;
        const finalMessages: Message[] = [
          ...msgs,
          userMsg,
          ...(fullContent
            ? [
                {
                  id: assistantId,
                  role: 'assistant' as const,
                  content: fullContent,
                  timestamp: Date.now(),
                },
              ]
            : []),
        ];
        await saveConversation({
          id: conversationId,
          messages: finalMessages,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          isDecision: decision,
        });

        for (const mem of extractMemories(text)) {
          const exists = savedMemories.some(
            (m) =>
              normalizeTitle(m.title) === normalizeTitle(mem.title) &&
              m.category === mem.category,
          );
          if (!exists)
            addMemory(mem.category, mem.title, mem.description);
        }
        flatListRef.current?.scrollToIndex({ index: 0, animated: true });
      }
    },
    [
      inputText,
      isStreaming,
      messages,
      conversationId,
      isDecision,
      savedMemories,
      addMemory,
      systemPrompt,
    ],
  );

  const handleSend = useCallback(() => doSend(), [doSend]);

  const handleDeleteMessage = useCallback((index: number) => {
    setDeleteTarget(index);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (deleteTarget === null) return;
    const updated = [...messages];
    updated.splice(deleteTarget, 1);
    setMessages(updated);
    setDeleteTarget(null);
    await saveConversation({
      id: conversationId,
      messages: updated,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isDecision,
    });
  }, [deleteTarget, messages, conversationId, isDecision]);

  const handleRetry = useCallback(
    (i: number) => {
      const msgs = [...messages];
      const prev = msgs.slice(0, i);
      const last = [...prev].reverse().find((m) => m.role === 'user');
      if (!last) return;
      setMessages(prev);
      doSend(last.content, prev);
    },
    [messages, doSend],
  );

  const handleRegenerate = useCallback(
    (i: number) => {
      const msgs = [...messages];
      const prev = msgs.slice(0, i);
      const last = [...prev].reverse().find((m) => m.role === 'user');
      if (!last) return;
      setMessages(prev);
      doSend(last.content, prev);
    },
    [messages, doSend],
  );

  const sendBtnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: sendScale.value }],
  }));
  const recordingStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }));

  const reversedMessages = [...messages].reverse();
  const canSend = !!inputText.trim() && !isStreaming;
  const bottomPadding = insets.bottom + TAB_BAR_HEIGHT + 8;
  const companionName = personalization?.companionName ?? 'Ari';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LoveBackground />

      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 12,
            borderBottomColor: colors.border,
            backgroundColor: colors.card,
          },
        ]}
      >
        <View style={styles.headerLeft}>
          <AriLogo size={36} />
          <View>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>
              Ari
            </Text>
            <Text
              style={[styles.headerSub, { color: colors.mutedForeground }]}
            >
              {greetingText}
            </Text>
          </View>
        </View>
        <Pressable onPress={handleNewConversation} hitSlop={12}>
          <Feather name="edit-3" size={20} color={colors.primary} />
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? TAB_BAR_HEIGHT : 0}
      >
        <FlatList
          ref={flatListRef}
          data={reversedMessages}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => {
            const realIndex = messages.length - 1 - index;
            return (
              <ChatBubble
                message={item}
                onRetry={
                  item.isError ? () => handleRetry(realIndex) : undefined
                }
                onRegenerate={
                  !item.isError &&
                  item.role === 'assistant' &&
                  realIndex === messages.length - 1
                    ? () => handleRegenerate(realIndex)
                    : undefined
                }
                onDelete={() => handleDeleteMessage(realIndex)}
              />
            );
          }}
          inverted={messages.length > 0}
          ListHeaderComponent={showTyping ? <TypingIndicator /> : null}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />

        <View
          style={[
            styles.inputArea,
            {
              paddingBottom: bottomPadding,
              backgroundColor: colors.card,
              borderTopColor: colors.border,
            },
          ]}
        >
          <View
            style={[
              styles.inputRow,
              { backgroundColor: colors.background, borderColor: colors.border },
            ]}
          >
            {isTranscribing ? (
              <View style={styles.transcribingRow}>
                <Text style={[styles.transcribingText, { color: colors.mutedForeground }]}>
                  Transcribing...
                </Text>
              </View>
            ) : (
              <TextInput
                ref={inputRef}
                value={inputText}
                onChangeText={setInputText}
                placeholder={`Talk to ${companionName}...`}
                placeholderTextColor={colors.mutedForeground}
                style={[styles.input, { color: colors.foreground }]}
                multiline
                maxLength={2000}
                blurOnSubmit={false}
                onSubmitEditing={handleSend}
                editable={!isStreaming}
              />
            )}
            <Pressable
              onPress={() => setShowCall(true)}
              hitSlop={8}
              style={styles.iconBtn}
            >
              <Feather name="phone" size={18} color={colors.mutedForeground} />
            </Pressable>
            <Pressable
              onPress={handleMicPress}
              hitSlop={8}
              style={styles.iconBtn}
            >
              <Animated.View
                style={isRecording ? recordingStyle : undefined}
              >
                <Feather
                  name={isRecording ? 'stop-circle' : 'mic'}
                  size={20}
                  color={
                    isRecording ? colors.destructive : colors.mutedForeground
                  }
                />
              </Animated.View>
            </Pressable>
            <Animated.View style={sendBtnStyle}>
              <Pressable
                onPress={handleSend}
                disabled={!canSend}
                style={[
                  styles.sendBtn,
                  {
                    backgroundColor: canSend
                      ? colors.primary
                      : colors.muted,
                  },
                ]}
              >
                {isStreaming ? (
                  <Feather name="square" size={14} color="#fff" />
                ) : (
                  <Feather
                    name="arrow-up"
                    size={18}
                    color={canSend ? '#fff' : colors.mutedForeground}
                  />
                )}
              </Pressable>
            </Animated.View>
          </View>
        </View>
      </KeyboardAvoidingView>

      <ConfirmModal
        visible={deleteTarget !== null}
        title="Delete Message"
        message="Delete this message?"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {personalization && (
        <CallModal
          visible={showCall}
          onClose={() => setShowCall(false)}
          companionName={companionName}
          voiceGender={personalization.voiceGender}
          persona={personalization.persona}
          systemPrompt={systemPrompt}
          onCallEnd={(callMsgs) => {
            if (callMsgs.length > 1) {
              setMessages((prev) => {
                const existing = new Set(prev.map((m) => m.id));
                const newMsgs = callMsgs
                  .filter((m) => m.content.trim())
                  .map((m) => ({
                    id: generateId('call'),
                    role: m.role as 'user' | 'assistant',
                    content: m.content,
                    timestamp: Date.now(),
                  }))
                  .filter((m) => !existing.has(m.id));
                if (newMsgs.length === 0) return prev;
                const updated = [...prev, ...newMsgs];
                saveConversation({
                  id: conversationId,
                  messages: updated,
                  createdAt: Date.now(),
                  updatedAt: Date.now(),
                  isDecision,
                });
                return updated;
              });
            }
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    paddingTop: 12,
    borderBottomWidth: 1,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  headerTitle: { fontSize: 18, fontFamily: 'Inter_700Bold' },
  headerSub: { fontSize: 12, fontFamily: 'Inter_500Medium', marginTop: 1 },
  listContent: { paddingVertical: 16, flexGrow: 1 },
  inputArea: { paddingHorizontal: 16, paddingTop: 8, borderTopWidth: 1 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: 28,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 2,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    lineHeight: 22,
    maxHeight: 120,
    paddingVertical: 4,
  },
  transcribingRow: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 8,
  },
  transcribingText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    fontStyle: 'italic',
  },
  iconBtn: { paddingBottom: 4, paddingHorizontal: 6 },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
