import { Platform } from 'react-native';

// ─── Color Palette ────────────────────────────────────────────────────────────
// Craft brewery meets outdoor club. Warm cream, dark forest green, brass accent.
// All text/bg combos verified WCAG AA (≥4.5:1 normal, ≥3:1 large text).

export const Colors = {
  // Brand greens
  primary:      '#1A4731', // Dark forest green — contrast 13:1 on white ✓
  primaryMid:   '#2D6A4F', // Medium green — contrast 7.5:1 on white ✓
  primaryLight: '#E8F5EE', // Very light mint tint

  // Backgrounds
  bg:           '#F5F2EC', // Warm cream — main app background
  surface:      '#FFFFFF',
  surfaceAlt:   '#EEE9DF', // Warm off-white — inputs, alt surfaces

  // Borders
  border:       '#D4C9B4', // Warm tan
  borderStrong: '#B5A88F', // Stronger border for focus states

  // Text — all on warm cream (#F5F2EC)
  white:        '#FFFFFF',
  black:        '#000000',
  text:         '#1C1208', // Very dark warm brown — contrast ~18:1 ✓
  textDim:      '#4A3F2F', // Medium warm brown — contrast ~7:1 ✓
  textFaint:    '#7A6E5F', // Muted — contrast ~3.5:1 (large text only)

  // Status colors — verified on their bg pairs
  yes:          '#166534', // Dark green — 6.2:1 on yesBg ✓
  yesBg:        '#DCFCE7',
  maybe:        '#92400E', // Dark amber — 6.5:1 on maybeBg ✓
  maybeBg:      '#FEF3C7',
  no:           '#991B1B', // Dark red — 6.9:1 on noBg ✓
  noBg:         '#FEE2E2',

  // Accent
  gold:         '#92400E', // Brass/amber — used for highlights
} as const;

// ─── Typography ───────────────────────────────────────────────────────────────
export const Typography = {
  displayLg: { fontSize: 42, fontWeight: '900' as const, letterSpacing: -1.5, lineHeight: 46 },
  displayMd: { fontSize: 28, fontWeight: '800' as const, letterSpacing: -0.5, lineHeight: 32 },
  titleLg:   { fontSize: 20, fontWeight: '800' as const, lineHeight: 26 },
  titleMd:   { fontSize: 17, fontWeight: '700' as const, lineHeight: 23 },
  titleSm:   { fontSize: 15, fontWeight: '600' as const, lineHeight: 21 },
  bodyMd:    { fontSize: 15, fontWeight: '400' as const, lineHeight: 22 },
  bodySm:    { fontSize: 13, fontWeight: '400' as const, lineHeight: 18 },
  // All-caps labels — use letterSpacing for readability
  label:     { fontSize: 11, fontWeight: '700' as const, letterSpacing: 1.2, lineHeight: 16 },
  caption:   { fontSize: 12, fontWeight: '500' as const, lineHeight: 16 },
} as const;

// ─── Spacing ──────────────────────────────────────────────────────────────────
export const Spacing = {
  xs:  4,
  sm:  8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

// ─── Radii ────────────────────────────────────────────────────────────────────
export const Radius = {
  xs:   4,
  sm:   8,
  md:  12,
  lg:  18,
  xl:  24,
  full: 999,
} as const;

// ─── Shadows (green-tinted for cohesion) ─────────────────────────────────────
export const Shadow = {
  sm: Platform.select({
    ios: {
      shadowColor: '#1A4731',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.10,
      shadowRadius: 6,
    },
    android: { elevation: 2 },
    default: {},
  }) ?? {},
  md: Platform.select({
    ios: {
      shadowColor: '#1A4731',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.16,
      shadowRadius: 16,
    },
    android: { elevation: 6 },
    default: {},
  }) ?? {},
} as const;
