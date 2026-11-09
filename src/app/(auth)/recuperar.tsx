import * as Linking from 'expo-linking';
import { Link } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { AuthShell } from '@/components/auth-shell';
import { Button, Input, Txt } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { colors } from '@/lib/theme';

export default function Recuperar() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setError('');
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: Linking.createURL('/nueva-clave'),
    });
    if (err) setError(err.message);
    else setSent(true);
  };

  return (
    <AuthShell title="Recuperar contraseña" subtitle="Te enviaremos un enlace para crear una nueva">
      {sent ? (
        <Txt>Si el email existe, recibirás un correo en unos minutos. Revisa también la carpeta de spam.</Txt>
      ) : (
        <>
          <Input label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
          {error ? (
            <Txt variant="small" color={colors.danger} style={{ marginBottom: 10 }}>
              {error}
            </Txt>
          ) : null}
          <Button title="Enviar enlace" icon="email-fast-outline" onPress={submit} disabled={!email} />
        </>
      )}
      <View style={{ marginTop: 14, alignItems: 'center' }}>
        <Link href="/login">
          <Txt color={colors.primaryDark}>Volver a entrar</Txt>
        </Link>
      </View>
    </AuthShell>
  );
}
