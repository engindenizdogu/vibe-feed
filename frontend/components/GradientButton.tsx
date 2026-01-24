import React, { useRef, useEffect } from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  Animated,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Gradients, Colors, BorderRadius, Spacing, FontSize, Fonts, Shadows } from '../constants/theme';

interface GradientButtonProps {
  onPress: () => void;
  title: string;
  icon?: keyof typeof Ionicons.glyphMap;
  gradient?: readonly string[];
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  size?: 'small' | 'medium' | 'large';
  glow?: boolean;
}

export function GradientButton({
  onPress,
  title,
  icon,
  gradient = Gradients.primary,
  disabled = false,
  style,
  textStyle,
  size = 'medium',
  glow = true,
}: GradientButtonProps) {
  const shineAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!disabled) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(shineAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(shineAnim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
      return () => animation.stop();
    }
  }, [disabled, shineAnim]);

  const sizeStyles = {
    small: { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md },
    medium: { paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg },
    large: { paddingVertical: Spacing.lg, paddingHorizontal: Spacing.xl },
  };

  const fontSizes = {
    small: FontSize.sm,
    medium: FontSize.md,
    large: FontSize.lg,
  };

  const iconSizes = {
    small: 16,
    medium: 20,
    large: 24,
  };

  const shineTranslate = shineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-200, 200],
  });

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.container,
        glow && !disabled && Shadows.glow,
        disabled && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}
    >
      <LinearGradient
        colors={disabled ? ['#333', '#222'] : (gradient as [string, string, ...string[]])}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.gradient, sizeStyles[size]]}
      >
        {icon && (
          <Ionicons
            name={icon}
            size={iconSizes[size]}
            color={disabled ? Colors.textMuted : Colors.background}
            style={styles.icon}
          />
        )}
        <Text
          style={[
            styles.text,
            { fontSize: fontSizes[size] },
            disabled && styles.textDisabled,
            textStyle,
          ]}
        >
          {title}
        </Text>
        {/* Shine effect overlay */}
        {Platform.OS !== 'web' && !disabled && (
          <Animated.View
            style={[
              styles.shine,
              {
                transform: [{ translateX: shineTranslate }],
              },
            ]}
          />
        )}
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.lg,
  },
  icon: {
    marginRight: Spacing.sm,
  },
  text: {
    color: Colors.background,
    fontFamily: Fonts.semibold,
    textAlign: 'center',
  },
  textDisabled: {
    color: Colors.textMuted,
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  shine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    transform: [{ skewX: '-20deg' }],
  },
});
