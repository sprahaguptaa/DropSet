// DropSet design tokens. Every color has one job; keep it that way.
//   ember  -> primary buttons, prices (>= 20px) and filled rating dumbbells only
//   cobalt -> selection, links, focus
//   mint   -> an ACTIVE pass only

export const color = {
  canvas: '#F5F2EC', // warm chalk page background
  card: '#FFFFFF',
  sunken: '#EEE9E0', // chips, skeletons, quiet fills
  line: '#E4DED3', // borders on chalk
  hairline: 'rgba(11, 16, 32, 0.08)',

  ink: '#0B1020', // navy ink: text, dark surfaces
  ink2: '#3B4150', // secondary text
  muted: '#6B6F7A', // tertiary text, captions
  onDark: '#F5F2EC',
  onDarkMuted: 'rgba(245, 242, 236, 0.72)',

  ember: '#FF4F1A',
  emberPressed: '#E8430F',
  emberTint: '#FFE9E0',

  cobalt: '#2D4BFF',
  cobaltTint: '#E8ECFF',

  mint: '#1FBF7A',
  mintTint: '#DDF5EA',

  danger: '#C8312B',
  dangerTint: '#FCE8E6',
} as const;

export const font = {
  display: 'BricolageGrotesque_800ExtraBold',
  displayBold: 'BricolageGrotesque_700Bold',
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extrabold: 'PlusJakartaSans_800ExtraBold',
} as const;

export const type = {
  hero: { fontFamily: font.display, fontSize: 44, lineHeight: 44, letterSpacing: -1.6 },
  title1: { fontFamily: font.display, fontSize: 32, lineHeight: 34, letterSpacing: -1 },
  title2: { fontFamily: font.display, fontSize: 24, lineHeight: 28, letterSpacing: -0.6 },
  title3: { fontFamily: font.displayBold, fontSize: 19, lineHeight: 23, letterSpacing: -0.3 },
  headline: { fontFamily: font.bold, fontSize: 16, lineHeight: 21, letterSpacing: -0.2 },
  body: { fontFamily: font.medium, fontSize: 15, lineHeight: 22 },
  bodyStrong: { fontFamily: font.semibold, fontSize: 15, lineHeight: 22 },
  callout: { fontFamily: font.medium, fontSize: 14, lineHeight: 19 },
  footnote: { fontFamily: font.medium, fontSize: 12.5, lineHeight: 17 },
  overline: { fontFamily: font.bold, fontSize: 10.5, lineHeight: 13, letterSpacing: 1.1, textTransform: 'uppercase' },
  button: { fontFamily: font.bold, fontSize: 16, lineHeight: 20, letterSpacing: -0.1 },
  price: { fontFamily: font.display, fontSize: 22, lineHeight: 24, letterSpacing: -0.5 },
} as const;

export const space = { xs: 4, s: 8, m: 12, l: 16, xl: 20, xxl: 24, xxxl: 32, huge: 48 } as const;

export const radius = { s: 10, m: 14, l: 18, xl: 24, pill: 999 } as const;

// Warm, low shadows (brown-tinted, never grey-blue).
export const shadow = {
  card: { boxShadow: '0 1px 2px rgba(59, 42, 20, 0.06), 0 8px 24px rgba(59, 42, 20, 0.07)' },
  float: { boxShadow: '0 2px 6px rgba(11, 16, 32, 0.10), 0 18px 40px rgba(11, 16, 32, 0.16)' },
} as const;

export const layout = {
  maxWidth: 1120, // web page column (nav bar, explore, results, gym page)
  list: 760, // single-column lists: saved, passes, search
  form: 600, // forms and summaries: profile, checkout
  ticket: 480, // the QR pass
  wide: 900, // breakpoint where the web layout goes two-column
  gutter: 20,
} as const;

export const motion = {
  press: { damping: 18, stiffness: 320, mass: 0.6 },
  sheet: { damping: 20, stiffness: 170, mass: 1 },
} as const;
