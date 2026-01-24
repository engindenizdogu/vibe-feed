import { useState, useEffect } from 'react';
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
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  FadeInDown,
  FadeInUp,
  ZoomIn,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Colors, Spacing, BorderRadius, FontSize, Fonts, Gradients, Shadows } from '../../constants/theme';
import { useAuthStore } from '../../lib/stores';
import { getUserApps } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { GlassCard } from '../../components/GlassCard';
import { GradientButton } from '../../components/GradientButton';
import type { App } from '../../lib/types';

const { width } = Dimensions.get('window');

type TabType = 'apps' | 'favorites';
type AuthMode = 'signin' | 'signup';

// Animated background for auth screen
function AuroraBackground() {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    translateX.value = withRepeat(
      withSequence(
        withTiming(50, { duration: 8000, easing: Easing.inOut(Easing.ease) }),
        withTiming(-50, { duration: 8000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    translateY.value = withRepeat(
      withSequence(
        withTiming(30, { duration: 6000, easing: Easing.inOut(Easing.ease) }),
        withTiming(-30, { duration: 6000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    scale.value = withRepeat(
      withSequence(
        withTiming(1.2, { duration: 10000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 10000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <Animated.View style={[styles.auroraContainer, animatedStyle]}>
      <LinearGradient
        colors={[Colors.secondary + '40', Colors.primary + '30', Colors.accent + '40']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.auroraGradient}
      />
    </Animated.View>
  );
}

// Animated avatar ring
function AvatarRing({ children }: { children: React.ReactNode }) {
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 8000, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <View style={styles.avatarRingContainer}>
      <Animated.View style={[styles.avatarRing, animatedStyle]}>
        <LinearGradient
          colors={[...Gradients.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.avatarRingGradient}
        />
      </Animated.View>
      <View style={styles.avatarInner}>{children}</View>
    </View>
  );
}

// Stat card component
function StatCard({ value, label, icon, delay = 0 }: { value: number; label: string; icon: keyof typeof Ionicons.glyphMap; delay?: number }) {
  return (
    <Animated.View entering={FadeInUp.delay(delay).duration(500)} style={styles.statCardWrapper}>
      <GlassCard style={styles.statCard}>
        <View style={styles.statCardContent}>
          <View style={styles.statIconWrapper}>
            <Ionicons name={icon} size={20} color={Colors.primary} />
          </View>
          <Text style={styles.statValue}>{value}</Text>
          <Text style={styles.statLabel}>{label}</Text>
        </View>
      </GlassCard>
    </Animated.View>
  );
}

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
  const [inputFocused, setInputFocused] = useState<string | null>(null);

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
      if (Platform.OS === 'web') {
        window.alert('Check your email to verify your account!');
      }
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
      await supabase.auth.signOut();
    }
  };

  const handleAppPress = (app: App) => {
    router.push(`/app/${app.id}`);
  };

  // Not logged in - show auth form
  if (!user) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[...Gradients.dark]}
          style={StyleSheet.absoluteFill}
        />
        <AuroraBackground />

        <ScrollView
          style={styles.authScrollView}
          contentContainerStyle={styles.authContainer}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View entering={ZoomIn.duration(600)} style={styles.authIconWrapper}>
            <AvatarRing>
              <View style={styles.authIconInner}>
                <Ionicons name="person" size={40} color={Colors.textSecondary} />
              </View>
            </AvatarRing>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(200).duration(600)}>
            <Text style={styles.authTitle}>
              {authMode === 'signin' ? 'Welcome Back' : 'Create Account'}
            </Text>
            <Text style={styles.authSubtitle}>
              {authMode === 'signin'
                ? 'Sign in to create and share AI-generated apps'
                : 'Join Slop Feed to start creating'}
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(400).duration(600)} style={styles.authFormWrapper}>
            <GlassCard style={styles.authFormCard}>
              <View style={styles.authFormInner}>
                {authError && (
                  <View style={styles.errorContainer}>
                    <Ionicons name="alert-circle" size={16} color={Colors.error} />
                    <Text style={styles.errorText}>{authError}</Text>
                  </View>
                )}

                {authMode === 'signup' && (
                  <View style={[styles.inputWrapper, inputFocused === 'username' && styles.inputWrapperFocused]}>
                    <Ionicons name="person-outline" size={20} color={inputFocused === 'username' ? Colors.primary : Colors.textMuted} />
                    <TextInput
                      style={styles.input}
                      placeholder="Username"
                      placeholderTextColor={Colors.textMuted}
                      value={username}
                      onChangeText={setUsername}
                      autoCapitalize="none"
                      autoCorrect={false}
                      onFocus={() => setInputFocused('username')}
                      onBlur={() => setInputFocused(null)}
                    />
                  </View>
                )}

                <View style={[styles.inputWrapper, inputFocused === 'email' && styles.inputWrapperFocused]}>
                  <Ionicons name="mail-outline" size={20} color={inputFocused === 'email' ? Colors.primary : Colors.textMuted} />
                  <TextInput
                    style={styles.input}
                    placeholder="Email"
                    placeholderTextColor={Colors.textMuted}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    onFocus={() => setInputFocused('email')}
                    onBlur={() => setInputFocused(null)}
                  />
                </View>

                <View style={[styles.inputWrapper, inputFocused === 'password' && styles.inputWrapperFocused]}>
                  <Ionicons name="lock-closed-outline" size={20} color={inputFocused === 'password' ? Colors.primary : Colors.textMuted} />
                  <TextInput
                    style={styles.input}
                    placeholder="Password"
                    placeholderTextColor={Colors.textMuted}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    onFocus={() => setInputFocused('password')}
                    onBlur={() => setInputFocused(null)}
                  />
                </View>

                <GradientButton
                  onPress={authMode === 'signin' ? handleLogin : handleSignUp}
                  title={authMode === 'signin' ? 'Sign In' : 'Create Account'}
                  icon={authMode === 'signin' ? 'log-in-outline' : 'person-add-outline'}
                  gradient={Gradients.primary}
                  disabled={isLoading}
                  size="large"
                  style={styles.authButton}
                />

                <Pressable
                  style={styles.switchButton}
                  onPress={() => {
                    setAuthMode(authMode === 'signin' ? 'signup' : 'signin');
                    setAuthError(null);
                  }}
                >
                  <Text style={styles.switchButtonText}>
                    {authMode === 'signin'
                      ? "Don't have an account? "
                      : 'Already have an account? '}
                    <Text style={styles.switchButtonHighlight}>
                      {authMode === 'signin' ? 'Sign Up' : 'Sign In'}
                    </Text>
                  </Text>
                </Pressable>
              </View>
            </GlassCard>
          </Animated.View>
        </ScrollView>
      </View>
    );
  }

  const publishedApps = userApps.filter((app) => app.is_published);
  const likedApps: App[] = [];
  const totalLikes = publishedApps.reduce((sum, app) => sum + app.likes_count, 0);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[...Gradients.dark]}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView style={styles.scrollView}>
        {/* Profile Header */}
        <View style={styles.headerSection}>
          <LinearGradient
            colors={[Colors.primary + '20', 'transparent']}
            style={styles.headerGradient}
          />

          <Animated.View entering={ZoomIn.duration(600)} style={styles.avatarSection}>
            <AvatarRing>
              {user.avatar_url ? (
                <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="person" size={40} color={Colors.textSecondary} />
                </View>
              )}
            </AvatarRing>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(200).duration(500)}>
            <Text style={styles.username}>@{user.username}</Text>
            <Text style={styles.joinDate}>
              Joined {new Date(user.created_at).toLocaleDateString()}
            </Text>
          </Animated.View>

          {/* Stats */}
          <View style={styles.statsRow}>
            <StatCard value={publishedApps.length} label="Apps" icon="cube" delay={300} />
            <StatCard value={totalLikes} label="Likes" icon="heart" delay={400} />
          </View>
        </View>

        {/* Tabs */}
        <Animated.View entering={FadeInUp.delay(500).duration(500)}>
          <GlassCard style={styles.tabsCard}>
            <View style={styles.tabs}>
              <Pressable
                style={[styles.tab, activeTab === 'apps' && styles.activeTab]}
                onPress={() => setActiveTab('apps')}
              >
                <Ionicons
                  name="cube"
                  size={18}
                  color={activeTab === 'apps' ? Colors.primary : Colors.textMuted}
                />
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
                <Ionicons
                  name="heart"
                  size={18}
                  color={activeTab === 'favorites' ? Colors.primary : Colors.textMuted}
                />
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
          </GlassCard>
        </Animated.View>

        {/* App Grid */}
        <View style={styles.appsGrid}>
          {(activeTab === 'apps' ? publishedApps : likedApps).length === 0 ? (
            <GlassCard style={styles.emptyStateCard}>
              <View style={styles.emptyState}>
                <View style={styles.emptyIconWrapper}>
                  <Ionicons
                    name={activeTab === 'apps' ? 'cube-outline' : 'heart-outline'}
                    size={48}
                    color={Colors.textMuted}
                  />
                </View>
                <Text style={styles.emptyText}>
                  {activeTab === 'apps'
                    ? "You haven't published any apps yet"
                    : "You haven't liked any apps yet"}
                </Text>
                {activeTab === 'apps' && (
                  <GradientButton
                    onPress={() => router.push('/create')}
                    title="Create your first app"
                    icon="add"
                    gradient={Gradients.primary}
                    size="medium"
                    style={styles.createButton}
                  />
                )}
              </View>
            </GlassCard>
          ) : (
            <View style={styles.grid}>
              {(activeTab === 'apps' ? publishedApps : likedApps).map((app, index) => (
                <Animated.View
                  key={app.id}
                  entering={FadeInUp.delay(index * 100).duration(400)}
                >
                  <Pressable
                    style={styles.gridItem}
                    onPress={() => handleAppPress(app)}
                  >
                    <GlassCard style={styles.gridItemCard}>
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
                    </GlassCard>
                  </Pressable>
                </Animated.View>
              ))}
            </View>
          )}
        </View>

        {/* Settings */}
        <Animated.View entering={FadeInUp.delay(600).duration(500)}>
          <GlassCard style={styles.settingsCard}>
            <View style={styles.settingsSection}>
              <Text style={styles.sectionTitle}>Settings</Text>

              <Pressable style={styles.settingsRow}>
                <View style={styles.settingsIconWrapper}>
                  <Ionicons name="notifications-outline" size={20} color={Colors.text} />
                </View>
                <Text style={styles.settingsText}>Notifications</Text>
                <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
              </Pressable>

              <Pressable style={styles.settingsRow}>
                <View style={styles.settingsIconWrapper}>
                  <Ionicons name="shield-outline" size={20} color={Colors.text} />
                </View>
                <Text style={styles.settingsText}>Privacy</Text>
                <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
              </Pressable>

              <Pressable style={styles.settingsRow}>
                <View style={styles.settingsIconWrapper}>
                  <Ionicons name="document-text-outline" size={20} color={Colors.text} />
                </View>
                <Text style={styles.settingsText}>Terms of Service</Text>
                <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
              </Pressable>

              <Pressable style={[styles.settingsRow, styles.logoutRow]} onPress={handleLogout}>
                <View style={[styles.settingsIconWrapper, styles.logoutIconWrapper]}>
                  <Ionicons name="log-out-outline" size={20} color={Colors.error} />
                </View>
                <Text style={[styles.settingsText, styles.logoutText]}>Sign Out</Text>
              </Pressable>
            </View>
          </GlassCard>
        </Animated.View>

        <View style={styles.bottomSpacer} />
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

  // Auth styles
  authScrollView: {
    flex: 1,
  },
  authContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
    paddingTop: Platform.OS === 'ios' ? 80 : 60,
  },
  auroraContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  auroraGradient: {
    width: width * 2,
    height: width * 2,
    borderRadius: width,
    position: 'absolute',
    top: -width / 2,
    left: -width / 2,
  },
  authIconWrapper: {
    marginBottom: Spacing.xl,
  },
  authIconInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  authTitle: {
    color: Colors.text,
    fontSize: FontSize.xxl,
    fontFamily: Fonts.bold,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  authSubtitle: {
    color: Colors.textSecondary,
    fontSize: FontSize.md,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  },
  authFormWrapper: {
    width: '100%',
    maxWidth: 400,
  },
  authFormCard: {
    padding: 0,
  },
  authFormInner: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.error + '20',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  errorText: {
    color: Colors.error,
    fontSize: FontSize.sm,
    flex: 1,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  inputWrapperFocused: {
    borderColor: Colors.primary,
    ...Shadows.glow,
  },
  input: {
    flex: 1,
    color: Colors.text,
    fontSize: FontSize.md,
    paddingVertical: Spacing.md,
    fontFamily: Fonts.regular,
  },
  authButton: {
    marginTop: Spacing.sm,
  },
  switchButton: {
    padding: Spacing.md,
    alignItems: 'center',
  },
  switchButtonText: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
  },
  switchButtonHighlight: {
    color: Colors.primary,
    fontFamily: Fonts.semibold,
  },

  // Profile styles
  headerSection: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    paddingTop: Platform.OS === 'ios' ? Spacing.xxl + 20 : Spacing.xl,
  },
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 200,
  },
  avatarSection: {
    marginBottom: Spacing.md,
  },
  avatarRingContainer: {
    width: 110,
    height: 110,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarRing: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    overflow: 'hidden',
  },
  avatarRingGradient: {
    width: '100%',
    height: '100%',
  },
  avatarInner: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
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
    textAlign: 'center',
  },
  joinDate: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: Spacing.lg,
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  statCardWrapper: {
    flex: 1,
  },
  statCard: {
    padding: 0,
  },
  statCardContent: {
    alignItems: 'center',
    padding: Spacing.md,
  },
  statIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
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

  // Tabs
  tabsCard: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    padding: 0,
  },
  tabs: {
    flexDirection: 'row',
    padding: Spacing.xs,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  activeTab: {
    backgroundColor: Colors.primary + '20',
  },
  tabText: {
    color: Colors.textMuted,
    fontSize: FontSize.md,
    fontFamily: Fonts.medium,
  },
  activeTabText: {
    color: Colors.primary,
  },

  // Apps grid
  appsGrid: {
    padding: Spacing.md,
  },
  emptyStateCard: {
    padding: 0,
  },
  emptyState: {
    alignItems: 'center',
    padding: Spacing.xxl,
  },
  emptyIconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: FontSize.md,
    marginBottom: Spacing.lg,
    textAlign: 'center',
  },
  createButton: {
    minWidth: 200,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  gridItem: {
    width: (width - Spacing.md * 2 - Spacing.sm * 2) / 3,
    aspectRatio: 1,
  },
  gridItemCard: {
    flex: 1,
    padding: 0,
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

  // Settings
  settingsCard: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    padding: 0,
  },
  settingsSection: {
    padding: Spacing.md,
  },
  sectionTitle: {
    color: Colors.textSecondary,
    fontSize: FontSize.xs,
    fontFamily: Fonts.semibold,
    marginBottom: Spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  settingsIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsText: {
    color: Colors.text,
    fontSize: FontSize.md,
    flex: 1,
    fontFamily: Fonts.regular,
  },
  logoutRow: {
    marginTop: Spacing.md,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.glassBorder,
  },
  logoutIconWrapper: {
    backgroundColor: Colors.error + '20',
  },
  logoutText: {
    color: Colors.error,
  },
  bottomSpacer: {
    height: Spacing.xxl,
  },
});
