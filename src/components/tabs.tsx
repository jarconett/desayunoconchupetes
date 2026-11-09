import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fonts } from '@/lib/theme';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

/**
 * Opciones de las pestañas. La altura y el relleno inferior suman el hueco de la
 * barra de navegación del sistema (botones atrás / inicio / menú de Android,
 * p. ej. en Xiaomi) para que no se superponga con la barra de la app.
 */
export function useTabScreenOptions() {
  const insets = useSafeAreaInsets();
  const bottom = Math.max(insets.bottom, 0);
  return {
    headerShown: false,
    tabBarActiveTintColor: colors.primaryDark,
    tabBarInactiveTintColor: '#A9A6B2',
    tabBarStyle: {
      backgroundColor: '#FFFFFF',
      borderTopColor: colors.border,
      height: 64 + bottom,
      paddingTop: 6,
      paddingBottom: 8 + bottom,
    },
    tabBarLabelStyle: { fontFamily: fonts.semibold, fontSize: 11 },
    sceneStyle: { backgroundColor: colors.bg },
  };
}

export function tabIcon(name: IconName, focusedName?: IconName) {
  function TabIcon({ color, focused }: { color: ColorValue; focused: boolean }) {
    return <MaterialCommunityIcons name={focused && focusedName ? focusedName : name} size={24} color={typeof color === 'string' ? color : colors.primaryDark} />;
  }
  return TabIcon;
}
