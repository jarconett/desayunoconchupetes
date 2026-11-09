import * as Linking from 'expo-linking';
import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, View } from 'react-native';

import { AuthShell } from '@/components/auth-shell';
import { Button, Input, Txt, notify } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { colors } from '@/lib/theme';

/**
 * Recuperar contraseña en dos pasos:
 * 1) Se envía un correo con un código (y un enlace).
 * 2) Se escribe el código y la nueva contraseña aquí mismo.
 * El código funciona igual en web, Android e iOS y no depende de URLs de redirección.
 */
export default function Recuperar() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const redirectTo = Platform.OS === 'web' && typeof window !== 'undefined' ? `${window.location.origin}/nueva-clave` : Linking.createURL('/nueva-clave');

  const send = async () => {
    setError('');
    setBusy(true);
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo });
    setBusy(false);
    if (err) {
      setError(/rate limit|seconds/i.test(err.message) ? 'Has pedido varios correos seguidos. Espera un minuto y vuelve a intentarlo.' : err.message);
      return;
    }
    setSent(true);
  };

  const save = async () => {
    setError('');
    const token = code.replace(/\D/g, '');
    if (token.length < 6) return setError('Escribe el código de 6 dígitos del correo');
    if (password.length < 8) return setError('La contraseña debe tener al menos 8 caracteres');
    if (password !== password2) return setError('Las contraseñas no coinciden');
    setBusy(true);
    const { error: otpErr } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token, type: 'recovery' });
    if (otpErr) {
      setBusy(false);
      return setError(/expired|invalid/i.test(otpErr.message) ? 'El código no es válido o ha caducado. Pide uno nuevo.' : otpErr.message);
    }
    const { error: updErr } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (updErr) return setError(updErr.message);
    notify('Contraseña actualizada', 'Ya puedes usar tu nueva contraseña');
    router.replace('/');
  };

  return (
    <AuthShell title="Recuperar contraseña" subtitle={sent ? 'Revisa tu correo' : 'Te enviaremos un código para crear una nueva'}>
      {!sent ? (
        <>
          <Input label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
          {error ? (
            <Txt variant="small" color={colors.danger} style={{ marginBottom: 10 }}>
              {error}
            </Txt>
          ) : null}
          <Button title="Enviar código" icon="email-fast-outline" onPress={send} disabled={!email || busy} />
        </>
      ) : (
        <>
          <Txt style={{ marginBottom: 12 }}>
            Si {email.trim()} está registrado, recibirás un correo en unos minutos (mira también en spam). Escribe aquí el código que
            aparece en el correo y tu nueva contraseña.
          </Txt>
          <Input label="Código del correo" value={code} onChangeText={setCode} keyboardType="number-pad" autoComplete="one-time-code" maxLength={10} />
          <Input label="Nueva contraseña" value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" />
          <Input label="Repite la contraseña" value={password2} onChangeText={setPassword2} secureTextEntry autoComplete="new-password" />
          {error ? (
            <Txt variant="small" color={colors.danger} style={{ marginBottom: 10 }}>
              {error}
            </Txt>
          ) : null}
          <Button title="Guardar nueva contraseña" icon="lock-reset" onPress={save} disabled={!code || !password || busy} />
          <Pressable accessibilityRole="button" onPress={send} disabled={busy} style={{ marginTop: 12, alignItems: 'center' }}>
            <Txt color={colors.primaryDark}>Reenviar el código</Txt>
          </Pressable>
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
