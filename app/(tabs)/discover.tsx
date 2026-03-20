// app/(tabs)/discover.tsx — Mock version (no Supabase needed)

import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
    Dimensions,
    FlatList,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

const { width } = Dimensions.get('window');

const MOCK_USERS = [
  {
    id: '1',
    username: 'sofia_wanders',
    bio: 'Finding beauty in every corner of the world 🌸',
    avatar_url: null,
    pin_count: 42,
    follower_count: 1204,
    is_following: false,
    is_featured: true,
  },
  {
    id: '2',
    username: 'marco_explores',
    bio: 'Food, travel and good vibes only 🍕✈️',
    avatar_url: null,
    pin_count: 87,
    follower_count: 3421,
    is_following: true,
    is_featured: true,
  },
  {
    id: '3',
    username: 'luna_travels',
    bio: 'Solo traveller. 34 countries and counting 🗺️',
    avatar_url: null,
    pin_count: 130,
    follower_count: 892,
    is_following: false,
    is_featured: true,
  },
  {
    id: '4',
    username: 'james_pins',
    bio: 'Hidden gems hunter 💎',
    avatar_url: null,
    pin_count: 21,
    follower_count: 310,
    is_following: false,
    is_featured: false,
  },
  {
    id: '5',
    username: 'elena_roams',
    bio: 'Nature lover. Hiker. Dreamer 🏔️',
    avatar_url: null,
    pin_count: 56,
    follower_count: 741,
    is_following: true,
    is_featured: false,
  },
  {
    id: '6',
    username: 'kai_adventures',
    bio: 'Surf, sun and sandy roads 🏄',
    avatar_url: null,
    pin_count: 33,
    follower_count: 528,
    is_following: false,
    is_featured: false,
  },
  {
    id: '7',
    username: 'priya_discovers',
    bio: 'Architecture and street food fanatic 🏛️',
    avatar_url: null,
    pin_count: 74,
    follower_count: 1893,
    is_following: false,
    is_featured: false,
  },
  {
    id: '8',
    username: 'oliver_maps',
    bio: 'Every city has a story 📖',
    avatar_url: null,
    pin_count: 19,
    follower_count: 205,
    is_following: false,
    is_featured: false,
  },
];

type User = typeof MOCK_USERS[0];

export default function DiscoverScreen() {
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState(MOCK_USERS);

  const featuredUsers = useMemo(() => users.filter((u) => u.is_featured), [users]);
  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users.filter((u) => !u.is_featured);
    return users.filter((u) =>
      u.username.toLowerCase().includes(search.toLowerCase())
    );
  }, [search, users]);

  const toggleFollow = (id: string) => {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === id
          ? {
              ...u,
              is_following: !u.is_following,
              follower_count: u.is_following ? u.follower_count - 1 : u.follower_count + 1,
            }
          : u
      )
    );
  };

  const getInitials = (username: string) => username.slice(0, 2).toUpperCase();

  const renderFeaturedUser = (user: User) => (
    <TouchableOpacity
      key={user.id}
      style={styles.featuredCard}
      onPress={() => router.push(`/user-profile?id=${user.id}`)}>
      <View style={styles.featuredAvatar}>
        <Text style={styles.featuredAvatarText}>{getInitials(user.username)}</Text>
      </View>
      <Text style={styles.featuredUsername} numberOfLines={1}>@{user.username}</Text>
      <Text style={styles.featuredPins}>{user.pin_count} pins</Text>
      <TouchableOpacity
        style={[styles.followBtn, user.is_following && styles.followingBtn]}
        onPress={() => toggleFollow(user.id)}>
        <Text style={[styles.followBtnText, user.is_following && styles.followingBtnText]}>
          {user.is_following ? 'Following' : 'Follow'}
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderUser = ({ item }: { item: User }) => (
    <TouchableOpacity
      style={styles.userRow}
      onPress={() => router.push(`/user-profile?id=${item.id}`)}>
      <View style={styles.rowAvatar}>
        <Text style={styles.rowAvatarText}>{getInitials(item.username)}</Text>
      </View>
      <View style={styles.rowInfo}>
        <Text style={styles.rowUsername}>@{item.username}</Text>
        <Text style={styles.rowBio} numberOfLines={1}>{item.bio}</Text>
        <Text style={styles.rowStats}>{item.follower_count.toLocaleString()} followers · {item.pin_count} pins</Text>
      </View>
      <TouchableOpacity
        style={[styles.followBtn, item.is_following && styles.followingBtn]}
        onPress={() => toggleFollow(item.id)}>
        <Text style={[styles.followBtnText, item.is_following && styles.followingBtnText]}>
          {item.is_following ? 'Following' : 'Follow'}
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredUsers}
        keyExtractor={(item) => item.id}
        renderItem={renderUser}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View>
            {/* Title */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Discover</Text>
            </View>

            {/* Search bar */}
            <View style={styles.searchContainer}>
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput
                style={styles.searchInput}
                placeholder="Search users..."
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

            {/* Featured section — hide when searching */}
            {!search.trim() && (
              <View>
                <Text style={styles.sectionTitle}>Featured explorers</Text>
                <FlatList
                  data={featuredUsers}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => renderFeaturedUser(item)}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.featuredList}
                />
                <Text style={styles.sectionTitle}>All users</Text>
              </View>
            )}

            {/* Search results label */}
            {search.trim() && (
              <Text style={styles.sectionTitle}>
                {filteredUsers.length === 0 ? 'No users found' : `Results for "${search}"`}
              </Text>
            )}
          </View>
        }
        ListEmptyComponent={
          !search.trim() ? null : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>🔍</Text>
              <Text style={styles.emptyText}>No users found</Text>
              <Text style={styles.emptySubtext}>Try a different username</Text>
            </View>
          )
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
    paddingBottom: 12,
  },
  headerTitle: { fontSize: 28, fontWeight: '700', color: '#11181C' },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 14,
    marginHorizontal: 16,
    marginBottom: 24,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  searchIcon: { fontSize: 16 },
  searchInput: { flex: 1, fontSize: 16, color: '#11181C' },
  clearBtn: { fontSize: 14, color: '#687076', paddingHorizontal: 4 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#11181C',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  featuredList: { paddingHorizontal: 16, gap: 12, paddingBottom: 24 },
  featuredCard: {
    width: 130,
    backgroundColor: '#F5FAF7',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E0F0E8',
    padding: 14,
    alignItems: 'center',
    gap: 6,
  },
  featuredAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#D4F0E4',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#A8DFC9',
    marginBottom: 4,
  },
  featuredAvatarText: { fontSize: 18, fontWeight: '700', color: '#2D6A4F' },
  featuredUsername: { fontSize: 13, fontWeight: '600', color: '#11181C', textAlign: 'center' },
  featuredPins: { fontSize: 11, color: '#687076' },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    gap: 12,
  },
  rowAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#D4F0E4',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#A8DFC9',
  },
  rowAvatarText: { fontSize: 16, fontWeight: '700', color: '#2D6A4F' },
  rowInfo: { flex: 1, gap: 2 },
  rowUsername: { fontSize: 15, fontWeight: '600', color: '#11181C' },
  rowBio: { fontSize: 13, color: '#687076' },
  rowStats: { fontSize: 12, color: '#A0A0A0', marginTop: 2 },
  followBtn: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#2D6A4F',
  },
  followBtnText: { fontSize: 13, fontWeight: '600', color: '#fff' },
  followingBtn: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#2D6A4F',
  },
  followingBtnText: { color: '#2D6A4F' },
  emptyContainer: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyEmoji: { fontSize: 48 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#11181C' },
  emptySubtext: { fontSize: 14, color: '#687076' },
});