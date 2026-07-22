import React, { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useColors } from '@/hooks/useColors';
import type { Message } from '@/types/index';

interface Props {
  message: Message;
  onRetry?: () => void;
  onRegenerate?: () => void;
  onDelete?: () => void;
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ChatBubble({
  message,
  onRetry,
  onRegenerate,
  onDelete,
}: Props) {
  const colors = useColors();
  const isUser = message.role === 'user';
  const isError = message.isError;

  const handleCopy = useCallback(async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    await Clipboard.setStringAsync(message.content);
  }, [message.content]);

  const handleLongPress = useCallback(() => {
    onDelete?.();
  }, [onDelete]);

  const bubbleBg = isUser
    ? colors.primary
    : isError
      ? colors.destructive + '15'
      : colors.card;

  const textColor = isUser ? '#fff' : colors.foreground;

  return (
    <View style={isUser ? styles.wrapperUser : styles.wrapperAri}>
      <Pressable onLongPress={handleLongPress} delayLongPress={500}>
        <View
          style={[
            styles.bubble,
            { backgroundColor: bubbleBg },
            isUser
              ? styles.userBubble
              : [styles.ariBubble, { borderColor: colors.border }],
          ]}
        >
          <Text style={[styles.text, { color: textColor }]}>
            {message.content}
          </Text>
          {message.isDecisionMode && !isUser && (
            <View
              style={[
                styles.decisionBadge,
                { backgroundColor: colors.primary + '20' },
              ]}
            >
              <Text style={[styles.decisionBadgeText, { color: colors.primary }]}>
                Decision Mode
              </Text>
            </View>
          )}
        </View>
      </Pressable>

      <View
        style={[
          styles.metaRow,
          isUser ? styles.metaRowUser : styles.metaRowAri,
        ]}
      >
        <Text style={[styles.timestamp, { color: colors.mutedForeground }]}>
          {formatTime(message.timestamp)}
        </Text>
        <View style={styles.metaActions}>
          {!isUser && onRegenerate && !isError && (
            <Pressable onPress={onRegenerate} hitSlop={8} style={styles.actionBtn}>
              <Feather name="refresh-cw" size={12} color={colors.mutedForeground} />
            </Pressable>
          )}
          {isError && onRetry && (
            <Pressable onPress={onRetry} hitSlop={8} style={styles.actionBtn}>
              <Feather name="alert-circle" size={12} color={colors.destructive} />
              <Text style={[styles.retryText, { color: colors.destructive }]}>
                Retry
              </Text>
            </Pressable>
          )}
          {!isUser && (
            <Pressable onPress={handleCopy} hitSlop={8} style={styles.actionBtn}>
              <Feather name="copy" size={12} color={colors.mutedForeground} />
            </Pressable>
          )}
          {onDelete && (
            <Pressable onPress={onDelete} hitSlop={8} style={styles.actionBtn}>
              <Feather name="trash-2" size={12} color={colors.destructive} />
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapperUser: {
    paddingHorizontal: 16,
    marginVertical: 4,
    alignItems: 'flex-end',
  },
  wrapperAri: {
    paddingHorizontal: 16,
    marginVertical: 4,
    alignItems: 'flex-start',
  },
  bubble: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignSelf: 'flex-start',
    flexShrink: 1,
  },
  userBubble: { borderBottomRightRadius: 6, borderBottomLeftRadius: 20 },
  ariBubble: { borderWidth: 1, borderBottomLeftRadius: 6, borderBottomRightRadius: 20 },
  text: {
    fontSize: 15,
    lineHeight: 22,
    fontFamily: 'Inter_400Regular',
    flexWrap: 'wrap',
  },
  timestamp: { fontSize: 11, fontFamily: 'Inter_400Regular', marginHorizontal: 4 },
  decisionBadge: {
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  decisionBadgeText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3 },
  metaRowUser: { justifyContent: 'flex-end' },
  metaRowAri: { justifyContent: 'flex-start' },
  metaActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, padding: 4 },
  retryText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
});
