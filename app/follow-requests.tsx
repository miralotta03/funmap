// app/follow-requests.tsx — Follow request inbox
// Place at app/follow-requests.tsx (outside tabs folder)

import { supabase } from '@/lib/supabase';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    FlatList,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { GestureHandlerRootView, PanGestureHandler } from 'react-native-gesture-handler';

const { width } = Dimensions.get('window');
const SWIPE_THRESHOLD = width * 0.25;

type Request = {
  follower_id: string;
  username: string;
  bio: string | null;
  avatar_url: string | null;
  created_at: string;
};

export default function FollowRequestsScreen() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const translateX = useRef(new Animated.Value(0)).current;

  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: translateX } }],
    { useNativeDriver: true }
  );

  const onHandlerStateChange = (event: any) => {
    const { state, translationX, velocityX } = event.nativeEvent;
    if (state === 5) {
      if (translationX > SWIPE_THRESHOLD || velocityX > 500) {
        Animated.timing(translateX, {
          toValue: width,
          duration: 150,
          useNativeDriver: true,
        }).start(() => router.back());
      } else {
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
          tension: 150,
          friction: 20,
        }).start();
      }
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchRequests();
    }, [])
  );

  const fetchRequests = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace('/login'); return; }

    // Get pending follow requests for this user
    const { data: followData } = await supabase
      .from('followers')
      .select('follower_id, created_at')
      .eq('following_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (!followData || followData.length === 0) {
      setRequests([]);
      setLoading(false);
      return;
    }

    // Get profile info for each requester
    const followerIds = followData.map((f) => f.follower_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, bio, avatar_url')
      .in('id', followerIds);

    const enriched = followData.map((f) => {
      const profile = profiles?.find((p) => p.id === f.follower_id);
      return {
        follower_id: f.follower_id,
        username: profile?.username ?? 'Unknown',
        bio: profile?.bio ?? null,
        avatar_url: profile?.avatar_url ?? null,
        created_at: f.created_at,
      };
    });

    setRequests(enriched);
    setLoading(false);
  };

  const handleAccept = async (followerId: string) => {
    setActionLoading(followerId);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('followers')
      .update({ status: 'accepted' })
      .eq('follower_id', followerId)
      .eq('following_id', user.id);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      setRequests((prev) => prev.filter((r) => r.follower_id !== followerId));
    }
    setActionLoading(null);
  };

  const handleDecline = async (followerId: string) => {
    setActionLoading(followerId);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('followers')
      .delete()
      .eq('follower_id', followerId)
      .eq('following_id', user.id);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      setRequests((prev) => prev.filter((r) => r.follower_id !== followerId));
    }
    setActionLoading(null);
  };

  const renderRequest = ({ item }: { item: Request }) => {
    const isActioning = actionLoading === item.follower_id;

    return (
      <View style={styles.row}>
        <TouchableOpacity
          onPress={() => router.push(`/user-profile?id=${item.follower_id}`)}>
          <View style={styles.avatar}>
            {item.avatar_url ? (
              <Image source={{ uri: item.avatar_url }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>{item.username.slice(0, 2).toUpperCase()}</Text>
            )}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.info}
          onPress={() => router.push(`/user-profile?id=${item.follower_id}`)}>
          <Text style={styles.username}>@{item.username}</Text>
          {item.bio ? (
            <Text style={styles.bio} numberOfLines={1}>{item.bio}</Text>
          ) : null}
        </TouchableOpacity>

        <View style={styles.actions}>
          {isActioning ? (
            <ActivityIndicator color="#2D6A4F" />
          ) : (
            <>
              <TouchableOpacity
                style={styles.acceptBtn}
                onPress={() => handleAccept(item.follower_id)}>
                <Text style={styles.acceptBtnText}>Accept</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.declineBtn}
                onPress={() => handleDecline(item.follower_id)}>
                <Text style={styles.declineBtnText}>Decline</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2D6A4F" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PanGestureHandler
        onGestureEvent={onGestureEvent}
        onHandlerStateChange={onHandlerStateChange}
        activeOffsetX={[-10, 10]}
        failOffsetY={[-15, 15]}>
        <Animated.View
          style={[
            styles.container,
            { transform: [{ translateX: translateX.interpolate({ inputRange: [0, width], outputRange: [0, width], extrapolate: 'clamp' }) }] },
          ]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Follow Requests</Text>
        <View style={{ width: 60 }} />
      </View>

      <FlatList
        data={requests}
        keyExtractor={(item) => item.follower_id}
        renderItem={renderRequest}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>🔔</Text>
            <Text style={styles.emptyText}>No pending requests</Text>
            <Text style={styles.emptySubtext}>When someone requests to follow you, it will appear here</Text>
          </View>
        }
      />
        </Animated.View>
      </PanGestureHandler>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 16,
    paddingTop: 60, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  backBtn: { width: 60 },
  backBtnText: { fontSize: 16, color: '#2D6A4F', fontWeight: '600' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#11181C' },
  listContent: { paddingBottom: 40 },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
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
  username: { fontSize: 15, fontWeight: '600', color: '#11181C' },
  bio: { fontSize: 13, color: '#687076' },
  actions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  acceptBtn: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 8, backgroundColor: '#2D6A4F',
  },
  acceptBtnText: { fontSize: 13, fontWeight: '600', color: '#fff' },
  declineBtn: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 8, backgroundColor: '#F5F5F5',
    borderWidth: 1, borderColor: '#E0E0E0',
  },
  declineBtnText: { fontSize: 13, fontWeight: '600', color: '#687076' },
  emptyContainer: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 32, gap: 10 },
  emptyEmoji: { fontSize: 44 },
  emptyText: { fontSize: 17, fontWeight: '600', color: '#11181C' },
  emptySubtext: { fontSize: 14, color: '#687076', textAlign: 'center', lineHeight: 20 },
});