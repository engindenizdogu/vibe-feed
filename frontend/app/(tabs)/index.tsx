import { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppCard } from '../../components/AppCard';
import { getApps, likeApp, unlikeApp } from '../../lib/api';
import { Colors, Spacing, FontSize } from '../../constants/theme';
import type { App } from '../../lib/types';

export default function FeedScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['apps'],
    queryFn: ({ pageParam = 1 }) => getApps(pageParam),
    getNextPageParam: (lastPage, allPages) =>
      lastPage.hasMore ? allPages.length + 1 : undefined,
    initialPageParam: 1,
  });

  const likeMutation = useMutation({
    mutationFn: ({ appId, isLiked }: { appId: string; isLiked: boolean }) =>
      isLiked ? unlikeApp(appId) : likeApp(appId),
    onMutate: async ({ appId, isLiked }) => {
      await queryClient.cancelQueries({ queryKey: ['apps'] });

      const previousData = queryClient.getQueryData(['apps']);

      queryClient.setQueryData(['apps'], (old: any) => ({
        ...old,
        pages: old.pages.map((page: any) => ({
          ...page,
          apps: page.apps.map((app: App) =>
            app.id === appId
              ? {
                  ...app,
                  is_liked: !isLiked,
                  likes_count: app.likes_count + (isLiked ? -1 : 1),
                }
              : app
          ),
        })),
      }));

      return { previousData };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['apps'], context.previousData);
      }
    },
  });

  const apps = data?.pages.flatMap((page) => page.apps) ?? [];

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleAppPress = (app: App) => {
    router.push(`/app/${app.id}`);
  };

  const handleLike = (app: App) => {
    likeMutation.mutate({ appId: app.id, isLiked: app.is_liked ?? false });
  };

  const loadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Failed to load apps</Text>
        <Text style={styles.errorSubtext}>Pull down to retry</Text>
      </View>
    );
  }

  if (apps.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyText}>No apps yet</Text>
        <Text style={styles.emptySubtext}>Be the first to create one!</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={apps}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <AppCard
            app={item}
            onPress={() => handleAppPress(item)}
            onLike={() => handleLike(item)}
          />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          isFetchingNextPage ? (
            <ActivityIndicator
              style={styles.loadingFooter}
              color={Colors.primary}
            />
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingVertical: Spacing.sm,
  },
  loadingFooter: {
    paddingVertical: Spacing.lg,
  },
  errorText: {
    color: Colors.error,
    fontSize: FontSize.lg,
    fontWeight: '600',
  },
  errorSubtext: {
    color: Colors.textSecondary,
    fontSize: FontSize.md,
    marginTop: Spacing.sm,
  },
  emptyText: {
    color: Colors.text,
    fontSize: FontSize.xl,
    fontWeight: '600',
  },
  emptySubtext: {
    color: Colors.textSecondary,
    fontSize: FontSize.md,
    marginTop: Spacing.sm,
  },
});
