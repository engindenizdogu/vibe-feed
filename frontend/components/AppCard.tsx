import { View, Text, Image, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, FontSize } from '../constants/theme';
import type { App } from '../lib/types';

interface AppCardProps {
  app: App;
  onPress: () => void;
  onLike: () => void;
}

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

export function AppCard({ app, onPress, onLike }: AppCardProps) {
  return (
    <Pressable style={styles.container} onPress={onPress}>
      <View style={styles.thumbnailContainer}>
        {app.thumbnail_url ? (
          <Image source={{ uri: app.thumbnail_url }} style={styles.thumbnail} />
        ) : (
          <View style={styles.placeholderThumbnail}>
            <Ionicons name="cube-outline" size={48} color={Colors.textMuted} />
          </View>
        )}
      </View>

      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.userInfo}>
            {app.user?.avatar_url ? (
              <Image source={{ uri: app.user.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={14} color={Colors.textSecondary} />
              </View>
            )}
            <Text style={styles.username}>@{app.user?.username || 'unknown'}</Text>
            <Text style={styles.timeAgo}>{formatTimeAgo(app.created_at)}</Text>
          </View>
        </View>

        <Text style={styles.title} numberOfLines={2}>
          {app.title || app.prompt}
        </Text>

        <View style={styles.actions}>
          <Pressable style={styles.actionButton} onPress={onLike}>
            <Ionicons
              name={app.is_liked ? 'heart' : 'heart-outline'}
              size={22}
              color={app.is_liked ? Colors.error : Colors.textSecondary}
            />
            <Text style={styles.actionText}>{app.likes_count}</Text>
          </Pressable>

          <View style={styles.actionButton}>
            <Ionicons name="eye-outline" size={22} color={Colors.textSecondary} />
            <Text style={styles.actionText}>{app.views_count}</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    marginHorizontal: Spacing.md,
    marginVertical: Spacing.sm,
    overflow: 'hidden',
  },
  thumbnailContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: Colors.surfaceLight,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholderThumbnail: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: Spacing.sm,
  },
  avatarPlaceholder: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  username: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    marginRight: Spacing.sm,
  },
  timeAgo: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
  },
  title: {
    color: Colors.text,
    fontSize: FontSize.md,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  actionText: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
  },
});
