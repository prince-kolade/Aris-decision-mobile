import React from 'react';
import { Image, type ImageStyle, type StyleProp } from 'react-native';

interface Props {
  size?: number;
  style?: StyleProp<ImageStyle>;
}

const logo = require('@/assets/images/logo.png');

export default function AriLogo({ size = 80, style }: Props) {
  return (
    <Image
      source={logo}
      style={[{ width: size, height: size, borderRadius: size * 0.22 }, style]}
      resizeMode="cover"
    />
  );
}
