import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import type { Memory, MemoryCategory } from '@/types/index';

const CATEGORY_COLORS: Record<MemoryCategory, string> = {
  Goals: '#FF4FA3',
  Projects: '#7C3AED',
  Preferences: '#EA580C',
  People: '#2563EB',
  Habits: '#059669',
  Reminders: '#CA8A04',
  'Personal Information': '#DB2777',
};

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

interface Props {
  memory: Memory;
  onDelete?: (id: string) => void;
  onEdit?: (memory: Memory) => void;
}

export default function MemoryCard({ memory, onDelete, onEdit }: Props) {
  const colors = useColors();
  const categoryColor = CATEGORY_COLORS[memory.category] ?? colors.primary;

  return (
    <Pressable
      onPress={() => onEdit?.(memory)}
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <View style={styles.header}>
        <View
          style={[
            styles.categoryBadge,
            { backgroundColor: categoryColor + '20' },
          ]}
        >
          <Text style={[styles.categoryText, { color: categoryColor }]}>
            {memory.category}
          </Text>
        </View>
        <View style={styles.headerActions}>
          {onEdit && (
            <Pressable
              onPress={() => onEdit(memory)}
              hitSlop={12}
              style={styles.actionBtn}
            >
              <Feather name="edit-2" size={14} color={colors.mutedForeground} />
            </Pressable>
          )}
          {onDelete && (
            <Pressable
              onPress={() => onDelete(memory.id)}
              hitSlop={12}
              style={styles.actionBtn}
            >
              <Feather name="trash-2" size={16} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>
      </View>
      <Text style={[styles.title, { color: colors.foreground }]}>
        {memory.title}
      </Text>
      {memory.description ? (
        <Text style={[styles.description, { color: colors.mutedForeground }]}>
          {memory.description}
        </Text>
      ) : null}
      <Text style={[styles.date, { color: colors.mutedForeground }]}>
        Remembered {formatDate(memory.createdAt)}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 4,
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    gap: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 100,
  },
  categoryText: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  actionBtn: {
    padding: 4,
  },
  title: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    lineHeight: 18,
    marginTop: 2,
  },
  description: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    lineHeight: 16,
  },
  date: {
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
    marginTop: 1,
  },
});
