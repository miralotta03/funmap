// app/(tabs)/profile.tsx — Real Supabase version

import { supabase } from '@/lib/supabase';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    FlatList,
    Image,
    KeyboardAvoidingView,
    Linking,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

const { width } = Dimensions.get('window');
const GRID_PADDING = 16;
const GRID_GAP = 4;
const GRID_SIZE = (width - GRID_PADDING * 2 - GRID_GAP * 2) / 3;

type Profile = {
  id: string;
  username: string;
  bio: string;
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

const formatWebsite = (url: string) =>
  url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');

const openWebsite = (url: string) => {
  const fullUrl = url.startsWith('http') ? url : `https://${url}`;
  Linking.openURL(fullUrl).catch(() => Alert.alert('Error', 'Could not open link.'));
};

export default function ProfileScreen() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [pins, setPins] = useState<Pin[]>([]);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editUsername, setEditUsername] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editWebsite, setEditWebsite] = useState('');
  const [editIsPrivate, setEditIsPrivate] = useState(false);
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchAll();
    }, [])
  );

  const fetchAll = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace('/login'); return; }

    const [profileRes, pinsRes, followersRes, followingRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('pins').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('followers').select('*', { count: 'exact' }).eq('following_id', user.id).eq('status', 'accepted'),
      supabase.from('followers').select('*', { count: 'exact' }).eq('follower_id', user.id).eq('status', 'accepted'),
    ]);

    if (profileRes.data) setProfile(profileRes.data);
    if (pinsRes.data) setPins(pinsRes.data);
    setFollowerCount(followersRes.count ?? 0);
    setFollowingCount(followingRes.count ?? 0);
    setLoading(false);
  };

  const handleEditOpen = () => {
    setEditUsername(profile?.username ?? '');
    setEditBio(profile?.bio ?? '');
    setEditWebsite(profile?.website ?? '');
    setEditIsPrivate(profile?.is_private ?? false);
    setEditModalVisible(true);
  };

  const handlePrivateToggle = (value: boolean) => {
    if (value) {
      Alert.alert(
        'Switch to Private?',
        'Only your approved followers will be able to see your pins. Existing followers will not be affected.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Switch to Private', onPress: () => setEditIsPrivate(true) },
        ]
      );
    } else {
      Alert.alert(
        'Switch to Public?',
        'Anyone will be able to see your pins and profile.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Switch to Public', onPress: () => setEditIsPrivate(false) },
        ]
      );
    }
  };

  const handleSaveProfile = async () => {
    if (!editUsername.trim()) {
      Alert.alert('Error', 'Username cannot be empty.');
      return;
    }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from('profiles')
      .update({
        username: editUsername.trim(),
        bio: editBio.trim(),
        website: editWebsite.trim() || null,
        is_private: editIsPrivate,
      })
      .eq('id', user!.id);
    setSaving(false);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      setEditModalVisible(false);
      fetchAll();
    }
  };

  const handleLogout = () => {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out', style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
          router.replace('/login');
        },
      },
    ]);
  };

  const renderPin = ({ item }: { item: Pin }) => (
    <TouchableOpacity
      style={styles.gridItem}
      onPress={() => router.push(`/edit-pin?id=${item.id}`)}>
      <View style={styles.gridItemInner}>
        <Text style={styles.gridItemEmoji}>📍</Text>
        <Text style={styles.gridItemTitle} numberOfLines={2}>{item.title}</Text>
        {item.location_name ? (
          <Text style={styles.gridItemLocation} numberOfLines={1}>{item.location_name}</Text>
        ) : null}
        {item.rating ? (
          <Text style={styles.gridItemRating}>
            {'★'.repeat(item.rating)}{'☆'.repeat(5 - item.rating)}
          </Text>
        ) : null}
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
        data={pins}
        keyExtractor={(item) => item.id}
        numColumns={3}
        ListHeaderComponent={
          <View>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <Text style={styles.headerUsername}>{profile?.username ?? 'Profile'}</Text>
                {profile?.is_private && (
                  <View style={styles.privateBadge}>
                    <Text style={styles.privateBadgeText}>🔒 Private</Text>
                  </View>
                )}
              </View>
              <TouchableOpacity onPress={handleLogout}>
                <Text style={styles.logoutBtn}>Log out</Text>
              </TouchableOpacity>
            </View>

            {/* Avatar + stats */}
            <View style={styles.profileRow}>
              <View style={styles.avatar}>
                {profile?.avatar_url ? (
                  <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
                ) : (
                  <Text style={styles.avatarInitials}>
                    {(profile?.username ?? '?').slice(0, 2).toUpperCase()}
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
                  onPress={() => router.push(`/followers?id=${profile?.id}&tab=followers`)}>
                  <Text style={styles.statNumber}>{followerCount}</Text>
                  <Text style={styles.statLabel}>Followers</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.statItem}
                  onPress={() => router.push(`/followers?id=${profile?.id}&tab=following`)}>
                  <Text style={styles.statNumber}>{followingCount}</Text>
                  <Text style={styles.statLabel}>Following</Text>
                </TouchableOpacity>
              </View>
            </View>{/* ← closes profileRow */}

            {/* Bio + website */}
            <View style={styles.bioSection}>
              {profile?.bio ? (
                <Text style={styles.bio}>{profile.bio}</Text>
              ) : (
                <Text style={styles.bioEmpty}>No bio yet</Text>
              )}
              {profile?.website ? (
                <TouchableOpacity
                  style={styles.websiteRow}
                  onPress={() => openWebsite(profile.website!)}>
                  <Text style={styles.websiteIcon}>🔗</Text>
                  <Text style={styles.websiteText}>{formatWebsite(profile.website)}</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Edit profile button */}
            <TouchableOpacity style={styles.editButton} onPress={handleEditOpen}>
              <Text style={styles.editButtonText}>Edit Profile</Text>
            </TouchableOpacity>

            {/* Grid header */}
            <View style={styles.gridDivider}>
              <Text style={styles.gridDividerText}>⊞  Posts</Text>
            </View>
          </View>
        }
        renderItem={renderPin}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>📍</Text>
            <Text style={styles.emptyText}>No pins yet</Text>
            <Text style={styles.emptySubtext}>Your saved pins will appear here</Text>
          </View>
        }
      />

      {/* Edit Profile Modal */}
      <Modal visible={editModalVisible} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView contentContainerStyle={styles.modalScroll}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Text style={styles.modalCancel}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={handleSaveProfile} disabled={saving}>
                <Text style={[styles.modalSave, saving && { opacity: 0.5 }]}>
                  {saving ? 'Saving...' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalAvatarContainer}>
              <View style={styles.avatarLarge}>
                <Text style={styles.avatarInitialsLarge}>
                  {(editUsername ?? '?').slice(0, 2).toUpperCase()}
                </Text>
              </View>
              <TouchableOpacity>
                <Text style={styles.changePhotoText}>Change profile photo</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalForm}>
              <Text style={styles.modalLabel}>Username</Text>
              <TextInput
                style={styles.modalInput}
                value={editUsername}
                onChangeText={setEditUsername}
                placeholder="Your username"
                autoCapitalize="none"
              />
              <Text style={styles.modalLabel}>Bio</Text>
              <TextInput
                style={[styles.modalInput, styles.modalTextArea]}
                value={editBio}
                onChangeText={setEditBio}
                placeholder="Tell people about yourself..."
                multiline
                numberOfLines={4}
              />
              <Text style={styles.modalLabel}>Website</Text>
              <View style={styles.inputWithIcon}>
                <Text style={styles.inputIcon}>🔗</Text>
                <TextInput
                  style={styles.modalInputFlex}
                  value={editWebsite}
                  onChangeText={setEditWebsite}
                  placeholder="yourwebsite.com"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                />
              </View>
              <Text style={styles.inputHint}>Shown publicly on your profile</Text>
            </View>

            <View style={styles.privacySection}>
              <Text style={styles.privacySectionTitle}>Privacy</Text>
              <View style={styles.privacyRow}>
                <View style={styles.privacyInfo}>
                  <Text style={styles.privacyLabel}>Private account</Text>
                  <Text style={styles.privacyDesc}>
                    {editIsPrivate
                      ? 'Only approved followers can see your pins'
                      : 'Anyone can see your pins and profile'}
                  </Text>
                </View>
                <Switch
                  value={editIsPrivate}
                  onValueChange={handlePrivateToggle}
                  trackColor={{ false: '#E0E0E0', true: '#A8DFC9' }}
                  thumbColor={editIsPrivate ? '#2D6A4F' : '#fff'}
                />
              </View>
              {editIsPrivate && (
                <View style={styles.privateInfoBox}>
                  <Text style={styles.privateInfoText}>
                    🔒 When private, new followers must be approved by you. Your pins will only be visible to approved followers.
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 60, paddingBottom: 12 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerUsername: { fontSize: 20, fontWeight: '700', color: '#11181C' },
  privateBadge: { backgroundColor: '#F5F5F5', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: '#E0E0E0' },
  privateBadgeText: { fontSize: 11, color: '#687076', fontWeight: '600' },
  logoutBtn: { fontSize: 14, color: '#FF3B30', fontWeight: '600' },
  profileRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 12, gap: 24 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#D4F0E4', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#A8DFC9' },
  avatarImage: { width: 80, height: 80, borderRadius: 40 },
  avatarInitials: { fontSize: 26, fontWeight: '700', color: '#2D6A4F' },
  avatarLarge: { width: 96, height: 96, borderRadius: 48, backgroundColor: '#D4F0E4', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#A8DFC9' },
  avatarInitialsLarge: { fontSize: 32, fontWeight: '700', color: '#2D6A4F' },
  stats: { flex: 1, flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { alignItems: 'center' },
  statNumber: { fontSize: 18, fontWeight: '700', color: '#11181C' },
  statLabel: { fontSize: 12, color: '#687076', marginTop: 2 },
  bioSection: { paddingHorizontal: 16, marginBottom: 12, gap: 6 },
  bio: { fontSize: 14, color: '#11181C', lineHeight: 20 },
  bioEmpty: { fontSize: 14, color: '#aaa', fontStyle: 'italic' },
  websiteRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  websiteIcon: { fontSize: 13 },
  websiteText: { fontSize: 14, color: '#2D6A4F', fontWeight: '500' },
  editButton: { marginHorizontal: 16, marginBottom: 16, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#E0E0E0', alignItems: 'center' },
  editButtonText: { fontSize: 14, fontWeight: '600', color: '#11181C' },
  gridDivider: { borderTopWidth: 1, borderColor: '#E0E0E0', paddingVertical: 10, alignItems: 'center', marginBottom: 4 },
  gridDividerText: { fontSize: 13, color: '#687076', fontWeight: '600' },
  gridRow: { paddingHorizontal: 16, gap: 4, marginBottom: 4, justifyContent: 'center' },
  gridItem: { width: GRID_SIZE, height: GRID_SIZE, borderRadius: 12, overflow: 'hidden' },
  gridItemInner: { flex: 1, backgroundColor: '#F5FAF7', borderWidth: 1, borderColor: '#E0F0E8', borderRadius: 12, padding: 8, justifyContent: 'center', alignItems: 'center', gap: 4 },
  gridItemEmoji: { fontSize: 20 },
  gridItemTitle: { fontSize: 11, fontWeight: '600', color: '#11181C', textAlign: 'center' },
  gridItemLocation: { fontSize: 10, color: '#687076', textAlign: 'center' },
  gridItemRating: { fontSize: 10, color: '#FFB800' },
  emptyContainer: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyEmoji: { fontSize: 48 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#11181C' },
  emptySubtext: { fontSize: 14, color: '#687076' },
  modalScroll: { padding: 24, paddingTop: 0 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 60, marginBottom: 24 },
  modalTitle: { fontSize: 17, fontWeight: '600', color: '#11181C' },
  modalCancel: { fontSize: 16, color: '#687076' },
  modalSave: { fontSize: 16, color: '#2D6A4F', fontWeight: '600' },
  modalAvatarContainer: { alignItems: 'center', marginBottom: 32, gap: 10 },
  changePhotoText: { fontSize: 14, color: '#2D6A4F', fontWeight: '600' },
  modalForm: { gap: 8 },
  modalLabel: { fontSize: 14, fontWeight: '600', color: '#11181C', marginTop: 16, marginBottom: 4 },
  modalInput: { borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 16, fontSize: 16, color: '#11181C' },
  modalInputFlex: { flex: 1, fontSize: 16, color: '#11181C' },
  modalTextArea: { height: 100, textAlignVertical: 'top' },
  inputWithIcon: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 16, gap: 8 },
  inputIcon: { fontSize: 16 },
  inputHint: { fontSize: 12, color: '#aaa', marginTop: 4, marginLeft: 4 },
  privacySection: { marginTop: 28, borderTopWidth: 1, borderTopColor: '#F0F0F0', paddingTop: 20, gap: 12 },
  privacySectionTitle: { fontSize: 16, fontWeight: '700', color: '#11181C' },
  privacyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F9F9F9', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#F0F0F0' },
  privacyInfo: { flex: 1, gap: 3, marginRight: 12 },
  privacyLabel: { fontSize: 15, fontWeight: '600', color: '#11181C' },
  privacyDesc: { fontSize: 13, color: '#687076' },
  privateInfoBox: { backgroundColor: '#F5FAF7', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#E0F0E8' },
  privateInfoText: { fontSize: 13, color: '#2D6A4F', lineHeight: 20 },
});