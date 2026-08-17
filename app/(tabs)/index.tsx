import * as Location from 'expo-location';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { supabase } from '@/lib/supabase';

const SCREEN_WIDTH = Dimensions.get('window').width;

type Pin = {
  id: string;
  user_id: string;
  title: string;
  description: string;
  location_name: string;
  latitude: number;
  longitude: number;
  rating: number;
  pin_images?: { url: string }[];
};

type Tab = 'discover' | 'friends';

export default function MapScreen() {
  const mapRef = useRef<MapView>(null);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [pins, setPins] = useState<Pin[]>([]);
  const [selectedPin, setSelectedPin] = useState<Pin | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('discover');
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [carouselWidth, setCarouselWidth] = useState(SCREEN_WIDTH - 64);

  useFocusEffect(
    useCallback(() => {
      fetchPins();
    }, [activeTab, currentUserId])
  );

  useEffect(() => {
    requestLocation();
    fetchCurrentUser();
  }, []);

  const fetchCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setCurrentUserId(user.id);
  };

  const requestLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission denied', 'Allow location access to see your position on the map.');
      return;
    }
    const current = await Location.getCurrentPositionAsync({});
    setLocation({
      latitude: current.coords.latitude,
      longitude: current.coords.longitude,
    });
  };

  const fetchPins = async () => {
    if (activeTab === 'discover') {
      const { data, error } = await supabase
        .from('pins')
        .select('*, pin_images(url)')
        .eq('is_public', true);
      if (!error && data) setPins(data);
    } else {
      if (!currentUserId) return;
      const { data: followData } = await supabase
        .from('followers')
        .select('following_id')
        .eq('follower_id', currentUserId)
        .eq('status', 'accepted');

      const friendIds = (followData ?? []).map((f) => f.following_id);
      if (friendIds.length === 0) { setPins([]); return; }

      const { data, error } = await supabase
        .from('pins')
        .select('*, pin_images(url)')
        .in('user_id', friendIds);
      if (!error && data) setPins(data);
    }
  };

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    setSelectedPin(null);
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        // @ts-ignore
        userInterfaceStyle="automatic"
        showsUserLocation
        onPress={() => setSelectedPin(null)}
        initialRegion={
          location
            ? {
                latitude: location.latitude,
                longitude: location.longitude,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
              }
            : {
                latitude: 48.8566,
                longitude: 2.3522,
                latitudeDelta: 50,
                longitudeDelta: 50,
              }
        }>
        {pins.map((pin) => (
          <Marker
            key={pin.id}
            coordinate={{ latitude: pin.latitude, longitude: pin.longitude }}
            anchor={{ x: 0.5, y: 1 }}
            onPress={(e) => {
              e.stopPropagation();
              setActiveImageIndex(0);
              setSelectedPin(pin);
            }}>
            <View style={markerStyles.container}>
              <View style={markerStyles.ball} />
              <View style={markerStyles.needle} />
            </View>
          </Marker>
        ))}
      </MapView>

      {/* Floating header */}
      <View style={styles.header} pointerEvents="box-none">
        <TouchableOpacity style={styles.iconButton} onPress={() => router.push('/add-pin')}>
          <Text style={styles.iconButtonText}>+</Text>
        </TouchableOpacity>

        <View style={styles.tabs}>
          <TouchableOpacity onPress={() => handleTabChange('discover')}>
            <Text style={[styles.tabText, activeTab === 'discover' && styles.tabTextActive]}>
              Discover
            </Text>
            {activeTab === 'discover' && <View style={styles.tabUnderline} />}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleTabChange('friends')}>
            <Text style={[styles.tabText, activeTab === 'friends' && styles.tabTextActive]}>
              Friends
            </Text>
            {activeTab === 'friends' && <View style={styles.tabUnderline} />}
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => router.push('/follow-requests')}>
          <IconSymbol name="bell.fill" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Pin popup */}
      {selectedPin && (
        <View style={styles.popup}>
          <View style={styles.popupHeader}>
            <Text style={styles.popupTitle}>{selectedPin.title}</Text>
            <TouchableOpacity onPress={() => setSelectedPin(null)}>
              <Text style={styles.popupClose}>✕</Text>
            </TouchableOpacity>
          </View>

          {selectedPin.pin_images && selectedPin.pin_images.length > 0 && (
            <View
              onLayout={(e) => setCarouselWidth(e.nativeEvent.layout.width)}
              style={styles.carouselContainer}>
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={(e) => {
                  const index = Math.round(e.nativeEvent.contentOffset.x / carouselWidth);
                  setActiveImageIndex(index);
                }}
                scrollEventThrottle={16}>
                {selectedPin.pin_images.map((img, i) => (
                  <Image
                    key={i}
                    source={{ uri: img.url }}
                    style={[styles.carouselImage, { width: carouselWidth }]}
                    resizeMode="cover"
                  />
                ))}
              </ScrollView>
              {selectedPin.pin_images.length > 1 && (
                <View style={styles.dotsRow}>
                  {selectedPin.pin_images.map((_, i) => (
                    <View key={i} style={[styles.dot, i === activeImageIndex && styles.dotActive]} />
                  ))}
                </View>
              )}
            </View>
          )}

          {selectedPin.location_name ? (
            <Text style={styles.popupLocation}>📍 {selectedPin.location_name}</Text>
          ) : null}

          {selectedPin.rating ? (
            <Text style={styles.popupRating}>
              {'★'.repeat(selectedPin.rating)}{'☆'.repeat(5 - selectedPin.rating)}
            </Text>
          ) : null}

          {selectedPin.description ? (
            <Text style={styles.popupDescription} numberOfLines={2}>
              {selectedPin.description}
            </Text>
          ) : null}

          {selectedPin.user_id === currentUserId && (
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => {
                setSelectedPin(null);
                router.push({ pathname: '/edit-pin', params: { id: selectedPin.id } });
              }}>
              <Text style={styles.editButtonText}>Edit pin</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const markerStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 3,
    elevation: 4,
  },
  ball: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#1A1A1A',
    borderWidth: 2,
    borderColor: '#fff',
  },
  needle: {
    width: 2.5,
    height: 22,
    backgroundColor: '#1A1A1A',
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  header: {
    position: 'absolute',
    top: 56,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  iconButtonText: {
    color: '#fff',
    fontSize: 26,
    lineHeight: 30,
    fontWeight: '300',
  },
  tabs: {
    flexDirection: 'row',
    gap: 20,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '500',
    color: 'rgba(0,0,0,0.4)',
  },
  tabTextActive: {
    color: '#000',
    fontWeight: '700',
  },
  tabUnderline: {
    height: 2,
    backgroundColor: '#000',
    borderRadius: 1,
    marginTop: 2,
  },
  popup: {
    position: 'absolute',
    bottom: 110,
    left: 16,
    right: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    gap: 6,
  },
  popupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  popupTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#11181C',
    flex: 1,
  },
  popupClose: {
    fontSize: 16,
    color: '#687076',
    paddingLeft: 8,
  },
  carouselContainer: {
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 4,
  },
  carouselImage: {
    height: 160,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 6,
    backgroundColor: '#fff',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D0D0D0',
  },
  dotActive: {
    backgroundColor: '#2D6A4F',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  popupLocation: {
    fontSize: 13,
    color: '#687076',
  },
  popupRating: {
    fontSize: 14,
    color: '#FFB800',
  },
  popupDescription: {
    fontSize: 14,
    color: '#687076',
    lineHeight: 20,
  },
  editButton: {
    marginTop: 8,
    backgroundColor: '#2D6A4F',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  editButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
