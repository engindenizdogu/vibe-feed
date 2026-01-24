import { useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
  Share,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
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
  FadeIn,
  FadeInDown,
  FadeInUp,
  ZoomIn,
} from 'react-native-reanimated';

// Conditionally import WebView (not available on web)
let WebView: any = null;
if (Platform.OS !== 'web') {
  WebView = require('react-native-webview').WebView;
}
import { useRouter } from 'expo-router';
import { Colors, Spacing, BorderRadius, FontSize, Fonts, Gradients, Shadows } from '../../constants/theme';
import { useCreateStore, useAuthStore } from '../../lib/stores';
import { createApp, publishApp } from '../../lib/api';
import { GlassCard } from '../../components/GlassCard';
import { GradientButton } from '../../components/GradientButton';
import type { CreateAppResponse } from '../../lib/api';

const { width } = Dimensions.get('window');

const GENERATION_STEPS = [
  { key: 'moderation', label: 'Checking prompt', icon: 'shield-checkmark' as const },
  { key: 'analyzing', label: 'Analyzing intent', icon: 'analytics' as const },
  { key: 'generating', label: 'Generating code', icon: 'code-slash' as const },
  { key: 'deploying', label: 'Deploying to cloud', icon: 'cloud-upload' as const },
  { key: 'finalizing', label: 'Going live!', icon: 'rocket' as const },
];

// Animated sparkle particles for header
function SparkleParticles() {
  const particles = Array.from({ length: 5 }, (_, i) => {
    const translateY = useSharedValue(0);
    const translateX = useSharedValue(0);
    const opacity = useSharedValue(0.4);
    const scale = useSharedValue(1);

    useEffect(() => {
      translateY.value = withRepeat(
        withDelay(
          i * 200,
          withTiming(-30 - i * 10, { duration: 2000 + i * 300, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
      translateX.value = withRepeat(
        withDelay(
          i * 150,
          withSequence(
            withTiming(15, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
            withTiming(-15, { duration: 1500, easing: Easing.inOut(Easing.ease) })
          )
        ),
        -1,
        true
      );
      opacity.value = withRepeat(
        withSequence(
          withTiming(0.8, { duration: 1000 }),
          withTiming(0.3, { duration: 1000 })
        ),
        -1,
        true
      );
      scale.value = withRepeat(
        withSequence(
          withTiming(1.2, { duration: 800 }),
          withTiming(0.8, { duration: 800 })
        ),
        -1,
        true
      );
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [
        { translateY: translateY.value },
        { translateX: translateX.value },
        { scale: scale.value },
      ],
      opacity: opacity.value,
    }));

    return (
      <Animated.View
        key={i}
        style={[
          styles.sparkle,
          {
            left: 30 + i * 20,
            top: 10 + (i % 3) * 15,
          },
          animatedStyle,
        ]}
      >
        <Ionicons name="sparkles" size={12 + i * 2} color={i % 2 === 0 ? Colors.primary : Colors.accent} />
      </Animated.View>
    );
  });

  return <View style={styles.sparkleContainer}>{particles}</View>;
}

// Animated gradient text for header
function GradientTitle() {
  return (
    <View style={styles.gradientTitleContainer}>
      <SparkleParticles />
      <Text style={styles.headerTitle}>Create an App</Text>
    </View>
  );
}

// Circular progress indicator for generation state
function CircularProgress({ percent }: { percent: number }) {
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 2000, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <View style={styles.circularProgressContainer}>
      <Animated.View style={[styles.circularProgressOuter, animatedStyle]}>
        <LinearGradient
          colors={[...Gradients.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.circularGradient}
        />
      </Animated.View>
      <View style={styles.circularProgressInner}>
        <Text style={styles.circularProgressText}>{percent}%</Text>
      </View>
    </View>
  );
}

// Pulsing background effect
function PulsingBackground() {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.6, { duration: 1500 }),
        withTiming(0.3, { duration: 1500 })
      ),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.pulsingBg, animatedStyle]}>
      <LinearGradient
        colors={['transparent', Colors.primary + '20', 'transparent']}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
}

export default function CreateScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);

  const {
    prompt,
    state,
    progress,
    currentApp,
    error,
    setPrompt,
    setState,
    setProgress,
    setCurrentApp,
    setError,
    reset,
  } = useCreateStore();

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) return;

    if (!user) {
      if (Platform.OS === 'web') {
        window.alert('Please sign in to create apps.');
      } else {
        Alert.alert('Sign in required', 'Please sign in to create apps.');
      }
      return;
    }

    try {
      setState('generating');
      setError(null);
      setProgress({ step: 'generating', percent: 50, message: 'Creating your app...' });

      const result = await createApp(prompt.trim());

      setCurrentApp({
        id: result.app_id,
        user_id: user.id,
        prompt: prompt,
        title: result.title,
        description: result.description,
        thumbnail_url: null,
        screenshot_url: null,
        live_url: result.live_url,
        status: 'live',
        is_published: false,
        likes_count: 0,
        views_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      setState('live');
      setProgress(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create app';
      setError(errorMessage);
      setState('error');
      setProgress(null);
      if (Platform.OS === 'web') {
        window.alert('Error: ' + errorMessage);
      }
    }
  }, [prompt, user, setState, setError, setProgress, setCurrentApp]);

  const handleCancel = useCallback(() => {
    setState('idle');
    setProgress(null);
    setError(null);
  }, [setState, setProgress, setError]);

  const handleShare = useCallback(async () => {
    if (!currentApp?.live_url) return;

    try {
      await Share.share({
        message: `Check out this app I created: ${currentApp.live_url}`,
        url: currentApp.live_url,
      });
    } catch (err) {
      console.error('Share failed:', err);
    }
  }, [currentApp]);

  const handlePostToFeed = useCallback(async () => {
    if (!currentApp) return;

    const defaultTitle = prompt.slice(0, 50);
    let title: string | null = null;

    if (Platform.OS === 'web') {
      title = window.prompt('Give your app a title:', defaultTitle);
    } else {
      title = defaultTitle;
    }

    if (!title?.trim()) return;

    try {
      await publishApp(currentApp.id, title.trim());
      if (Platform.OS === 'web') {
        window.alert('Your app has been posted to the feed!');
      } else {
        Alert.alert('Success', 'Your app has been posted to the feed!');
      }
      reset();
      router.push('/');
    } catch (err) {
      if (Platform.OS === 'web') {
        window.alert('Failed to post app. Please try again.');
      } else {
        Alert.alert('Error', 'Failed to post app. Please try again.');
      }
    }
  }, [currentApp, prompt, reset, router]);

  const handleNew = useCallback(() => {
    reset();
  }, [reset]);

  const handleRetry = useCallback(() => {
    setState('idle');
    setError(null);
  }, [setState, setError]);

  // IDLE State
  if (state === 'idle') {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <LinearGradient
          colors={[...Gradients.dark]}
          style={StyleSheet.absoluteFill}
        />
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.idleContent}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View entering={FadeInDown.duration(600)} style={styles.header}>
            <View style={styles.iconWrapper}>
              <LinearGradient
                colors={[...Gradients.primary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.iconGradient}
              >
                <Ionicons name="sparkles" size={32} color={Colors.background} />
              </LinearGradient>
            </View>
            <GradientTitle />
            <Text style={styles.headerSubtitle}>
              Describe the app you want to build and watch it come to life
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(200).duration(600)}>
            <GlassCard style={styles.inputCard} borderGlow glowColor={Colors.primary}>
              <View style={styles.inputInner}>
                <TextInput
                  style={styles.promptInput}
                  placeholder="A retro pixel art game where you dodge falling asteroids..."
                  placeholderTextColor={Colors.textMuted}
                  multiline
                  value={prompt}
                  onChangeText={setPrompt}
                  maxLength={1000}
                />
                <View style={styles.inputFooter}>
                  <Text style={styles.charCount}>{prompt.length}/1000</Text>
                </View>
              </View>
            </GlassCard>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(400).duration(600)}>
            <GradientButton
              onPress={handleGenerate}
              title="Generate"
              icon="sparkles"
              gradient={Gradients.primary}
              disabled={!prompt.trim()}
              size="large"
              style={styles.generateButton}
            />
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(600).duration(600)} style={styles.examplesContainer}>
            <Text style={styles.examplesTitle}>Try these:</Text>
            {[
              'A calculator with a beautiful gradient UI',
              'A to-do list app with dark mode',
              'A simple drawing canvas',
            ].map((example, index) => (
              <Pressable
                key={example}
                style={({ pressed }) => [
                  styles.exampleChip,
                  pressed && styles.exampleChipPressed,
                ]}
                onPress={() => setPrompt(example)}
              >
                <GlassCard style={styles.exampleChipInner}>
                  <View style={styles.exampleContent}>
                    <Ionicons name="bulb-outline" size={16} color={Colors.accent} style={styles.exampleIcon} />
                    <Text style={styles.exampleText}>{example}</Text>
                  </View>
                </GlassCard>
              </Pressable>
            ))}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // GENERATING State
  if (state === 'generating') {
    const currentStepIndex = GENERATION_STEPS.findIndex(
      (s) => s.key === progress?.step
    );

    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[...Gradients.dark]}
          style={StyleSheet.absoluteFill}
        />
        <PulsingBackground />

        <GlassCard style={styles.promptPreviewCard}>
          <View style={styles.promptPreviewInner}>
            <Ionicons name="document-text-outline" size={16} color={Colors.textSecondary} />
            <Text style={styles.promptPreviewText} numberOfLines={1}>
              {prompt}
            </Text>
          </View>
        </GlassCard>

        <View style={styles.generatingContent}>
          <Animated.View entering={ZoomIn.duration(600)}>
            <CircularProgress percent={progress?.percent || 0} />
          </Animated.View>

          <Text style={styles.generatingTitle}>Creating your app...</Text>

          <View style={styles.stepsContainer}>
            {GENERATION_STEPS.map((step, index) => {
              const isComplete = index < currentStepIndex;
              const isCurrent = index === currentStepIndex;

              return (
                <Animated.View
                  key={step.key}
                  entering={FadeInDown.delay(index * 100).duration(400)}
                >
                  <GlassCard
                    style={isCurrent ? [styles.stepCard, styles.stepCardActive] : styles.stepCard}
                    borderGlow={isCurrent}
                    glowColor={Colors.primary}
                  >
                    <View style={styles.stepRow}>
                      {isComplete ? (
                        <View style={styles.stepIconComplete}>
                          <Ionicons name="checkmark" size={16} color={Colors.background} />
                        </View>
                      ) : isCurrent ? (
                        <ActivityIndicator size="small" color={Colors.primary} />
                      ) : (
                        <View style={styles.stepIconPending}>
                          <Ionicons name={step.icon} size={16} color={Colors.textMuted} />
                        </View>
                      )}
                      <Text
                        style={[
                          styles.stepText,
                          isComplete && styles.stepTextComplete,
                          isCurrent && styles.stepTextCurrent,
                        ]}
                      >
                        {step.label}
                      </Text>
                    </View>
                  </GlassCard>
                </Animated.View>
              );
            })}
          </View>

          <Pressable style={styles.cancelButton} onPress={handleCancel}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ERROR State
  if (state === 'error') {
    const shakeAnim = useSharedValue(0);

    useEffect(() => {
      shakeAnim.value = withSequence(
        withTiming(-10, { duration: 50 }),
        withTiming(10, { duration: 50 }),
        withTiming(-10, { duration: 50 }),
        withTiming(10, { duration: 50 }),
        withTiming(0, { duration: 50 })
      );
    }, []);

    const shakeStyle = useAnimatedStyle(() => ({
      transform: [{ translateX: shakeAnim.value }],
    }));

    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[...Gradients.dark]}
          style={StyleSheet.absoluteFill}
        />

        <GlassCard style={styles.promptPreviewCard}>
          <View style={styles.promptPreviewInner}>
            <Ionicons name="document-text-outline" size={16} color={Colors.textSecondary} />
            <Text style={styles.promptPreviewText} numberOfLines={1}>
              {prompt}
            </Text>
          </View>
        </GlassCard>

        <View style={styles.errorContent}>
          <Animated.View style={shakeStyle}>
            <GlassCard
              style={styles.errorCard}
              borderGlow
              glowColor={Colors.error}
            >
              <View style={styles.errorCardInner}>
                <View style={styles.errorIconWrapper}>
                  <LinearGradient
                    colors={[Colors.error, Colors.secondary]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.errorIconGradient}
                  >
                    <Ionicons name="alert-circle" size={40} color={Colors.text} />
                  </LinearGradient>
                </View>
                <Text style={styles.errorTitle}>Generation Failed</Text>
                <Text style={styles.errorMessage}>{error}</Text>
              </View>
            </GlassCard>
          </Animated.View>

          <View style={styles.errorActions}>
            <GradientButton
              onPress={handleRetry}
              title="Try Again"
              icon="refresh"
              gradient={Gradients.primary}
              size="medium"
              style={styles.retryButton}
            />
            <Pressable style={styles.editButton} onPress={handleNew}>
              <Text style={styles.editButtonText}>Edit Prompt</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  // LIVE State
  if (state === 'live' && currentApp) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[...Gradients.dark]}
          style={StyleSheet.absoluteFill}
        />

        <GlassCard style={styles.promptPreviewCard}>
          <View style={styles.promptPreviewInner}>
            <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
            <Text style={styles.promptPreviewText} numberOfLines={1}>
              {prompt}
            </Text>
          </View>
        </GlassCard>

        <Animated.View entering={ZoomIn.duration(400)} style={styles.webviewWrapper}>
          <GlassCard style={styles.webviewCard} borderGlow glowColor={Colors.success}>
            <View style={styles.webviewContainer}>
              {Platform.OS === 'web' ? (
                <iframe
                  src={currentApp.live_url!}
                  style={{ width: '100%', height: '100%', border: 'none', borderRadius: 12 }}
                  title="App Preview"
                />
              ) : (
                <WebView
                  source={{ uri: currentApp.live_url! }}
                  style={styles.webview}
                  startInLoadingState
                  renderLoading={() => (
                    <View style={styles.webviewLoading}>
                      <ActivityIndicator size="large" color={Colors.primary} />
                    </View>
                  )}
                />
              )}
            </View>
          </GlassCard>
        </Animated.View>

        <GlassCard style={styles.liveUrlCard}>
          <View style={styles.liveUrl}>
            <Ionicons name="link" size={16} color={Colors.accent} />
            <Text style={styles.liveUrlText} numberOfLines={1}>
              {currentApp.live_url}
            </Text>
          </View>
        </GlassCard>

        <View style={styles.liveActions}>
          <Pressable style={styles.actionButton} onPress={handleShare}>
            <GlassCard style={styles.actionButtonInner}>
              <View style={styles.actionButtonContent}>
                <Ionicons name="share-outline" size={24} color={Colors.text} />
                <Text style={styles.actionButtonText}>Share</Text>
              </View>
            </GlassCard>
          </Pressable>

          <GradientButton
            onPress={handlePostToFeed}
            title="Post to Feed"
            icon="paper-plane"
            gradient={Gradients.primary}
            size="medium"
            style={styles.postButton}
          />

          <Pressable style={styles.actionButton} onPress={handleNew}>
            <GlassCard style={styles.actionButtonInner}>
              <View style={styles.actionButtonContent}>
                <Ionicons name="add-circle-outline" size={24} color={Colors.text} />
                <Text style={styles.actionButtonText}>New</Text>
              </View>
            </GlassCard>
          </Pressable>
        </View>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  idleContent: {
    padding: Spacing.lg,
    paddingTop: Spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  iconWrapper: {
    marginBottom: Spacing.md,
    ...Shadows.glow,
  },
  iconGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradientTitleContainer: {
    position: 'relative',
  },
  sparkleContainer: {
    position: 'absolute',
    top: -20,
    left: -20,
    right: -20,
    bottom: 0,
  },
  sparkle: {
    position: 'absolute',
  },
  headerTitle: {
    color: Colors.text,
    fontSize: FontSize.xxl,
    fontFamily: Fonts.bold,
  },
  headerSubtitle: {
    color: Colors.textSecondary,
    fontSize: FontSize.md,
    textAlign: 'center',
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  inputCard: {
    marginBottom: Spacing.lg,
  },
  inputInner: {
    padding: Spacing.md,
  },
  promptInput: {
    color: Colors.text,
    fontSize: FontSize.md,
    minHeight: 150,
    textAlignVertical: 'top',
    fontFamily: Fonts.regular,
  },
  inputFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: Spacing.sm,
  },
  charCount: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
  },
  generateButton: {
    marginBottom: Spacing.xl,
  },
  examplesContainer: {
    marginTop: Spacing.md,
  },
  examplesTitle: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    marginBottom: Spacing.md,
    fontFamily: Fonts.medium,
  },
  exampleChip: {
    marginBottom: Spacing.sm,
  },
  exampleChipPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  exampleChipInner: {
    padding: 0,
  },
  exampleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
  },
  exampleIcon: {
    marginRight: Spacing.sm,
  },
  exampleText: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    flex: 1,
  },
  promptPreviewCard: {
    margin: Spacing.md,
    marginTop: Platform.OS === 'ios' ? Spacing.xl : Spacing.md,
  },
  promptPreviewInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  promptPreviewText: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    flex: 1,
  },
  generatingContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  pulsingBg: {
    ...StyleSheet.absoluteFillObject,
  },
  circularProgressContainer: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  circularProgressOuter: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
  },
  circularGradient: {
    width: '100%',
    height: '100%',
  },
  circularProgressInner: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  circularProgressText: {
    color: Colors.text,
    fontSize: FontSize.xl,
    fontFamily: Fonts.bold,
  },
  generatingTitle: {
    color: Colors.text,
    fontSize: FontSize.lg,
    fontFamily: Fonts.semibold,
    marginBottom: Spacing.xl,
  },
  stepsContainer: {
    width: '100%',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  stepCard: {
    padding: 0,
  },
  stepCardActive: {
    borderColor: Colors.primary + '50',
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.md,
  },
  stepIconComplete: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.success,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepIconPending: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepText: {
    color: Colors.textMuted,
    fontSize: FontSize.md,
    fontFamily: Fonts.regular,
  },
  stepTextComplete: {
    color: Colors.success,
  },
  stepTextCurrent: {
    color: Colors.text,
    fontFamily: Fonts.semibold,
  },
  cancelButton: {
    padding: Spacing.md,
  },
  cancelButtonText: {
    color: Colors.textSecondary,
    fontSize: FontSize.md,
  },
  errorContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  errorCard: {
    padding: 0,
    marginBottom: Spacing.xl,
  },
  errorCardInner: {
    alignItems: 'center',
    padding: Spacing.xl,
  },
  errorIconWrapper: {
    marginBottom: Spacing.lg,
    ...Shadows.glowPink,
  },
  errorIconGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorTitle: {
    color: Colors.error,
    fontSize: FontSize.xl,
    fontFamily: Fonts.semibold,
    marginBottom: Spacing.sm,
  },
  errorMessage: {
    color: Colors.textSecondary,
    fontSize: FontSize.md,
    textAlign: 'center',
  },
  errorActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    alignItems: 'center',
  },
  retryButton: {
    minWidth: 140,
  },
  editButton: {
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  editButtonText: {
    color: Colors.textSecondary,
    fontSize: FontSize.md,
    fontFamily: Fonts.medium,
  },
  webviewWrapper: {
    flex: 1,
    margin: Spacing.md,
  },
  webviewCard: {
    flex: 1,
    padding: 0,
    overflow: 'hidden',
  },
  webviewContainer: {
    flex: 1,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
  },
  webview: {
    flex: 1,
  },
  webviewLoading: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.surface,
  },
  liveUrlCard: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    padding: 0,
  },
  liveUrl: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  liveUrlText: {
    color: Colors.textSecondary,
    fontSize: FontSize.xs,
    flex: 1,
    fontFamily: Fonts.regular,
  },
  liveActions: {
    flexDirection: 'row',
    padding: Spacing.md,
    gap: Spacing.md,
    alignItems: 'center',
  },
  actionButton: {
    flex: 1,
  },
  actionButtonInner: {
    padding: 0,
  },
  actionButtonContent: {
    alignItems: 'center',
    padding: Spacing.sm,
    gap: Spacing.xs,
  },
  actionButtonText: {
    color: Colors.text,
    fontSize: FontSize.xs,
    fontFamily: Fonts.medium,
  },
  postButton: {
    flex: 2,
  },
});
