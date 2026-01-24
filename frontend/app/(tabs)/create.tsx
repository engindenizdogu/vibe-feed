import { useEffect, useRef, useCallback } from 'react';
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
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Spacing, BorderRadius, FontSize } from '../../constants/theme';
import { useCreateStore, useAuthStore } from '../../lib/stores';
import { createApp, publishApp, connectGenerationWebSocket } from '../../lib/api';
import type { GenerationUpdate } from '../../lib/types';

const GENERATION_STEPS = [
  { key: 'moderation', label: 'Checking prompt...' },
  { key: 'analyzing', label: 'Analyzing intent...' },
  { key: 'generating', label: 'Generating code...' },
  { key: 'deploying', label: 'Deploying to cloud...' },
  { key: 'finalizing', label: 'Going live!' },
];

export default function CreateScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const wsRef = useRef<WebSocket | null>(null);

  const {
    prompt,
    state,
    progress,
    currentApp,
    error,
    jobId,
    setPrompt,
    setState,
    setProgress,
    setCurrentApp,
    setError,
    setJobId,
    reset,
  } = useCreateStore();

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) return;

    if (!user) {
      Alert.alert('Sign in required', 'Please sign in to create apps.');
      return;
    }

    try {
      setState('generating');
      setError(null);
      setProgress({ step: 'moderation', percent: 0, message: 'Starting...' });

      const { app_id, job_id } = await createApp(prompt.trim());
      setJobId(job_id);

      // Connect to WebSocket for real-time updates
      wsRef.current = connectGenerationWebSocket(
        job_id,
        (data: GenerationUpdate) => {
          if (data.type === 'status_update') {
            setProgress({
              step: data.step as any,
              percent: data.percent || 0,
              message: data.message || '',
            });
          } else if (data.type === 'completed') {
            setCurrentApp({
              id: data.app_id!,
              user_id: user.id,
              prompt: prompt,
              title: null,
              description: null,
              thumbnail_url: data.thumbnail_url || null,
              screenshot_url: null,
              live_url: data.live_url!,
              status: 'live',
              is_published: false,
              likes_count: 0,
              views_count: 0,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
            setState('live');
            setProgress(null);
          } else if (data.type === 'failed') {
            setError(data.error_message || 'Generation failed');
            setState('error');
            setProgress(null);
          }
        },
        (err) => {
          console.error('WebSocket error:', err);
          setError('Connection lost. Please try again.');
          setState('error');
        },
        () => {
          wsRef.current = null;
        }
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start generation');
      setState('error');
    }
  }, [prompt, user, setState, setError, setProgress, setJobId, setCurrentApp]);

  const handleCancel = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setState('idle');
    setProgress(null);
    setError(null);
    setJobId(null);
  }, [setState, setProgress, setError, setJobId]);

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

    Alert.prompt(
      'Post to Feed',
      'Give your app a title:',
      async (title) => {
        if (!title?.trim()) return;

        try {
          await publishApp(currentApp.id, title.trim());
          Alert.alert('Success', 'Your app has been posted to the feed!');
          reset();
          router.push('/');
        } catch (err) {
          Alert.alert('Error', 'Failed to post app. Please try again.');
        }
      },
      'plain-text',
      prompt.slice(0, 50)
    );
  }, [currentApp, prompt, reset, router]);

  const handleNew = useCallback(() => {
    reset();
  }, [reset]);

  const handleRetry = useCallback(() => {
    setState('idle');
    setError(null);
  }, [setState, setError]);

  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  // IDLE State
  if (state === 'idle') {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.idleContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Ionicons name="sparkles" size={48} color={Colors.primary} />
            <Text style={styles.headerTitle}>Create an App</Text>
            <Text style={styles.headerSubtitle}>
              Describe the app you want to build and watch it come to life
            </Text>
          </View>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.promptInput}
              placeholder="A retro pixel art game where you dodge falling asteroids..."
              placeholderTextColor={Colors.textMuted}
              multiline
              value={prompt}
              onChangeText={setPrompt}
              maxLength={1000}
            />
            <Text style={styles.charCount}>{prompt.length}/1000</Text>
          </View>

          <Pressable
            style={[styles.generateButton, !prompt.trim() && styles.generateButtonDisabled]}
            onPress={handleGenerate}
            disabled={!prompt.trim()}
          >
            <Ionicons name="sparkles" size={20} color={Colors.text} />
            <Text style={styles.generateButtonText}>Generate</Text>
          </Pressable>

          <View style={styles.examplesContainer}>
            <Text style={styles.examplesTitle}>Try these:</Text>
            {[
              'A calculator with a beautiful gradient UI',
              'A to-do list app with dark mode',
              'A simple drawing canvas',
            ].map((example) => (
              <Pressable
                key={example}
                style={styles.exampleChip}
                onPress={() => setPrompt(example)}
              >
                <Text style={styles.exampleText}>{example}</Text>
              </Pressable>
            ))}
          </View>
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
        <View style={styles.promptPreview}>
          <Text style={styles.promptPreviewText} numberOfLines={1}>
            {prompt}
          </Text>
        </View>

        <View style={styles.generatingContent}>
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[styles.progressFill, { width: `${progress?.percent || 0}%` }]}
              />
            </View>
            <Text style={styles.progressPercent}>{progress?.percent || 0}%</Text>
          </View>

          <View style={styles.stepsContainer}>
            {GENERATION_STEPS.map((step, index) => {
              const isComplete = index < currentStepIndex;
              const isCurrent = index === currentStepIndex;

              return (
                <View key={step.key} style={styles.stepRow}>
                  {isComplete ? (
                    <Ionicons name="checkmark-circle" size={24} color={Colors.success} />
                  ) : isCurrent ? (
                    <ActivityIndicator size="small" color={Colors.primary} />
                  ) : (
                    <Ionicons name="ellipse-outline" size={24} color={Colors.textMuted} />
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
        <View style={styles.promptPreview}>
          <Text style={styles.promptPreviewText} numberOfLines={1}>
            {prompt}
          </Text>
        </View>

        <View style={styles.errorContent}>
          <Ionicons name="alert-circle" size={64} color={Colors.error} />
          <Text style={styles.errorTitle}>Generation Failed</Text>
          <Text style={styles.errorMessage}>{error}</Text>

          <View style={styles.errorActions}>
            <Pressable style={styles.retryButton} onPress={handleRetry}>
              <Ionicons name="refresh" size={20} color={Colors.text} />
              <Text style={styles.retryButtonText}>Try Again</Text>
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
          <Text style={styles.promptPreviewText} numberOfLines={1}>
            {prompt}
          </Text>
        </View>

        <View style={styles.webviewContainer}>
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
        </View>

        <View style={styles.liveUrl}>
          <Ionicons name="link" size={16} color={Colors.textSecondary} />
          <Text style={styles.liveUrlText} numberOfLines={1}>
            {currentApp.live_url}
          </Text>
        </View>

        <View style={styles.liveActions}>
          <Pressable style={styles.actionButton} onPress={handleShare}>
            <Ionicons name="share-outline" size={24} color={Colors.text} />
            <Text style={styles.actionButtonText}>Share</Text>
          </Pressable>

          <Pressable
            style={[styles.actionButton, styles.primaryActionButton]}
            onPress={handlePostToFeed}
          >
            <Ionicons name="paper-plane" size={24} color={Colors.text} />
            <Text style={styles.actionButtonText}>Post to Feed</Text>
          </Pressable>

          <Pressable style={styles.actionButton} onPress={handleNew}>
            <Ionicons name="add-circle-outline" size={24} color={Colors.text} />
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
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  headerTitle: {
    color: Colors.text,
    fontSize: FontSize.xxl,
    fontWeight: '700',
    marginTop: Spacing.md,
  },
  headerSubtitle: {
    color: Colors.textSecondary,
    fontSize: FontSize.md,
    textAlign: 'center',
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  inputContainer: {
    marginBottom: Spacing.lg,
  },
  promptInput: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    color: Colors.text,
    fontSize: FontSize.md,
    minHeight: 150,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  charCount: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    textAlign: 'right',
    marginTop: Spacing.xs,
  },
  generateButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  generateButtonDisabled: {
    opacity: 0.5,
  },
  generateButtonText: {
    color: Colors.text,
    fontSize: FontSize.lg,
    fontWeight: '600',
  },
  examplesContainer: {
    marginTop: Spacing.xl,
  },
  examplesTitle: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    marginBottom: Spacing.sm,
  },
  exampleChip: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  exampleText: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
  },
  promptPreview: {
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  promptPreviewText: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
  },
  generatingContent: {
    flex: 1,
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: Colors.surfaceLight,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
  },
  progressPercent: {
    color: Colors.text,
    fontSize: FontSize.md,
    fontWeight: '600',
    marginLeft: Spacing.md,
    width: 45,
  },
  stepsContainer: {
    marginBottom: Spacing.xl,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    gap: Spacing.md,
  },
  stepText: {
    color: Colors.textMuted,
    fontSize: FontSize.md,
  },
  stepTextComplete: {
    color: Colors.success,
  },
  stepTextCurrent: {
    color: Colors.text,
    fontWeight: '600',
  },
  cancelButton: {
    alignSelf: 'center',
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
  errorTitle: {
    color: Colors.error,
    fontSize: FontSize.xl,
    fontWeight: '600',
    marginTop: Spacing.md,
  },
  errorMessage: {
    color: Colors.textSecondary,
    fontSize: FontSize.md,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  errorActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.xl,
  },
  retryButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  retryButtonText: {
    color: Colors.text,
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  editButton: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  editButtonText: {
    color: Colors.textSecondary,
    fontSize: FontSize.md,
  },
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
  liveUrl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.sm,
    gap: Spacing.xs,
  },
  liveUrlText: {
    color: Colors.textSecondary,
    fontSize: FontSize.xs,
    flex: 1,
  },
  liveActions: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  actionButton: {
    flex: 1,
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  primaryActionButton: {
    backgroundColor: Colors.primary,
  },
  actionButtonText: {
    color: Colors.text,
    fontSize: FontSize.xs,
    fontWeight: '500',
  },
});
