// app/user-profile.tsx — Real Supabase version with smooth swipe-to-go-back

import { supabase } from "@/lib/supabase";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Image,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  GestureHandlerRootView,
  PanGestureHandler,
} from "react-native-gesture-handler";

const { width } = Dimensions.get("window");
const GRID_PADDING = 16;
const GRID_GAP = 4;
const GRID_SIZE = (width - GRID_PADDING * 2 - GRID_GAP * 2) / 3;
const SWIPE_THRESHOLD = width * 0.25;

type Profile = {
  id: string;
  username: string;
  bio: string | null;
  avatar_url: string | null;
  website: string | null;
  is_private: boolean;
};

type Pin = {
  id: string;
  title: string;
  location_name: string;
  rating: number;
};

type FollowStatus = "none" | "pending" | "accepted";

const formatWebsite = (url: string) =>
  url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");

const openWebsite = (url: string) => {
  const fullUrl = url.startsWith("http") ? url : `https://${url}`;
  Linking.openURL(fullUrl).catch(() =>
    Alert.alert("Error", "Could not open link."),
  );
};

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [pins, setPins] = useState<Pin[]>([]);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [followStatus, setFollowStatus] = useState<FollowStatus>("none");
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [followLoading, setFollowLoading] = useState(false);

  const translateX = useRef(new Animated.Value(0)).current;

  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: translateX } }],
    { useNativeDriver: true },
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
      if (id) fetchAll();
    }, [id]),
  );

  const fetchAll = async () => {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.replace("/login");
      return;
    }
    setCurrentUserId(user.id);

    const [profileRes, followersRes, followingRes, followStatusRes] =
      await Promise.all([
        supabase.from("profiles").select("*").eq("id", id).single(),
        supabase
          .from("followers")
          .select("*", { count: "exact" })
          .eq("following_id", id)
          .eq("status", "accepted"),
        supabase
          .from("followers")
          .select("*", { count: "exact" })
          .eq("follower_id", id)
          .eq("status", "accepted"),
        supabase
          .from("followers")
          .select("status")
          .eq("follower_id", user.id)
          .eq("following_id", id)
          .single(),
      ]);

    if (!profileRes.data) {
      Alert.alert("Error", "User not found.");
      router.back();
      return;
    }

    const profileData = profileRes.data as Profile;
    setProfile(profileData);
    setFollowerCount(followersRes.count ?? 0);
    setFollowingCount(followingRes.count ?? 0);
    setFollowStatus((followStatusRes.data?.status as FollowStatus) ?? "none");

    const canSeePins =
      !profileData.is_private ||
      user.id === id ||
      followStatusRes.data?.status === "accepted";

    if (canSeePins) {
      const { data: pinsData } = await supabase
        .from("pins")
        .select("*")
        .eq("user_id", id)
        .order("created_at", { ascending: false });
      if (pinsData) setPins(pinsData);
    } else {
      setPins([]);
    }

    setLoading(false);
  };

  const handleFollow = async () => {
    if (!currentUserId || followLoading) return;
    setFollowLoading(true);

    if (followStatus === "accepted") {
      await supabase
        .from("followers")
        .delete()
        .eq("follower_id", currentUserId)
        .eq("following_id", id);
      setFollowStatus("none");
      setFollowerCount((c) => c - 1);
    } else if (followStatus === "pending") {
      await supabase
        .from("followers")
        .delete()
        .eq("follower_id", currentUserId)
        .eq("following_id", id);
      setFollowStatus("none");
    } else {
      const status = profile?.is_private ? "pending" : "accepted";
      await supabase.from("followers").insert({
        follower_id: currentUserId,
        following_id: id,
        status,
      });
      setFollowStatus(status as FollowStatus);
      if (status === "accepted") setFollowerCount((c) => c + 1);
    }

    setFollowLoading(false);
  };

  const getFollowLabel = () => {
    if (followLoading) return "...";
    if (followStatus === "accepted") return "Following";
    if (followStatus === "pending") return "Requested";
    return "Follow";
  };

  const isOwnProfile = currentUserId === id;
  const canSeePins =
    !profile?.is_private || isOwnProfile || followStatus === "accepted";

  const renderPin = ({ item }: { item: Pin }) => (
    <View style={styles.gridItem}>
      <View style={styles.gridItemInner}>
        <Text style={styles.gridItemEmoji}>📍</Text>
        <Text style={styles.gridItemTitle} numberOfLines={2}>
          {item.title}
        </Text>
        {item.location_name ? (
          <Text style={styles.gridItemLocation} numberOfLines={1}>
            {item.location_name}
          </Text>
        ) : null}
        {item.rating ? (
          <Text style={styles.gridItemRating}>
            {"★".repeat(item.rating)}
            {"☆".repeat(5 - item.rating)}
          </Text>
        ) : null}
      </View>
    </View>
  );
  if (loading) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2D6A4F" />
        </View>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PanGestureHandler
        onGestureEvent={onGestureEvent}
        onHandlerStateChange={onHandlerStateChange}
        activeOffsetX={[-10, 10]}
        failOffsetY={[-15, 15]}
      >
        <Animated.View
          style={[
            styles.container,
            {
              transform: [
                {
                  translateX: translateX.interpolate({
                    inputRange: [0, width],
                    outputRange: [0, width],
                    extrapolate: "clamp",
                  }),
                },
              ],
            },
          ]}
        >
          <FlatList
            data={canSeePins ? pins : []}
            keyExtractor={(item) => item.id}
            numColumns={3}
            columnWrapperStyle={styles.gridRow}
            contentContainerStyle={styles.listContent}
            renderItem={renderPin}
            ListHeaderComponent={
              <View>
                <View style={styles.header}>
                  <TouchableOpacity
                    onPress={() => router.back()}
                    style={styles.backBtn}
                  >
                    <Text style={styles.backBtnText}>← Back</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.profileRow}>
                  <View style={styles.avatar}>
                    {profile?.avatar_url ? (
                      <Image
                        source={{ uri: profile.avatar_url }}
                        style={styles.avatarImage}
                      />
                    ) : (
                      <Text style={styles.avatarInitials}>
                        {(profile?.username ?? "?").slice(0, 2).toUpperCase()}
                      </Text>
                    )}
                  </View>
                  <View style={styles.stats}>
                    <View style={styles.statItem}>
                      <Text style={styles.statNumber}>{pins.length}</Text>
                      <Text style={styles.statLabel}>Pins</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.statItem}
                      onPress={() =>
                        router.push(`/followers?id=${id}&tab=followers`)
                      }
                    >
                      <Text style={styles.statNumber}>
                        {followerCount.toLocaleString()}
                      </Text>
                      <Text style={styles.statLabel}>Followers</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.statItem}
                      onPress={() =>
                        router.push(`/followers?id=${id}&tab=following`)
                      }
                    >
                      <Text style={styles.statNumber}>{followingCount}</Text>
                      <Text style={styles.statLabel}>Following</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.bioSection}>
                  <View style={styles.usernameRow}>
                    <Text style={styles.username}>@{profile?.username}</Text>
                    {profile?.is_private && (
                      <View style={styles.privateBadge}>
                        <Text style={styles.privateBadgeText}>🔒 Private</Text>
                      </View>
                    )}
                  </View>
                  {profile?.bio ? (
                    <Text style={styles.bio}>{profile.bio}</Text>
                  ) : (
                    <Text style={styles.bioEmpty}>No bio yet</Text>
                  )}
                  {profile?.website ? (
                    <TouchableOpacity
                      style={styles.websiteRow}
                      onPress={() => openWebsite(profile.website!)}
                    >
                      <Text style={styles.websiteIcon}>🔗</Text>
                      <Text style={styles.websiteText}>
                        {formatWebsite(profile.website)}
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>

                {!isOwnProfile && (
                  <TouchableOpacity
                    style={[
                      styles.followButton,
                      (followStatus === "accepted" ||
                        followStatus === "pending") &&
                        styles.followingButton,
                      followLoading && { opacity: 0.6 },
                    ]}
                    onPress={handleFollow}
                    disabled={followLoading}
                  >
                    <Text
                      style={[
                        styles.followButtonText,
                        (followStatus === "accepted" ||
                          followStatus === "pending") &&
                          styles.followingButtonText,
                      ]}
                    >
                      {getFollowLabel()}
                    </Text>
                  </TouchableOpacity>
                )}

                {canSeePins ? (
                  <View style={styles.gridDivider}>
                    <Text style={styles.gridDividerText}>⊞ Pins</Text>
                  </View>
                ) : (
                  <View style={styles.privateNotice}>
                    <Text style={styles.privateNoticeEmoji}>🔒</Text>
                    <Text style={styles.privateNoticeText}>
                      This account is private
                    </Text>
                    <Text style={styles.privateNoticeSub}>
                      {followStatus === "pending"
                        ? "Your follow request is pending approval"
                        : "Follow this account to see their pins"}
                    </Text>
                  </View>
                )}
              </View>
            }
            ListEmptyComponent={
              canSeePins ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyEmoji}>📍</Text>
                  <Text style={styles.emptyText}>No pins yet</Text>
                </View>
              ) : null
            }
          />
        </Animated.View>
      </PanGestureHandler>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  listContent: { paddingBottom: 40 },
  header: { paddingHorizontal: 16, paddingTop: 60, paddingBottom: 8 },
  backBtn: { alignSelf: "flex-start" },
  backBtnText: { fontSize: 16, color: "#2D6A4F", fontWeight: "600" },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 24,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#D4F0E4",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#A8DFC9",
  },
  avatarImage: { width: 80, height: 80, borderRadius: 40 },
  avatarInitials: { fontSize: 26, fontWeight: "700", color: "#2D6A4F" },
  stats: { flex: 1, flexDirection: "row", justifyContent: "space-around" },
  statItem: { alignItems: "center" },
  statNumber: { fontSize: 18, fontWeight: "700", color: "#11181C" },
  statLabel: { fontSize: 12, color: "#687076", marginTop: 2 },
  bioSection: { paddingHorizontal: 16, marginBottom: 14, gap: 5 },
  usernameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  username: { fontSize: 16, fontWeight: "700", color: "#11181C" },
  privateBadge: {
    backgroundColor: "#F5F5F5",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  privateBadgeText: { fontSize: 11, color: "#687076", fontWeight: "600" },
  bio: { fontSize: 14, color: "#11181C", lineHeight: 20 },
  bioEmpty: { fontSize: 14, color: "#aaa", fontStyle: "italic" },
  websiteRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  websiteIcon: { fontSize: 13 },
  websiteText: { fontSize: 14, color: "#2D6A4F", fontWeight: "500" },
  followButton: {
    marginHorizontal: 16,
    marginBottom: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#2D6A4F",
    alignItems: "center",
  },
  followButtonText: { fontSize: 15, fontWeight: "600", color: "#fff" },
  followingButton: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#2D6A4F",
  },
  followingButtonText: { color: "#2D6A4F" },
  gridDivider: {
    borderTopWidth: 1,
    borderColor: "#E0E0E0",
    paddingVertical: 10,
    alignItems: "center",
    marginBottom: 4,
  },
  gridDividerText: { fontSize: 13, color: "#687076", fontWeight: "600" },
  privateNotice: {
    alignItems: "center",
    paddingVertical: 48,
    paddingHorizontal: 32,
    gap: 8,
  },
  privateNoticeEmoji: { fontSize: 40 },
  privateNoticeText: { fontSize: 17, fontWeight: "700", color: "#11181C" },
  privateNoticeSub: {
    fontSize: 14,
    color: "#687076",
    textAlign: "center",
    lineHeight: 20,
  },
  gridRow: {
    paddingHorizontal: 16,
    gap: 4,
    marginBottom: 4,
    justifyContent: "center",
  },
  gridItem: {
    width: GRID_SIZE,
    height: GRID_SIZE,
    borderRadius: 12,
    overflow: "hidden",
  },
  gridItemInner: {
    flex: 1,
    backgroundColor: "#F5FAF7",
    borderWidth: 1,
    borderColor: "#E0F0E8",
    borderRadius: 12,
    padding: 8,
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
  },
  gridItemEmoji: { fontSize: 20 },
  gridItemTitle: {
    fontSize: 11,
    fontWeight: "600",
    color: "#11181C",
    textAlign: "center",
  },
  gridItemLocation: { fontSize: 10, color: "#687076", textAlign: "center" },
  gridItemRating: { fontSize: 10, color: "#FFB800" },
  emptyContainer: { alignItems: "center", paddingTop: 60, gap: 8 },
  emptyEmoji: { fontSize: 48 },
  emptyText: { fontSize: 18, fontWeight: "600", color: "#11181C" },
});
