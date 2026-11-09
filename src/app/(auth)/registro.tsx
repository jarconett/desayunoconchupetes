import * as Linking from 'expo-linking';
import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Platform, View } from 'react-native';

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
  // Paso 2: confirmar el correo con el código recibido
  const [pendingEmail, setPendingEmail] = useState('');
  const [code, setCode] = useState('');

  const submit = async () => {
    setError('');
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    // El enlace del correo vuelve a esta misma web o abre la app del móvil
    const emailRedirectTo =
      Platform.OS === 'web' && typeof window !== 'undefined' ? `${window.location.origin}/login` : Linking.createURL('/login');
    const { data, error: err } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: { emailRedirectTo, data: { full_name: name.trim(), phone: phone.trim() } },
    });
    if (err) {
      setError(err.message);
      return;
    }
    if (!data.session) {
      setPendingEmail(email.trim().toLowerCase());
      return;
    }
    router.replace('/');
  };

  const confirm = async () => {
    setError('');
    const token = code.replace(/\D/g, '');
    if (token.length < 6) return setError('Escribe el código de 6 dígitos del correo');
    const { error: err } = await supabase.auth.verifyOtp({ email: pendingEmail, token, type: 'signup' });
    if (err) {
      setError(/expired|invalid/i.test(err.message) ? 'El código no es válido o ha caducado. Pulsa «Reenviar el código».' : err.message);
      return;
    }
    router.replace('/');
  };

  const resend = async () => {
    setError('');
    const { error: err } = await supabase.auth.resend({ type: 'signup', email: pendingEmail });
    if (err) setError(err.message);
    else notify('Código reenviado', 'Revisa tu correo (también la carpeta de spam).');
  };

  if (pendingEmail) {
    return (
      <AuthShell title="Confirma tu correo" subtitle={`Te hemos enviado un código a ${pendingEmail}`}>
        <Txt style={{ marginBottom: 12 }}>
          Escribe el código que aparece en el correo para activar tu cuenta. También puedes pulsar el enlace del correo desde este mismo
          dispositivo. Si no lo ves, mira en la carpeta de spam.
        </Txt>
        <Input label="Código del correo" value={code} onChangeText={setCode} keyboardType="number-pad" autoComplete="one-time-code" maxLength={10} />
        {error ? (
          <Txt variant="small" color={colors.danger} style={{ marginBottom: 10 }}>
            {error}
          </Txt>
        ) : null}
        <Button title="Confirmar y entrar" icon="check-circle-outline" onPress={confirm} disabled={!code} />
        <Button title="Reenviar el código" variant="ghost" small style={{ marginTop: 8 }} onPress={resend} />
        <View style={{ marginTop: 10, alignItems: 'center' }}>
          <Link href="/login">
            <Txt color={colors.primaryDark}>Ya la he confirmado: entrar</Txt>
          </Link>
        </View>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Crea tu cuenta" subtitle="Para solicitar tu entrevista inicial y seguir la asesoría desde la app">
      <Input label="Nombre y apellidos" value={name} onChangeText={setName} placeholder="Lucía Martínez Ruiz" autoComplete="name" />
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
        Al registrarte aceptas que tratemos tus datos únicamente para prestar el servicio de asesoría. Antes de la intervención te
        pediremos el consentimiento de protección de datos.
      </Txt>
      <View style={{ marginTop: 6, alignItems: 'center' }}>
        <Link href="/politica-cookies">
          <Txt variant="small" color={colors.primaryDark}>
            Política de cookies
          </Txt>
        </Link>
      </View>
      <View style={{ marginTop: 14, alignItems: 'center' }}>
        <Link href="/login">
          <Txt color={colors.primaryDark}>Ya tengo cuenta</Txt>
        </Link>
      </View>
    </AuthShell>
  );
}
