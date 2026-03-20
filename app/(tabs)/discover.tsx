// app/(tabs)/discover.tsx — Featured explorers only

import { router } from 'expo-router';
import { useState } from 'react';
import {
    FlatList,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

const MOCK_USERS = [
  { id: '1', username: 'sofia_wanders', bio: 'Finding beauty in every corner of the world 🌸', pin_count: 42, follower_count: 1204, is_following: false },
  { id: '2', username: 'marco_explores', bio: 'Food, travel and good vibes only 🍕✈️', pin_count: 87, follower_count: 3421, is_following: true },
  { id: '3', username: 'luna_travels', bio: 'Solo traveller. 34 countries and counting 🗺️', pin_count: 130, follower_count: 892, is_following: false },
  { id: '4', username: 'kai_adventures', bio: 'Surf, sun and sandy roads 🏄', pin_count: 33, follower_count: 528, is_following: false },
  { id: '5', username: 'priya_discovers', bio: 'Architecture and street food fanatic 🏛️', pin_count: 74, follower_count: 1893, is_following: false },
  { id: '6', username: 'elena_roams', bio: 'Nature lover. Hiker. Dreamer 🏔️', pin_count: 56, follower_count: 741, is_following: true },
];

type User = typeof MOCK_USERS[0];

export default function DiscoverScreen() {
  const [users, setUsers] = useState(MOCK_USERS);
  const [search, setSearch] = useState('');

  const filtered = search.trim()
    ? users.filter((u) => u.username.toLowerCase().includes(search.toLowerCase()))
    : users;

  const toggleFollow = (id: string) => {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === id
          ? { ...u, is_following: !u.is_following, follower_count: u.is_following ? u.follower_count - 1 : u.follower_count + 1 }
          : u
      )
    );
  };

  const renderUser = ({ item }: { item: User }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/user-profile?id=${item.id}`)}>
      <View style={styles.cardTop}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.username.slice(0, 2).toUpperCase()}</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.username}>@{item.username}</Text>
          <Text style={styles.bio} numberOfLines={2}>{item.bio}</Text>
        </View>
      </View>
      <View style={styles.cardBottom}>
        <View style={styles.stats}>
          <Text style={styles.stat}><Text style={styles.statNum}>{item.follower_count.toLocaleString()}</Text> followers</Text>
          <Text style={styles.statDot}>·</Text>
          <Text style={styles.stat}><Text style={styles.statNum}>{item.pin_count}</Text> pins</Text>
        </View>
        <TouchableOpacity
          style={[styles.followBtn, item.is_following && styles.followingBtn]}
          onPress={() => toggleFollow(item.id)}>
          <Text style={[styles.followBtnText, item.is_following && styles.followingBtnText]}>
            {item.is_following ? 'Following' : 'Follow'}
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderUser}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Discover</Text>
            </View>
            <View style={styles.searchContainer}>
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput
                style={styles.searchInput}
                placeholder="Search explorers..."
                value={search}
                onChangeText={setSearch}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <Text style={styles.clearBtn}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
            <Text style={styles.sectionTitle}>
              {search.trim() ? `Results for "${search}"` : 'Featured explorers'}
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>🔍</Text>
            <Text style={styles.emptyText}>No users found</Text>
            <Text style={styles.emptySubtext}>Try a different username</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  listContent: { paddingBottom: 40 },
  header: { paddingHorizontal: 16, paddingTop: 60, paddingBottom: 12 },
  headerTitle: { fontSize: 28, fontWeight: '700', color: '#11181C' },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 14,
    marginHorizontal: 16,
    marginBottom: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  searchIcon: { fontSize: 16 },
  searchInput: { flex: 1, fontSize: 16, color: '#11181C' },
  clearBtn: { fontSize: 14, color: '#687076', paddingHorizontal: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#11181C', paddingHorizontal: 16, marginBottom: 12 },
  card: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#F5FAF7',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E0F0E8',
    padding: 16,
    gap: 12,
  },
  cardTop: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#D4F0E4',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#A8DFC9',
  },
  avatarText: { fontSize: 18, fontWeight: '700', color: '#2D6A4F' },
  info: { flex: 1, gap: 3 },
  username: { fontSize: 15, fontWeight: '700', color: '#11181C' },
  bio: { fontSize: 13, color: '#687076', lineHeight: 18 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stats: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stat: { fontSize: 13, color: '#687076' },
  statNum: { fontWeight: '700', color: '#11181C' },
  statDot: { color: '#ccc' },
  followBtn: {
    paddingHorizontal: 18,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#2D6A4F',
  },
  followBtnText: { fontSize: 13, fontWeight: '600', color: '#fff' },
  followingBtn: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#2D6A4F' },
  followingBtnText: { color: '#2D6A4F' },
  emptyContainer: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyEmoji: { fontSize: 48 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#11181C' },
  emptySubtext: { fontSize: 14, color: '#687076' },
});