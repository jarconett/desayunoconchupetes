import { Redirect, Stack, useSegments } from 'expo-router';

import { useAuth } from '@/context/auth';
import { colors } from '@/lib/theme';

export default function AuthLayout() {
  const { session, profile } = useAuth();
  const segments = useSegments();
  const onNewPassword = segments[segments.length - 1] === 'nueva-clave';
  if (session && profile && !onNewPassword) return <Redirect href="/" />;
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />;
}
