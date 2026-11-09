import { useState } from 'react';
import { Linking, Platform, View } from 'react-native';

import { useAuth } from '@/context/auth';
import { getNotificationDiagnostics, sendTestNotifications, type NotificationDiagnostics } from '@/lib/notifications';
import { colors } from '@/lib/theme';

import { Button, Card, Icon, Row, Txt } from './ui';

function Line({ ok, warn, text }: { ok: boolean; warn?: boolean; text: string }) {
  const color = ok ? colors.mintDark : warn ? colors.butterDark : colors.danger;
  return (
    <Row gap={8} style={{ alignItems: 'flex-start', marginTop: 6 }}>
      <Icon name={ok ? 'check-circle' : warn ? 'alert-circle' : 'close-circle'} size={18} color={color} />
      <Txt variant="small" style={{ flex: 1, color: colors.text }}>
        {text}
      </Txt>
    </Row>
  );
}

/** Tarjeta "Probar notificaciones" con diagnóstico (perfil y ajustes). */
export function NotificationTestCard() {
  const { session } = useAuth();
  const [diag, setDiag] = useState<NotificationDiagnostics | null>(null);
  const [result, setResult] = useState<string>('');

  if (Platform.OS === 'web') {
    return (
      <Card>
        <Txt variant="small">Las notificaciones y recordatorios funcionan en la app del móvil (Android/iOS).</Txt>
      </Card>
    );
  }

  const run = async () => {
    setResult('');
    const r = await sendTestNotifications();
    const d = await getNotificationDiagnostics(session?.user.id);
    setDiag(d);
    if (r.push === 'error') setResult(`El servidor no pudo enviar el aviso: ${r.error}. ¿Has ejecutado la actualización SQL en Supabase?`);
    else if (r.push === 'push_enviado')
      setResult('Deberías recibir 2 notificaciones: una ahora (local) y otra del servidor en unos segundos. Si solo llega la primera, revisa Firebase en expo.dev.');
    else setResult('Llegará solo la notificación local. Para los avisos del servidor falta que el móvil registre su token push (ver abajo).');
  };

  return (
    <Card>
      <Txt variant="small" style={{ marginBottom: 10 }}>
        Envía una notificación de prueba a este móvil y comprueba que todo está bien configurado.
      </Txt>
      <Button title="Probar notificaciones" icon="bell-ring-outline" variant="secondary" onPress={run} />
      {result ? <Txt variant="small" style={{ marginTop: 10 }}>{result}</Txt> : null}
      {diag ? (
        <View style={{ marginTop: 8 }}>
          <Line ok={diag.permission === 'granted'} text={diag.permission === 'granted' ? 'Permiso de notificaciones concedido' : 'Sin permiso de notificaciones: actívalo en los ajustes del móvil'} />
          <Line
            ok={diag.pushToken}
            text={diag.pushToken ? 'Móvil registrado para recibir avisos de la asesoría' : `Móvil sin registrar para avisos push${diag.pushError ? `: ${diag.pushError}` : ''}`}
          />
          <Line ok={diag.scheduledReminders > 0} warn text={`${diag.scheduledReminders} recordatorios del plan programados en este móvil`} />
          {Platform.OS === 'android' ? (
            <Txt variant="small" style={{ marginTop: 10 }}>
              En Xiaomi, Redmi, Huawei u Oppo: Ajustes › Aplicaciones › Desayuno con Chupetes › activa «Inicio automático», pon «Ahorro de batería» en «Sin
              restricciones» y en Notificaciones permite «Pantalla de bloqueo» y «Notificaciones flotantes».
            </Txt>
          ) : null}
          {diag.permission !== 'granted' ? (
            <Button title="Abrir ajustes del móvil" small variant="ghost" icon="cog-outline" style={{ marginTop: 6 }} onPress={() => Linking.openSettings()} />
          ) : null}
        </View>
      ) : null}
    </Card>
  );
}
