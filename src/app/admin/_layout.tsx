import { Redirect, Stack } from 'expo-router';

import { AdminProvider } from '@/context/admin';
import { useAuth } from '@/context/auth';
import { colors } from '@/lib/theme';

/**
 * Zona de administración: un Stack con las pestañas ((tabs): Agenda, Usuarios,
 * Avisos, Ajustes) y, encima, las pantallas de detalle (peque, familia, ficha,
 * plan de sueño, resumen, diario).
 */
export default function AdminLayout() {
  const { session, profile, loading } = useAuth();
  // El navegador se monta siempre para no perder la URL/enlace profundo mientras carga la sesión.
  // Los datos están protegidos en la base de datos (RLS) aunque se llegue a montar la pantalla.
  if (!loading && !session) return <Redirect href="/login" />;
  if (profile && profile.role !== 'admin') return <Redirect href="/inicio" />;
  return (
    <AdminProvider>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />
    </AdminProvider>
  );
}
