import { useState, useEffect } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';

import { supabase } from '@/lib/supabase';

const { width } = Dimensions.get('window');

export default function AddPinScreen() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [locationName, setLocationName] = useState('');
  const [rating, setRating] = useState(0);
  const [loading, setLoading] = useState(false);
  const [pinLocation, setPinLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [usingCurrentLocation, setUsingCurrentLocation] = useState(true);

  useEffect(() => {
    getCurrentLocation();
  }, []);

  const getCurrentLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission denied', 'Allow location access to place pins.');
      return;
    }
    const current = await Location.getCurrentPositionAsync({});
    setPinLocation({
      latitude: current.coords.latitude,
      longitude: current.coords.longitude,
    });
  };

  const handleMapPress = (e: any) => {
    if (!usingCurrentLocation) {
      setPinLocation(e.nativeEvent.coordinate);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please add a title for your pin.');
      return;
    }
    if (!pinLocation) {
      Alert.alert('Error', 'Could not get location. Please try again.');
      return;
    }

    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from('pins').insert({
      user_id: user.id,
      title: title.trim(),
      description: description.trim(),
      location_name: locationName.trim(),
      latitude: pinLocation.latitude,
      longitude: pinLocation.longitude,
      rating: rating || null,
      is_public: true,
    });

    setLoading(false);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      router.back();
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.cancel}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>New Pin</Text>
          <TouchableOpacity onPress={handleSave} disabled={loading}>
            <Text style={[styles.save, loading && { opacity: 0.5 }]}>
              {loading ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Location toggle */}
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[styles.toggleButton, usingCurrentLocation && styles.toggleActive]}
            onPress={() => {
              setUsingCurrentLocation(true);
              getCurrentLocation();
            }}>
            <Text style={[styles.toggleText, usingCurrentLocation && styles.toggleTextActive]}>
              📍 Current location
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, !usingCurrentLocation && styles.toggleActive]}
            onPress={() => setUsingCurrentLocation(false)}>
            <Text style={[styles.toggleText, !usingCurrentLocation && styles.toggleTextActive]}>
              🗺️ Pick on map
            </Text>
          </TouchableOpacity>
        </View>

        {/* Map preview */}
        {pinLocation && (
          <View style={styles.mapContainer}>
            <MapView
              style={styles.map}
              provider={PROVIDER_DEFAULT}
              // @ts-ignore
              userInterfaceStyle="automatic"
              onPress={handleMapPress}
              region={{
                latitude: pinLocation.latitude,
                longitude: pinLocation.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}>
              <Marker coordinate={pinLocation} />
            </MapView>
            {!usingCurrentLocation && (
              <Text style={styles.mapHint}>Tap anywhere on the map to move the pin</Text>
            )}
          </View>
        )}

        {/* Form */}
        <View style={styles.form}>
          <Text style={styles.label}>Title *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Amazing coffee shop"
            value={title}
            onChangeText={setTitle}
          />

          <Text style={styles.label}>Location name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Paris, France"
            value={locationName}
            onChangeText={setLocationName}
          />

          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="What did you do here? Any recommendations?"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
          />

          <Text style={styles.label}>Rating</Text>
          <View style={styles.stars}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity key={star} onPress={() => setRating(star)}>
                <Text style={[styles.star, rating >= star && styles.starActive]}>
                  ★
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scroll: {
    padding: 24,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#11181C',
  },
  cancel: {
    fontSize: 16,
    color: '#687076',
  },
  save: {
    fontSize: 16,
    color: '#2D6A4F',
    fontWeight: '600',
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    gap: 4,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  toggleActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleText: {
    fontSize: 14,
    color: '#687076',
  },
  toggleTextActive: {
    color: '#2D6A4F',
    fontWeight: '600',
  },
  mapContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 8,
  },
  map: {
    width: '100%',
    height: 200,
  },
  mapHint: {
    textAlign: 'center',
    fontSize: 12,
    color: '#687076',
    paddingVertical: 8,
    backgroundColor: '#F5F5F5',
  },
  form: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#11181C',
    marginTop: 16,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#11181C',
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  stars: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  star: {
    fontSize: 36,
    color: '#E0E0E0',
  },
  starActive: {
    color: '#FFB800',
  },
});