// app/(tabs)/explore.tsx — Tinder-style pin swipe

import { useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    PanResponder,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const { width, height } = Dimensions.get('window');
const CARD_WIDTH = width - 48;
const CARD_HEIGHT = height * 0.62;
const SWIPE_THRESHOLD = 100;

const MOCK_PINS = [
  { id: 'p1', title: 'Cliffside café', location_name: 'Santorini, Greece', rating: 5, username: 'sofia_wanders', color: '#5DCAA5' },
  { id: 'p2', title: 'Cherry blossom park', location_name: 'Tokyo, Japan', rating: 5, username: 'luna_travels', color: '#ED93B1' },
  { id: 'p3', title: 'Secret waterfall', location_name: 'Bali, Indonesia', rating: 4, username: 'marco_explores', color: '#378ADD' },
  { id: 'p4', title: 'Night market', location_name: 'Chiang Mai, Thailand', rating: 5, username: 'kai_adventures', color: '#EF9F27' },
  { id: 'p5', title: 'Lavender fields', location_name: 'Provence, France', rating: 5, username: 'priya_discovers', color: '#AFA9EC' },
  { id: 'p6', title: 'Desert camp', location_name: 'Sahara, Morocco', rating: 5, username: 'elena_roams', color: '#F0997B' },
  { id: 'p7', title: 'Ice cave', location_name: 'Iceland', rating: 5, username: 'luna_travels', color: '#85B7EB' },
  { id: 'p8', title: 'Rooftop sunset', location_name: 'Marrakech, Morocco', rating: 4, username: 'sofia_wanders', color: '#FAC775' },
  { id: 'p9', title: 'Hidden beach cove', location_name: 'Algarve, Portugal', rating: 5, username: 'marco_explores', color: '#97C459' },
  { id: 'p10', title: 'Mountain hut', location_name: 'Dolomites, Italy', rating: 4, username: 'kai_adventures', color: '#F4C0D1' },
];

type Pin = typeof MOCK_PINS[0];

function SwipeCard({
  pin,
  onSwipeLeft,
  onSwipeRight,
  isTop,
  stackIndex,
}: {
  pin: Pin;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  isTop: boolean;
  stackIndex: number;
}) {
  const position = useRef(new Animated.ValueXY()).current;
  const saveOpacity = useRef(new Animated.Value(0)).current;
  const skipOpacity = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => isTop,
      onMoveShouldSetPanResponder: () => isTop,
      onPanResponderMove: (_, gesture) => {
        position.setValue({ x: gesture.dx, y: gesture.dy * 0.3 });
        if (gesture.dx > 30) {
          saveOpacity.setValue(Math.min((gesture.dx - 30) / 60, 1));
          skipOpacity.setValue(0);
        } else if (gesture.dx < -30) {
          skipOpacity.setValue(Math.min((-gesture.dx - 30) / 60, 1));
          saveOpacity.setValue(0);
        } else {
          saveOpacity.setValue(0);
          skipOpacity.setValue(0);
        }
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx > SWIPE_THRESHOLD) {
          flyOut('right');
        } else if (gesture.dx < -SWIPE_THRESHOLD) {
          flyOut('left');
        } else {
          Animated.spring(position, { toValue: { x: 0, y: 0 }, useNativeDriver: true }).start();
          Animated.timing(saveOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start();
          Animated.timing(skipOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  const flyOut = (dir: 'left' | 'right') => {
    Animated.timing(position, {
      toValue: { x: dir === 'right' ? width * 1.5 : -width * 1.5, y: -100 },
      duration: 350,
      useNativeDriver: true,
    }).start(() => {
      if (dir === 'right') onSwipeRight();
      else onSwipeLeft();
    });
  };

  const rotate = position.x.interpolate({
    inputRange: [-width / 2, 0, width / 2],
    outputRange: ['-15deg', '0deg', '15deg'],
  });

  const cardStyle = isTop
    ? { transform: [{ translateX: position.x }, { translateY: position.y }, { rotate }] }
    : { transform: [{ translateY: stackIndex * 10 }, { scale: 1 - stackIndex * 0.04 }] };

  return (
    <Animated.View
      style={[styles.card, cardStyle, { zIndex: 10 - stackIndex }]}
      {...(isTop ? panResponder.panHandlers : {})}>
      <View style={[styles.cardImage, { backgroundColor: pin.color }]}>
        <Text style={styles.cardImageEmoji}>📍</Text>
      </View>
      <Animated.View style={[styles.stamp, styles.saveStamp, { opacity: saveOpacity }]}>
        <Text style={styles.saveStampText}>SAVE</Text>
      </Animated.View>
      <Animated.View style={[styles.stamp, styles.skipStamp, { opacity: skipOpacity }]}>
        <Text style={styles.skipStampText}>SKIP</Text>
      </Animated.View>
      <View style={styles.cardOverlay}>
        <Text style={styles.cardTitle}>{pin.title}</Text>
        <Text style={styles.cardLocation}>📌 {pin.location_name}</Text>
        <View style={styles.cardBottom}>
          <Text style={styles.cardStars}>{'★'.repeat(pin.rating)}{'☆'.repeat(5 - pin.rating)}</Text>
          <Text style={styles.cardUser}>@{pin.username}</Text>
        </View>
      </View>
    </Animated.View>
  );
}

export default function ExploreScreen() {
  const [pins] = useState(MOCK_PINS);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [savedCount, setSavedCount] = useState(0);

  const visiblePins = pins.slice(currentIndex, currentIndex + 3).reverse();
  const isDone = currentIndex >= pins.length;

  const handleSwipeLeft = () => setCurrentIndex((i) => i + 1);
  const handleSwipeRight = () => {
    setSavedCount((c) => c + 1);
    setCurrentIndex((i) => i + 1);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Explore</Text>
          <Text style={styles.headerSub}>Swipe to discover new places</Text>
        </View>
        <View style={styles.savedBadge}>
          <Text style={styles.savedBadgeText}>♥ {savedCount} saved</Text>
        </View>
      </View>

      {/* Hint */}
      <View style={styles.hintRow}>
        <View style={styles.hintLeft}>
          <Text style={styles.hintSkip}>← Skip</Text>
        </View>
        <View style={styles.hintRight}>
          <Text style={styles.hintSave}>Save →</Text>
        </View>
      </View>

      {/* Swipe area */}
      <View style={styles.swipeArea}>
        {isDone ? (
          <View style={styles.doneContainer}>
            <Text style={styles.doneEmoji}>🗺️</Text>
            <Text style={styles.doneText}>All caught up!</Text>
            <Text style={styles.doneSub}>You've seen all pins for now</Text>
            <TouchableOpacity
              style={styles.resetBtn}
              onPress={() => setCurrentIndex(0)}>
              <Text style={styles.resetBtnText}>Start over</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.cardStack}>
              {visiblePins.map((pin, i) => {
                const stackIndex = visiblePins.length - 1 - i;
                return (
                  <SwipeCard
                    key={`${pin.id}-${currentIndex}`}
                    pin={pin}
                    isTop={stackIndex === 0}
                    stackIndex={stackIndex}
                    onSwipeLeft={handleSwipeLeft}
                    onSwipeRight={handleSwipeRight}
                  />
                );
              })}
            </View>

            {/* Counter */}
            <Text style={styles.counter}>
              {currentIndex + 1} / {pins.length}
            </Text>

            {/* Action buttons */}
            <View style={styles.actions}>
              <TouchableOpacity style={styles.skipBtn} onPress={handleSwipeLeft}>
                <Text style={styles.skipBtnText}>✕</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSwipeRight}>
                <Text style={styles.saveBtnText}>♥</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 8,
  },
  headerTitle: { fontSize: 28, fontWeight: '700', color: '#11181C' },
  headerSub: { fontSize: 13, color: '#687076', marginTop: 2 },
  savedBadge: {
    backgroundColor: '#F5FAF7',
    borderWidth: 1,
    borderColor: '#A8DFC9',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  savedBadgeText: { fontSize: 13, fontWeight: '600', color: '#2D6A4F' },
  hintRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 28,
    marginBottom: 4,
  },
  hintLeft: {},
  hintRight: {},
  hintSkip: { fontSize: 13, color: '#E24B4A', fontWeight: '600' },
  hintSave: { fontSize: 13, color: '#2D6A4F', fontWeight: '600' },
  swipeArea: { flex: 1, alignItems: 'center', paddingTop: 8 },
  cardStack: { width: CARD_WIDTH, height: CARD_HEIGHT, position: 'relative' },
  card: {
    position: 'absolute',
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#eee',
  },
  cardImage: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  cardImageEmoji: { fontSize: 80 },
  cardOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  cardTitle: { fontSize: 22, fontWeight: '700', color: '#fff', marginBottom: 4 },
  cardLocation: { fontSize: 14, color: 'rgba(255,255,255,0.85)', marginBottom: 8 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardStars: { color: '#FFB800', fontSize: 16 },
  cardUser: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  stamp: { position: 'absolute', top: 40, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, borderWidth: 4 },
  saveStamp: { left: 20, borderColor: '#2D6A4F', transform: [{ rotate: '-20deg' }] },
  saveStampText: { fontSize: 22, fontWeight: '800', color: '#2D6A4F' },
  skipStamp: { right: 20, borderColor: '#E24B4A', transform: [{ rotate: '20deg' }] },
  skipStampText: { fontSize: 22, fontWeight: '800', color: '#E24B4A' },
  counter: { fontSize: 13, color: '#aaa', marginTop: 10, marginBottom: 2 },
  actions: { flexDirection: 'row', gap: 36, marginTop: 12, alignItems: 'center' },
  skipBtn: {
    width: 60, height: 60, borderRadius: 30, backgroundColor: '#fff',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: '#E0E0E0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
  },
  skipBtnText: { fontSize: 22, color: '#E24B4A' },
  saveBtn: {
    width: 68, height: 68, borderRadius: 34, backgroundColor: '#2D6A4F',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#2D6A4F', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 8, elevation: 6,
  },
  saveBtnText: { fontSize: 26, color: '#fff' },
  doneContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  doneEmoji: { fontSize: 56 },
  doneText: { fontSize: 20, fontWeight: '700', color: '#11181C' },
  doneSub: { fontSize: 14, color: '#687076' },
  resetBtn: {
    marginTop: 8,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: '#2D6A4F',
  },
  resetBtnText: { fontSize: 15, fontWeight: '600', color: '#fff' },
});