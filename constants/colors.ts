export const lightPalette = {
  text: '#1A1A2E',
  tint: '#FF4FA3',
  background: '#FFF5F7',
  foreground: '#1A1A2E',
  card: '#FFFFFF',
  cardForeground: '#1A1A2E',
  primary: '#FF4FA3',
  primaryForeground: '#FFFFFF',
  secondary: '#FFE4EC',
  secondaryForeground: '#1A1A2E',
  muted: '#F5F5F5',
  mutedForeground: '#8E8E93',
  accent: '#FF8ABC',
  accentForeground: '#1A1A2E',
  destructive: '#FF3B30',
  destructiveForeground: '#FFFFFF',
  border: '#E5E5EA',
  input: '#FFFFFF',
};

export const darkPalette = {
  text: '#FFFFFF',
  tint: '#FF4FA3',
  background: '#09090B',
  foreground: '#FFFFFF',
  card: '#15151B',
  cardForeground: '#FFFFFF',
  primary: '#FF4FA3',
  primaryForeground: '#FFFFFF',
  secondary: '#1A1A24',
  secondaryForeground: '#FFFFFF',
  muted: '#1A1A24',
  mutedForeground: '#9CA3AF',
  accent: '#FFC0DC',
  accentForeground: '#09090B',
  destructive: '#ef4444',
  destructiveForeground: '#FFFFFF',
  border: '#1F1F2E',
  input: '#15151B',
};

export type Palette = typeof lightPalette;

const colors = { light: lightPalette, dark: darkPalette, radius: 20 };
export default colors;
