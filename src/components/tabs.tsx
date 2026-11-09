import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';

import { colors, fonts } from '@/lib/theme';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

export const tabScreenOptions = {
  headerShown: false,
  tabBarActiveTintColor: colors.primaryDark,
  tabBarInactiveTintColor: '#A9A6B2',
  tabBarStyle: {
    backgroundColor: '#FFFFFF',
    borderTopColor: colors.border,
    height: 64,
    paddingTop: 6,
    paddingBottom: 8,
  },
  tabBarLabelStyle: { fontFamily: fonts.semibold, fontSize: 11 },
  sceneStyle: { backgroundColor: colors.bg },
};

export function tabIcon(name: IconName, focusedName?: IconName) {
  function TabIcon({ color, focused }: { color: ColorValue; focused: boolean }) {
    return <MaterialCommunityIcons name={focused && focusedName ? focusedName : name} size={24} color={typeof color === 'string' ? color : colors.primaryDark} />;
  }
  return TabIcon;
}
