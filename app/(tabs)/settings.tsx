import React, { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMemory } from '@/context/MemoryContext';
import { useTheme } from '@/context/ThemeContext';
import {
  type Conversation,
  clearAllConversations,
  getConversations,
} from '@/services/storage';
import { configureVoice, getVoiceService } from '@/services/voice';
import {
  getPersonalization,
  setCompanionName,
  setPersona,
  setVoiceGender,
  type PersonaType,
  type VoiceGender,
} from '@/services/personalization';
import ConfirmModal from '@/components/ConfirmModal';
import AriLogo from '@/components/AriLogo';
import LoveBackground from '@/components/LoveBackground';
import Constants from 'expo-constants';

interface RowProps {
  label: string;
  value?: string;
  icon: string;
  onPress?: () => void;
  danger?: boolean;
  disabled?: boolean;
}

function SettingsRow({
  label,
  value,
  icon,
  onPress,
  danger,
  disabled,
}: RowProps) {
  const colors = useColors();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || !onPress}
      style={({ pressed }) => [
        styles.row,
        {
          borderColor: colors.border,
          backgroundColor: colors.card,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <View style={styles.rowLeft}>
        <Feather
          name={icon as any}
          size={18}
          color={danger ? colors.destructive : colors.mutedForeground}
        />
        <Text
          style={[
            styles.rowLabel,
            { color: danger ? colors.destructive : colors.foreground },
          ]}
        >
          {label}
        </Text>
      </View>
      <View style={styles.rowRight}>
        {value ? (
          <Text style={[styles.rowValue, { color: colors.mutedForeground }]}>
            {value}
          </Text>
        ) : null}
        {onPress ? (
          <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
        ) : null}
      </View>
    </Pressable>
  );
}

function SectionTitle({ title }: { title: string }) {
  const colors = useColors();
  return (
    <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
      {title}
    </Text>
  );
}

function ChatHistoryModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const load = useCallback(async () => {
    const all = await getConversations();
    setConvs(
      Object.values(all).sort((a, b) => b.updatedAt - a.updatedAt),
    );
  }, []);

  useEffect(() => {
    if (visible) load();
  }, [visible, load]);

  const confirmDeleteConv = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    const all = await getConversations();
    delete all[deleteTarget];
    await clearAllConversations();
    for (const conv of Object.values(all)) {
      const { saveConversation } = await import('@/services/storage');
      await saveConversation(conv as Conversation);
    }
    setDeleteTarget(null);
    load();
  }, [deleteTarget, load]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
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
            Chat History
          </Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Feather name="x" size={22} color={colors.mutedForeground} />
          </Pressable>
        </View>
        {convs.length === 0 ? (
          <View style={styles.emptyModal}>
            <Text
              style={[
                {
                  color: colors.mutedForeground,
                  fontSize: 15,
                  fontFamily: 'Inter_400Regular',
                },
              ]}
            >
              No conversations yet
            </Text>
          </View>
        ) : (
          <FlatList
            data={convs}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <Pressable
                onPress={async () => {
                  const { setActiveConversationId } = await import(
                    '@/services/storage'
                  );
                  await setActiveConversationId(item.id);
                  onClose();
                }}
                style={[styles.convRow, { borderBottomColor: colors.border }]}
              >
                <View style={styles.convInfo}>
                  <Text
                    style={[
                      {
                        color: colors.foreground,
                        fontSize: 14,
                        fontFamily: 'Inter_600SemiBold',
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {item.messages.find((m) => m.role === 'user')?.content ||
                      'Chat'}
                  </Text>
                  <Text
                    style={[
                      {
                        color: colors.mutedForeground,
                        fontSize: 12,
                        fontFamily: 'Inter_400Regular',
                        marginTop: 2,
                      },
                    ]}
                  >
                    {new Date(item.updatedAt).toLocaleDateString()} ·{' '}
                    {item.messages.length} messages
                  </Text>
                </View>
                <Pressable
                  onPress={() => setDeleteTarget(item.id)}
                  hitSlop={12}
                  style={{ padding: 8 }}
                >
                  <Feather
                    name="trash-2"
                    size={18}
                    color={colors.destructive}
                  />
                </Pressable>
              </Pressable>
            )}
            contentContainerStyle={{ padding: 16 }}
          />
        )}
        <ConfirmModal
          visible={deleteTarget !== null}
          title="Delete Chat"
          message="This conversation will be permanently deleted."
          onConfirm={confirmDeleteConv}
          onCancel={() => setDeleteTarget(null)}
        />
      </View>
    </Modal>
  );
}

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { clearAll: clearMemories } = useMemory();
  const { mode, setMode, resolved } = useTheme();
  const [version] = useState(Constants.expoConfig?.version ?? '1.0.0');
  const [showChatHistory, setShowChatHistory] = useState(false);
  const [compName, setCompName] = useState('Ari');
  const [persona, setPersonaState] = useState<PersonaType>('love');
  const [voiceGend, setVoiceGend] = useState<VoiceGender>('female');
  const [showNameEdit, setShowNameEdit] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [confirmTarget, setConfirmTarget] = useState<
    'memory' | 'chats' | null
  >(null);

  useEffect(() => {
    (async () => {
      const p = await getPersonalization();
      setCompName(p.companionName);
      setPersonaState(p.persona);
      setVoiceGend(p.voiceGender);
    })();
  }, []);

  const handleClearMemory = () => setConfirmTarget('memory');
  const handleClearChat = () => setConfirmTarget('chats');

  const confirmClearMemory = async () => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch {}
    await clearMemories();
    setConfirmTarget(null);
  };

  const confirmClearChats = async () => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch {}
    await clearAllConversations();
    setConfirmTarget(null);
  };

  const cycleTheme = () => {
    const next =
      mode === 'system' ? 'light' : mode === 'light' ? 'dark' : 'system';
    setMode(next);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
  };

  const handleVoice = async () => {
    try {
      configureVoice({ provider: 'groq' });
      const voice = getVoiceService();
      await voice.requestPermission();
    } catch {}
  };

  const cyclePersona = () => {
    const next: PersonaType = persona === 'love' ? 'friend' : 'love';
    setPersonaState(next);
    setPersona(next);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
  };

  const cycleVoiceGender = () => {
    const next: VoiceGender = voiceGend === 'female' ? 'male' : 'female';
    setVoiceGend(next);
    setVoiceGender(next);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
  };

  const handleSaveName = async () => {
    if (!nameInput.trim()) return;
    await setCompanionName(nameInput.trim());
    setCompName(nameInput.trim());
    setShowNameEdit(false);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
  };

  const themeLabel =
    mode === 'system'
      ? `System (${resolved})`
      : mode === 'light'
        ? 'Light'
        : 'Dark';

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
          Settings
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.brandSection}>
          <AriLogo size={72} />
          <Text style={[styles.brandName, { color: colors.foreground }]}>
            {compName}
          </Text>
          <Text style={[styles.brandSub, { color: colors.mutedForeground }]}>
            Built by Kolade, for my Ari
          </Text>
        </View>

        <SectionTitle title="Personalization" />
        <View style={[styles.card, { borderColor: colors.border }]}>
          <SettingsRow
            label="AI Name"
            value={compName}
            icon="edit-3"
            onPress={() => {
              setNameInput(compName);
              setShowNameEdit(true);
            }}
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <SettingsRow
            label="Persona"
            value={
              persona === 'love' ? 'My Love (Romantic)' : 'Friend (Platonic)'
            }
            icon="heart"
            onPress={cyclePersona}
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <SettingsRow
            label="AI Voice"
            value={
              voiceGend === 'female' ? 'Female (Nova)' : 'Male (Onyx)'
            }
            icon="volume-2"
            onPress={cycleVoiceGender}
          />
        </View>

        <SectionTitle title="Preferences" />
        <View style={[styles.card, { borderColor: colors.border }]}>
          <SettingsRow
            label="Theme"
            value={themeLabel}
            icon={
              mode === 'dark'
                ? 'moon'
                : mode === 'light'
                  ? 'sun'
                  : 'monitor'
            }
            onPress={cycleTheme}
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <SettingsRow label="Voice" icon="mic" onPress={handleVoice} />
        </View>

        <SectionTitle title="Data" />
        <View style={[styles.card, { borderColor: colors.border }]}>
          <SettingsRow
            label="Chat History"
            icon="message-square"
            onPress={() => setShowChatHistory(true)}
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <SettingsRow
            label="Clear Memory"
            icon="trash-2"
            onPress={handleClearMemory}
            danger
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <SettingsRow
            label="Clear All Chats"
            icon="alert-triangle"
            onPress={handleClearChat}
            danger
          />
        </View>

        <SectionTitle title="About" />
        <View style={[styles.card, { borderColor: colors.border }]}>
          <SettingsRow
            label={compName}
            icon="heart"
            value="For you, always"
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <SettingsRow
            label="Built by Kolade"
            icon="code"
            value="For Ari, with love"
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <SettingsRow
            label="App Version"
            icon="package"
            value={version}
          />
        </View>
      </ScrollView>

      <Modal
        visible={showNameEdit}
        transparent
        animationType="fade"
        onRequestClose={() => setShowNameEdit(false)}
      >
        <View style={styles.nameOverlay}>
          <View
            style={[
              styles.nameModal,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text
              style={[styles.nameModalTitle, { color: colors.foreground }]}
            >
              Change AI Name
            </Text>
            <TextInput
              value={nameInput}
              onChangeText={setNameInput}
              placeholder="Enter a name..."
              placeholderTextColor={colors.mutedForeground}
              style={[
                styles.nameInput,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                  color: colors.foreground,
                },
              ]}
              autoFocus
              maxLength={30}
            />
            <View style={styles.nameActions}>
              <Pressable
                onPress={() => setShowNameEdit(false)}
                style={[styles.nameBtn, { borderColor: colors.border }]}
              >
                <Text
                  style={[
                    styles.nameBtnText,
                    { color: colors.mutedForeground },
                  ]}
                >
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={handleSaveName}
                disabled={!nameInput.trim()}
                style={[
                  styles.nameBtn,
                  {
                    backgroundColor: colors.primary,
                    opacity: nameInput.trim() ? 1 : 0.4,
                  },
                ]}
              >
                <Text style={[styles.nameBtnText, { color: '#fff' }]}>
                  Save
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <ChatHistoryModal
        visible={showChatHistory}
        onClose={() => setShowChatHistory(false)}
      />

      <ConfirmModal
        visible={confirmTarget === 'memory'}
        title="Clear Memory"
        message="This will permanently delete all saved memories."
        onConfirm={confirmClearMemory}
        onCancel={() => setConfirmTarget(null)}
      />
      <ConfirmModal
        visible={confirmTarget === 'chats'}
        title="Clear Chat History"
        message="This will permanently delete all conversations."
        onConfirm={confirmClearChats}
        onCancel={() => setConfirmTarget(null)}
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
  headerTitle: { fontSize: 26, fontFamily: 'Inter_700Bold' },
  content: { padding: 20, gap: 8 },
  brandSection: { alignItems: 'center', paddingVertical: 28, gap: 10 },
  brandName: { fontSize: 22, fontFamily: 'Inter_700Bold' },
  brandSub: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  sectionTitle: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: 16,
    marginBottom: 4,
    marginLeft: 4,
  },
  card: { borderRadius: 20, borderWidth: 1, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowLabel: { fontSize: 15, fontFamily: 'Inter_400Regular' },
  rowValue: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  divider: { height: 1, marginLeft: 50 },
  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 20, fontFamily: 'Inter_700Bold' },
  emptyModal: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  convRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  convInfo: { flex: 1, marginRight: 12 },
  nameOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  nameModal: {
    width: '100%',
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
    gap: 16,
  },
  nameModalTitle: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    textAlign: 'center',
  },
  nameInput: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },
  nameActions: { flexDirection: 'row', gap: 12 },
  nameBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
  },
  nameBtnText: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
});
