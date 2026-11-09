import { Link, router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { AuthShell } from '@/components/auth-shell';
import { Button, Input, Txt } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { colors } from '@/lib/theme';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const submit = async () => {
    setError('');
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (err) {
      setError(err.message.includes('Invalid') ? 'Email o contraseña incorrectos' : err.message);
      return;
    }
    router.replace('/');
  };

  return (
    <AuthShell title="¡Hola de nuevo!" subtitle="Entra para seguir el descanso de tu peque">
      <Input label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" placeholder="tu@email.com" />
      <Input label="Contraseña" value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" placeholder="••••••••" onSubmitEditing={submit} />
      {error ? (
        <Txt variant="small" color={colors.danger} style={{ marginBottom: 10 }}>
          {error}
        </Txt>
      ) : null}
      <Button title="Entrar" icon="login" onPress={submit} disabled={!email || !password} />
      <View style={{ marginTop: 16, gap: 10, alignItems: 'center' }}>
        <Link href="/recuperar">
          <Txt variant="small" color={colors.primaryDark}>
            ¿Has olvidado tu contraseña?
          </Txt>
        </Link>
        <Link href="/registro">
          <Txt color={colors.primaryDark}>
            ¿Primera vez? <Txt color={colors.primaryDark} style={{ fontFamily: 'Quicksand_700Bold' }}>Crea tu cuenta</Txt>
          </Txt>
        </Link>
      </View>
    </AuthShell>
  );
}
