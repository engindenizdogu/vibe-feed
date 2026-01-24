import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { Colors, BorderRadius, GlassEffect } from '../constants/theme';

interface GlassCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  intensity?: number;
  borderGlow?: boolean;
  glowColor?: string;
}

export function GlassCard({
  children,
  style,
  intensity = GlassEffect.blur,
  borderGlow = false,
  glowColor = Colors.primary,
}: GlassCardProps) {
  // On web, BlurView doesn't work well, so we use a simple background
  if (Platform.OS === 'web') {
    return (
      <View
        style={[
          styles.container,
          styles.webGlass,
          borderGlow && {
            borderColor: glowColor,
            shadowColor: glowColor,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.3,
            shadowRadius: 15,
          },
          style,
        ]}
      >
        {children}
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        borderGlow && {
          shadowColor: glowColor,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.4,
          shadowRadius: 15,
          elevation: 8,
        },
        style,
      ]}
    >
      <BlurView
        intensity={intensity}
        tint="dark"
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.overlay} />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  webGlass: {
    backgroundColor: Colors.glass,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.glass,
  },
  content: {
    position: 'relative',
  },
});
