import { Link, router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { AuthShell } from '@/components/auth-shell';
import { Button, Input, Txt, notify } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { colors } from '@/lib/theme';

export default function Registro() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const submit = async () => {
    setError('');
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    const { data, error: err } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { full_name: name.trim(), phone: phone.trim() } },
    });
    if (err) {
      setError(err.message);
      return;
    }
    if (!data.session) {
      notify('Revisa tu correo', 'Te hemos enviado un email para confirmar tu cuenta. Después podrás entrar en la app.');
      router.replace('/login');
      return;
    }
    router.replace('/');
  };

  return (
    <AuthShell title="Crea tu cuenta" subtitle="Para solicitar tu entrevista inicial y seguir la asesoría desde la app">
      <Input label="Nombre y apellidos" value={name} onChangeText={setName} placeholder="Inés García" autoComplete="name" />
      <Input label="Teléfono" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="600 000 000" autoComplete="tel" />
      <Input label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" placeholder="tu@email.com" />
      <Input label="Contraseña" value={password} onChangeText={setPassword} secureTextEntry hint="Mínimo 8 caracteres" autoComplete="new-password" />
      {error ? (
        <Txt variant="small" color={colors.danger} style={{ marginBottom: 10 }}>
          {error}
        </Txt>
      ) : null}
      <Button title="Crear cuenta" icon="account-plus-outline" onPress={submit} disabled={!name || !email || !password} />
      <Txt variant="small" center style={{ marginTop: 12 }}>
        Al registrarte aceptas que tratemos tus datos y los de tu peque únicamente para prestar el servicio de asesoría.
      </Txt>
      <View style={{ marginTop: 14, alignItems: 'center' }}>
        <Link href="/login">
          <Txt color={colors.primaryDark}>Ya tengo cuenta</Txt>
        </Link>
      </View>
    </AuthShell>
  );
}
