import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useColors } from '@/hooks/useColors';

function Dot({ delay }: { delay: number }) {
  const colors = useColors();
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 400 }),
          withTiming(0.3, { duration: 400 }),
        ),
        -1,
        false,
      ),
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[styles.dot, { backgroundColor: colors.primary }, animStyle]}
    />
  );
}

export default function TypingIndicator() {
  const colors = useColors();

  return (
    <View style={styles.row}>
      <View
        style={[
          styles.bubble,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <View style={styles.dots}>
          <Dot delay={0} />
          <Dot delay={150} />
          <Dot delay={300} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    alignItems: 'flex-start',
  },
  bubble: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 20,
    borderBottomLeftRadius: 6,
    borderWidth: 1,
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
