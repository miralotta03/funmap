// app/followers.tsx — Followers & Following screen
// Place at app/followers.tsx (outside tabs folder, same as user-profile.tsx)
// Navigate to this screen like: router.push(`/followers?id=${userId}&tab=followers`)

import { supabase } from '@/lib/supabase';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

type Person = {
  id: string;
  username: string;
  bio: string | null;
  avatar_url: string | null;
  is_private: boolean;
  follow_status: 'none' | 'pending' | 'accepted';
};

type TabType = 'followers' | 'following';

export default function FollowersScreen() {
  const { id, tab } = useLocalSearchParams<{ id: string; tab?: string }>();
  const [activeTab, setActiveTab] = useState<TabType>((tab as TabType) ?? 'followers');
  const [followers, setFollowers] = useState<Person[]>([]);
  const [following, setFollowing] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [profileUsername, setProfileUsername] = useState('');

  useFocusEffect(
    useCallback(() => {
      fetchAll();
    }, [id])
  );

  const fetchAll = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace('/login'); return; }
    setCurrentUserId(user.id);

    // Get the profile username for the header
    const { data: profileData } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', id)
      .single();
    if (profileData) setProfileUsername(profileData.username);

    // Fetch followers (people who follow this profile)
    const { data: followersData } = await supabase
      .from('followers')
      .select('follower_id, status')
      .eq('following_id', id)
      .eq('status', 'accepted');

    // Fetch following (people this profile follows)
    const { data: followingData } = await supabase
      .from('followers')
      .select('following_id, status')
      .eq('follower_id', id)
      .eq('status', 'accepted');

    // Get current user's follow statuses for all these people
    const { data: myFollows } = await supabase
      .from('followers')
      .select('following_id, status')
      .eq('follower_id', user.id);

    const myFollowMap = new Map(myFollows?.map((f) => [f.following_id, f.status]) ?? []);

    // Enrich followers list
    const followerIds = followersData?.map((f) => f.follower_id) ?? [];
    const followerProfiles = followerIds.length > 0
      ? (await supabase.from('profiles').select('id, username, bio, avatar_url, is_private').in('id', followerIds)).data ?? []
      : [];

    setFollowers(
      followerProfiles.map((p) => ({
        ...p,
        is_private: p.is_private ?? false,
        follow_status: (myFollowMap.get(p.id) as Person['follow_status']) ?? 'none',
      }))
    );

    // Enrich following list
    const followingIds = followingData?.map((f) => f.following_id) ?? [];
    const followingProfiles = followingIds.length > 0
      ? (await supabase.from('profiles').select('id, username, bio, avatar_url, is_private').in('id', followingIds)).data ?? []
      : [];

    setFollowing(
      followingProfiles.map((p) => ({
        ...p,
        is_private: p.is_private ?? false,
        follow_status: (myFollowMap.get(p.id) as Person['follow_status']) ?? 'none',
      }))
    );

    setLoading(false);
  };

  const handleFollow = async (person: Person) => {
    if (!currentUserId) return;

    const updateList = (list: Person[]) =>
      list.map((p) => {
        if (p.id !== person.id) return p;
        if (person.follow_status === 'accepted') {
          return { ...p, follow_status: 'none' as const };
        } else if (person.follow_status === 'pending') {
          return { ...p, follow_status: 'none' as const };
        } else {
          return { ...p, follow_status: person.is_private ? 'pending' as const : 'accepted' as const };
        }
      });

    // Optimistic update
    setFollowers((prev) => updateList(prev));
    setFollowing((prev) => updateList(prev));

    if (person.follow_status === 'accepted' || person.follow_status === 'pending') {
      await supabase
        .from('followers')
        .delete()
        .eq('follower_id', currentUserId)
        .eq('following_id', person.id);
    } else {
      const status = person.is_private ? 'pending' : 'accepted';
      await supabase.from('followers').insert({
        follower_id: currentUserId,
        following_id: person.id,
        status,
      });
    }
  };

  const getFollowLabel = (person: Person) => {
    if (person.id === currentUserId) return null;
    if (person.follow_status === 'accepted') return 'Following';
    if (person.follow_status === 'pending') return 'Requested';
    return 'Follow';
  };

  const renderPerson = ({ item }: { item: Person }) => {
    const followLabel = getFollowLabel(item);
    const isFollowingOrPending = item.follow_status === 'accepted' || item.follow_status === 'pending';

    return (
      <TouchableOpacity
        style={styles.row}
        onPress={() => router.push(`/user-profile?id=${item.id}`)}>
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
          {item.bio ? (
            <Text style={styles.bio} numberOfLines={1}>{item.bio}</Text>
          ) : null}
        </View>
        {followLabel && (
          <TouchableOpacity
            style={[styles.followBtn, isFollowingOrPending && styles.followingBtn]}
            onPress={() => handleFollow(item)}>
            <Text style={[styles.followBtnText, isFollowingOrPending && styles.followingBtnText]}>
              {followLabel}
            </Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  const currentList = activeTab === 'followers' ? followers : following;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2D6A4F" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>@{profileUsername}</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'followers' && styles.tabActive]}
          onPress={() => setActiveTab('followers')}>
          <Text style={[styles.tabText, activeTab === 'followers' && styles.tabTextActive]}>
            Followers
          </Text>
          <Text style={[styles.tabCount, activeTab === 'followers' && styles.tabCountActive]}>
            {followers.length}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'following' && styles.tabActive]}
          onPress={() => setActiveTab('following')}>
          <Text style={[styles.tabText, activeTab === 'following' && styles.tabTextActive]}>
            Following
          </Text>
          <Text style={[styles.tabCount, activeTab === 'following' && styles.tabCountActive]}>
            {following.length}
          </Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      <FlatList
        data={currentList}
        keyExtractor={(item) => item.id}
        renderItem={renderPerson}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>{activeTab === 'followers' ? '👥' : '🔍'}</Text>
            <Text style={styles.emptyText}>
              {activeTab === 'followers' ? 'No followers yet' : 'Not following anyone yet'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 16,
    paddingTop: 60, paddingBottom: 12,
  },
  backBtn: { width: 60 },
  backBtnText: { fontSize: 16, color: '#2D6A4F', fontWeight: '600' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#11181C' },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  tab: {
    flex: 1, flexDirection: 'row', justifyContent: 'center',
    alignItems: 'center', paddingVertical: 14, gap: 6,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#2D6A4F',
  },
  tabText: { fontSize: 15, fontWeight: '600', color: '#687076' },
  tabTextActive: { color: '#2D6A4F' },
  tabCount: {
    fontSize: 13, fontWeight: '600', color: '#aaa',
    backgroundColor: '#F5F5F5', borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  tabCountActive: { backgroundColor: '#E0F0E8', color: '#2D6A4F' },
  listContent: { paddingBottom: 40 },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#F5F5F5', gap: 12,
  },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#D4F0E4',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: '#A8DFC9',
  },
  avatarImage: { width: 48, height: 48, borderRadius: 24 },
  avatarText: { fontSize: 16, fontWeight: '700', color: '#2D6A4F' },
  info: { flex: 1, gap: 3 },
  usernameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  username: { fontSize: 15, fontWeight: '600', color: '#11181C' },
  lockIcon: { fontSize: 12 },
  bio: { fontSize: 13, color: '#687076' },
  followBtn: {
    paddingHorizontal: 16, paddingVertical: 7,
    borderRadius: 20, backgroundColor: '#2D6A4F',
  },
  followBtnText: { fontSize: 13, fontWeight: '600', color: '#fff' },
  followingBtn: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#2D6A4F' },
  followingBtnText: { color: '#2D6A4F' },
  emptyContainer: { alignItems: 'center', paddingTop: 80, gap: 10 },
  emptyEmoji: { fontSize: 44 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#687076' },
});