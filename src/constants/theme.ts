import { Platform } from 'react-native';

export const Colors = {
  primary:    '#0F3460',
  primaryDim: '#1A4F8A',
  white:      '#FFFFFF',
  black:      '#000000',
  bg:         '#F2F4F8',
  surface:    '#FFFFFF',
  surfaceAlt: '#F7F8FA',
  border:     '#E4E7EE',
  text:       '#0F1B2D',
  textDim:    '#5A6478',
  textFaint:  '#9BA3B5',
  yes:        '#16A34A',
  yesBg:      '#DCFCE7',
  maybe:      '#D97706',
  maybeBg:    '#FEF3C7',
  no:         '#DC2626',
  noBg:       '#FEE2E2',
} as const;

export const Typography = {
  titleLg: { fontSize: 20, fontWeight: '700' as const, lineHeight: 26 },
  titleMd: { fontSize: 16, fontWeight: '600' as const, lineHeight: 22 },
  titleSm: { fontSize: 14, fontWeight: '600' as const, lineHeight: 20 },
  bodyMd:  { fontSize: 15, fontWeight: '400' as const, lineHeight: 22 },
  bodySm:  { fontSize: 13, fontWeight: '400' as const, lineHeight: 18 },
  label:   { fontSize: 12, fontWeight: '600' as const, letterSpacing: 0.4 },
} as const;

export const Spacing = {
  xs:  4,
  sm:  8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const Radius = {
  sm:   6,
  md:  12,
  lg:  16,
  full: 999,
} as const;

export const Shadow = {
  sm: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
    },
    android: { elevation: 2 },
    default: {},
  }) ?? {},
  md: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 12,
    },
    android: { elevation: 5 },
    default: {},
  }) ?? {},
} as const;
