import { supabase } from '@/lib/supabase';
import { router, useLocalSearchParams } from 'expo-router';
import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
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
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';

const { height } = Dimensions.get('window');

type Member = {
  user_id: string;
  role: string;
  username: string;
  avatar_url: string | null;
};

type TripPin = {
  id: string;
  pin_id: string;
  title: string;
  location_name: string | null;
  rating: number | null;
};

type Message = {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  username: string;
  avatar_url: string | null;
};


export default function TripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [tripName, setTripName] = useState('');
  const [tripDescription, setTripDescription] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [pins, setPins] = useState<TripPin[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [tab, setTab] = useState<'pins' | 'chat'>('pins');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentRole, setCurrentRole] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [showAddPin, setShowAddPin] = useState(false);
  const [addPinStep, setAddPinStep] = useState<'map' | 'form'>('map');
  const [pinLocation, setPinLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [pinTitle, setPinTitle] = useState('');
  const [pinDescription, setPinDescription] = useState('');
  const [pinLocationName, setPinLocationName] = useState('');
  const [pinRating, setPinRating] = useState(0);
  const [savingPin, setSavingPin] = useState(false);
  const [existingUserPins, setExistingUserPins] = useState<{ id: string; title: string; latitude: number; longitude: number }[]>([]);
  const [selectedExistingPin, setSelectedExistingPin] = useState<{ id: string; title: string } | null>(null);
  const [showEditMembers, setShowEditMembers] = useState(false);
  const [followersToAdd, setFollowersToAdd] = useState<{ id: string; username: string; avatar_url: string | null }[]>([]);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!id) return;
    fetchAll();

    const channel = supabase
      .channel(`trip-messages-${id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'trip_messages', filter: `trip_id=eq.${id}` },
        () => fetchMessages()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id]);

  const fetchAll = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setCurrentUserId(user.id);

    const [tripRes, membersRes] = await Promise.all([
      supabase.from('trips').select('name, description').eq('id', id).single(),
      supabase
        .from('trip_members')
        .select('user_id, role, profiles(username, avatar_url)')
        .eq('trip_id', id),
    ]);

    if (tripRes.data) {
      setTripName(tripRes.data.name);
      setTripDescription(tripRes.data.description);
    }

    if (membersRes.data) {
      const mapped = membersRes.data.map((m: any) => ({
        user_id: m.user_id,
        role: m.role,
        username: m.profiles?.username ?? 'Unknown',
        avatar_url: m.profiles?.avatar_url ?? null,
      }));
      setMembers(mapped);
      const me = mapped.find((m: Member) => m.user_id === user.id);
      setCurrentRole(me?.role ?? null);
    }

    await Promise.all([fetchPins(), fetchMessages()]);
    setLoading(false);
  };

  const fetchPins = async () => {
    const { data } = await supabase
      .from('trip_pins')
      .select('id, pin_id, pins(title, location_name, rating)')
      .eq('trip_id', id)
      .order('created_at', { ascending: false });

    if (data) {
      setPins(
        data.map((tp: any) => ({
          id: tp.id,
          pin_id: tp.pin_id,
          title: tp.pins?.title ?? '',
          location_name: tp.pins?.location_name ?? null,
          rating: tp.pins?.rating ?? null,
        }))
      );
    }
  };

  const fetchMessages = async () => {
    const { data } = await supabase
      .from('trip_messages')
      .select('id, user_id, content, created_at, profiles(username, avatar_url)')
      .eq('trip_id', id)
      .order('created_at', { ascending: true });

    if (data) {
      setMessages(
        data.map((m: any) => ({
          id: m.id,
          user_id: m.user_id,
          content: m.content,
          created_at: m.created_at,
          username: m.profiles?.username ?? 'Unknown',
          avatar_url: m.profiles?.avatar_url ?? null,
        }))
      );
    }
  };

  const sendMessage = async () => {
    if (!messageText.trim() || !currentUserId) return;
    setSending(true);
    await supabase.from('trip_messages').insert({
      trip_id: id,
      user_id: currentUserId,
      content: messageText.trim(),
    });
    setMessageText('');
    setSending(false);
  };

  const openAddPin = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') {
      const current = await Location.getCurrentPositionAsync({});
      setPinLocation({ latitude: current.coords.latitude, longitude: current.coords.longitude });
    }
    setAddPinStep('map');
    setPinTitle('');
    setPinDescription('');
    setPinLocationName('');
    setPinRating(0);
    setSearchQuery('');
    setSelectedExistingPin(null);

    // Load user's pins not already in this trip
    if (currentUserId) {
      const alreadyAdded = pins.map((p) => p.pin_id);
      const { data } = await supabase
        .from('pins')
        .select('id, title, latitude, longitude')
        .eq('user_id', currentUserId);
      if (data) {
        setExistingUserPins(data.filter((p) => !alreadyAdded.includes(p.id)));
      }
    }

    setShowAddPin(true);
  };

  const addExistingPinToTrip = async (pinId: string) => {
    if (!currentUserId) return;
    setSavingPin(true);
    const { error } = await supabase.from('trip_pins').insert({
      trip_id: id,
      pin_id: pinId,
      added_by: currentUserId,
    });
    setSavingPin(false);
    if (error) {
      Alert.alert('Error', 'Could not add pin to trip.');
      return;
    }
    setShowAddPin(false);
    fetchPins();
  };

  const searchLocation = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const results = await Location.geocodeAsync(searchQuery.trim());
      if (results.length > 0) {
        setPinLocation({ latitude: results[0].latitude, longitude: results[0].longitude });
        setPinLocationName(searchQuery.trim());
      } else {
        Alert.alert('Not found', 'Could not find that location. Try a different search.');
      }
    } catch {
      Alert.alert('Error', 'Search failed. Try again.');
    }
    setSearching(false);
  };

  const saveNewPin = async () => {
    if (!pinTitle.trim()) {
      Alert.alert('Error', 'Please add a title for your pin.');
      return;
    }
    if (!pinLocation) {
      Alert.alert('Error', 'Please pick a location on the map first.');
      return;
    }
    if (!currentUserId) return;
    setSavingPin(true);

    const { data: newPin, error: pinError } = await supabase
      .from('pins')
      .insert({
        user_id: currentUserId,
        title: pinTitle.trim(),
        description: pinDescription.trim() || null,
        location_name: pinLocationName.trim() || null,
        latitude: pinLocation.latitude,
        longitude: pinLocation.longitude,
        rating: pinRating || null,
        is_public: true,
      })
      .select()
      .single();

    if (pinError || !newPin) {
      Alert.alert('Error', 'Could not save pin.');
      setSavingPin(false);
      return;
    }

    const { error: tripPinError } = await supabase.from('trip_pins').insert({
      trip_id: id,
      pin_id: newPin.id,
      added_by: currentUserId,
    });

    if (tripPinError) {
      Alert.alert('Error', 'Pin saved but could not be added to the trip.');
    }

    setSavingPin(false);
    setShowAddPin(false);
    fetchPins();
  };

  const leaveTrip = () => {
    if (!currentUserId) return;
    Alert.alert('Leave trip', 'Are you sure you want to leave this trip?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: async () => {
          await supabase
            .from('trip_members')
            .delete()
            .eq('trip_id', id)
            .eq('user_id', currentUserId);
          router.replace('/(tabs)/trips');
        },
      },
    ]);
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2D6A4F" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>{tripName}</Text>
          {tripDescription ? (
            <Text style={styles.headerSub} numberOfLines={1}>{tripDescription}</Text>
          ) : null}
        </View>
        {currentRole !== 'owner' && (
          <TouchableOpacity onPress={leaveTrip}>
            <Text style={styles.leaveText}>Leave</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Members strip */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.membersStrip}
        contentContainerStyle={styles.membersContent}>
        {members.map((m) => (
          <View key={m.user_id} style={styles.memberItem}>
            <View style={[styles.memberAvatar, m.role === 'owner' && styles.memberAvatarOwner]}>
              <Text style={styles.memberInitials}>{m.username.slice(0, 2).toUpperCase()}</Text>
            </View>
            <Text style={styles.memberName} numberOfLines={1}>{m.username}</Text>
            {m.role === 'owner' && <Text style={styles.ownerBadge}>owner</Text>}
          </View>
        ))}
      </ScrollView>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === 'pins' && styles.tabActive]}
          onPress={() => setTab('pins')}>
          <Text style={[styles.tabText, tab === 'pins' && styles.tabTextActive]}>📍 Pins</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'chat' && styles.tabActive]}
          onPress={() => setTab('chat')}>
          <Text style={[styles.tabText, tab === 'chat' && styles.tabTextActive]}>💬 Chat</Text>
        </TouchableOpacity>
      </View>

      {/* Pins tab */}
      {tab === 'pins' && (
        <FlatList
          data={pins}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <TouchableOpacity style={styles.addPinBtn} onPress={openAddPin}>
              <Text style={styles.addPinBtnText}>+ Add a pin</Text>
            </TouchableOpacity>
          }
          renderItem={({ item }) => (
            <View style={styles.pinCard}>
              <View style={styles.pinIcon}>
                <Text style={styles.pinIconText}>📍</Text>
              </View>
              <View style={styles.pinContent}>
                <Text style={styles.pinTitle}>{item.title}</Text>
                {item.location_name ? (
                  <Text style={styles.pinLocation}>{item.location_name}</Text>
                ) : null}
                {item.rating ? (
                  <Text style={styles.pinRating}>
                    {'★'.repeat(item.rating)}{'☆'.repeat(5 - item.rating)}
                  </Text>
                ) : null}
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>📍</Text>
              <Text style={styles.emptyText}>No pins yet</Text>
              <Text style={styles.emptySub}>Add pins to plan where you'll go</Text>
            </View>
          }
        />
      )}

      {/* Chat tab */}
      {tab === 'chat' && (
        <>
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.chatList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            renderItem={({ item }) => {
              const isMe = item.user_id === currentUserId;
              return (
                <View style={[styles.msgRow, isMe && styles.msgRowMe]}>
                  {!isMe && (
                    <View style={styles.msgAvatar}>
                      <Text style={styles.msgAvatarText}>
                        {item.username.slice(0, 2).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View style={[styles.msgBubble, isMe && styles.msgBubbleMe]}>
                    {!isMe && (
                      <Text style={styles.msgUsername}>{item.username}</Text>
                    )}
                    <Text style={[styles.msgContent, isMe && styles.msgContentMe]}>
                      {item.content}
                    </Text>
                    <Text style={[styles.msgTime, isMe && styles.msgTimeMe]}>
                      {formatTime(item.created_at)}
                    </Text>
                  </View>
                </View>
              );
            }}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyEmoji}>💬</Text>
                <Text style={styles.emptyText}>No messages yet</Text>
                <Text style={styles.emptySub}>Say hello to your travel crew!</Text>
              </View>
            }
          />
          <View style={styles.inputRow}>
            <TextInput
              style={styles.chatInput}
              placeholder="Message..."
              value={messageText}
              onChangeText={setMessageText}
              onSubmitEditing={sendMessage}
              returnKeyType="send"
            />
            <TouchableOpacity
              style={[styles.sendBtn, (!messageText.trim() || sending) && styles.sendBtnDisabled]}
              onPress={sendMessage}
              disabled={!messageText.trim() || sending}>
              <Text style={styles.sendBtnText}>↑</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Add pin modal */}
      <Modal visible={showAddPin} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView style={styles.modal} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          {/* Modal header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => addPinStep === 'form' ? setAddPinStep('map') : setShowAddPin(false)}>
              <Text style={styles.modalBack}>{addPinStep === 'form' ? '‹ Map' : 'Cancel'}</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{addPinStep === 'map' ? 'Pick a location' : 'Pin details'}</Text>
            {addPinStep === 'map' ? (
              <TouchableOpacity
                style={[styles.modalNextBtn, (!pinLocation && !selectedExistingPin) && { opacity: 0.4 }]}
                onPress={() => selectedExistingPin ? addExistingPinToTrip(selectedExistingPin.id) : setAddPinStep('form')}
                disabled={!pinLocation && !selectedExistingPin}>
                <Text style={styles.modalNextText}>
                  {savingPin ? 'Adding...' : selectedExistingPin ? 'Add' : 'Next'}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.modalNextBtn, savingPin && { opacity: 0.4 }]}
                onPress={saveNewPin}
                disabled={savingPin}>
                <Text style={styles.modalNextText}>{savingPin ? 'Saving...' : 'Save'}</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Step 1: Map + search */}
          {addPinStep === 'map' && (
            <View style={{ flex: 1 }}>
              {/* Search bar */}
              <View style={styles.searchRow}>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search for a place..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  onSubmitEditing={searchLocation}
                  returnKeyType="search"
                />
                <TouchableOpacity
                  style={[styles.searchBtn, searching && { opacity: 0.5 }]}
                  onPress={searchLocation}
                  disabled={searching}>
                  <Text style={styles.searchBtnText}>{searching ? '...' : '🔍'}</Text>
                </TouchableOpacity>
              </View>

              {pinLocation ? (
                <MapView
                  style={styles.modalMap}
                  provider={PROVIDER_DEFAULT}
                  // @ts-ignore
                  userInterfaceStyle="automatic"
                  region={{
                    latitude: pinLocation.latitude,
                    longitude: pinLocation.longitude,
                    latitudeDelta: 0.05,
                    longitudeDelta: 0.05,
                  }}
                  onPress={(e) => {
                    setSelectedExistingPin(null);
                    setPinLocation(e.nativeEvent.coordinate);
                  }}>
                  {/* New pin location */}
                  {!selectedExistingPin && (
                    <Marker coordinate={pinLocation} pinColor="#2D6A4F" />
                  )}
                  {/* Existing user pins */}
                  {existingUserPins.map((p) => (
                    <Marker
                      key={p.id}
                      coordinate={{ latitude: p.latitude, longitude: p.longitude }}
                      pinColor={selectedExistingPin?.id === p.id ? '#FF6B35' : '#1A73E8'}
                      title={p.title}
                      onPress={() => {
                        setSelectedExistingPin({ id: p.id, title: p.title });
                        setPinLocation({ latitude: p.latitude, longitude: p.longitude });
                      }}
                    />
                  ))}
                </MapView>
              ) : (
                <View style={styles.mapPlaceholder}>
                  <ActivityIndicator size="large" color="#2D6A4F" />
                  <Text style={styles.mapPlaceholderText}>Getting your location...</Text>
                </View>
              )}
              {selectedExistingPin ? (
                <View style={styles.selectedPinBar}>
                  <Text style={styles.selectedPinText}>📍 {selectedExistingPin.title}</Text>
                  <TouchableOpacity onPress={() => setSelectedExistingPin(null)}>
                    <Text style={styles.selectedPinClear}>✕</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <Text style={styles.mapHint}>Tap a blue pin to add it, or tap the map to create new</Text>
              )}
            </View>
          )}

          {/* Step 2: Pin details form */}
          {addPinStep === 'form' && (
            <ScrollView contentContainerStyle={styles.formScroll}>
              <Text style={styles.formLabel}>Title *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. Amazing coffee shop"
                value={pinTitle}
                onChangeText={setPinTitle}
              />

              <Text style={styles.formLabel}>Location name</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. Paris, France"
                value={pinLocationName}
                onChangeText={setPinLocationName}
              />

              <Text style={styles.formLabel}>Description</Text>
              <TextInput
                style={[styles.formInput, styles.formTextArea]}
                placeholder="What's here? Any tips?"
                value={pinDescription}
                onChangeText={setPinDescription}
                multiline
                numberOfLines={3}
              />

              <Text style={styles.formLabel}>Rating</Text>
              <View style={styles.stars}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity key={star} onPress={() => setPinRating(star)}>
                    <Text style={[styles.star, pinRating >= star && styles.starActive]}>★</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          )}
        </KeyboardAvoidingView>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    gap: 12,
  },
  back: { fontSize: 36, color: '#2D6A4F', lineHeight: 40, width: 24 },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#11181C' },
  headerSub: { fontSize: 12, color: '#687076', marginTop: 1 },
  leaveText: { fontSize: 14, color: '#E24B4A', fontWeight: '600' },
  membersStrip: { maxHeight: 90, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  membersContent: { paddingHorizontal: 16, paddingVertical: 10, gap: 14, flexDirection: 'row' },
  memberItem: { alignItems: 'center', gap: 3, width: 52 },
  memberAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#D4F0E4',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  memberAvatarOwner: { borderColor: '#2D6A4F' },
  memberInitials: { fontSize: 13, fontWeight: '700', color: '#2D6A4F' },
  memberName: { fontSize: 11, color: '#687076', textAlign: 'center' },
  ownerBadge: { fontSize: 9, color: '#2D6A4F', fontWeight: '700', textTransform: 'uppercase' },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#2D6A4F' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#687076' },
  tabTextActive: { color: '#2D6A4F' },
  list: { padding: 16, gap: 10 },
  addPinBtn: {
    backgroundColor: '#F5FAF7',
    borderWidth: 1,
    borderColor: '#A8DFC9',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginBottom: 4,
  },
  addPinBtnText: { color: '#2D6A4F', fontWeight: '600', fontSize: 15 },
  pinCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E0F0E8',
    backgroundColor: '#F9FBF9',
  },
  pinIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#D4F0E4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pinIconText: { fontSize: 18 },
  pinContent: { flex: 1, gap: 2 },
  pinTitle: { fontSize: 15, fontWeight: '600', color: '#11181C' },
  pinLocation: { fontSize: 12, color: '#687076' },
  pinRating: { fontSize: 12, color: '#FFB800' },
  addIcon: { fontSize: 22, color: '#2D6A4F', fontWeight: '700' },
  empty: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyEmoji: { fontSize: 44 },
  emptyText: { fontSize: 17, fontWeight: '700', color: '#11181C' },
  emptySub: { fontSize: 13, color: '#687076' },
  chatList: { padding: 16, gap: 4, flexGrow: 1 },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 6 },
  msgRowMe: { flexDirection: 'row-reverse' },
  msgAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#D4F0E4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  msgAvatarText: { fontSize: 10, fontWeight: '700', color: '#2D6A4F' },
  msgBubble: {
    maxWidth: '72%',
    backgroundColor: '#F3F3F3',
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 2,
  },
  msgBubbleMe: { backgroundColor: '#2D6A4F', borderBottomLeftRadius: 18, borderBottomRightRadius: 4 },
  msgUsername: { fontSize: 11, fontWeight: '700', color: '#2D6A4F', marginBottom: 2 },
  msgContent: { fontSize: 15, color: '#11181C' },
  msgContentMe: { color: '#fff' },
  msgTime: { fontSize: 10, color: '#aaa', alignSelf: 'flex-end' },
  msgTimeMe: { color: 'rgba(255,255,255,0.6)' },
  inputRow: {
    flexDirection: 'row',
    padding: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    alignItems: 'center',
  },
  chatInput: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: '#11181C',
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2D6A4F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  modal: { flex: 1, backgroundColor: '#fff' },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#11181C' },
  modalClose: { fontSize: 16, color: '#2D6A4F', fontWeight: '600' },
  modalBack: { fontSize: 16, color: '#687076' },
  modalNextBtn: { backgroundColor: '#2D6A4F', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  modalNextText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  searchRow: { flexDirection: 'row', padding: 12, gap: 8, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  searchInput: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#11181C',
  },
  searchBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F5F5', borderRadius: 12 },
  searchBtnText: { fontSize: 18 },
  modalMap: { width: '100%', flex: 1 },
  mapPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  mapPlaceholderText: { fontSize: 14, color: '#687076' },
  mapHint: { textAlign: 'center', fontSize: 12, color: '#687076', paddingVertical: 8, backgroundColor: '#F5F5F5' },
  formScroll: { padding: 20, gap: 4 },
  formLabel: { fontSize: 14, fontWeight: '600', color: '#11181C', marginTop: 12, marginBottom: 4 },
  formInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#11181C',
  },
  formTextArea: { height: 80, textAlignVertical: 'top' },
  stars: { flexDirection: 'row', gap: 8, marginTop: 4 },
  star: { fontSize: 32, color: '#E0E0E0' },
  starActive: { color: '#FFB800' },
  selectedPinBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F5FAF7',
    borderTopWidth: 1,
    borderTopColor: '#A8DFC9',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  selectedPinText: { fontSize: 14, fontWeight: '600', color: '#2D6A4F', flex: 1 },
  selectedPinClear: { fontSize: 16, color: '#687076', paddingLeft: 12 },
});
