import { Tabs } from 'expo-router';

import { tabIcon, useTabScreenOptions } from '@/components/tabs';
import { useFamily } from '@/context/family';

export default function FamilyTabs() {
  const { tasks } = useFamily();
  const screenOptions = useTabScreenOptions();
  return (
    <Tabs screenOptions={screenOptions}>
      <Tabs.Screen
        name="inicio"
        options={{
          title: 'Inicio',
          tabBarIcon: tabIcon('home-heart'),
          tabBarBadge: tasks.length ? tasks.length : undefined,
        }}
      />
      <Tabs.Screen name="citas" options={{ title: 'Citas', tabBarIcon: tabIcon('calendar-heart') }} />
      <Tabs.Screen name="mi-espacio" options={{ title: 'Mi espacio', tabBarIcon: tabIcon('folder-heart-outline', 'folder-heart') }} />
      <Tabs.Screen name="plan" options={{ title: 'Plan', tabBarIcon: tabIcon('weather-night') }} />
      <Tabs.Screen name="perfil" options={{ title: 'Perfil', tabBarIcon: tabIcon('account-circle-outline', 'account-circle') }} />
    </Tabs>
  );
}
