/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

// It takes two arguments:
// props — optional custom colors you pass in directly, e.g. { light: '#ff0000', dark: '#ff9999' }
// colorName — a key from your Colors object like 'text', 'background', 'tint'
export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof typeof Colors.light & keyof typeof Colors.dark
) {

  // So it has a priority system:
  // If you passed a custom color for this theme → use that
  // Otherwise → look it up from your Colors constant
  const theme = useColorScheme() ?? 'light';
  const colorFromProps = props[theme];

  if (colorFromProps) {
    return colorFromProps;
  } else {
    return Colors[theme][colorName];
  }
}
