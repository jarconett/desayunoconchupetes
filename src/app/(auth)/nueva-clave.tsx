import { router } from 'expo-router';
import { useState } from 'react';

import { AuthShell } from '@/components/auth-shell';
import { Button, Input, Txt, notify } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { colors } from '@/lib/theme';

export default function NuevaClave() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const submit = async () => {
    setError('');
    if (password.length < 8) {
      setError('Mínimo 8 caracteres');
      return;
    }
    const { error: err } = await supabase.auth.updateUser({ password });
    if (err) {
      setError(
        /session/i.test(err.message)
          ? 'El enlace ha caducado o no es válido. Vuelve a "¿Has olvidado tu contraseña?" y usa el código del correo.'
          : err.message,
      );
      return;
    }
    notify('Contraseña actualizada');
    router.replace('/');
  };

  return (
    <AuthShell title="Nueva contraseña">
      <Input label="Nueva contraseña" value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" />
      {error ? (
        <Txt variant="small" color={colors.danger} style={{ marginBottom: 10 }}>
          {error}
        </Txt>
      ) : null}
      <Button title="Guardar" onPress={submit} disabled={!password} />
    </AuthShell>
  );
}
