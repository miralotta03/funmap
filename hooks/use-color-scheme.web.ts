import { useEffect, useState } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

/**
 * To support static rendering, this value needs to be re-calculated on the client side for web
 */
export function useColorScheme() {
  // On web, the app first renders on the server 
  // (static HTML) before JavaScript loads on the client. 
  // At that server render moment, there's no way to know 
  // the user's color scheme yet. So hasHydrated tracks 
  // whether we're past that initial server render.
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  const colorScheme = useRNColorScheme();

  // This prevents a flash of wrong colors when 
  // the page first loads on web. On your phone 
  // app you'll never notice this file — it only 
  // matters for web.
  if (hasHydrated) {
    return colorScheme;
  }

  return 'light';
}
