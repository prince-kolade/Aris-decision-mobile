import React, { useState, useMemo } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MemoryCard from '@/components/MemoryCard';
import LoveBackground from '@/components/LoveBackground';
import { useMemory } from '@/context/MemoryContext';
import { MEMORY_CATEGORIES, type MemoryCategory } from '@/types/index';

type ModalMode = 'add' | 'edit' | null;

function MemoryFormModal({
  visible,
  mode,
  initialValues,
  onClose,
}: {
  visible: boolean;
  mode: ModalMode;
  initialValues?: {
    id: string;
    category: MemoryCategory;
    title: string;
    description: string;
  };
  onClose: () => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { addMemory, editMemory } = useMemory();

  const [category, setCategory] = useState<MemoryCategory>(
    initialValues?.category ?? 'Goals',
  );
  const [title, setTitle] = useState(initialValues?.title ?? '');
  const [description, setDescription] = useState(
    initialValues?.description ?? '',
  );

  React.useEffect(() => {
    if (visible) {
      setCategory(initialValues?.category ?? 'Goals');
      setTitle(initialValues?.title ?? '');
      setDescription(initialValues?.description ?? '');
    }
  }, [visible, initialValues]);

  const handleSave = async () => {
    if (!title.trim()) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (mode === 'edit' && initialValues) {
      await editMemory(initialValues.id, {
        category,
        title: title.trim(),
        description: description.trim(),
      });
    } else {
      await addMemory(category, title.trim(), description.trim());
    }
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={[styles.modalContainer, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View
          style={[
            styles.modalHeader,
            {
              borderBottomColor: colors.border,
              paddingTop: insets.top + 12,
            },
          ]}
        >
          <Text style={[styles.modalTitle, { color: colors.foreground }]}>
            {mode === 'edit' ? 'Edit Memory' : 'Add Memory'}
          </Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Feather name="x" size={22} color={colors.mutedForeground} />
          </Pressable>
        </View>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.modalContent}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[styles.label, { color: colors.mutedForeground }]}>
            Category
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryScroll}
          >
            {MEMORY_CATEGORIES.map((cat) => (
              <Pressable
                key={cat}
                onPress={() => setCategory(cat)}
                style={[
                  styles.catChip,
                  {
                    backgroundColor:
                      category === cat ? colors.primary + '20' : colors.card,
                    borderColor:
                      category === cat ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.catChipText,
                    {
                      color:
                        category === cat
                          ? colors.primary
                          : colors.mutedForeground,
                    },
                  ]}
                >
                  {cat}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <Text style={[styles.label, { color: colors.mutedForeground }]}>
            Title
          </Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="E.g. Launch my app"
            placeholderTextColor={colors.mutedForeground}
            style={[
              styles.textInput,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                color: colors.foreground,
              },
            ]}
            autoFocus
          />

          <Text style={[styles.label, { color: colors.mutedForeground }]}>
            Description
          </Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Optional details..."
            placeholderTextColor={colors.mutedForeground}
            style={[
              styles.textInput,
              styles.textArea,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                color: colors.foreground,
              },
            ]}
            multiline
            numberOfLines={4}
          />

          <Pressable
            onPress={handleSave}
            disabled={!title.trim()}
            style={styles.saveWrapper}
          >
            <LinearGradient
              colors={['#FF4FA3', '#d63888']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[
                styles.saveBtn,
                { opacity: title.trim() ? 1 : 0.4 },
              ]}
            >
              <Text style={styles.saveBtnText}>
                {mode === 'edit' ? 'Save Changes' : 'Save Memory'}
              </Text>
            </LinearGradient>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function MemoryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { memories, isLoading, deleteMemory } = useMemory();
  const [showAdd, setShowAdd] = useState(false);
  const [editTarget, setEditTarget] = useState<{
    id: string;
    category: MemoryCategory;
    title: string;
    description: string;
  } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] =
    useState<MemoryCategory | null>(null);

  const filteredMemories = useMemo(() => {
    let result = memories;
    if (filterCategory) {
      result = result.filter((m) => m.category === filterCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (m) =>
          m.title.toLowerCase().includes(q) ||
          m.description.toLowerCase().includes(q),
      );
    }
    return result;
  }, [memories, filterCategory, searchQuery]);

  const handleDelete = async (id: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await deleteMemory(id);
  };

  const handleEdit = (memory: {
    id: string;
    category: MemoryCategory;
    title: string;
    description: string;
  }) => {
    setEditTarget(memory);
  };

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
          Memory
        </Text>
        <Pressable
          onPress={() => setShowAdd(true)}
          style={[styles.addBtn, { backgroundColor: colors.primary }]}
        >
          <Feather name="plus" size={18} color="#fff" />
        </Pressable>
      </View>

      <View style={[styles.searchRow, { paddingHorizontal: 16, paddingVertical: 8 }]}>
        <View
          style={[
            styles.searchInputWrapper,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Feather name="search" size={14} color={colors.mutedForeground} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search memories..."
            placeholderTextColor={colors.mutedForeground}
            style={[styles.searchInput, { color: colors.foreground }]}
          />
          {searchQuery ? (
            <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
              <Feather name="x" size={14} color={colors.mutedForeground} />
            </Pressable>
          ) : null}
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterScroll}
        style={{ paddingHorizontal: 16 }}
      >
        <Pressable
          onPress={() => setFilterCategory(null)}
          style={[
            styles.filterChip,
            {
              backgroundColor: !filterCategory
                ? colors.primary + '20'
                : colors.card,
              borderColor: !filterCategory ? colors.primary : colors.border,
            },
          ]}
        >
          <Text
            style={[
              styles.filterChipText,
              {
                color: !filterCategory
                  ? colors.primary
                  : colors.mutedForeground,
              },
            ]}
          >
            All
          </Text>
        </Pressable>
        {MEMORY_CATEGORIES.map((cat) => (
          <Pressable
            key={cat}
            onPress={() =>
              setFilterCategory(filterCategory === cat ? null : cat)
            }
            style={[
              styles.filterChip,
              {
                backgroundColor:
                  filterCategory === cat ? colors.primary + '20' : colors.card,
                borderColor:
                  filterCategory === cat ? colors.primary : colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.filterChipText,
                {
                  color:
                    filterCategory === cat
                      ? colors.primary
                      : colors.mutedForeground,
                },
              ]}
            >
              {cat}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {isLoading ? null : filteredMemories.length === 0 ? (
        <View style={styles.empty}>
          <Feather name="bookmark" size={44} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            {searchQuery || filterCategory
              ? 'No matching memories'
              : 'No memories yet'}
          </Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            {searchQuery || filterCategory
              ? 'Try a different search or filter.'
              : 'Ari will remember important information here. Tap the + button to add something manually.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredMemories}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <MemoryCard
              memory={item}
              onDelete={handleDelete}
              onEdit={handleEdit}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      <MemoryFormModal
        visible={showAdd}
        mode="add"
        onClose={() => setShowAdd(false)}
      />
      <MemoryFormModal
        visible={!!editTarget}
        mode="edit"
        initialValues={editTarget ?? undefined}
        onClose={() => setEditTarget(null)}
      />
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
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 26,
    fontFamily: 'Inter_700Bold',
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchRow: {
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    gap: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    paddingVertical: 8,
  },
  filterScroll: {
    gap: 6,
    paddingVertical: 6,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 100,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
  },
  listContent: {
    paddingTop: 4,
    paddingBottom: 80,
    flexGrow: 1,
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
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
  },
  modalContent: {
    padding: 20,
    gap: 12,
    paddingBottom: 60,
  },
  label: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    marginTop: 4,
  },
  categoryScroll: {
    gap: 8,
    paddingVertical: 4,
  },
  catChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 100,
    borderWidth: 1,
  },
  catChipText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  saveWrapper: {
    marginTop: 8,
  },
  saveBtn: {
    paddingVertical: 16,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF4FA3',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  saveBtnText: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    color: '#FFFFFF',
  },
});
