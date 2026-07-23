import React, { useEffect, useRef } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  withRepeat,
  withSequence,
} from 'react-native-reanimated';
import { useColors } from '@/hooks/useColors';
import { router } from 'expo-router';
import { isOnboarded } from '@/services/storage';
import AriLogo from '@/components/AriLogo';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const FLOATING_TEXTS = [
  '\u2764\uFE0F',
  'I am Ari',
  '\u2764\uFE0F',
  'You are loved',
  '\u2764\uFE0F',
  'My Ari',
  '\u2764\uFE0F',
  'Forever',
];

function FloatingParticle({ index }: { index: number }) {
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(
      index * 200,
      withRepeat(
        withSequence(
          withTiming(0.8, { duration: 800 }),
          withTiming(0.2, { duration: 1200 }),
        ),
        -1,
        true,
      ),
    );
  }, []);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  const cols = 4;
  const col = index % cols;
  const row = Math.floor(index / cols);
  const left = (SCREEN_WIDTH / cols) * col + (col === 3 ? -20 : 10);
  const top = row * 180 + 100;

  return (
    <Animated.Text
      style={[
        style,
        {
          position: 'absolute',
          fontSize: index % 2 === 0 ? 20 : 13,
          fontFamily: 'Inter_600SemiBold',
          color: '#FF4FA3',
          left,
          top,
        },
      ]}
    >
      {FLOATING_TEXTS[index]}
    </Animated.Text>
  );
}

export default function SplashScreenEntry() {
  const colors = useColors();
  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.85);
  const subOpacity = useSharedValue(0);
  const navigated = useRef(false);
  const particles = Array.from(
    { length: FLOATING_TEXTS.length },
    (_, i) => i,
  );

  useEffect(() => {
    logoOpacity.value = withTiming(1, { duration: 600 });
    logoScale.value = withTiming(1, { duration: 600 });
    subOpacity.value = withDelay(500, withTiming(1, { duration: 500 }));

    const timer = setTimeout(async () => {
      if (navigated.current) return;
      navigated.current = true;
      const onboarded = await isOnboarded();
      if (onboarded) {
        router.replace('/(tabs)/chat');
      } else {
        router.replace('/welcome');
      }
    }, 3500);

    return () => clearTimeout(timer);
  }, []);

  const logoAnimStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const subStyle = useAnimatedStyle(() => ({
    opacity: subOpacity.value,
  }));

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.particles}>
        {particles.map((i) => (
          <FloatingParticle key={i} index={i} />
        ))}
      </View>
      <Animated.View style={[styles.logoWrapper, logoAnimStyle]}>
        <AriLogo size={100} />
        <Animated.Text
          style={[styles.tagline, subStyle, { color: colors.primary }]}
        >
          Ari
        </Animated.Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  particles: {
    ...StyleSheet.absoluteFillObject,
  },
  logoWrapper: {
    alignItems: 'center',
    gap: 16,
  },
  tagline: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
  },
});
