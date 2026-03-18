// `app/modal.tsx` — Modal Screen
import { Link } from 'expo-router';
// usefull to be able to write css_like 
// styles in react native, instead of 
// regular CSS you write javascript objects
import { StyleSheet } from 'react-native';

// These are wrappers around the basic React Native 
// Text and View components that automatically switch 
// colors based on dark/light mode. You'll use these a lot.
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

// A screen that slides up from the bottom. 
// For your app this could be useful for 
// things like **adding a new pin** or 
// viewing a post's details.
export default function ModalScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">This is a modal</ThemedText>
      <Link href="/" dismissTo style={styles.link}>
        <ThemedText type="link">Go to home screen</ThemedText>
      </Link>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
});
