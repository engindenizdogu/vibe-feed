import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Pressable,
  Platform,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withDelay,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { Colors, Gradients, Spacing, BorderRadius, FontSize, Fonts, Shadows } from '../constants/theme';
import { GlassCard } from '../components/GlassCard';
import { GradientButton } from '../components/GradientButton';
import { useOnboardingStore } from '../lib/stores';

const { width, height } = Dimensions.get('window');

interface OnboardingSlide {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  gradient: readonly string[];
}

const SLIDES: OnboardingSlide[] = [
  {
    id: 'welcome',
    icon: 'sparkles',
    title: 'Welcome to Slop Feed',
    subtitle: 'Create AI-powered apps with just a prompt',
    gradient: Gradients.primary,
  },
  {
    id: 'create',
    icon: 'bulb',
    title: 'Describe Your Idea',
    subtitle: 'Watch it come to life in seconds',
    gradient: Gradients.secondary,
  },
  {
    id: 'share',
    icon: 'people',
    title: 'Share & Discover',
    subtitle: 'Explore apps from creators worldwide',
    gradient: Gradients.accent,
  },
  {
    id: 'start',
    icon: 'rocket',
    title: 'Ready to Create?',
    subtitle: 'Your imagination is the only limit',
    gradient: Gradients.aurora,
  },
];

function AnimatedIcon({ icon, gradient }: { icon: keyof typeof Ionicons.glyphMap; gradient: readonly string[] }) {
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);

  React.useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    rotation.value = withRepeat(
      withSequence(
        withTiming(10, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(-10, { duration: 2000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotation.value}deg` },
    ],
  }));

  return (
    <Animated.View style={[styles.iconContainer, animatedStyle]}>
      <LinearGradient
        colors={gradient as [string, string, ...string[]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.iconGradient}
      >
        <Ionicons name={icon} size={64} color={Colors.background} />
      </LinearGradient>
    </Animated.View>
  );
}

function FloatingParticles() {
  const particles = Array.from({ length: 6 }, (_, i) => {
    const animY = useSharedValue(0);
    const animX = useSharedValue(0);
    const opacity = useSharedValue(0.3);

    React.useEffect(() => {
      animY.value = withRepeat(
        withDelay(
          i * 300,
          withTiming(-100, { duration: 3000 + i * 500, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
      animX.value = withRepeat(
        withDelay(
          i * 200,
          withSequence(
            withTiming(20, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
            withTiming(-20, { duration: 2000, easing: Easing.inOut(Easing.ease) })
          )
        ),
        -1,
        true
      );
      opacity.value = withRepeat(
        withSequence(
          withTiming(0.6, { duration: 1500 }),
          withTiming(0.2, { duration: 1500 })
        ),
        -1,
        true
      );
    }, []);

    const style = useAnimatedStyle(() => ({
      transform: [
        { translateY: animY.value },
        { translateX: animX.value },
      ],
      opacity: opacity.value,
    }));

    return (
      <Animated.View
        key={i}
        style={[
          styles.particle,
          {
            left: `${15 + i * 15}%`,
            top: `${50 + (i % 3) * 15}%`,
            width: 8 + i * 2,
            height: 8 + i * 2,
            backgroundColor: i % 2 === 0 ? Colors.primary : Colors.accent,
          },
          style,
        ]}
      />
    );
  });

  return <View style={styles.particlesContainer}>{particles}</View>;
}

function DotIndicator({ currentIndex, total }: { currentIndex: number; total: number }) {
  return (
    <View style={styles.dotsContainer}>
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            i === currentIndex && styles.dotActive,
          ]}
        />
      ))}
    </View>
  );
}

export default function OnboardingScreen() {
  const router = useRouter();
  const setHasSeenOnboarding = useOnboardingStore((state) => state.setHasSeenOnboarding);
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const handleSkip = () => {
    setHasSeenOnboarding(true);
    router.replace('/(tabs)');
  };

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      scrollRef.current?.scrollTo({ x: nextIndex * width, animated: true });
    } else {
      handleSkip();
    }
  };

  const handleScroll = (event: any) => {
    const slideIndex = Math.round(event.nativeEvent.contentOffset.x / width);
    if (slideIndex !== currentIndex && slideIndex >= 0 && slideIndex < SLIDES.length) {
      setCurrentIndex(slideIndex);
    }
  };

  const currentSlide = SLIDES[currentIndex];
  const isLastSlide = currentIndex === SLIDES.length - 1;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[...Gradients.dark]}
        style={StyleSheet.absoluteFill}
      />

      <FloatingParticles />

      {/* Skip button */}
      {!isLastSlide && (
        <Pressable style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      )}

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        style={styles.scrollView}
      >
        {SLIDES.map((slide, index) => (
          <View key={slide.id} style={styles.slide}>
            <View style={styles.slideContent}>
              <AnimatedIcon icon={slide.icon} gradient={slide.gradient} />

              <Text style={styles.title}>{slide.title}</Text>
              <Text style={styles.subtitle}>{slide.subtitle}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Bottom section */}
      <View style={styles.bottomSection}>
        <DotIndicator currentIndex={currentIndex} total={SLIDES.length} />

        <View style={styles.buttonContainer}>
          {isLastSlide ? (
            <GradientButton
              onPress={handleSkip}
              title="Get Started"
              icon="arrow-forward"
              gradient={Gradients.primary}
              size="large"
              style={styles.ctaButton}
            />
          ) : (
            <Pressable style={styles.nextButton} onPress={handleNext}>
              <LinearGradient
                colors={[...Gradients.primary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.nextButtonGradient}
              >
                <Ionicons name="arrow-forward" size={24} color={Colors.background} />
              </LinearGradient>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  particlesContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  particle: {
    position: 'absolute',
    borderRadius: 999,
  },
  skipButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    right: Spacing.lg,
    zIndex: 10,
    padding: Spacing.sm,
  },
  skipText: {
    color: Colors.textSecondary,
    fontSize: FontSize.md,
    fontFamily: Fonts.medium,
  },
  scrollView: {
    flex: 1,
  },
  slide: {
    width,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  slideContent: {
    alignItems: 'center',
    paddingBottom: 100,
  },
  iconContainer: {
    marginBottom: Spacing.xxl,
    ...Shadows.glow,
  },
  iconGradient: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    color: Colors.text,
    fontSize: FontSize.xxxl,
    fontFamily: Fonts.bold,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: FontSize.lg,
    fontFamily: Fonts.regular,
    textAlign: 'center',
    paddingHorizontal: Spacing.lg,
    lineHeight: 26,
  },
  bottomSection: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 50 : 30,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  dotsContainer: {
    flexDirection: 'row',
    marginBottom: Spacing.xl,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.textMuted,
    marginHorizontal: Spacing.xs,
  },
  dotActive: {
    backgroundColor: Colors.primary,
    width: 24,
  },
  buttonContainer: {
    paddingHorizontal: Spacing.xl,
    width: '100%',
  },
  nextButton: {
    alignSelf: 'center',
    ...Shadows.glow,
  },
  nextButtonGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ctaButton: {
    width: '100%',
  },
});
