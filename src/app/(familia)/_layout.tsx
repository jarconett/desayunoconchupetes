import { Redirect, Stack } from 'expo-router';

import { useAuth } from '@/context/auth';
import { FamilyProvider } from '@/context/family';
import { colors } from '@/lib/theme';

/**
 * Zona de familias: un Stack con las pestañas ((tabs)) y, encima, las pantallas
 * de detalle (diario, histórico, 1,2,3 DESCANSO, resúmenes, avisos…).
 */
export default function FamilyLayout() {
  const { session, profile, loading } = useAuth();
  // El navegador se monta siempre para no perder la URL/enlace profundo mientras carga la sesión
  if (!loading && !session) return <Redirect href="/login" />;
  if (profile?.role === 'admin') return <Redirect href="/admin/agenda" />;
  return (
    <FamilyProvider>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />
    </FamilyProvider>
  );
}
