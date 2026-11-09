import { Tabs } from 'expo-router';

import { tabIcon, tabScreenOptions } from '@/components/tabs';
import { useAdmin } from '@/context/admin';

export default function AdminTabs() {
  const { tasks, unreadNotifications } = useAdmin();
  return (
    <Tabs screenOptions={tabScreenOptions}>
      <Tabs.Screen name="agenda" options={{ title: 'Agenda', tabBarIcon: tabIcon('calendar-month-outline', 'calendar-month'), tabBarBadge: tasks.length || undefined }} />
      <Tabs.Screen name="familias" options={{ title: 'Usuarios', tabBarIcon: tabIcon('account-group-outline', 'account-group') }} />
      <Tabs.Screen name="avisos" options={{ title: 'Avisos', tabBarIcon: tabIcon('bell-outline', 'bell'), tabBarBadge: unreadNotifications || undefined }} />
      <Tabs.Screen name="ajustes" options={{ title: 'Ajustes', tabBarIcon: tabIcon('cog-outline', 'cog') }} />
    </Tabs>
  );
}
