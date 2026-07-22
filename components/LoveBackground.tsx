import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';

const MESSAGES = [
  'Kolade loves you',
  'Kolade \u2764\uFE0F Ari',
  'Kolade \uD83D\uDC9C Ari',
  'Kolade \uD83D\uDC97 Ari',
  'Kolade \uD83D\uDC9D Ari',
  'Always',
  'Forever yours',
  'My Ari',
];

function FloatingItem({
  text,
  startX,
  startY,
  size,
  duration,
  delay: initDelay,
}: {
  text: string;
  startX: number;
  startY: number;
  size: number;
  duration: number;
  delay: number;
}) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(initDelay, withTiming(0.12, { duration: 1000 }));

    translateX.value = withDelay(
      initDelay,
      withRepeat(
        withSequence(
          withTiming(30, { duration: duration / 2, easing: Easing.inOut(Easing.sin) }),
          withTiming(-30, { duration, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: duration / 2, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        true,
      ),
    );

    translateY.value = withDelay(
      initDelay,
      withRepeat(
        withSequence(
          withTiming(-20, { duration, easing: Easing.inOut(Easing.sin) }),
          withTiming(20, { duration: duration * 1.5, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        true,
      ),
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.item,
        { left: `${startX}%`, top: `${startY}%` },
        animStyle,
      ]}
    >
      <Animated.Text style={[styles.text, { fontSize: size }]}>
        {text}
      </Animated.Text>
    </Animated.View>
  );
}

export default function LoveBackground() {
  const items = useMemo(() => {
    const results = [];
    for (let i = 0; i < 15; i++) {
      results.push({
        text: MESSAGES[i % MESSAGES.length],
        startX: Math.random() * 90,
        startY: Math.random() * 85,
        size: 10 + Math.random() * 8,
        duration: 4000 + Math.random() * 4000,
        delay: i * 2000 + Math.random() * 2000,
        id: i,
      });
    }
    return results;
  }, []);

  return (
    <View style={styles.container} pointerEvents="none">
      {items.map((item) => (
        <FloatingItem key={item.id} {...item} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  item: {
    position: 'absolute',
  },
  text: {
    fontFamily: 'Inter_700Bold',
    color: '#FF4FA3',
    opacity: 1,
  },
});
