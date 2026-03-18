// Dead simple — it just re-exports React Native's built-in useColorScheme hook. 
// The reason it exists as its own file is so that everywhere in your app 
// imports from @/hooks/use-color-scheme instead of directly from react-native. 
// That way if you ever need to change the behavior you only change it in one place.
export { useColorScheme } from 'react-native';
