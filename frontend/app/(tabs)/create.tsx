import { useCallback, useState, useEffect, useRef } from 'react';
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
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

// Conditionally import WebView (not available on web)
let WebView: any = null;
if (Platform.OS !== 'web') {
  WebView = require('react-native-webview').WebView;
}
import { useRouter } from 'expo-router';
import { Colors, Spacing, BorderRadius, FontSize, Fonts } from '../../constants/theme';
import { useCreateStore, useAuthStore } from '../../lib/stores';
import { createApp, publishApp, analyzeComplexity } from '../../lib/api';
import type { CreateAppResponse, ComplexityAnalysis } from '../../lib/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const GENERATION_STEPS = [
  { key: 'moderation', label: 'Checking prompt...', icon: 'shield-checkmark' },
  { key: 'analyzing', label: 'Analyzing intent...', icon: 'analytics' },
  { key: 'generating', label: 'Generating code...', icon: 'code-slash' },
  { key: 'deploying', label: 'Deploying to cloud...', icon: 'cloud-upload' },
  { key: 'finalizing', label: 'Going live!', icon: 'rocket' },
];

const EXAMPLE_PROMPTS = [
  { text: 'A retro neon calculator', icon: 'calculator', gradient: ['#FF006E', '#FF6B9D'] as [string, string] },
  { text: 'Pixel art drawing canvas', icon: 'brush', gradient: ['#00F0FF', '#00A3FF'] as [string, string] },
  { text: 'Minimalist habit tracker', icon: 'checkbox', gradient: ['#BEFF00', '#7ACC00'] as [string, string] },
  { text: 'Dark mode pomodoro timer', icon: 'timer', gradient: ['#9D4EDD', '#C77DFF'] as [string, string] },
];

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

  // Complexity analysis state
  const [complexity, setComplexity] = useState<ComplexityAnalysis | null>(null);
  const [analyzingComplexity, setAnalyzingComplexity] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);

  // Animation values
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  // Pulse animation for generate button
  useEffect(() => {
    if (prompt.trim()) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.02,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [prompt]);

  // Glow animation for input when focused
  useEffect(() => {
    Animated.timing(glowAnim, {
      toValue: inputFocused ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [inputFocused]);

  // Debounced complexity analysis
  useEffect(() => {
    if (!prompt.trim()) {
      setComplexity(null);
      return;
    }

    setAnalyzingComplexity(true);
    const timer = setTimeout(async () => {
      try {
        const result = await analyzeComplexity(prompt);
        setComplexity(result);
      } catch (error) {
        console.error('Failed to analyze complexity:', error);
      } finally {
        setAnalyzingComplexity(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [prompt]);

  const handleGenerate = useCallback(async () => {
    console.log('Generate clicked, prompt:', prompt, 'user:', user);

    if (!prompt.trim()) {
      console.log('Empty prompt, returning');
      return;
    }

    if (!user) {
      console.log('No user, showing alert');
      if (Platform.OS === 'web') {
        window.alert('Please sign in to create apps.');
      } else {
        Alert.alert('Sign in required', 'Please sign in to create apps.');
      }
      return;
    }

    try {
      console.log('Starting generation...');
      setState('generating');
      setError(null);
      setProgress({ step: 'generating', percent: 50, message: 'Creating your app... This may take up to 30 seconds.' });

      console.log('Calling createApp API...');
      const result = await createApp(prompt.trim());
      console.log('Got response:', result);

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
      console.error('Generation error:', err);
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

  const borderColor = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [Colors.border, Colors.primary],
  });

  // IDLE State
  if (state === 'idle') {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <LinearGradient
          colors={['#0A0A0A', '#000000', '#050510'] as [string, string, ...string[]]}
          style={StyleSheet.absoluteFill}
        />
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.idleContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Header */}
          <View style={styles.heroContainer}>
            <View style={styles.iconContainer}>
              <LinearGradient
                colors={[Colors.primary, '#9EFF00'] as [string, string]}
                style={styles.iconGradient}
              >
                <Ionicons name="sparkles" size={32} color="#000000" />
              </LinearGradient>
            </View>
            <Text style={styles.heroTitle}>What will you build?</Text>
            <Text style={styles.heroSubtitle}>
              Describe your app idea and watch AI bring it to life
            </Text>
          </View>

          {/* Input Card with Glass Effect */}
          <Animated.View style={[styles.inputCard, { borderColor }]}>
            <LinearGradient
              colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.02)'] as [string, string]}
              style={styles.inputCardGradient}
            >
              <TextInput
                style={styles.promptInput}
                placeholder="A retro arcade game with neon visuals..."
                placeholderTextColor={Colors.textMuted}
                multiline
                value={prompt}
                onChangeText={setPrompt}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                maxLength={1000}
              />

              <View style={styles.inputFooter}>
                <Text style={styles.charCount}>{prompt.length}/1000</Text>
                {analyzingComplexity && (
                  <View style={styles.analyzingBadge}>
                    <ActivityIndicator size="small" color={Colors.primary} />
                    <Text style={styles.analyzingText}>Analyzing...</Text>
                  </View>
                )}
              </View>
            </LinearGradient>
          </Animated.View>

          {/* Complexity Estimation */}
          {complexity && prompt.length > 0 && (
            <View style={styles.complexityCard}>
              <View style={styles.complexityRow}>
                <View style={styles.complexityLeft}>
                  <View style={[styles.complexityDot, { backgroundColor: complexity.complexity_color }]} />
                  <Text style={styles.complexityLabel}>{complexity.complexity_label}</Text>
                </View>
                <Text style={[styles.complexityPercent, { color: complexity.complexity_color }]}>
                  {complexity.complexity_score}%
                </Text>
              </View>
              <View style={styles.complexityBarBg}>
                <View
                  style={[
                    styles.complexityBarFill,
                    {
                      width: `${complexity.complexity_score}%`,
                      backgroundColor: complexity.complexity_color,
                    },
                  ]}
                />
              </View>
              <Text style={styles.complexityHint}>
                {complexity.complexity_score < 20 && '⚡ Quick generation'}
                {complexity.complexity_score >= 20 && complexity.complexity_score < 45 && '🎯 Standard complexity'}
                {complexity.complexity_score >= 45 && complexity.complexity_score < 70 && '🔧 May take longer'}
                {complexity.complexity_score >= 70 && '🚀 Complex build ahead'}
              </Text>
            </View>
          )}

          {/* Generate Button */}
          <Animated.View style={{ transform: [{ scale: prompt.trim() ? pulseAnim : 1 }] }}>
            <Pressable
              style={[styles.generateButton, !prompt.trim() && styles.generateButtonDisabled]}
              onPress={handleGenerate}
              disabled={!prompt.trim()}
            >
              <LinearGradient
                colors={prompt.trim() ? [Colors.primary, '#9EFF00'] as [string, string] : ['#333333', '#222222'] as [string, string]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.generateButtonGradient}
              >
                <Ionicons name="sparkles" size={22} color={prompt.trim() ? '#000000' : Colors.textMuted} />
                <Text style={[styles.generateButtonText, !prompt.trim() && styles.generateButtonTextDisabled]}>
                  Generate App
                </Text>
                <Ionicons name="arrow-forward" size={20} color={prompt.trim() ? '#000000' : Colors.textMuted} />
              </LinearGradient>
            </Pressable>
          </Animated.View>

          {/* Example Prompts */}
          <View style={styles.examplesSection}>
            <Text style={styles.examplesTitle}>Need inspiration?</Text>
            <View style={styles.examplesGrid}>
              {EXAMPLE_PROMPTS.map((example, index) => (
                <Pressable
                  key={index}
                  style={styles.exampleCard}
                  onPress={() => setPrompt(example.text)}
                >
                  <LinearGradient
                    colors={example.gradient}
                    style={styles.exampleIconBg}
                  >
                    <Ionicons name={example.icon as any} size={18} color="#FFFFFF" />
                  </LinearGradient>
                  <Text style={styles.exampleText}>{example.text}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Bottom Spacer */}
          <View style={{ height: 40 }} />
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
          colors={['#0A0A0A', '#000000', '#050510'] as [string, string, ...string[]]}
          style={StyleSheet.absoluteFill}
        />

        <View style={styles.promptPreview}>
          <LinearGradient
            colors={['rgba(190,255,0,0.1)', 'transparent'] as [string, string]}
            style={styles.promptPreviewGradient}
          >
            <Ionicons name="sparkles" size={16} color={Colors.primary} />
            <Text style={styles.promptPreviewText} numberOfLines={1}>
              {prompt}
            </Text>
          </LinearGradient>
        </View>

        <View style={styles.generatingContent}>
          {/* Animated Progress Ring */}
          <View style={styles.progressRingContainer}>
            <View style={styles.progressRingBg}>
              <Text style={styles.progressRingPercent}>{progress?.percent || 0}%</Text>
            </View>
          </View>

          <Text style={styles.generatingTitle}>Creating your app...</Text>

          <View style={styles.stepsContainer}>
            {GENERATION_STEPS.map((step, index) => {
              const isComplete = index < currentStepIndex;
              const isCurrent = index === currentStepIndex;

              return (
                <View key={step.key} style={[styles.stepRow, isCurrent && styles.stepRowActive]}>
                  <View style={[styles.stepIcon, isComplete && styles.stepIconComplete, isCurrent && styles.stepIconCurrent]}>
                    {isComplete ? (
                      <Ionicons name="checkmark" size={16} color="#000000" />
                    ) : isCurrent ? (
                      <ActivityIndicator size="small" color="#000000" />
                    ) : (
                      <Ionicons name={step.icon as any} size={14} color={Colors.textMuted} />
                    )}
                  </View>
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
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#0A0A0A', '#000000', '#100505'] as [string, string, ...string[]]}
          style={StyleSheet.absoluteFill}
        />

        <View style={styles.errorContent}>
          <View style={styles.errorIconContainer}>
            <Ionicons name="alert-circle" size={48} color={Colors.error} />
          </View>
          <Text style={styles.errorTitle}>Generation Failed</Text>
          <Text style={styles.errorMessage}>{error}</Text>

          <View style={styles.errorActions}>
            <Pressable style={styles.retryButton} onPress={handleRetry}>
              <LinearGradient
                colors={[Colors.primary, '#9EFF00'] as [string, string]}
                style={styles.retryButtonGradient}
              >
                <Ionicons name="refresh" size={20} color="#000000" />
                <Text style={styles.retryButtonText}>Try Again</Text>
              </LinearGradient>
            </Pressable>
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
        <View style={styles.promptPreview}>
          <LinearGradient
            colors={['rgba(0,255,148,0.1)', 'transparent'] as [string, string]}
            style={styles.promptPreviewGradient}
          >
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveBadgeText}>LIVE</Text>
            </View>
            <Text style={styles.promptPreviewText} numberOfLines={1}>
              {prompt}
            </Text>
          </LinearGradient>
        </View>

        <View style={styles.webviewContainer}>
          {Platform.OS === 'web' ? (
            <iframe
              src={currentApp.live_url!}
              style={{ width: '100%', height: '100%', border: 'none' }}
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

        <View style={styles.liveUrl}>
          <Ionicons name="link" size={14} color={Colors.textMuted} />
          <Text style={styles.liveUrlText} numberOfLines={1}>
            {currentApp.live_url}
          </Text>
        </View>

        <View style={styles.liveActions}>
          <Pressable style={styles.actionButton} onPress={handleShare}>
            <Ionicons name="share-outline" size={22} color={Colors.text} />
            <Text style={styles.actionButtonText}>Share</Text>
          </Pressable>

          <Pressable style={styles.postButton} onPress={handlePostToFeed}>
            <LinearGradient
              colors={[Colors.primary, '#9EFF00'] as [string, string]}
              style={styles.postButtonGradient}
            >
              <Ionicons name="paper-plane" size={22} color="#000000" />
              <Text style={styles.postButtonText}>Post to Feed</Text>
            </LinearGradient>
          </Pressable>

          <Pressable style={styles.actionButton} onPress={handleNew}>
            <Ionicons name="add-circle-outline" size={22} color={Colors.text} />
            <Text style={styles.actionButtonText}>New</Text>
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

  // Hero Section
  heroContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  iconContainer: {
    marginBottom: Spacing.md,
  },
  iconGradient: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroTitle: {
    color: Colors.text,
    fontSize: 28,
    fontFamily: Fonts.bold,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  heroSubtitle: {
    color: Colors.textSecondary,
    fontSize: FontSize.md,
    textAlign: 'center',
    paddingHorizontal: Spacing.lg,
    lineHeight: 22,
  },

  // Input Card
  inputCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  inputCardGradient: {
    padding: Spacing.md,
  },
  promptInput: {
    color: Colors.text,
    fontSize: FontSize.md,
    minHeight: 120,
    textAlignVertical: 'top',
    lineHeight: 24,
  },
  inputFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  charCount: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
  },
  analyzingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  analyzingText: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
  },

  // Complexity Card
  complexityCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  complexityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  complexityLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  complexityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  complexityLabel: {
    color: Colors.text,
    fontSize: FontSize.sm,
    fontFamily: Fonts.medium,
  },
  complexityPercent: {
    fontSize: FontSize.lg,
    fontFamily: Fonts.bold,
  },
  complexityBarBg: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  complexityBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  complexityHint: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    textAlign: 'center',
  },

  // Generate Button
  generateButton: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    marginBottom: Spacing.xl,
  },
  generateButtonDisabled: {
    opacity: 0.6,
  },
  generateButtonGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  generateButtonText: {
    color: '#000000',
    fontSize: FontSize.lg,
    fontFamily: Fonts.bold,
  },
  generateButtonTextDisabled: {
    color: Colors.textMuted,
  },

  // Examples Section
  examplesSection: {
    marginTop: Spacing.md,
  },
  examplesTitle: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    fontFamily: Fonts.medium,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  examplesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  exampleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  exampleIconBg: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  exampleText: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    flex: 1,
  },

  // Prompt Preview
  promptPreview: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  promptPreviewGradient: {
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

  // Generating State
  generatingContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  progressRingContainer: {
    marginBottom: Spacing.lg,
  },
  progressRingBg: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(190,255,0,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: Colors.primary,
  },
  progressRingPercent: {
    color: Colors.primary,
    fontSize: 28,
    fontFamily: Fonts.bold,
  },
  generatingTitle: {
    color: Colors.text,
    fontSize: FontSize.xl,
    fontFamily: Fonts.semibold,
    marginBottom: Spacing.xl,
  },
  stepsContainer: {
    width: '100%',
    maxWidth: 300,
    marginBottom: Spacing.xl,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.md,
  },
  stepRowActive: {
    backgroundColor: 'rgba(190,255,0,0.1)',
  },
  stepIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepIconComplete: {
    backgroundColor: Colors.success,
  },
  stepIconCurrent: {
    backgroundColor: Colors.primary,
  },
  stepText: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
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

  // Error State
  errorContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  errorIconContainer: {
    marginBottom: Spacing.md,
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
    marginBottom: Spacing.xl,
  },
  errorActions: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  retryButton: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  retryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  retryButtonText: {
    color: '#000000',
    fontSize: FontSize.md,
    fontFamily: Fonts.semibold,
  },
  editButton: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  editButtonText: {
    color: Colors.textSecondary,
    fontSize: FontSize.md,
  },

  // Live State
  webviewContainer: {
    flex: 1,
    backgroundColor: Colors.surface,
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
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,255,148,0.2)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.success,
  },
  liveBadgeText: {
    color: Colors.success,
    fontSize: 10,
    fontFamily: Fonts.bold,
  },
  liveUrl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.sm,
    gap: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  liveUrlText: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    flex: 1,
  },
  liveActions: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    gap: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  actionButton: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    gap: 4,
  },
  actionButtonText: {
    color: Colors.text,
    fontSize: FontSize.xs,
    fontFamily: Fonts.medium,
  },
  postButton: {
    flex: 2,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  postButtonGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  postButtonText: {
    color: '#000000',
    fontSize: FontSize.sm,
    fontFamily: Fonts.bold,
  },
});
