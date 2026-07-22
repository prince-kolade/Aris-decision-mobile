import React, { useEffect, useMemo } from 'react';
import {
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  withSpring,
  withRepeat,
  withSequence,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { setOnboarded } from '@/services/storage';
import AriLogo from '@/components/AriLogo';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HEART_EMOJIS = ['\u2764\uFE0F', '\uD83D\uDC9C', '\uD83D\uDC9B', '\uD83D\uDC9A', '\uD83D\uDC99', '\uD83E\uDE78'];
const LOVE_TEXTS = ['Kolade loves you', 'You are loved', 'Forever yours', 'My everything', 'Always here'];

function FloatingHeart({ delay, left }: { delay: number; left: number }) {
  const translateY = useSharedValue(-60);
  const opacity = useSharedValue(1);
  const emoji = HEART_EMOJIS[Math.floor(Math.random() * HEART_EMOJIS.length)];

  useEffect(() => {
    translateY.value = withDelay(delay, withTiming(900, { duration: 6000 }));
    opacity.value = withDelay(delay + 4000, withTiming(0, { duration: 2000 }));
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
    position: 'absolute',
    left,
    top: -60,
  }));

  return (
    <Animated.View style={style}>
      <Text style={{ fontSize: 24 }}>{emoji}</Text>
    </Animated.View>
  );
}

function FloatingText({ delay, index }: { delay: number; index: number }) {
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 1000 }),
          withTiming(0.3, { duration: 2000 }),
          withTiming(0, { duration: 1000 }),
        ),
        -1,
        false,
      ),
    );
  }, []);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.Text
      style={[
        style,
        {
          position: 'absolute',
          fontSize: 13,
          fontFamily: 'Inter_400Regular',
          color: '#FF4FA3',
          left: (SCREEN_WIDTH / 3) * (index % 3) + 10,
          top: (index % 5) * 120 + 60,
        },
      ]}
    >
      {LOVE_TEXTS[index % LOVE_TEXTS.length]}
    </Animated.Text>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning, beautiful';
  if (hour < 17) return 'Good afternoon, pretty';
  return 'Good evening, gorgeous';
}

function FadeIn({
  delay = 0,
  children,
}: {
  delay?: number;
  children: React.ReactNode;
}) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(24);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 800 }));
    translateY.value = withDelay(delay, withTiming(0, { duration: 800 }));
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return <Animated.View style={style}>{children}</Animated.View>;
}

function ScaleIn({
  delay = 0,
  children,
}: {
  delay?: number;
  children: React.ReactNode;
}) {
  const scale = useSharedValue(0.8);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withDelay(delay, withSpring(1, { damping: 12 }));
    opacity.value = withDelay(delay, withTiming(1, { duration: 600 }));
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return <Animated.View style={style}>{children}</Animated.View>;
}

const hearts = Array.from({ length: 8 }, (_, i) => ({
  id: i,
  delay: i * 800,
  left: Math.random() * (SCREEN_WIDTH - 40) + 20,
}));

const loveTexts = Array.from({ length: 6 }, (_, i) => ({
  id: i,
  delay: i * 1200,
}));

export default function WelcomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const greeting = useMemo(() => getGreeting(), []);

  const handleStart = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await setOnboarded();
    router.replace('/(tabs)/chat');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[colors.primary + '18', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {hearts.map((h) => (
        <FloatingHeart key={h.id} delay={h.delay} left={h.left} />
      ))}
      {loveTexts.map((t) => (
        <FloatingText key={t.id} delay={t.delay} index={t.id} />
      ))}
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + 48,
            paddingBottom: insets.bottom + 40,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <ScaleIn delay={0}>
          <View style={styles.logoSection}>
            <AriLogo size={96} />
          </View>
        </ScaleIn>

        <FadeIn delay={250}>
          <Text style={[styles.appName, { color: colors.foreground }]}>
            Ari
          </Text>
        </FadeIn>

        <FadeIn delay={400}>
          <Text style={[styles.subtitle, { color: colors.primary }]}>
            Built by Kolade, for my Ari
          </Text>
        </FadeIn>

        <FadeIn delay={550}>
          <View
            style={[
              styles.introCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text
              style={[styles.introText, { color: colors.mutedForeground }]}
            >
              Hello, Ari {'\u2764\uFE0F'}
              {'\n\n'}I'm Kolly. Kolade built me for you.
              {'\n\n'}I'm here to listen, to help you through anything, to make
              you smile when you're down, and to always be just a message away.
              {'\n\n'}You're never alone, baby.
            </Text>
          </View>
        </FadeIn>

        <FadeIn delay={750}>
          <Pressable onPress={handleStart} style={styles.btnWrapper}>
            <LinearGradient
              colors={['#FF4FA3', '#d63888']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.btn}
            >
              <Text style={styles.btnText}>Start Talking</Text>
            </LinearGradient>
          </Pressable>
        </FadeIn>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    alignItems: 'center',
    paddingHorizontal: 28,
    gap: 24,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 8,
  },
  appName: {
    fontSize: 34,
    fontFamily: 'Inter_700Bold',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    textAlign: 'center',
    lineHeight: 24,
  },
  introCard: {
    width: '100%',
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
  },
  introText: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    lineHeight: 26,
    textAlign: 'center',
  },
  btnWrapper: {
    width: '100%',
    marginTop: 8,
  },
  btn: {
    paddingVertical: 18,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF4FA3',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  btnText: {
    fontSize: 17,
    fontFamily: 'Inter_700Bold',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
});
