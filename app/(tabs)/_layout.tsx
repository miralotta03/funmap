// `app/(tabs)/_layout.tsx` — The Tab Bar

// The parentheses in `(tabs)` are special 
// — they mean it's a **group** that doesn't 
// appear in the URL/route. This file defines 
// your **bottom tab bar**.

// The Tabs navigator — this is what 
// creates the bottom tab bar you see 
// in most apps. Just like Stack handles 
// slide-in navigation, Tabs handles the 
// tab bar at the bottom.
import { Tabs } from 'expo-router';
// The core React library. In older 
// React you had to import this in 
// every single file that used JSX 
// (the HTML-like syntax). In modern 
// React you technically don't need 
// it anymore, but it's still common 
// to include it and some setups 
// require it. You'll see it at the 
// top of many files.
import React from 'react';

// Your custom tab button component that adds a subtle 
// vibration when tapped. It replaces the default boring 
// tab button with one that has tactile feedback.
import { HapticTab } from '@/components/haptic-tab';
// You've seen this one before — the icon component 
// that uses SF Symbols (Apple's icon library) on iOS. 
// On Android it falls back to a different icon set 
// since SF Symbols are Apple-only.
import { IconSymbol } from '@/components/ui/icon-symbol';
//Similar to Fonts from before, this is where all your app 
// colors are defined in one place. This is why you saw 
// Colors[colorScheme ?? 'light'].tint — it looks up the 
// right color based on dark/light mode. Instead of hardcoding
// '#FF0000' everywhere you write Colors.light.tint and 
// change it in one place if needed.
import { Colors } from '@/constants/theme';
// detects whether the user's phone is in dark or light 
// mode so you can pass the right colors to the tab bar.
import { useColorScheme } from '@/hooks/use-color-scheme';

// Right now it has two tabs: 
// `index` (Home) and `explore`. 
// For your travel app you'll want 
// to change these to something like:

// - **Map** (your main screen)
// - **Feed** (the Instagram-style view)
// - Maybe **Profile**
export default function TabLayout() {
  // Reads the users phone and sets 
  // dark mode or light mode accordingly
  const colorScheme = useColorScheme();

  return (
    // settings that apply to all tabs at once
    // first: only index (Map)
    // second: only feed (Feed)
    // third: only profile (Profile)
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Map',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="map.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="feed"
        options={{
          title: 'Feed',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="square.grid.2x2.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="person.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}
