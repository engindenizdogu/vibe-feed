import { Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/theme';
import type { App } from '../lib/types';
import { View, Text, Pressable } from '../src/tw';

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
  // Generate a consistent color from app id for placeholder
  const colors = ['#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#06B6D4'];
  const colorIndex = app.id ? parseInt(app.id.slice(0, 8), 16) % colors.length : 0;
  const placeholderColor = colors[colorIndex];

  return (
    <Pressable className="mb-0" onPress={onPress}>
      {/* Content area with color placeholder */}
      <View 
        className="w-full aspect-square"
        style={{ backgroundColor: placeholderColor }}
      />

      {/* Info section */}
      <View className="px-4 py-3">
        {/* User info */}
        <View className="flex-row items-center mb-2">
          {app.user?.avatar_url ? (
            <Image 
              source={{ uri: app.user.avatar_url }} 
              className="w-6 h-6 rounded-full mr-2"
              style={{ width: 24, height: 24, borderRadius: 12, marginRight: 8 }}
            />
          ) : (
            <View className="w-6 h-6 rounded-full mr-2 items-center justify-center" style={{ backgroundColor: Colors.surfaceLight, width: 24, height: 24, borderRadius: 12, marginRight: 8 }}>
              <Ionicons name="person" size={14} color={Colors.textSecondary} />
            </View>
          )}
          <Text className="text-sm" style={{ color: Colors.text, fontSize: 14, fontWeight: '600' }}>
            {app.user?.username || 'unknown'}
          </Text>
          <Text className="text-xs ml-2" style={{ color: Colors.textMuted, fontSize: 12, marginLeft: 8 }}>
            {formatTimeAgo(app.created_at)}
          </Text>
        </View>

        {/* Title */}
        <Text className="text-base mb-2" numberOfLines={2} style={{ color: Colors.text, fontSize: 16, marginBottom: 8 }}>
          {app.title || app.prompt}
        </Text>

        {/* Actions */}
        <View className="flex-row items-center gap-4">
          <Pressable className="flex-row items-center gap-1" onPress={onLike} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons
              name={app.is_liked ? 'heart' : 'heart-outline'}
              size={24}
              color={app.is_liked ? Colors.error : Colors.textSecondary}
            />
            <Text className="text-sm" style={{ color: Colors.textSecondary, fontSize: 14, marginLeft: 4 }}>
              {app.likes_count}
            </Text>
          </Pressable>

          <View className="flex-row items-center gap-1" style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="eye-outline" size={24} color={Colors.textSecondary} />
            <Text className="text-sm" style={{ color: Colors.textSecondary, fontSize: 14, marginLeft: 4 }}>
              {app.views_count}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}
