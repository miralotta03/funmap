import { useState, useCallback } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  View,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { supabase } from '@/lib/supabase';

const { width } = Dimensions.get('window');

type Pin = {
  id: string;
  title: string;
  description: string;
  location_name: string;
  rating: number;
  created_at: string;
  user_id: string;
  profiles: {
    username: string;
    avatar_url: string | null;
  };
};

function timeAgo(dateString: string) {
  const now = new Date();
  const date = new Date(dateString);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
}

function PinCard({ pin }: { pin: Pin }) {
  return (
    <View style={styles.card}>
      {/* Header: avatar + username + date */}
      <View style={styles.cardHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {pin.profiles?.username?.[0]?.toUpperCase() ?? '?'}
          </Text>
        </View>
        <View style={styles.cardHeaderText}>
          <Text style={styles.username}>@{pin.profiles?.username ?? 'unknown'}</Text>
          <Text style={styles.date}>{timeAgo(pin.created_at)}</Text>
        </View>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Content */}
      <View style={styles.cardContent}>
        <Text style={styles.pinTitle}>{pin.title}</Text>

        {pin.location_name ? (
          <Text style={styles.pinLocation}>📍 {pin.location_name}</Text>
        ) : null}

        {pin.rating ? (
          <Text style={styles.pinRating}>
            {'★'.repeat(pin.rating)}{'☆'.repeat(5 - pin.rating)}
          </Text>
        ) : null}

        {pin.description ? (
          <Text style={styles.pinDescription}>{pin.description}</Text>
        ) : null}
      </View>

      {/* View on map button */}
      <TouchableOpacity
        style={styles.mapButton}
        onPress={() => router.push('/(tabs)')}>
        <Text style={styles.mapButtonText}>🗺️ View on map</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function FeedScreen() {
  const [pins, setPins] = useState<Pin[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPins = async () => {
    const { data, error } = await supabase
      .from('pins')
      .select('*, profiles(username, avatar_url)')
      .eq('is_public', true)
      .order('created_at', { ascending: false });

    if (!error && data) setPins(data as Pin[]);
  };

  useFocusEffect(
    useCallback(() => {
      fetchPins();
    }, [])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchPins();
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>Feed</Text>
      </View>

      <FlatList
        data={pins}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <PinCard pin={item} />}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#2D6A4F"
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🌍</Text>
            <Text style={styles.emptyTitle}>No pins yet</Text>
            <Text style={styles.emptySubtitle}>
              Add your first pin on the map and it will show up here!
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  topBar: {
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  topBarTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#11181C',
  },
  list: {
    padding: 16,
    gap: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2D6A4F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cardHeaderText: {
    gap: 2,
  },
  username: {
    fontSize: 14,
    fontWeight: '600',
    color: '#11181C',
  },
  date: {
    fontSize: 12,
    color: '#687076',
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginHorizontal: 16,
  },
  cardContent: {
    padding: 16,
    gap: 6,
  },
  pinTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#11181C',
  },
  pinLocation: {
    fontSize: 13,
    color: '#687076',
  },
  pinRating: {
    fontSize: 16,
    color: '#FFB800',
  },
  pinDescription: {
    fontSize: 15,
    color: '#444',
    lineHeight: 22,
    marginTop: 4,
  },
  mapButton: {
    margin: 16,
    marginTop: 8,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F0F7F4',
    alignItems: 'center',
  },
  mapButtonText: {
    color: '#2D6A4F',
    fontSize: 14,
    fontWeight: '600',
  },
  empty: {
    alignItems: 'center',
    paddingTop: 80,
    gap: 12,
  },
  emptyEmoji: {
    fontSize: 48,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#11181C',
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#687076',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 32,
  },
});