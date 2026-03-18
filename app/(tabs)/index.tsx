import { router, useFocusEffect } from 'expo-router';
import { useState, useEffect, useRef, useCallback } from 'react';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { StyleSheet, View, TouchableOpacity, Text, Alert } from 'react-native';
import * as Location from 'expo-location';

import { supabase } from '@/lib/supabase';

type Pin = {
  id: string;
  title: string;
  description: string;
  location_name: string;
  latitude: number;
  longitude: number;
  rating: number;
};

export default function MapScreen() {
  const mapRef = useRef<MapView>(null);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [pins, setPins] = useState<Pin[]>([]);
  const [selectedPin, setSelectedPin] = useState<Pin | null>(null);

  useFocusEffect(
    useCallback(() => {
      fetchPins();
    }, [])
  );

  useEffect(() => {
    requestLocation();
  }, []);

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
    const { data, error } = await supabase
      .from('pins')
      .select('*, pin_images(url)');
    if (!error && data) setPins(data);
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
            onPress={(e) => {
              e.stopPropagation();
              setSelectedPin(pin);
            }}
          />
        ))}
      </MapView>

      {/* Custom pin popup */}
      {selectedPin && (
        <View style={styles.popup}>
          <View style={styles.popupHeader}>
            <Text style={styles.popupTitle}>{selectedPin.title}</Text>
            <TouchableOpacity onPress={() => setSelectedPin(null)}>
              <Text style={styles.popupClose}>✕</Text>
            </TouchableOpacity>
          </View>

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

          <TouchableOpacity
            style={styles.editButton}
            onPress={() => {
              setSelectedPin(null);
              router.push({ pathname: '/edit-pin', params: { id: selectedPin.id } });
            }}>
            <Text style={styles.editButtonText}>Edit pin</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Add pin button */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => router.push('/add-pin')}>
        <Text style={styles.addButtonText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  popup: {
    position: 'absolute',
    bottom: 100,
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
  addButton: {
    position: 'absolute',
    bottom: 32,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2D6A4F',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 32,
    lineHeight: 36,
  },
});