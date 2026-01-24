import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  ScrollView,
  FlatList,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Colors, Spacing, BorderRadius, FontSize } from '../../constants/theme';
import { useAuthStore } from '../../lib/stores';
import { getUserApps } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import type { App } from '../../lib/types';

type TabType = 'apps' | 'favorites';

export default function ProfileScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [activeTab, setActiveTab] = useState<TabType>('apps');

  const { data: userApps = [] } = useQuery({
    queryKey: ['userApps', user?.id],
    queryFn: () => (user ? getUserApps(user.id) : Promise.resolve([])),
    enabled: !!user,
  });

  const handleLogin = async () => {
    // For now, just show a placeholder login flow
    Alert.prompt(
      'Sign In',
      'Enter your email:',
      async (email) => {
        if (!email) return;
        Alert.prompt(
          'Sign In',
          'Enter your password:',
          async (password) => {
            if (!password) return;
            try {
              const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
              });
              if (error) throw error;
            } catch (err) {
              Alert.alert('Error', err instanceof Error ? err.message : 'Sign in failed');
            }
          },
          'secure-text'
        );
      },
      'email-address'
    );
  };

  const handleSignUp = async () => {
    Alert.prompt(
      'Sign Up',
      'Enter your email:',
      async (email) => {
        if (!email) return;
        Alert.prompt(
          'Sign Up',
          'Create a password:',
          async (password) => {
            if (!password) return;
            Alert.prompt(
              'Sign Up',
              'Choose a username:',
              async (username) => {
                if (!username) return;
                try {
                  const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                      data: { username },
                    },
                  });
                  if (error) throw error;
                  Alert.alert('Success', 'Check your email to verify your account!');
                } catch (err) {
                  Alert.alert('Error', err instanceof Error ? err.message : 'Sign up failed');
                }
              },
              'plain-text'
            );
          },
          'secure-text'
        );
      },
      'email-address'
    );
  };

  const handleLogout = async () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
        },
      },
    ]);
  };

  const handleAppPress = (app: App) => {
    router.push(`/app/${app.id}`);
  };

  // Not logged in
  if (!user) {
    return (
      <View style={styles.container}>
        <View style={styles.authContainer}>
          <Ionicons name="person-circle" size={80} color={Colors.textMuted} />
          <Text style={styles.authTitle}>Welcome to Slop Feed</Text>
          <Text style={styles.authSubtitle}>
            Sign in to create and share AI-generated apps
          </Text>

          <Pressable style={styles.primaryButton} onPress={handleLogin}>
            <Text style={styles.primaryButtonText}>Sign In</Text>
          </Pressable>

          <Pressable style={styles.secondaryButton} onPress={handleSignUp}>
            <Text style={styles.secondaryButtonText}>Create Account</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const publishedApps = userApps.filter((app) => app.is_published);
  const likedApps: App[] = []; // TODO: Fetch from API

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Profile Header */}
        <View style={styles.header}>
          {user.avatar_url ? (
            <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={48} color={Colors.textSecondary} />
            </View>
          )}
          <Text style={styles.username}>@{user.username}</Text>
          <Text style={styles.joinDate}>
            Joined {new Date(user.created_at).toLocaleDateString()}
          </Text>

          {/* Stats */}
          <View style={styles.stats}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{publishedApps.length}</Text>
              <Text style={styles.statLabel}>Apps</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {publishedApps.reduce((sum, app) => sum + app.likes_count, 0)}
              </Text>
              <Text style={styles.statLabel}>Likes</Text>
            </View>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          <Pressable
            style={[styles.tab, activeTab === 'apps' && styles.activeTab]}
            onPress={() => setActiveTab('apps')}
          >
            <Text
              style={[styles.tabText, activeTab === 'apps' && styles.activeTabText]}
            >
              My Apps
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tab, activeTab === 'favorites' && styles.activeTab]}
            onPress={() => setActiveTab('favorites')}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'favorites' && styles.activeTabText,
              ]}
            >
              Favorites
            </Text>
          </Pressable>
        </View>

        {/* App Grid */}
        <View style={styles.appsGrid}>
          {(activeTab === 'apps' ? publishedApps : likedApps).length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons
                name={activeTab === 'apps' ? 'cube-outline' : 'heart-outline'}
                size={48}
                color={Colors.textMuted}
              />
              <Text style={styles.emptyText}>
                {activeTab === 'apps'
                  ? "You haven't published any apps yet"
                  : "You haven't liked any apps yet"}
              </Text>
            </View>
          ) : (
            <View style={styles.grid}>
              {(activeTab === 'apps' ? publishedApps : likedApps).map((app) => (
                <Pressable
                  key={app.id}
                  style={styles.gridItem}
                  onPress={() => handleAppPress(app)}
                >
                  {app.thumbnail_url ? (
                    <Image
                      source={{ uri: app.thumbnail_url }}
                      style={styles.gridThumbnail}
                    />
                  ) : (
                    <View style={styles.gridPlaceholder}>
                      <Ionicons
                        name="cube-outline"
                        size={24}
                        color={Colors.textMuted}
                      />
                    </View>
                  )}
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* Settings */}
        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>Settings</Text>

          <Pressable style={styles.settingsRow}>
            <Ionicons name="notifications-outline" size={24} color={Colors.text} />
            <Text style={styles.settingsText}>Notifications</Text>
            <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
          </Pressable>

          <Pressable style={styles.settingsRow}>
            <Ionicons name="shield-outline" size={24} color={Colors.text} />
            <Text style={styles.settingsText}>Privacy</Text>
            <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
          </Pressable>

          <Pressable style={styles.settingsRow}>
            <Ionicons name="document-text-outline" size={24} color={Colors.text} />
            <Text style={styles.settingsText}>Terms of Service</Text>
            <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
          </Pressable>

          <Pressable style={[styles.settingsRow, styles.logoutRow]} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={24} color={Colors.error} />
            <Text style={[styles.settingsText, styles.logoutText]}>Sign Out</Text>
          </Pressable>
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
  authContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  authTitle: {
    color: Colors.text,
    fontSize: FontSize.xxl,
    fontWeight: '700',
    marginTop: Spacing.lg,
  },
  authSubtitle: {
    color: Colors.textSecondary,
    fontSize: FontSize.md,
    textAlign: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xxl,
    width: '100%',
    marginBottom: Spacing.md,
  },
  primaryButtonText: {
    color: Colors.text,
    fontSize: FontSize.lg,
    fontWeight: '600',
    textAlign: 'center',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xxl,
    width: '100%',
  },
  secondaryButtonText: {
    color: Colors.textSecondary,
    fontSize: FontSize.lg,
    fontWeight: '600',
    textAlign: 'center',
  },
  header: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  username: {
    color: Colors.text,
    fontSize: FontSize.xl,
    fontWeight: '700',
    marginTop: Spacing.md,
  },
  joinDate: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    marginTop: Spacing.xs,
  },
  stats: {
    flexDirection: 'row',
    marginTop: Spacing.lg,
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  statValue: {
    color: Colors.text,
    fontSize: FontSize.xl,
    fontWeight: '700',
  },
  statLabel: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
  },
  statDivider: {
    width: 1,
    height: '100%',
    backgroundColor: Colors.border,
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: Colors.primary,
  },
  tabText: {
    color: Colors.textSecondary,
    fontSize: FontSize.md,
    fontWeight: '500',
  },
  activeTabText: {
    color: Colors.text,
  },
  appsGrid: {
    padding: Spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: FontSize.md,
    marginTop: Spacing.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  gridItem: {
    width: '32.5%',
    aspectRatio: 1,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  gridThumbnail: {
    width: '100%',
    height: '100%',
  },
  gridPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsSection: {
    padding: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    marginTop: Spacing.md,
  },
  sectionTitle: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    fontWeight: '600',
    marginBottom: Spacing.md,
    textTransform: 'uppercase',
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  settingsText: {
    color: Colors.text,
    fontSize: FontSize.md,
    flex: 1,
  },
  logoutRow: {
    marginTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.lg,
  },
  logoutText: {
    color: Colors.error,
  },
});
