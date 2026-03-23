// app/(tabs)/discover.tsx — Real Supabase version

import { supabase } from '@/lib/supabase';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

type User = {
  id: string;
  username: string;
  bio: string;
  avatar_url: string | null;
  is_private: boolean;
  follower_count: number;
  pin_count: number;
  is_following: boolean;
  follow_status: 'none' | 'pending' | 'accepted';
};

export default function DiscoverScreen() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      fetchUsers();
    }, [])
  );

  const fetchUsers = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setCurrentUserId(user.id);

    // Fetch all profiles except own
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, bio, avatar_url, is_private')
      .neq('id', user.id);

    if (!profiles) { setLoading(false); return; }

    // Fetch follower counts, pin counts, and follow status in parallel
    const enriched = await Promise.all(
      profiles.map(async (profile) => {
        const [followersRes, pinsRes, followRes] = await Promise.all([
          supabase.from('followers').select('*', { count: 'exact' }).eq('following_id', profile.id).eq('status', 'accepted'),
          supabase.from('pins').select('*', { count: 'exact' }).eq('user_id', profile.id),
          supabase.from('followers').select('status').eq('follower_id', user.id).eq('following_id', profile.id).single(),
        ]);

        const followStatus = followRes.data?.status ?? 'none';
        return {
          ...profile,
          is_private: profile.is_private ?? false,
          follower_count: followersRes.count ?? 0,
          pin_count: pinsRes.count ?? 0,
          is_following: followStatus === 'accepted',
          follow_status: (followStatus as 'none' | 'pending' | 'accepted'),
        };
      })
    );

    setUsers(enriched);
    setLoading(false);
  };

  const handleFollow = async (targetUser: User) => {
    if (!currentUserId) return;

    if (targetUser.is_following || targetUser.follow_status === 'pending') {
      // Unfollow or cancel request
      await supabase
        .from('followers')
        .delete()
        .eq('follower_id', currentUserId)
        .eq('following_id', targetUser.id);

      setUsers((prev) =>
        prev.map((u) =>
          u.id === targetUser.id
            ? { ...u, is_following: false, follow_status: 'none', follower_count: u.is_following ? u.follower_count - 1 : u.follower_count }
            : u
        )
      );
    } else {
      // Follow — if private account, set status to pending
      const status = targetUser.is_private ? 'pending' : 'accepted';
      await supabase.from('followers').insert({
        follower_id: currentUserId,
        following_id: targetUser.id,
        status,
      });

      setUsers((prev) =>
        prev.map((u) =>
          u.id === targetUser.id
            ? {
                ...u,
                is_following: status === 'accepted',
                follow_status: status,
                follower_count: status === 'accepted' ? u.follower_count + 1 : u.follower_count,
              }
            : u
        )
      );
    }
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return users;
    return users.filter((u) =>
      u.username.toLowerCase().includes(search.toLowerCase())
    );
  }, [search, users]);

  const getFollowLabel = (user: User) => {
    if (user.follow_status === 'pending') return 'Requested';
    if (user.is_following) return 'Following';
    return 'Follow';
  };

  const renderUser = ({ item }: { item: User }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/user-profile?id=${item.id}`)}>
      <View style={styles.cardTop}>
        <View style={styles.avatar}>
          {item.avatar_url ? (
            <Image source={{ uri: item.avatar_url }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarText}>{item.username.slice(0, 2).toUpperCase()}</Text>
          )}
        </View>
        <View style={styles.info}>
          <View style={styles.usernameRow}>
            <Text style={styles.username}>@{item.username}</Text>
            {item.is_private && <Text style={styles.lockIcon}>🔒</Text>}
          </View>
          <Text style={styles.bio} numberOfLines={2}>{item.bio || 'No bio yet'}</Text>
        </View>
      </View>
      <View style={styles.cardBottom}>
        <View style={styles.stats}>
          <Text style={styles.stat}>
            <Text style={styles.statNum}>{item.follower_count.toLocaleString()}</Text> followers
          </Text>
          <Text style={styles.statDot}>·</Text>
          <Text style={styles.stat}>
            <Text style={styles.statNum}>{item.pin_count}</Text> pins
          </Text>
        </View>
        <TouchableOpacity
          style={[
            styles.followBtn,
            (item.is_following || item.follow_status === 'pending') && styles.followingBtn,
          ]}
          onPress={() => handleFollow(item)}>
          <Text style={[
            styles.followBtnText,
            (item.is_following || item.follow_status === 'pending') && styles.followingBtnText,
          ]}>
            {getFollowLabel(item)}
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2D6A4F" />
      </View>
    );
  }

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
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingBottom: 40 },
  header: { paddingHorizontal: 16, paddingTop: 60, paddingBottom: 12 },
  headerTitle: { fontSize: 28, fontWeight: '700', color: '#11181C' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F5', borderRadius: 14, marginHorizontal: 16, marginBottom: 20, paddingHorizontal: 14, paddingVertical: 10, gap: 8 },
  searchIcon: { fontSize: 16 },
  searchInput: { flex: 1, fontSize: 16, color: '#11181C' },
  clearBtn: { fontSize: 14, color: '#687076', paddingHorizontal: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#11181C', paddingHorizontal: 16, marginBottom: 12 },
  card: { marginHorizontal: 16, marginBottom: 12, backgroundColor: '#F5FAF7', borderRadius: 16, borderWidth: 1, borderColor: '#E0F0E8', padding: 16, gap: 12 },
  cardTop: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#D4F0E4', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#A8DFC9' },
  avatarImage: { width: 52, height: 52, borderRadius: 26 },
  avatarText: { fontSize: 18, fontWeight: '700', color: '#2D6A4F' },
  info: { flex: 1, gap: 3 },
  usernameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  username: { fontSize: 15, fontWeight: '700', color: '#11181C' },
  lockIcon: { fontSize: 13 },
  bio: { fontSize: 13, color: '#687076', lineHeight: 18 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stats: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stat: { fontSize: 13, color: '#687076' },
  statNum: { fontWeight: '700', color: '#11181C' },
  statDot: { color: '#ccc' },
  followBtn: { paddingHorizontal: 18, paddingVertical: 7, borderRadius: 20, backgroundColor: '#2D6A4F' },
  followBtnText: { fontSize: 13, fontWeight: '600', color: '#fff' },
  followingBtn: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#2D6A4F' },
  followingBtnText: { color: '#2D6A4F' },
  emptyContainer: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyEmoji: { fontSize: 48 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#11181C' },
  emptySubtext: { fontSize: 14, color: '#687076' },
});