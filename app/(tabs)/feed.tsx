import { useState, useCallback, useMemo } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  View,
  RefreshControl,
  TouchableOpacity,
  Image,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, router } from 'expo-router';
import { supabase } from '@/lib/supabase';

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
  pin_images: { url: string }[];
};

type StoryUser = {
  id: string;
  username: string;
  avatar_url: string | null;
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

function StoryBubble({
  name,
  avatarUrl,
  isYou,
  onPress,
}: {
  name: string;
  avatarUrl: string | null;
  isYou?: boolean;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity style={styles.storyItem} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.storyRing}>
        <View style={styles.storyAvatar}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarText}>{name?.[0]?.toUpperCase() ?? '?'}</Text>
          )}
        </View>
        {isYou && (
          <View style={styles.storyAddBadge}>
            <Ionicons name="add" size={13} color="#000" />
          </View>
        )}
      </View>
      <Text style={styles.storyName} numberOfLines={1}>
        {isYou ? 'Your story' : name}
      </Text>
    </TouchableOpacity>
  );
}

function PinCard({ pin }: { pin: Pin }) {
  const [liked, setLiked] = useState(false);
  const imageUrl = pin.pin_images?.[0]?.url;

  return (
    <View style={styles.post}>
      {/* Header */}
      <View style={styles.postHeader}>
        <View style={styles.avatar}>
          {pin.profiles?.avatar_url ? (
            <Image source={{ uri: pin.profiles.avatar_url }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarText}>
              {pin.profiles?.username?.[0]?.toUpperCase() ?? '?'}
            </Text>
          )}
        </View>
        <View style={styles.postHeaderText}>
          <Text style={styles.username}>{pin.profiles?.username ?? 'unknown'}</Text>
          <Text style={styles.date}>{timeAgo(pin.created_at)}</Text>
        </View>
        <TouchableOpacity hitSlop={12}>
          <Ionicons name="ellipsis-vertical" size={18} color="#8A8A8E" />
        </TouchableOpacity>
      </View>

      {pin.location_name ? (
        <View style={styles.locationRow}>
          <Ionicons name="location-sharp" size={13} color="#8A8A8E" />
          <Text style={styles.locationText}>{pin.location_name}</Text>
        </View>
      ) : null}

      {/* Image */}
      <TouchableOpacity
        activeOpacity={0.95}
        style={styles.imageWrap}
        onPress={() => router.push('/(tabs)')}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.image} />
        ) : (
          <View style={[styles.image, styles.imageFallback]}>
            <Ionicons name="image-outline" size={40} color="#3A3A3C" />
          </View>
        )}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.75)']}
          style={styles.imageGradient}
          pointerEvents="none"
        />
        {pin.title ? <Text style={styles.imageCaption}>{pin.title}</Text> : null}
      </TouchableOpacity>

      {/* Actions */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={styles.actionItem}
          hitSlop={8}
          onPress={() => setLiked((v) => !v)}>
          <Ionicons
            name={liked ? 'heart' : 'heart-outline'}
            size={24}
            color={liked ? '#FF4D67' : '#fff'}
          />
          <Text style={styles.actionText}>{128 + (liked ? 1 : 0)}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionItem} hitSlop={8}>
          <Ionicons name="chatbubble-outline" size={22} color="#fff" />
          <Text style={styles.actionText}>16</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        <TouchableOpacity hitSlop={8}>
          <Ionicons name="bookmark-outline" size={22} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function FeedScreen() {
  const [pins, setPins] = useState<Pin[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'forYou' | 'following'>('forYou');
  const [me, setMe] = useState<StoryUser | null>(null);

  const fetchPins = async () => {
    const { data, error } = await supabase
      .from('pins')
      .select('*, profiles(username, avatar_url), pin_images(url)')
      .eq('is_public', true)
      .order('created_at', { ascending: false });

    if (!error && data) setPins(data as Pin[]);
  };

  const fetchMe = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('profiles')
      .select('id, username, avatar_url')
      .eq('id', user.id)
      .single();

    if (data) setMe(data as StoryUser);
  };

  useFocusEffect(
    useCallback(() => {
      fetchPins();
      fetchMe();
    }, [])
  );

  const stories = useMemo(() => {
    const seen = new Set<string>();
    const list: StoryUser[] = [];
    for (const pin of pins) {
      if (!pin.user_id || seen.has(pin.user_id) || pin.user_id === me?.id) continue;
      seen.add(pin.user_id);
      list.push({
        id: pin.user_id,
        username: pin.profiles?.username ?? 'unknown',
        avatar_url: pin.profiles?.avatar_url ?? null,
      });
    }
    return list;
  }, [pins, me?.id]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchPins();
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <View style={styles.topBarRow}>
          <TouchableOpacity style={styles.iconButton} hitSlop={8}>
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Feed</Text>
          <TouchableOpacity style={styles.iconButton} hitSlop={8}>
            <Ionicons name="notifications-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.storiesRow}>
          <StoryBubble
            name={me?.username ?? 'You'}
            avatarUrl={me?.avatar_url ?? null}
            isYou
            onPress={() => router.push('/add-pin')}
          />
          {stories.map((story) => (
            <StoryBubble
              key={story.id}
              name={story.username}
              avatarUrl={story.avatar_url}
              onPress={() => router.push({ pathname: '/user-profile', params: { id: story.id } })}
            />
          ))}
        </ScrollView>

        <View style={styles.tabsRow}>
          <TouchableOpacity onPress={() => setActiveTab('forYou')} style={styles.tabItem}>
            <Text style={[styles.tabText, activeTab === 'forYou' && styles.tabTextActive]}>
              For you
            </Text>
            {activeTab === 'forYou' && <View style={styles.tabUnderline} />}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setActiveTab('following')} style={styles.tabItem}>
            <Text style={[styles.tabText, activeTab === 'following' && styles.tabTextActive]}>
              Following
            </Text>
            {activeTab === 'following' && <View style={styles.tabUnderline} />}
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={pins}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <PinCard pin={item} />}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#fff" />
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
    backgroundColor: '#000',
  },
  topBar: {
    paddingTop: 60,
    paddingBottom: 4,
    backgroundColor: '#000',
  },
  topBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBarTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  storiesRow: {
    paddingHorizontal: 16,
    paddingTop: 18,
    gap: 14,
  },
  storyItem: {
    alignItems: 'center',
    width: 68,
    gap: 6,
  },
  storyRing: {
    width: 66,
    height: 66,
    borderRadius: 33,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyAvatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#2D6A4F',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  storyAddBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyName: {
    fontSize: 11,
    color: '#D1D1D6',
    textAlign: 'center',
  },
  tabsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 28,
    marginTop: 16,
  },
  tabItem: {
    alignItems: 'center',
    paddingBottom: 12,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6E6E73',
  },
  tabTextActive: {
    color: '#fff',
  },
  tabUnderline: {
    marginTop: 8,
    height: 2,
    width: 24,
    borderRadius: 1,
    backgroundColor: '#fff',
  },
  list: {
    paddingBottom: 100,
  },
  post: {
    borderBottomWidth: 1,
    borderBottomColor: '#1C1C1E',
    paddingBottom: 14,
    marginBottom: 8,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2D6A4F',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  postHeaderText: {
    flex: 1,
    gap: 1,
  },
  username: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  date: {
    fontSize: 12,
    color: '#8A8A8E',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 16,
    paddingTop: 6,
  },
  locationText: {
    fontSize: 12,
    color: '#8A8A8E',
  },
  imageWrap: {
    marginTop: 10,
    width: '100%',
    aspectRatio: 4 / 5,
    backgroundColor: '#1C1C1E',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageFallback: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '45%',
  },
  imageCaption: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 21,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
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
    color: '#fff',
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#8A8A8E',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 32,
  },
});
