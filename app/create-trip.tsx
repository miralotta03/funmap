import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

type Follower = {
  id: string;
  username: string;
  avatar_url: string | null;
  selected: boolean;
};

export default function CreateTripScreen() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [followers, setFollowers] = useState<Follower[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadFollowers();
  }, []);

  const loadFollowers = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('followers')
      .select('following_id, profiles!followers_following_id_fkey(id, username, avatar_url)')
      .eq('follower_id', user.id)
      .eq('status', 'accepted');

    if (data) {
      setFollowers(
        data
          .map((r: any) => ({ ...r.profiles, selected: false }))
          .filter(Boolean)
      );
    }
  };

  const toggleFollower = (id: string) => {
    setFollowers((prev) =>
      prev.map((f) => (f.id === id ? { ...f, selected: !f.selected } : f))
    );
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a trip name.');
      return;
    }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: trip, error } = await supabase
      .from('trips')
      .insert({
        name: name.trim(),
        description: description.trim() || null,
        created_by: user.id,
      })
      .select()
      .single();

    if (error || !trip) {
      Alert.alert('Error', error?.message ?? 'Failed to create trip.');
      setSaving(false);
      return;
    }

    // Insert owner first so the trip always works solo
    const { error: ownerError } = await supabase
      .from('trip_members')
      .insert({ trip_id: trip.id, user_id: user.id, role: 'owner' });

    if (ownerError) {
      await supabase.from('trips').delete().eq('id', trip.id);
      Alert.alert('Error', 'Could not create trip. Please try again.');
      setSaving(false);
      return;
    }

    // Then invite selected friends
    const selected = followers.filter((f) => f.selected);
    if (selected.length > 0) {
      const { error: membersError } = await supabase
        .from('trip_members')
        .insert(selected.map((f) => ({ trip_id: trip.id, user_id: f.id, role: 'member' })));

      if (membersError) {
        Alert.alert(
          'Trip created',
          "Some friends could not be added. Make sure everyone you're inviting follows you back.",
          [{ text: 'OK', onPress: () => router.replace(`/trip-detail?id=${trip.id}`) }]
        );
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    router.replace(`/trip-detail?id=${trip.id}`);
  };

  const selectedCount = followers.filter((f) => f.selected).length;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.cancel}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>New Trip</Text>
          <TouchableOpacity onPress={handleCreate} disabled={saving}>
            <Text style={[styles.save, saving && { opacity: 0.5 }]}>
              {saving ? 'Creating...' : 'Create'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Trip name *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Summer in Europe"
            value={name}
            onChangeText={setName}
          />
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="What's the plan?"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Invite friends{selectedCount > 0 ? ` · ${selectedCount} selected` : ''}
          </Text>
          {followers.length === 0 ? (
            <Text style={styles.noFollowers}>Follow people to invite them to trips</Text>
          ) : (
            followers.map((f) => (
              <TouchableOpacity
                key={f.id}
                style={[styles.followerRow, f.selected && styles.followerRowSelected]}
                onPress={() => toggleFollower(f.id)}>
                {f.avatar_url ? (
                  <Image source={{ uri: f.avatar_url }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarFallback}>
                    <Text style={styles.avatarInitials}>
                      {f.username.slice(0, 2).toUpperCase()}
                    </Text>
                  </View>
                )}
                <Text style={styles.followerName}>{f.username}</Text>
                <View style={[styles.checkbox, f.selected && styles.checkboxSelected]}>
                  {f.selected && <Text style={styles.checkmark}>✓</Text>}
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scroll: { padding: 24, paddingTop: 60, paddingBottom: 40 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 28,
  },
  headerTitle: { fontSize: 17, fontWeight: '600', color: '#11181C' },
  cancel: { fontSize: 16, color: '#687076' },
  save: { fontSize: 16, color: '#2D6A4F', fontWeight: '600' },
  form: { gap: 8, marginBottom: 28 },
  label: { fontSize: 14, fontWeight: '600', color: '#11181C', marginTop: 12, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#11181C',
  },
  textArea: { height: 90, textAlignVertical: 'top' },
  section: { gap: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#11181C', marginBottom: 4 },
  noFollowers: { fontSize: 14, color: '#aaa', fontStyle: 'italic' },
  followerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#fff',
  },
  followerRowSelected: {
    borderColor: '#2D6A4F',
    backgroundColor: '#F5FAF7',
  },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  avatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#D4F0E4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: { fontSize: 14, fontWeight: '700', color: '#2D6A4F' },
  followerName: { flex: 1, fontSize: 15, fontWeight: '500', color: '#11181C' },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: { backgroundColor: '#2D6A4F', borderColor: '#2D6A4F' },
  checkmark: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
