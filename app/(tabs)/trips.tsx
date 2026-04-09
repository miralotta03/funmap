import { supabase } from '@/lib/supabase';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

type Trip = {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  created_at: string;
  member_count: number;
  pin_count: number;
};

export default function TripsScreen() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      fetchTrips();
    }, [])
  );

  const fetchTrips = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: memberRows } = await supabase
      .from('trip_members')
      .select('trip_id')
      .eq('user_id', user.id);

    if (!memberRows || memberRows.length === 0) {
      setTrips([]);
      setLoading(false);
      return;
    }

    const tripIds = memberRows.map((r: any) => r.trip_id);

    const { data: tripData } = await supabase
      .from('trips')
      .select('*')
      .in('id', tripIds)
      .order('created_at', { ascending: false });

    if (!tripData) {
      setTrips([]);
      setLoading(false);
      return;
    }

    const [memberCounts, pinCounts] = await Promise.all([
      Promise.all(
        tripIds.map((id: string) =>
          supabase.from('trip_members').select('*', { count: 'exact', head: true }).eq('trip_id', id)
        )
      ),
      Promise.all(
        tripIds.map((id: string) =>
          supabase.from('trip_pins').select('*', { count: 'exact', head: true }).eq('trip_id', id)
        )
      ),
    ]);

    const tripsWithCounts = tripData.map((trip: any, i: number) => ({
      ...trip,
      member_count: memberCounts[i].count ?? 0,
      pin_count: pinCounts[i].count ?? 0,
    }));

    setTrips(tripsWithCounts);
    setLoading(false);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2D6A4F" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Trips</Text>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => router.push('/create-trip')}>
          <Text style={styles.createButtonText}>+ New Trip</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={trips}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push(`/trip-detail?id=${item.id}`)}>
            <View style={styles.cardIcon}>
              <Text style={styles.cardIconText}>✈️</Text>
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardName}>{item.name}</Text>
              {item.description ? (
                <Text style={styles.cardDesc} numberOfLines={1}>{item.description}</Text>
              ) : null}
              <View style={styles.cardMeta}>
                <Text style={styles.cardMetaText}>👤 {item.member_count}</Text>
                <Text style={styles.cardMetaText}>📍 {item.pin_count}</Text>
              </View>
            </View>
            <Text style={styles.cardChevron}>›</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>✈️</Text>
            <Text style={styles.emptyTitle}>No trips yet</Text>
            <Text style={styles.emptySubtitle}>Create a trip and plan places with friends</Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => router.push('/create-trip')}>
              <Text style={styles.emptyButtonText}>Create your first trip</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#11181C' },
  createButton: {
    backgroundColor: '#2D6A4F',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  createButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  list: { padding: 16, gap: 12 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FBF9',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E0F0E8',
    gap: 12,
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#D4F0E4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardIconText: { fontSize: 22 },
  cardContent: { flex: 1, gap: 4 },
  cardName: { fontSize: 16, fontWeight: '700', color: '#11181C' },
  cardDesc: { fontSize: 13, color: '#687076' },
  cardMeta: { flexDirection: 'row', gap: 12, marginTop: 4 },
  cardMetaText: { fontSize: 12, color: '#687076' },
  cardChevron: { fontSize: 22, color: '#C0C0C0' },
  empty: { alignItems: 'center', paddingTop: 80, gap: 12, paddingHorizontal: 32 },
  emptyEmoji: { fontSize: 52 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#11181C' },
  emptySubtitle: { fontSize: 14, color: '#687076', textAlign: 'center' },
  emptyButton: {
    marginTop: 8,
    backgroundColor: '#2D6A4F',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  emptyButtonText: { color: '#fff', fontWeight: '600', fontSize: 15 },
});
