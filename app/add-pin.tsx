import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
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
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';

import { supabase } from '@/lib/supabase';

export default function AddPinScreen() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [locationName, setLocationName] = useState('');
  const [rating, setRating] = useState(0);
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<{ uri: string; base64: string }[]>([]);
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

  const handlePickImages = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photo library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.7,
      base64: true,
      selectionLimit: 5,
    });
    if (result.canceled) return;
    const picked = result.assets
      .filter((a) => a.base64)
      .map((a) => ({ uri: a.uri, base64: a.base64! }));
    setImages((prev) => [...prev, ...picked].slice(0, 5));
  };

  const handleRemoveImage = (uri: string) => {
    setImages((prev) => prev.filter((img) => img.uri !== uri));
  };

  const uploadImages = async (pinId: string, userId: string) => {
    for (const img of images) {
      const rawExt = img.uri.split('.').pop()?.split('?')[0]?.toLowerCase();
      const fileExt = ['jpg', 'jpeg', 'png', 'webp', 'heic'].includes(rawExt ?? '') ? rawExt! : 'jpg';
      const filePath = `${userId}/${pinId}/${Date.now()}.${fileExt}`;

      const byteCharacters = atob(img.base64);
      const byteArray = new Uint8Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteArray[i] = byteCharacters.charCodeAt(i);
      }

      const { error: uploadError } = await supabase.storage
        .from('pin-images')
        .upload(filePath, byteArray, { upsert: true, contentType: `image/${fileExt}` });

      if (uploadError) {
        Alert.alert('Storage upload failed', uploadError.message);
        continue;
      }

      const { data: urlData } = supabase.storage.from('pin-images').getPublicUrl(filePath);
      const { error: insertError } = await supabase.from('pin_images').insert({ pin_id: pinId, url: urlData.publicUrl });
      if (insertError) Alert.alert('Database insert failed', insertError.message);
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

    const { data, error } = await supabase.from('pins').insert({
      user_id: user.id,
      title: title.trim(),
      description: description.trim(),
      location_name: locationName.trim(),
      latitude: pinLocation.latitude,
      longitude: pinLocation.longitude,
      rating: rating || null,
      is_public: true,
    }).select().single();

    if (error) {
      setLoading(false);
      Alert.alert('Error', error.message);
      return;
    }

    if (data && images.length > 0) {
      await uploadImages(data.id, user.id);
    }

    setLoading(false);
    router.back();
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
            placeholderTextColor="#A0A0A0"
            value={title}
            onChangeText={setTitle}
          />

          <Text style={styles.label}>Location name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Paris, France"
            placeholderTextColor="#A0A0A0"
            value={locationName}
            onChangeText={setLocationName}
          />

          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="What did you do here? Any recommendations?"
            placeholderTextColor="#A0A0A0"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
          />

          <Text style={styles.label}>Photos</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoRow}>
            {images.map((img) => (
              <View key={img.uri} style={styles.photoThumbContainer}>
                <Image source={{ uri: img.uri }} style={styles.photoThumb} />
                <TouchableOpacity
                  style={styles.photoRemove}
                  onPress={() => handleRemoveImage(img.uri)}>
                  <Text style={styles.photoRemoveText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
            {images.length < 5 && (
              <TouchableOpacity style={styles.photoAdd} onPress={handlePickImages}>
                <Text style={styles.photoAddIcon}>+</Text>
                <Text style={styles.photoAddText}>Add photo</Text>
              </TouchableOpacity>
            )}
          </ScrollView>

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
  photoRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  photoThumbContainer: {
    position: 'relative',
    marginRight: 8,
  },
  photoThumb: {
    width: 80,
    height: 80,
    borderRadius: 10,
  },
  photoRemove: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoRemoveText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  photoAdd: {
    width: 80,
    height: 80,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  photoAddIcon: {
    fontSize: 24,
    color: '#2D6A4F',
    lineHeight: 28,
  },
  photoAddText: {
    fontSize: 11,
    color: '#687076',
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
