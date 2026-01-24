import { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  Platform,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Fonts, Spacing, BorderRadius } from '../../constants/theme';
import { getApps, likeApp, unlikeApp } from '../../lib/api';
import type { App } from '../../lib/types';
import { useAuthStore } from '../../lib/stores';

// Conditionally import WebView (not available on web)
let WebView: any = null;
if (Platform.OS !== 'web') {
  WebView = require('react-native-webview').WebView;
}

const { width: screenWidth } = Dimensions.get('window');

// Responsive breakpoints
const isDesktop = Platform.OS === 'web' && screenWidth > 768;
const isTablet = Platform.OS === 'web' && screenWidth > 480 && screenWidth <= 768;

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

interface FeedItemProps {
  app: App;
  onLike: () => void;
  onPress: () => void;
  onComment: () => void;
}

function FeedItem({ app, onLike, onPress, onComment }: FeedItemProps) {
  const [isWebViewLoading, setIsWebViewLoading] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  // Accent colors for variety
  const accentColors = ['#BEFF00', '#FF006E', '#00F0FF', '#FFD600', '#FF6B00'];
  const colorIndex = app.id ? parseInt(app.id.slice(0, 8), 16) % accentColors.length : 0;
  const accentColor = accentColors[colorIndex];

  return (
    <View
      style={[
        styles.feedItem,
        Platform.OS === 'web' && styles.feedItemWeb,
      ]}
      // @ts-ignore - web only props
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Card with subtle gradient border effect */}
      <View style={[
        styles.feedCard,
        isHovered && styles.feedCardHovered,
      ]}>
        {/* Main container with app preview */}
        <View
          style={[
            styles.previewContainer,
            { borderColor: isHovered ? accentColor : 'rgba(255,255,255,0.1)' }
          ]}
        >
          {/* Live app preview */}
          {app.live_url ? (
            Platform.OS === 'web' ? (
              <iframe
                src={app.live_url}
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  borderRadius: 8,
                }}
                title={app.title || 'App Preview'}
              />
            ) : (
              <Pressable onPress={onPress} style={{ flex: 1 }}>
                {WebView ? (
                  <>
                    <WebView
                      source={{ uri: app.live_url }}
                      style={{ flex: 1, borderRadius: 8 }}
                      onLoadStart={() => setIsWebViewLoading(true)}
                      onLoadEnd={() => setIsWebViewLoading(false)}
                      scrollEnabled={false}
                      javaScriptEnabled={true}
                    />
                    {isWebViewLoading && (
                      <View style={styles.webviewLoading}>
                        <ActivityIndicator size="large" color={accentColor} />
                      </View>
                    )}
                  </>
                ) : (
                  <View style={styles.noPreview}>
                    <Text style={{ color: Colors.textSecondary }}>Preview not available</Text>
                  </View>
                )}
              </Pressable>
            )
          ) : (
            <View style={styles.noPreview}>
              <Ionicons name="cube-outline" size={48} color={accentColor} />
              <Text style={{ color: Colors.textSecondary, marginTop: 12 }}>No preview</Text>
            </View>
          )}

          {/* Status badge */}
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: app.status === 'live' ? '#10B981' : accentColor }
            ]}
          >
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>
              {app.status === 'live' ? 'LIVE' : app.status?.toUpperCase() || 'PREVIEW'}
            </Text>
          </View>

        </View>

        {/* Metadata section */}
        <View style={styles.metadataSection}>
          {/* User info row */}
          <View style={styles.userInfoRow}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={14} color={Colors.textSecondary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.username}>
                {app.user?.username || 'Anonymous'}
              </Text>
            </View>
            <Text style={styles.timeAgo}>
              {formatTimeAgo(app.created_at)}
            </Text>
          </View>

          {/* Title & Description */}
          <Text numberOfLines={2} style={styles.title}>
            {app.title || 'Untitled App'}
          </Text>

          {app.description && (
            <Text numberOfLines={2} style={styles.description}>
              {app.description}
            </Text>
          )}

          {/* Prompt preview */}
          {app.prompt && (
            <View style={styles.promptContainer}>
              <Ionicons name="sparkles" size={12} color={Colors.textMuted} />
              <Text numberOfLines={1} style={styles.prompt}>
                {app.prompt}
              </Text>
            </View>
          )}

          {/* Divider */}
          <View style={styles.divider} />

          {/* Action buttons */}
          <View style={styles.actionsRow}>
            <Pressable
              onPress={onLike}
              style={[styles.actionButton, app.is_liked && styles.actionButtonActive]}
            >
              <Ionicons
                name={app.is_liked ? 'heart' : 'heart-outline'}
                size={20}
                color={app.is_liked ? '#EF4444' : Colors.textSecondary}
              />
              <Text style={[styles.actionText, app.is_liked && { color: '#EF4444' }]}>
                {app.likes_count || 0}
              </Text>
            </Pressable>

            <Pressable onPress={onComment} style={styles.actionButton}>
              <Ionicons name="chatbubble-outline" size={18} color={Colors.textSecondary} />
              <Text style={styles.actionText}>Comment</Text>
            </Pressable>

            <View style={styles.actionButton}>
              <Ionicons name="eye-outline" size={20} color={Colors.textSecondary} />
              <Text style={styles.actionText}>{app.views_count || 0}</Text>
            </View>

            <Pressable onPress={onPress} style={[styles.actionButton, styles.openAction]}>
              <Ionicons name="arrow-forward" size={18} color={Colors.primary} />
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

export default function FeedScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [apps, setApps] = useState<App[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchApps = useCallback(async () => {
    try {
      setError(null);
      const result = await getApps(1, 50);
      console.log('Fetched apps:', result);
      setApps(result.apps || []);
    } catch (err) {
      console.error('Failed to fetch apps:', err);
      setError(err instanceof Error ? err.message : 'Failed to load apps');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchApps();
  }, [fetchApps]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchApps();
  }, [fetchApps]);

  const handleLike = useCallback(async (app: App) => {
    if (!user) {
      if (Platform.OS === 'web') {
        window.alert('Please sign in to like apps');
      }
      return;
    }

    // Optimistic update
    setApps(prevApps => prevApps.map(a => {
      if (a.id === app.id) {
        return {
          ...a,
          is_liked: !a.is_liked,
          likes_count: a.is_liked ? a.likes_count - 1 : a.likes_count + 1,
        };
      }
      return a;
    }));

    try {
      if (app.is_liked) {
        await unlikeApp(app.id);
      } else {
        await likeApp(app.id);
      }
    } catch (err) {
      console.error('Failed to like/unlike:', err);
      // Revert on error
      setApps(prevApps => prevApps.map(a => {
        if (a.id === app.id) {
          return {
            ...a,
            is_liked: app.is_liked,
            likes_count: app.likes_count,
          };
        }
        return a;
      }));
    }
  }, [user]);

  const handleComment = useCallback((app: App) => {
    router.push(`/app/${app.id}`);
  }, [router]);

  const handlePress = useCallback((app: App) => {
    if (app.live_url) {
      if (Platform.OS === 'web') {
        window.open(app.live_url, '_blank');
      } else {
        router.push(`/app/${app.id}`);
      }
    }
  }, [router]);

  // Loading state
  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <LinearGradient
          colors={['#0A0A0A', '#000000'] as [string, string]}
          style={StyleSheet.absoluteFill}
        />
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading feed...</Text>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={styles.centerContainer}>
        <LinearGradient
          colors={['#0A0A0A', '#000000'] as [string, string]}
          style={StyleSheet.absoluteFill}
        />
        <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
        <Text style={styles.errorText}>{error}</Text>
        <Pressable onPress={fetchApps} style={styles.retryButton}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </Pressable>
      </View>
    );
  }

  // Empty state
  if (apps.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <LinearGradient
          colors={['#0A0A0A', '#000000'] as [string, string]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.emptyIconContainer}>
          <Ionicons name="apps-outline" size={48} color={Colors.primary} />
        </View>
        <Text style={styles.emptyTitle}>No apps yet</Text>
        <Text style={styles.emptySubtitle}>
          Be the first to create and publish an app!
        </Text>
        <Pressable onPress={() => router.push('/create')} style={styles.createButton}>
          <LinearGradient
            colors={[Colors.primary, '#9EFF00'] as [string, string]}
            style={styles.createButtonGradient}
          >
            <Ionicons name="add" size={20} color="#000" />
            <Text style={styles.createButtonText}>Create App</Text>
          </LinearGradient>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0A0A0A', '#000000', '#050510'] as [string, string, ...string[]]}
        style={StyleSheet.absoluteFill}
      />

      {/* Header for web */}
      {Platform.OS === 'web' && (
        <View style={styles.webHeader}>
          <View style={styles.webHeaderContent}>
            <Text style={styles.webHeaderTitle}>Discover Apps</Text>
            <Text style={styles.webHeaderSubtitle}>
              {apps.length} apps created by the community
            </Text>
          </View>
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          Platform.OS === 'web' && styles.scrollContentWeb,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
      >
        {/* Grid container for web */}
        <View style={[
          styles.feedGrid,
          Platform.OS === 'web' && styles.feedGridWeb,
        ]}>
          {apps.map((app) => (
            <FeedItem
              key={app.id}
              app={app}
              onLike={() => handleLike(app)}
              onPress={() => handlePress(app)}
              onComment={() => handleComment(app)}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  scrollContentWeb: {
    paddingVertical: 24,
    paddingHorizontal: 24,
    maxWidth: 1400,
    marginHorizontal: 'auto',
    width: '100%',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
    paddingHorizontal: 24,
  },

  // Web Header
  webHeader: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    paddingVertical: 24,
    paddingHorizontal: 24,
  },
  webHeaderContent: {
    maxWidth: 1400,
    marginHorizontal: 'auto',
    width: '100%',
  },
  webHeaderTitle: {
    color: Colors.text,
    fontSize: 28,
    fontFamily: Fonts.bold,
    marginBottom: 4,
  },
  webHeaderSubtitle: {
    color: Colors.textSecondary,
    fontSize: 14,
  },

  // Feed Grid
  feedGrid: {
    flex: 1,
  },
  feedGridWeb: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 24,
  },

  // Feed Item
  feedItem: {
    marginBottom: 20,
  },
  feedItemWeb: {
    width: 'calc(50% - 12px)' as any, // 2 columns with gap
    marginBottom: 0,
    // For smaller screens, single column
    ...(screenWidth <= 900 && {
      width: '100%',
    }),
  },
  feedCard: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    overflow: 'hidden',
    // Web-specific styles
    ...(Platform.OS === 'web' && {
      transition: 'all 0.2s ease',
    } as any),
  },
  feedCardHovered: {
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    transform: [{ scale: 1.01 }],
  },

  // Preview Container
  previewContainer: {
    width: '100%',
    aspectRatio: Platform.OS === 'web' ? 16/10 : 4/5,
    backgroundColor: '#0D0D0D',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    position: 'relative',
    overflow: 'hidden',
  },
  webviewLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0D0D0D',
  },
  noPreview: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Status Badge
  statusBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#000',
  },
  statusText: {
    color: '#000000',
    fontSize: 10,
    fontFamily: Fonts.bold,
    letterSpacing: 0.5,
  },

  // Metadata Section
  metadataSection: {
    padding: 16,
  },
  userInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  username: {
    color: Colors.text,
    fontSize: 13,
    fontFamily: Fonts.medium,
  },
  timeAgo: {
    color: Colors.textMuted,
    fontSize: 12,
  },
  title: {
    color: Colors.text,
    fontSize: 16,
    fontFamily: Fonts.semibold,
    marginBottom: 4,
    lineHeight: 22,
  },
  description: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginBottom: 8,
    lineHeight: 18,
  },
  promptContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.03)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginBottom: 12,
  },
  prompt: {
    color: Colors.textMuted,
    fontSize: 12,
    flex: 1,
    fontStyle: 'italic',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginBottom: 12,
  },

  // Action Buttons
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  actionButtonActive: {
    backgroundColor: 'rgba(239,68,68,0.1)',
  },
  actionText: {
    color: Colors.textSecondary,
    fontSize: 13,
  },
  openAction: {
    marginLeft: 'auto',
    backgroundColor: 'rgba(190,255,0,0.1)',
  },

  // Loading State
  loadingText: {
    color: Colors.textSecondary,
    marginTop: 16,
    fontSize: 14,
  },

  // Error State
  errorText: {
    color: Colors.error,
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  retryButtonText: {
    color: '#000',
    fontFamily: Fonts.semibold,
  },

  // Empty State
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: 'rgba(190,255,0,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    color: Colors.text,
    fontSize: 20,
    fontFamily: Fonts.bold,
  },
  emptySubtitle: {
    color: Colors.textSecondary,
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  createButton: {
    marginTop: 24,
    borderRadius: 8,
    overflow: 'hidden',
  },
  createButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    gap: 8,
  },
  createButtonText: {
    color: '#000',
    fontFamily: Fonts.bold,
    fontSize: 14,
  },
});
