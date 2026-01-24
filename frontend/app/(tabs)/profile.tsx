import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Colors, Spacing, BorderRadius, FontSize, Fonts } from '../../constants/theme';
import { useAuthStore } from '../../lib/stores';
import { getUserApps } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import type { App } from '../../lib/types';

type TabType = 'apps' | 'favorites';
type AuthMode = 'signin' | 'signup';

export default function ProfileScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [activeTab, setActiveTab] = useState<TabType>('apps');

  // Auth form state
  const [authMode, setAuthMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const { data: userApps = [] } = useQuery({
    queryKey: ['userApps', user?.id],
    queryFn: () => (user ? getUserApps(user.id) : Promise.resolve([])),
    enabled: !!user,
  });

  const handleLogin = async () => {
    if (!email || !password) {
      setAuthError('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    setAuthError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      // Clear form on success
      setEmail('');
      setPassword('');
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Sign in failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (!email || !password || !username) {
      setAuthError('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    setAuthError(null);

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username },
        },
      });
      if (error) throw error;
      setAuthError(null);
      // Show success message
      if (Platform.OS === 'web') {
        window.alert('Check your email to verify your account!');
      }
      // Clear form
      setEmail('');
      setPassword('');
      setUsername('');
      setAuthMode('signin');
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Sign up failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to sign out?')) {
        await supabase.auth.signOut();
      }
    } else {
      // For native, we'd use Alert.alert but keeping it simple
      await supabase.auth.signOut();
    }
  };

  const handleAppPress = (app: App) => {
    router.push(`/app/${app.id}`);
  };

  // Not logged in - show auth form
  if (!user) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.authContainer}>
        <Ionicons name="person-circle" size={80} color={Colors.textMuted} />
        <Text style={styles.authTitle}>
          {authMode === 'signin' ? 'Welcome Back' : 'Create Account'}
        </Text>
        <Text style={styles.authSubtitle}>
          {authMode === 'signin'
            ? 'Sign in to create and share AI-generated apps'
            : 'Join Slop Feed to start creating'}
        </Text>

        {authError && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{authError}</Text>
          </View>
        )}

        <View style={styles.formContainer}>
          {authMode === 'signup' && (
            <TextInput
              style={styles.input}
              placeholder="Username"
              placeholderTextColor={Colors.textMuted}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
            />
          )}

          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={Colors.textMuted}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={Colors.textMuted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <Pressable
            style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
            onPress={authMode === 'signin' ? handleLogin : handleSignUp}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={Colors.text} />
            ) : (
              <Text style={styles.primaryButtonText}>
                {authMode === 'signin' ? 'Sign In' : 'Create Account'}
              </Text>
            )}
          </Pressable>

          <Pressable
            style={styles.switchButton}
            onPress={() => {
              setAuthMode(authMode === 'signin' ? 'signup' : 'signin');
              setAuthError(null);
            }}
          >
            <Text style={styles.switchButtonText}>
              {authMode === 'signin'
                ? "Don't have an account? Sign Up"
                : 'Already have an account? Sign In'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  const publishedApps = userApps.filter((app) => app.is_published);
  const allApps = userApps; // Show all apps, not just published
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
              <Text style={styles.statValue}>{allApps.length}</Text>
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
              My Apps ({allApps.length})
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

        {/* App List */}
        <View style={styles.appsGrid}>
          {(activeTab === 'apps' ? allApps : likedApps).length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons
                name={activeTab === 'apps' ? 'cube-outline' : 'heart-outline'}
                size={48}
                color={Colors.textMuted}
              />
              <Text style={styles.emptyText}>
                {activeTab === 'apps'
                  ? "You haven't created any apps yet"
                  : "You haven't liked any apps yet"}
              </Text>
              {activeTab === 'apps' && (
                <Pressable
                  style={styles.createButton}
                  onPress={() => router.push('/create')}
                >
                  <Text style={styles.createButtonText}>Create your first app</Text>
                </Pressable>
              )}
            </View>
          ) : (
            <View style={styles.appList}>
              {(activeTab === 'apps' ? allApps : likedApps).map((app) => (
                <Pressable
                  key={app.id}
                  style={styles.appCard}
                  onPress={() => handleAppPress(app)}
                >
                  <View style={styles.appCardContent}>
                    <View style={styles.appIconContainer}>
                      <Ionicons name="cube" size={24} color={Colors.primary} />
                    </View>
                    <View style={styles.appInfo}>
                      <Text style={styles.appTitle} numberOfLines={1}>
                        {app.title || 'Untitled App'}
                      </Text>
                      <Text style={styles.appPrompt} numberOfLines={2}>
                        {app.prompt || app.description || 'No description'}
                      </Text>
                      <View style={styles.appMeta}>
                        <View style={[
                          styles.statusBadge,
                          app.is_published ? styles.statusPublished : styles.statusDraft
                        ]}>
                          <Text style={styles.statusText}>
                            {app.is_published ? 'Published' : 'Draft'}
                          </Text>
                        </View>
                        {app.is_published && (
                          <View style={styles.likesContainer}>
                            <Ionicons name="heart" size={12} color={Colors.secondary} />
                            <Text style={styles.likesText}>{app.likes_count}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
                  </View>
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
    fontFamily: Fonts.bold,
    marginTop: Spacing.lg,
  },
  authSubtitle: {
    color: Colors.textSecondary,
    fontSize: FontSize.md,
    textAlign: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  errorContainer: {
    backgroundColor: Colors.error + '20',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    width: '100%',
  },
  errorText: {
    color: Colors.error,
    fontSize: FontSize.sm,
    textAlign: 'center',
  },
  formContainer: {
    width: '100%',
    gap: Spacing.md,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    color: Colors.text,
    fontSize: FontSize.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  switchButton: {
    padding: Spacing.md,
    alignItems: 'center',
  },
  switchButtonText: {
    color: Colors.primary,
    fontSize: FontSize.sm,
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
    fontFamily: Fonts.semibold,
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
    fontFamily: Fonts.bold,
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
    fontFamily: Fonts.bold,
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
    fontFamily: Fonts.medium,
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
  createButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.md,
  },
  createButtonText: {
    color: Colors.background,
    fontSize: FontSize.sm,
    fontFamily: Fonts.semibold,
  },
  appList: {
    gap: Spacing.sm,
  },
  appCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  appCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.md,
  },
  appIconContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  appInfo: {
    flex: 1,
    gap: Spacing.xs,
  },
  appTitle: {
    color: Colors.text,
    fontSize: FontSize.md,
    fontFamily: Fonts.semibold,
  },
  appPrompt: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    lineHeight: 18,
  },
  appMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  statusPublished: {
    backgroundColor: Colors.success + '20',
  },
  statusDraft: {
    backgroundColor: Colors.warning + '20',
  },
  statusText: {
    fontSize: FontSize.xs,
    fontFamily: Fonts.medium,
    color: Colors.text,
  },
  likesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  likesText: {
    color: Colors.textSecondary,
    fontSize: FontSize.xs,
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
    fontFamily: Fonts.semibold,
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
