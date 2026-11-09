import { Redirect } from 'expo-router';
import { View } from 'react-native';

import { Card, Loading, Logo, Txt } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { isConfigured } from '@/lib/supabase';
import { colors } from '@/lib/theme';

export default function Index() {
  const { session, profile, loading } = useAuth();

  if (!isConfigured) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Logo size={160} />
        <Card style={{ maxWidth: 520, marginTop: 16 }}>
          <Txt variant="h2">Falta configurar Supabase</Txt>
          <Txt style={{ marginTop: 8 }}>
            Crea un archivo .env (copia .env.example) con EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_ANON_KEY y vuelve a
            arrancar la app. Encontrarás los pasos en el README.
          </Txt>
        </Card>
      </View>
    );
  }

  if (loading || (session && !profile)) return <Loading />;
  if (!session) return <Redirect href="/login" />;
  return <Redirect href={profile?.role === 'admin' ? '/admin/agenda' : '/inicio'} />;
}
