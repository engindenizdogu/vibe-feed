export const Colors = {
  // Neo-Brutalism: Bold, punchy colors with stark contrast
  primary: '#BEFF00',        // Electric lime
  secondary: '#FF006E',      // Hot pink
  accent: '#00F0FF',         // Bright cyan
  background: '#000000',     // Pure black
  surface: '#1A1A1A',        // Dark surface
  surfaceLight: '#2A2A2A',   // Lighter surface
  text: '#FFFFFF',           // Pure white
  textSecondary: '#B4B4B4',  // Light gray
  textMuted: '#666666',      // Muted gray
  success: '#00FF94',        // Neon green
  error: '#FF3366',          // Bright red/pink
  warning: '#FFD600',        // Electric yellow
  border: '#333333',         // Subtle border

  // Glassmorphism
  glass: 'rgba(255, 255, 255, 0.05)',
  glassBorder: 'rgba(255, 255, 255, 0.1)',
  glassLight: 'rgba(255, 255, 255, 0.08)',
};

export const GlassEffect = {
  blur: 20,
  background: 'rgba(255, 255, 255, 0.05)',
  border: 'rgba(255, 255, 255, 0.1)',
};

// Gradients for LinearGradient components
export const Gradients = {
  primary: ['#BEFF00', '#00F0FF'] as const,
  secondary: ['#FF006E', '#BEFF00'] as const,
  accent: ['#00F0FF', '#FF006E'] as const,
  dark: ['#1A1A1A', '#000000'] as const,
  aurora: ['#FF006E', '#BEFF00', '#00F0FF'] as const,
  mesh: ['#1A1A1A', '#0A0A0A', '#000000'] as const,
};

// Shadow configurations
export const Shadows = {
  glow: {
    shadowColor: '#BEFF00',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  glowCyan: {
    shadowColor: '#00F0FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  glowPink: {
    shadowColor: '#FF006E',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  subtle: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
};

export const Fonts = {
  primary: 'SpaceGrotesk-Bold',
  regular: 'SpaceGrotesk-Regular',
  medium: 'SpaceGrotesk-Medium',
  semibold: 'SpaceGrotesk-SemiBold',
  bold: 'SpaceGrotesk-Bold',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const BorderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
};

export const FontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};
