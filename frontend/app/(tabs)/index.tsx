import { useState, useCallback, useEffect } from 'react';
import {
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts } from '../../constants/theme';
import { getApps, likeApp, unlikeApp } from '../../lib/api';
import type { App } from '../../lib/types';
import { View, Text, ScrollView, Pressable } from '../../src/tw';
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
}

function FeedItem({ app, onLike, onPress }: FeedItemProps) {
  const [isWebViewLoading, setIsWebViewLoading] = useState(true);

  // Accent colors for variety
  const accentColors = ['#BEFF00', '#FF006E', '#00F0FF', '#FFD600', '#FF6B00'];
  const colorIndex = app.id ? parseInt(app.id.slice(0, 8), 16) % accentColors.length : 0;
  const accentColor = accentColors[colorIndex];

  return (
    <View className="mb-6">
      {/* Main container with app preview */}
      <Pressable onPress={onPress}>
        <View
          className="w-full relative overflow-hidden"
          style={{
            backgroundColor: '#1A1A1A',
            aspectRatio: 4/5,
            borderRadius: 8,
            borderWidth: 2,
            borderColor: accentColor + '40',
          }}
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
                  <View
                    className="absolute inset-0 items-center justify-center"
                    style={{ backgroundColor: '#1A1A1A' }}
                  >
                    <ActivityIndicator size="large" color={accentColor} />
                  </View>
                )}
              </>
            ) : (
              <View className="flex-1 items-center justify-center">
                <Text style={{ color: Colors.textSecondary }}>Preview not available</Text>
              </View>
            )
          ) : (
            <View className="flex-1 items-center justify-center">
              <Ionicons name="cube-outline" size={56} color={accentColor} />
              <Text style={{ color: Colors.textSecondary, marginTop: 16 }}>No preview available</Text>
            </View>
          )}

          {/* Status badge */}
          <View
            className="absolute top-3 left-3 px-3 py-1"
            style={{
              backgroundColor: app.status === 'live' ? '#10B981' : accentColor,
              borderRadius: 4,
            }}
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
      <View className="px-4 py-3">
        {/* User info */}
        <View className="flex-row items-center mb-2">
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
      const result = await getApps(1, 10);
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

    try {
      if (app.is_liked) {
        await unlikeApp(app.id);
      } else {
        await likeApp(app.id);
      }
      // Refresh the feed to get updated like status
      fetchApps();
    } catch (err) {
      console.error('Failed to like/unlike:', err);
    }
  }, [user, fetchApps]);

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
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: Colors.background }}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={{ color: Colors.textSecondary, marginTop: 16 }}>Loading feed...</Text>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View className="flex-1 items-center justify-center px-4" style={{ backgroundColor: Colors.background }}>
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
      <View className="flex-1 items-center justify-center px-4" style={{ backgroundColor: Colors.background }}>
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
    <View className="flex-1" style={{ backgroundColor: Colors.background }}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingVertical: 16 }}
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
          />
        ))}
      </ScrollView>
    </View>
  );
}
