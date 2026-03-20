import { router } from 'expo-router';
import { useState } from 'react';
import {
    Alert,
    Dimensions,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

const { width } = Dimensions.get('window');
const GRID_PADDING = 16;
const GRID_GAP = 4;
const GRID_SIZE = (width - GRID_PADDING * 2 - GRID_GAP * 2) / 3;

const MOCK_PROFILE = {
  id: '1',
  username: 'alex_explores',
  bio: 'Collecting favourite spots around the world 🌍 Always looking for the next hidden gem.',
  avatar_url: null,
};

const MOCK_PINS = [
  { id: '1', title: 'Amazing coffee shop', location_name: 'Paris, France', rating: 5 },
  { id: '2', title: 'Hidden beach cove', location_name: 'Algarve, Portugal', rating: 4 },
  { id: '3', title: 'Best pizza ever', location_name: 'Naples, Italy', rating: 5 },
  { id: '4', title: 'Sunrise viewpoint', location_name: 'Lisbon, Portugal', rating: 5 },
  { id: '5', title: 'Local market', location_name: 'Marrakech, Morocco', rating: 3 },
  { id: '6', title: 'Rooftop bar', location_name: 'Barcelona, Spain', rating: 4 },
  { id: '7', title: 'Cosy bookshop', location_name: 'London, UK', rating: 4 },
  { id: '8', title: 'Waterfall trail', location_name: 'Iceland', rating: 5 },
  { id: '9', title: 'Night food market', location_name: 'Bangkok, Thailand', rating: 5 },
];

const MOCK_FOLLOWER_COUNT = 284;
const MOCK_FOLLOWING_COUNT = 173;

type Pin = {
  id: string;
  title: string;
  location_name: string;
  rating: number;
};

export default function ProfileScreen() {
  const [profile, setProfile] = useState(MOCK_PROFILE);
  const [pins] = useState<Pin[]>(MOCK_PINS);
  const [followerCount] = useState(MOCK_FOLLOWER_COUNT);
  const [followingCount] = useState(MOCK_FOLLOWING_COUNT);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editUsername, setEditUsername] = useState('');
  const [editBio, setEditBio] = useState('');

  const handleEditOpen = () => {
    setEditUsername(profile.username);
    setEditBio(profile.bio);
    setEditModalVisible(true);
  };

  const handleSaveProfile = () => {
    if (!editUsername.trim()) {
      Alert.alert('Error', 'Username cannot be empty.');
      return;
    }
    setProfile((prev) => ({
      ...prev,
      username: editUsername.trim(),
      bio: editBio.trim(),
    }));
    setEditModalVisible(false);
    Alert.alert('Saved!', 'Profile updated (mock — not saved to database).');
  };

  const handleLogout = () => {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: () => Alert.alert('Logged out', '(Mock — no real action taken)'),
      },
    ]);
  };


  const handlePinPress = (pin: Pin) => {
  router.push(`/edit-pin?id=${pin.id}`);
};

  const renderPin = ({ item }: { item: Pin }) => (
    <TouchableOpacity style={styles.gridItem} onPress={() => handlePinPress(item)}>
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
        data={pins}
        keyExtractor={(item) => item.id}
        numColumns={3}
        ListHeaderComponent={
          <View>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.headerUsername}>{profile.username}</Text>
              <TouchableOpacity onPress={handleLogout}>
                <Text style={styles.logoutBtn}>Log out</Text>
              </TouchableOpacity>
            </View>

            {/* Avatar + stats */}
            <View style={styles.profileRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarInitials}>
                  {profile.username.slice(0, 2).toUpperCase()}
                </Text>
              </View>
              <View style={styles.stats}>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{pins.length}</Text>
                  <Text style={styles.statLabel}>Pins</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{followerCount}</Text>
                  <Text style={styles.statLabel}>Followers</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{followingCount}</Text>
                  <Text style={styles.statLabel}>Following</Text>
                </View>
              </View>
            </View>

            {/* Bio */}
            <View style={styles.bioSection}>
              {profile.bio ? (
                <Text style={styles.bio}>{profile.bio}</Text>
              ) : (
                <Text style={styles.bioEmpty}>No bio yet</Text>
              )}
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
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView contentContainerStyle={styles.modalScroll}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Text style={styles.modalCancel}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={handleSaveProfile}>
                <Text style={styles.modalSave}>Save</Text>
              </TouchableOpacity>
            </View>

            {/* Avatar placeholder */}
            <View style={styles.modalAvatarContainer}>
              <View style={styles.avatarLarge}>
                <Text style={styles.avatarInitialsLarge}>
                  {editUsername.slice(0, 2).toUpperCase()}
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
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  listContent: { paddingBottom: 40 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 12,
  },
  headerUsername: { fontSize: 20, fontWeight: '700', color: '#11181C' },
  logoutBtn: { fontSize: 14, color: '#FF3B30', fontWeight: '600' },
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
  avatarLarge: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#D4F0E4',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#A8DFC9',
  },
  avatarInitialsLarge: { fontSize: 32, fontWeight: '700', color: '#2D6A4F' },
  stats: { flex: 1, flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { alignItems: 'center' },
  statNumber: { fontSize: 18, fontWeight: '700', color: '#11181C' },
  statLabel: { fontSize: 12, color: '#687076', marginTop: 2 },
  bioSection: { paddingHorizontal: 16, marginBottom: 12 },
  bio: { fontSize: 14, color: '#11181C', lineHeight: 20 },
  bioEmpty: { fontSize: 14, color: '#aaa', fontStyle: 'italic' },
  editButton: {
    marginHorizontal: 16,
    marginBottom: 16,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  editButtonText: { fontSize: 14, fontWeight: '600', color: '#11181C' },
  gridDivider: {
    borderTopWidth: 1,
    borderColor: '#E0E0E0',
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 4,
  },
  gridDividerText: { fontSize: 13, color: '#687076', fontWeight: '600' },
  gridRow: { paddingHorizontal: 16, gap: 4, marginBottom: 4 },
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
  emptySubtext: { fontSize: 14, color: '#687076' },
  modalScroll: { padding: 24, paddingTop: 0 },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    marginBottom: 24,
  },
  modalTitle: { fontSize: 17, fontWeight: '600', color: '#11181C' },
  modalCancel: { fontSize: 16, color: '#687076' },
  modalSave: { fontSize: 16, color: '#2D6A4F', fontWeight: '600' },
  modalAvatarContainer: { alignItems: 'center', marginBottom: 32, gap: 10 },
  changePhotoText: { fontSize: 14, color: '#2D6A4F', fontWeight: '600' },
  modalForm: { gap: 8 },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#11181C',
    marginTop: 16,
    marginBottom: 4,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#11181C',
  },
  modalTextArea: { height: 100, textAlignVertical: 'top' },
});