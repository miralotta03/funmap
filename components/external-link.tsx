import { Href, Link } from 'expo-router';
import { openBrowserAsync, WebBrowserPresentationStyle } from 'expo-web-browser';
import { type ComponentProps } from 'react';

// This is TypeScript defining what props this component accepts. It takes all 
// the props that Link normally takes, but replaces href with a stricter type 
// that must be both a Href and a string.
type Props = Omit<ComponentProps<typeof Link>, 'href'> & { href: Href & string };

export function ExternalLink({ href, ...rest }: Props) {
  return (
    <Link
      target="_blank"
      {...rest}
      href={href}
      onPress={async (event) => {
        // On phones it prevents the default behavior 
        // (opening the system browser) and instead 
        // opens an in-app browser that slides up. 
        // On web it just behaves like a normal link. 
        // This is a great example of platform-specific behavior.
        if (process.env.EXPO_OS !== 'web') {
          // Prevent the default behavior of linking to the default browser on native.
          event.preventDefault();
          // Open the link in an in-app browser.
          await openBrowserAsync(href, {
            presentationStyle: WebBrowserPresentationStyle.AUTOMATIC,
          });
        }
      }}
    />
  );
}
