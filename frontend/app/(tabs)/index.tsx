import { useState, useCallback } from 'react';
import {
  RefreshControl,
  ActivityIndicator,
  FlatList as RNFlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppCard } from '../../components/AppCard';
import { FeedContainer } from '../../components/FeedContainer';
import { getApps, likeApp, unlikeApp } from '../../lib/api';
import { Colors } from '../../constants/theme';
import type { App } from '../../lib/types';
import { View, Text, ScrollView } from '../../src/tw';

export default function FeedScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  // Create 3 placeholder items for now
  const placeholderData = [0, 1, 2];

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // Simulate refresh delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  }, []);

  return (
    <View className="flex-1" style={{ backgroundColor: Colors.background }}>
      <ScrollView
        className="flex-1"
        contentContainerClassName="py-4"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
      >
        {placeholderData.map((index) => (
          <FeedContainer key={index} index={index} />
        ))}
      </ScrollView>
    </View>
  );
}
