import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Pressable,
  TextInput,
  ActivityIndicator,
  Share,
  Linking,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Colors, Spacing, BorderRadius, FontSize } from '../../constants/theme';
import { getApp, getComments, addComment, likeApp, unlikeApp } from '../../lib/api';
import { useAuthStore } from '../../lib/stores';
import type { App, Comment } from '../../lib/types';

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
}

export default function AppDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const [commentText, setCommentText] = useState('');
  const [showWebView, setShowWebView] = useState(true);

  const { data: app, isLoading: appLoading } = useQuery({
    queryKey: ['app', id],
    queryFn: () => getApp(id!),
    enabled: !!id,
  });

  const { data: comments = [], isLoading: commentsLoading } = useQuery({
    queryKey: ['comments', id],
    queryFn: () => getComments(id!),
    enabled: !!id,
  });

  const likeMutation = useMutation({
    mutationFn: () => (app?.is_liked ? unlikeApp(id!) : likeApp(id!)),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['app', id] });
      const previousApp = queryClient.getQueryData<App>(['app', id]);

      if (previousApp) {
        queryClient.setQueryData<App>(['app', id], {
          ...previousApp,
          is_liked: !previousApp.is_liked,
          likes_count: previousApp.likes_count + (previousApp.is_liked ? -1 : 1),
        });
      }

      return { previousApp };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousApp) {
        queryClient.setQueryData(['app', id], context.previousApp);
      }
    },
  });

  const commentMutation = useMutation({
    mutationFn: (content: string) => addComment(id!, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', id] });
      setCommentText('');
    },
  });

  const handleShare = async () => {
    if (!app?.live_url) return;

    try {
      await Share.share({
        message: `Check out ${app.title || 'this app'}: ${app.live_url}`,
        url: app.live_url,
      });
    } catch (err) {
      console.error('Share failed:', err);
    }
  };

  const handleOpenInBrowser = () => {
    if (app?.live_url) {
      Linking.openURL(app.live_url);
    }
  };

  const handleSubmitComment = () => {
    if (commentText.trim() && user) {
      commentMutation.mutate(commentText.trim());
    }
  };

  if (appLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!app) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={48} color={Colors.error} />
        <Text style={styles.errorText}>App not found</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: app.title || 'App Details',
          headerRight: () => (
            <Pressable onPress={handleShare} style={styles.headerButton}>
              <Ionicons name="share-outline" size={24} color={Colors.text} />
            </Pressable>
          ),
        }}
      />

      <View style={styles.container}>
        {/* WebView */}
        {showWebView && app.live_url && (
          <View style={styles.webviewContainer}>
            <WebView
              source={{ uri: app.live_url }}
              style={styles.webview}
              startInLoadingState
              renderLoading={() => (
                <View style={styles.webviewLoading}>
                  <ActivityIndicator size="large" color={Colors.primary} />
                </View>
              )}
            />
          </View>
        )}

        {/* Toggle WebView / Info */}
        <Pressable
          style={styles.toggleButton}
          onPress={() => setShowWebView(!showWebView)}
        >
          <Ionicons
            name={showWebView ? 'chevron-down' : 'chevron-up'}
            size={20}
            color={Colors.textSecondary}
          />
          <Text style={styles.toggleText}>
            {showWebView ? 'Show Details' : 'Show App'}
          </Text>
        </Pressable>

        <ScrollView style={styles.scrollView}>
          {/* App Info */}
          <View style={styles.appInfo}>
            <View style={styles.creatorRow}>
              {app.user?.avatar_url ? (
                <Image source={{ uri: app.user.avatar_url }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="person" size={16} color={Colors.textSecondary} />
                </View>
              )}
              <View style={styles.creatorInfo}>
                <Text style={styles.username}>@{app.user?.username || 'unknown'}</Text>
                <Text style={styles.timeAgo}>{formatTimeAgo(app.created_at)}</Text>
              </View>
            </View>

            <Text style={styles.title}>{app.title || 'Untitled'}</Text>
            {app.description && (
              <Text style={styles.description}>{app.description}</Text>
            )}

            <Text style={styles.promptLabel}>Prompt:</Text>
            <Text style={styles.prompt}>{app.prompt}</Text>

            {/* Actions */}
            <View style={styles.actions}>
              <Pressable
                style={styles.actionButton}
                onPress={() => likeMutation.mutate()}
                disabled={!user}
              >
                <Ionicons
                  name={app.is_liked ? 'heart' : 'heart-outline'}
                  size={24}
                  color={app.is_liked ? Colors.error : Colors.textSecondary}
                />
                <Text style={styles.actionText}>{app.likes_count}</Text>
              </Pressable>

              <Pressable style={styles.actionButton} onPress={handleOpenInBrowser}>
                <Ionicons name="open-outline" size={24} color={Colors.textSecondary} />
                <Text style={styles.actionText}>Open</Text>
              </Pressable>
            </View>
          </View>

          {/* Comments */}
          <View style={styles.commentsSection}>
            <Text style={styles.commentsTitle}>Comments</Text>

            {user && (
              <View style={styles.commentInput}>
                <TextInput
                  style={styles.commentTextInput}
                  placeholder="Add a comment..."
                  placeholderTextColor={Colors.textMuted}
                  value={commentText}
                  onChangeText={setCommentText}
                  maxLength={500}
                />
                <Pressable
                  style={[
                    styles.sendButton,
                    !commentText.trim() && styles.sendButtonDisabled,
                  ]}
                  onPress={handleSubmitComment}
                  disabled={!commentText.trim() || commentMutation.isPending}
                >
                  {commentMutation.isPending ? (
                    <ActivityIndicator size="small" color={Colors.text} />
                  ) : (
                    <Ionicons name="send" size={20} color={Colors.text} />
                  )}
                </Pressable>
              </View>
            )}

            {commentsLoading ? (
              <ActivityIndicator style={styles.commentsLoading} color={Colors.primary} />
            ) : comments.length === 0 ? (
              <Text style={styles.noComments}>No comments yet. Be the first!</Text>
            ) : (
              comments.map((comment: Comment) => (
                <View key={comment.id} style={styles.commentItem}>
                  <View style={styles.commentHeader}>
                    {comment.user?.avatar_url ? (
                      <Image
                        source={{ uri: comment.user.avatar_url }}
                        style={styles.commentAvatar}
                      />
                    ) : (
                      <View style={styles.commentAvatarPlaceholder}>
                        <Ionicons name="person" size={12} color={Colors.textSecondary} />
                      </View>
                    )}
                    <Text style={styles.commentUsername}>
                      @{comment.user?.username || 'unknown'}
                    </Text>
                    <Text style={styles.commentTime}>
                      {formatTimeAgo(comment.created_at)}
                    </Text>
                  </View>
                  <Text style={styles.commentContent}>{comment.content}</Text>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: Colors.error,
    fontSize: FontSize.lg,
    marginTop: Spacing.md,
  },
  headerButton: {
    padding: Spacing.sm,
  },
  webviewContainer: {
    height: 300,
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
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.sm,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: Spacing.xs,
  },
  toggleText: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
  },
  scrollView: {
    flex: 1,
  },
  appInfo: {
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  creatorInfo: {
    marginLeft: Spacing.sm,
  },
  username: {
    color: Colors.text,
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  timeAgo: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
  },
  title: {
    color: Colors.text,
    fontSize: FontSize.xl,
    fontWeight: '700',
    marginBottom: Spacing.sm,
  },
  description: {
    color: Colors.textSecondary,
    fontSize: FontSize.md,
    marginBottom: Spacing.md,
  },
  promptLabel: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    marginBottom: Spacing.xs,
  },
  prompt: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    fontStyle: 'italic',
    backgroundColor: Colors.surface,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  actions: {
    flexDirection: 'row',
    marginTop: Spacing.md,
    gap: Spacing.lg,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  actionText: {
    color: Colors.textSecondary,
    fontSize: FontSize.md,
  },
  commentsSection: {
    padding: Spacing.md,
  },
  commentsTitle: {
    color: Colors.text,
    fontSize: FontSize.lg,
    fontWeight: '600',
    marginBottom: Spacing.md,
  },
  commentInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  commentTextInput: {
    flex: 1,
    color: Colors.text,
    fontSize: FontSize.md,
    padding: Spacing.sm,
  },
  sendButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  commentsLoading: {
    padding: Spacing.lg,
  },
  noComments: {
    color: Colors.textMuted,
    fontSize: FontSize.md,
    textAlign: 'center',
    padding: Spacing.lg,
  },
  commentItem: {
    marginBottom: Spacing.md,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  commentAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  commentAvatarPlaceholder: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentUsername: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    marginLeft: Spacing.sm,
  },
  commentTime: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    marginLeft: Spacing.sm,
  },
  commentContent: {
    color: Colors.text,
    fontSize: FontSize.md,
    marginLeft: 32,
  },
});
