import { useState, useCallback } from 'react';
import {
  RefreshControl,
  ActivityIndicator,
  FlatList as RNFlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppCard } from '../../components/AppCard';
import { getApps, likeApp, unlikeApp } from '../../lib/api';
import { Colors } from '../../constants/theme';
import type { App } from '../../lib/types';
import { View, Text } from '../../src/tw';

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
      <View className="flex-1 justify-center items-center" style={{ backgroundColor: Colors.background }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (isError) {
    return (
      <View className="flex-1 justify-center items-center" style={{ backgroundColor: Colors.background }}>
        <Text className="text-lg font-semibold" style={{ color: Colors.error, fontSize: 18 }}>
          Failed to load apps
        </Text>
        <Text className="text-base mt-2" style={{ color: Colors.textSecondary, fontSize: 16, marginTop: 8 }}>
          Pull down to retry
        </Text>
      </View>
    );
  }

  if (apps.length === 0) {
    return (
      <View className="flex-1 justify-center items-center" style={{ backgroundColor: Colors.background }}>
        <Text className="text-xl font-semibold" style={{ color: Colors.text, fontSize: 20 }}>
          No apps yet
        </Text>
        <Text className="text-base mt-2" style={{ color: Colors.textSecondary, fontSize: 16, marginTop: 8 }}>
          Be the first to create one!
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1" style={{ backgroundColor: Colors.background }}>
      <RNFlatList
        data={apps}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <AppCard
            app={item}
            onPress={() => handleAppPress(item)}
            onLike={() => handleLike(item)}
          />
        )}
        style={{ backgroundColor: Colors.background }}
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
            <View style={{ paddingVertical: 24 }}>
              <ActivityIndicator color={Colors.primary} />
            </View>
          ) : null
        }
      />
    </View>
  );
}
