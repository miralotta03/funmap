// app/user-profile.tsx — Mock version (no Supabase needed)
// Place this at app/user-profile.tsx (outside the tabs folder, same as edit-pin.tsx)

import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
    Alert,
    Dimensions,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const { width } = Dimensions.get('window');
const GRID_PADDING = 16;
const GRID_GAP = 4;
const GRID_SIZE = (width - GRID_PADDING * 2 - GRID_GAP * 2) / 3;

const MOCK_USERS: Record<string, {
  id: string;
  username: string;
  bio: string;
  pin_count: number;
  follower_count: number;
  following_count: number;
  is_following: boolean;
  pins: { id: string; title: string; location_name: string; rating: number }[];
}> = {
  '1': {
    id: '1',
    username: 'sofia_wanders',
    bio: 'Finding beauty in every corner of the world 🌸',
    pin_count: 42,
    follower_count: 1204,
    following_count: 312,
    is_following: false,
    pins: [
      { id: 'p1', title: 'Cherry blossom park', location_name: 'Tokyo, Japan', rating: 5 },
      { id: 'p2', title: 'Cliffside café', location_name: 'Santorini, Greece', rating: 5 },
      { id: 'p3', title: 'Night market', location_name: 'Chiang Mai, Thailand', rating: 4 },
      { id: 'p4', title: 'Lavender fields', location_name: 'Provence, France', rating: 5 },
      { id: 'p5', title: 'Secret waterfall', location_name: 'Bali, Indonesia', rating: 4 },
      { id: 'p6', title: 'Rooftop sunset', location_name: 'Marrakech, Morocco', rating: 5 },
    ],
  },
  '2': {
    id: '2',
    username: 'marco_explores',
    bio: 'Food, travel and good vibes only 🍕✈️',
    pin_count: 87,
    follower_count: 3421,
    following_count: 540,
    is_following: true,
    pins: [
      { id: 'p7', title: 'Best pasta in Rome', location_name: 'Rome, Italy', rating: 5 },
      { id: 'p8', title: 'Hidden beach', location_name: 'Sardinia, Italy', rating: 5 },
      { id: 'p9', title: 'Mountain hut', location_name: 'Dolomites, Italy', rating: 4 },
      { id: 'p10', title: 'Truffle restaurant', location_name: 'Alba, Italy', rating: 5 },
    ],
  },
  '3': {
    id: '3',
    username: 'luna_travels',
    bio: 'Solo traveller. 34 countries and counting 🗺️',
    pin_count: 130,
    follower_count: 892,
    following_count: 201,
    is_following: false,
    pins: [
      { id: 'p11', title: 'Desert camp', location_name: 'Sahara, Morocco', rating: 5 },
      { id: 'p12', title: 'Ice cave', location_name: 'Iceland', rating: 5 },
      { id: 'p13', title: 'Floating market', location_name: 'Bangkok, Thailand', rating: 4 },
    ],
  },
};

// Fallback for users 4-8
const FALLBACK_USER = {
  id: '4',
  username: 'james_pins',
  bio: 'Hidden gems hunter 💎',
  pin_count: 21,
  follower_count: 310,
  following_count: 89,
  is_following: false,
  pins: [
    { id: 'px1', title: 'Secret alley café', location_name: 'Berlin, Germany', rating: 4 },
    { id: 'px2', title: 'Rooftop garden', location_name: 'London, UK', rating: 5 },
    { id: 'px3', title: 'Underground bar', location_name: 'Budapest, Hungary', rating: 4 },
  ],
};

type Pin = { id: string; title: string; location_name: string; rating: number };

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const initialUser = MOCK_USERS[id ?? ''] ?? { ...FALLBACK_USER, id: id ?? '4' };

  const [user, setUser] = useState(initialUser);

  const toggleFollow = () => {
    setUser((prev) => ({
      ...prev,
      is_following: !prev.is_following,
      follower_count: prev.is_following ? prev.follower_count - 1 : prev.follower_count + 1,
    }));
  };

  const getInitials = (username: string) => username.slice(0, 2).toUpperCase();

  const renderPin = ({ item }: { item: Pin }) => (
    <TouchableOpacity
      style={styles.gridItem}
      onPress={() => Alert.alert(item.title, item.location_name)}>
      <View style={styles.gridItemInner}>
        <Text style={styles.gridItemEmoji}>📍</Text>
        <Text style={styles.gridItemTitle} numberOfLines={2}>{item.title}</Text>
        {item.location_name ? (
          <Text style={styles.gridItemLocation} numberOfLines={1}>{item.location_name}</Text>
        ) : null}
        {item.rating ? (
          <Text style={styles.gridItemRating}>{'★'.repeat(item.rating)}{'☆'.repeat(5 - item.rating)}</Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={user.pins}
        keyExtractor={(item) => item.id}
        numColumns={3}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={styles.listContent}
        renderItem={renderPin}
        ListHeaderComponent={
          <View>
            {/* Back button */}
            <View style={styles.header}>
              <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                <Text style={styles.backBtnText}>← Back</Text>
              </TouchableOpacity>
            </View>

            {/* Avatar + stats */}
            <View style={styles.profileRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarInitials}>{getInitials(user.username)}</Text>
              </View>
              <View style={styles.stats}>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{user.pin_count}</Text>
                  <Text style={styles.statLabel}>Pins</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{user.follower_count.toLocaleString()}</Text>
                  <Text style={styles.statLabel}>Followers</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{user.following_count}</Text>
                  <Text style={styles.statLabel}>Following</Text>
                </View>
              </View>
            </View>

            {/* Username + bio */}
            <View style={styles.bioSection}>
              <Text style={styles.username}>@{user.username}</Text>
              {user.bio ? (
                <Text style={styles.bio}>{user.bio}</Text>
              ) : (
                <Text style={styles.bioEmpty}>No bio yet</Text>
              )}
            </View>

            {/* Follow button */}
            <TouchableOpacity
              style={[styles.followButton, user.is_following && styles.followingButton]}
              onPress={toggleFollow}>
              <Text style={[styles.followButtonText, user.is_following && styles.followingButtonText]}>
                {user.is_following ? 'Following' : 'Follow'}
              </Text>
            </TouchableOpacity>

            {/* Grid header */}
            <View style={styles.gridDivider}>
              <Text style={styles.gridDividerText}>⊞  Pins</Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>📍</Text>
            <Text style={styles.emptyText}>No pins yet</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  listContent: { paddingBottom: 40 },
  header: {
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 8,
  },
  backBtn: { alignSelf: 'flex-start' },
  backBtnText: { fontSize: 16, color: '#2D6A4F', fontWeight: '600' },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 24,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#D4F0E4',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#A8DFC9',
  },
  avatarInitials: { fontSize: 26, fontWeight: '700', color: '#2D6A4F' },
  stats: { flex: 1, flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { alignItems: 'center' },
  statNumber: { fontSize: 18, fontWeight: '700', color: '#11181C' },
  statLabel: { fontSize: 12, color: '#687076', marginTop: 2 },
  bioSection: { paddingHorizontal: 16, marginBottom: 14, gap: 4 },
  username: { fontSize: 16, fontWeight: '700', color: '#11181C' },
  bio: { fontSize: 14, color: '#11181C', lineHeight: 20 },
  bioEmpty: { fontSize: 14, color: '#aaa', fontStyle: 'italic' },
  followButton: {
    marginHorizontal: 16,
    marginBottom: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#2D6A4F',
    alignItems: 'center',
  },
  followButtonText: { fontSize: 15, fontWeight: '600', color: '#fff' },
  followingButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#2D6A4F',
  },
  followingButtonText: { color: '#2D6A4F' },
  gridDivider: {
    borderTopWidth: 1,
    borderColor: '#E0E0E0',
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 4,
  },
  gridDividerText: { fontSize: 13, color: '#687076', fontWeight: '600' },
  gridRow: {
    paddingHorizontal: 16,
    gap: 4,
    marginBottom: 4,
    justifyContent: 'center',
  },
  gridItem: { width: GRID_SIZE, height: GRID_SIZE, borderRadius: 12, overflow: 'hidden' },
  gridItemInner: {
    flex: 1,
    backgroundColor: '#F5FAF7',
    borderWidth: 1,
    borderColor: '#E0F0E8',
    borderRadius: 12,
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  gridItemEmoji: { fontSize: 20 },
  gridItemTitle: { fontSize: 11, fontWeight: '600', color: '#11181C', textAlign: 'center' },
  gridItemLocation: { fontSize: 10, color: '#687076', textAlign: 'center' },
  gridItemRating: { fontSize: 10, color: '#FFB800' },
  emptyContainer: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyEmoji: { fontSize: 48 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#11181C' },
});