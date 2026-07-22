import React, { useCallback, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ChatBubble from '@/components/ChatBubble';
import LoveBackground from '@/components/LoveBackground';
import {
  type Conversation,
  type Message,
  getConversations,
} from '@/services/storage';
import { useFocusEffect } from 'expo-router';

function DecisionCard({
  conv,
  onPress,
}: {
  conv: Conversation;
  onPress: (conv: Conversation) => void;
}) {
  const colors = useColors();

  const firstUserMsg = conv.messages.find((m) => m.role === 'user');
  const preview = firstUserMsg?.content ?? '—';
  const date = new Date(conv.createdAt).toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const msgCount = conv.messages.length;

  return (
    <Pressable
      onPress={() => onPress(conv)}
      style={({ pressed }) => [
        styles.decisionCard,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          opacity: pressed ? 0.75 : 1,
        },
      ]}
    >
      <View style={styles.cardTop}>
        <View style={[styles.decisionBadge, { backgroundColor: colors.primary + '15' }]}>
          <Feather name="zap" size={12} color={colors.primary} />
          <Text style={[styles.decisionBadgeText, { color: colors.primary }]}>
            Decision
          </Text>
        </View>
        <Text style={[styles.dateText, { color: colors.mutedForeground }]}>
          {date}
        </Text>
      </View>
      <Text
        style={[styles.previewText, { color: colors.foreground }]}
        numberOfLines={2}
      >
        {preview}
      </Text>
      <Text style={[styles.countText, { color: colors.mutedForeground }]}>
        {msgCount} messages
      </Text>
    </Pressable>
  );
}

function ConversationModal({
  conv,
  onClose,
}: {
  conv: Conversation | null;
  onClose: () => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  if (!conv) return null;

  return (
    <Modal
      visible={!!conv}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View
          style={[
            styles.modalHeader,
            {
              paddingTop: insets.top + 12,
              borderBottomColor: colors.border,
            },
          ]}
        >
          <Pressable onPress={onClose} hitSlop={12}>
            <Feather
              name="chevron-down"
              size={24}
              color={colors.mutedForeground}
            />
          </Pressable>
          <Text style={[styles.modalTitle, { color: colors.foreground }]}>
            Decision
          </Text>
          <View style={{ width: 24 }} />
        </View>
        <ScrollView contentContainerStyle={{ paddingVertical: 16 }}>
          {conv.messages.map((msg: Message) => (
            <ChatBubble key={msg.id} message={msg} />
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

export default function DecisionsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [decisions, setDecisions] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);

  const loadDecisions = useCallback(async () => {
    const convs = await getConversations();
    const decisionConvs = Object.values(convs)
      .filter((c) => c.isDecision)
      .sort((a, b) => b.updatedAt - a.updatedAt);
    setDecisions(decisionConvs);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadDecisions();
    }, [loadDecisions]),
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LoveBackground />
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 12,
            borderBottomColor: colors.border,
            backgroundColor: colors.background,
          },
        ]}
      >
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          Decisions
        </Text>
      </View>

      {decisions.length === 0 ? (
        <View style={styles.empty}>
          <Feather name="zap" size={44} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            No decisions yet
          </Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            When you discuss a decision with Ari, it will appear here for review.
          </Text>
        </View>
      ) : (
        <FlatList
          data={decisions}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <DecisionCard conv={item} onPress={setSelected} />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      <ConversationModal
        conv={selected}
        onClose={() => setSelected(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 26,
    fontFamily: 'Inter_700Bold',
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  decisionCard: {
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    gap: 10,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  decisionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
  },
  decisionBadgeText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
  dateText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  previewText: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    lineHeight: 22,
  },
  countText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 22,
  },
  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
  },
});
