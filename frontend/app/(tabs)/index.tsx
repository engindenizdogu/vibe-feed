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

  // Accent colors for variety
  const accentColors = ['#BEFF00', '#FF006E', '#00F0FF', '#FFD600', '#FF6B00'];
  const colorIndex = app.id ? parseInt(app.id.slice(0, 8), 16) % accentColors.length : 0;
  const accentColor = accentColors[colorIndex];

  return (
    <View style={styles.feedItem}>
      {/* Main container with app preview */}
      <Pressable onPress={onPress}>
        <View
          style={[
            styles.previewContainer,
            { borderColor: accentColor + '40' }
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
                  borderRadius: 6,
                }}
                title={app.title || 'App Preview'}
              />
            ) : WebView ? (
              <>
                <WebView
                  source={{ uri: app.live_url }}
                  style={{ flex: 1, borderRadius: 6 }}
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
            )
          ) : (
            <View style={styles.noPreview}>
              <Ionicons name="cube-outline" size={56} color={accentColor} />
              <Text style={{ color: Colors.textSecondary, marginTop: 16 }}>No preview available</Text>
            </View>
          )}

          {/* Status badge */}
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: app.status === 'live' ? '#10B981' : accentColor }
            ]}
          >
            <Text
              style={{
                color: '#000000',
                fontSize: 11,
                fontFamily: Fonts.bold,
                letterSpacing: 1,
              }}
            >
              {app.status === 'live' ? 'LIVE' : app.status?.toUpperCase() || 'PREVIEW'}
            </Text>
          </View>
        </View>
      </Pressable>

      {/* Metadata section */}
      <View style={styles.metadataSection}>
        {/* User info */}
        <View style={styles.userInfoRow}>
          <View
            style={{
              backgroundColor: Colors.surfaceLight,
              width: 32,
              height: 32,
              borderRadius: 16,
              marginRight: 8,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="person" size={16} color={Colors.textSecondary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{ color: Colors.text, fontSize: 14, fontFamily: Fonts.semibold }}
            >
              {app.user?.username || 'Anonymous'}
            </Text>
            <Text
              style={{ color: Colors.textMuted, fontSize: 12 }}
            >
              {formatTimeAgo(app.created_at)}
            </Text>
          </View>
        </View>

        {/* Title & Description */}
        <Text
          numberOfLines={2}
          style={{ color: Colors.text, fontSize: 16, marginBottom: 4, fontFamily: Fonts.semibold }}
        >
          {app.title || 'Untitled App'}
        </Text>
        {app.description && (
          <Text
            numberOfLines={2}
            style={{ color: Colors.textSecondary, fontSize: 14, marginBottom: 8 }}
          >
            {app.description}
          </Text>
        )}

        {/* Prompt preview */}
        {app.prompt && (
          <Text
            numberOfLines={1}
            style={{ color: Colors.textMuted, fontSize: 12, marginBottom: 12, fontStyle: 'italic' }}
          >
            "{app.prompt}"
          </Text>
        )}

        {/* Action buttons */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <Pressable
            onPress={onLike}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
          >
            <Ionicons
              name={app.is_liked ? 'heart' : 'heart-outline'}
              size={24}
              color={app.is_liked ? '#EF4444' : Colors.textSecondary}
            />
            <Text style={{ color: Colors.textSecondary, fontSize: 14, marginLeft: 4 }}>
              {app.likes_count || 0}
            </Text>
          </Pressable>

          <Pressable
            onPress={onComment}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
          >
            <Ionicons name="chatbubble-outline" size={22} color={Colors.textSecondary} />
            <Text style={{ color: Colors.textSecondary, fontSize: 14, marginLeft: 4 }}>
              Comment
            </Text>
          </Pressable>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="eye-outline" size={24} color={Colors.textSecondary} />
            <Text style={{ color: Colors.textSecondary, fontSize: 14, marginLeft: 4 }}>
              {app.views_count || 0}
            </Text>
          </View>

          <Pressable
            onPress={onPress}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 'auto' }}
          >
            <Ionicons name="open-outline" size={20} color={Colors.textSecondary} />
            <Text style={{ color: Colors.textSecondary, fontSize: 14 }}>
              Open
            </Text>
          </Pressable>
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

    // Optimistic update - update UI immediately
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
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={{ color: Colors.textSecondary, marginTop: 16 }}>Loading feed...</Text>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
        <Text style={{ color: Colors.error, fontSize: 16, marginTop: 16, textAlign: 'center' }}>
          {error}
        </Text>
        <Pressable
          onPress={fetchApps}
          style={{
            backgroundColor: Colors.primary,
            paddingHorizontal: 24,
            paddingVertical: 12,
            borderRadius: 8,
            marginTop: 16,
          }}
        >
          <Text style={{ color: Colors.text, fontFamily: Fonts.semibold }}>Try Again</Text>
        </Pressable>
      </View>
    );
  }

  // Empty state
  if (apps.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="apps-outline" size={64} color={Colors.textMuted} />
        <Text style={{ color: Colors.text, fontSize: 20, fontFamily: Fonts.bold, marginTop: 16 }}>
          No apps yet
        </Text>
        <Text style={{ color: Colors.textSecondary, fontSize: 14, marginTop: 8, textAlign: 'center' }}>
          Be the first to create and publish an app!
        </Text>
        <Pressable
          onPress={() => router.push('/create')}
          style={{
            backgroundColor: Colors.primary,
            paddingHorizontal: 24,
            paddingVertical: 12,
            borderRadius: 8,
            marginTop: 24,
          }}
        >
          <Text style={{ color: Colors.text, fontFamily: Fonts.semibold }}>Create App</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
      >
        {apps.map((app) => (
          <FeedItem
            key={app.id}
            app={app}
            onLike={() => handleLike(app)}
            onPress={() => handlePress(app)}
            onComment={() => handleComment(app)}
          />
        ))}
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
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
    paddingHorizontal: 16,
  },
  feedItem: {
    marginBottom: 24,
  },
  previewContainer: {
    width: '100%',
    aspectRatio: 4/5,
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    borderWidth: 2,
    overflow: 'hidden',
    position: 'relative',
  },
  webviewLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
  },
  noPreview: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
  },
  metadataSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  userInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
});
