import { useEffect, useMemo, useState } from 'react';
import { Platform, Text, View } from 'react-native';

import { Button, Card, Chips, HeroHeader, IconBubble, Row, Screen, Txt, notify } from '@/components/ui';
import { WheelPicker } from '@/components/wheel-picker';
import { useFamily } from '@/context/family';
import { cancelNapTimer, getNapTimer, startNapTimer, type NapTimer } from '@/lib/notifications';
import { colors, fonts } from '@/lib/theme';

// De 5 min a 4 h, de 5 en 5
const MINUTES = Array.from({ length: 48 }, (_, i) => (i + 1) * 5);
const QUICK = [30, 45, 60, 90, 120];

const durationLabel = (m: number) => (m < 60 ? `${m} min` : `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60}` : ''}`);
const clock = (ms: number) => {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
};
const hourOf = (t: number) => new Date(t).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

/** Temporizador de siestas: se elige la duración en una rueda y avisa con una notificación. */
export default function Temporizador() {
  const fam = useFamily();
  const kids = fam.children;
  const [childId, setChildId] = useState<string | null>(kids[0]?.id ?? null);
  const [minutes, setMinutes] = useState(60);
  const [timer, setTimer] = useState<NapTimer | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    getNapTimer().then(setTimer);
  }, []);

  useEffect(() => {
    if (!childId && kids[0]) setChildId(kids[0].id);
  }, [kids, childId]);

  // Cuenta atrás
  useEffect(() => {
    if (!timer) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [timer]);

  const remaining = timer ? timer.endsAt - now : 0;
  const finished = !!timer && remaining <= 0;

  // En la web no hay notificaciones: se avisa en pantalla al terminar
  useEffect(() => {
    if (finished && Platform.OS === 'web' && timer) notify('⏰ ¡Fin de la siesta!', timer.childName ? `Hora de despertar a ${timer.childName}.` : undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished]);

  const childName = useMemo(() => kids.find((k) => k.id === childId)?.name ?? '', [kids, childId]);

  const start = async () => {
    const { timer: t, notified } = await startNapTimer(minutes, childName);
    setNow(Date.now());
    setTimer(t);
    if (!notified && Platform.OS !== 'web') {
      notify('Sin permiso de notificaciones', 'El temporizador funciona, pero para que te avise con la app cerrada activa las notificaciones en los ajustes del móvil.');
    }
  };

  const stop = async () => {
    await cancelNapTimer();
    setTimer(null);
  };

  const progress = timer ? Math.min(1, Math.max(0, (now - timer.startedAt) / (timer.endsAt - timer.startedAt))) : 0;

  return (
    <Screen header={<HeroHeader back title="Temporizador de siesta" subtitle="Te avisamos cuando sea la hora de despertar" />}>
      {timer ? (
        <Card style={{ alignItems: 'center', paddingVertical: 28 }} tint={finished ? colors.butter : colors.lavender}>
          <IconBubble name={finished ? 'white-balance-sunny' : 'sleep'} bg="#fff" color={finished ? colors.butterDark : colors.lavenderDark} size={64} />
          <Txt variant="h3" style={{ marginTop: 12 }}>
            {finished ? '¡Fin de la siesta!' : `Siesta${timer.childName ? ` de ${timer.childName}` : ''}`}
          </Txt>
          <Text style={{ fontFamily: fonts.bold, fontSize: 56, color: colors.night, marginVertical: 6, fontVariant: ['tabular-nums'] }}>
            {finished ? '00:00' : clock(remaining)}
          </Text>
          <View style={{ width: '100%', height: 10, borderRadius: 5, backgroundColor: '#ffffffaa', overflow: 'hidden', marginBottom: 10 }}>
            <View style={{ width: `${progress * 100}%`, height: '100%', backgroundColor: finished ? colors.butterDark : colors.lavenderDark }} />
          </View>
          <Txt variant="small" center>
            {finished
              ? `Terminó a las ${hourOf(timer.endsAt)} (duración ${durationLabel(timer.minutes)}).`
              : `Duración ${durationLabel(timer.minutes)} · te avisaremos a las ${hourOf(timer.endsAt)}`}
          </Txt>
          {!finished && Platform.OS !== 'web' ? (
            <Txt variant="small" center style={{ marginTop: 4 }}>
              Puedes cerrar la app: la notificación llegará igualmente.
            </Txt>
          ) : null}
          <Button
            title={finished ? 'Nuevo temporizador' : 'Cancelar temporizador'}
            icon={finished ? 'restart' : 'close'}
            variant={finished ? 'primary' : 'danger'}
            style={{ marginTop: 18, alignSelf: 'stretch' }}
            onPress={stop}
          />
        </Card>
      ) : (
        <>
          {kids.length > 1 ? (
            <Card style={{ marginBottom: 12 }}>
              <Txt variant="label">¿Quién duerme?</Txt>
              <Chips options={kids.map((k) => ({ value: k.id, label: k.name, icon: 'baby-face-outline' }))} value={childId ?? ''} onChange={setChildId} />
            </Card>
          ) : null}
          <Card style={{ alignItems: 'center' }}>
            <Txt variant="label">Duración de la siesta (minutos)</Txt>
            <Txt variant="small" style={{ marginBottom: 10 }}>
              Desliza la rueda hacia arriba o abajo
            </Txt>
            <WheelPicker values={MINUTES} value={minutes} onChange={setMinutes} format={(v) => `${v} min`} />
            <Txt variant="h3" color={colors.night} style={{ marginTop: 10 }}>
              {durationLabel(minutes)} · terminará a las {hourOf(Date.now() + minutes * 60000)}
            </Txt>
            <Row gap={6} style={{ flexWrap: 'wrap', justifyContent: 'center', marginTop: 12 }}>
              {QUICK.map((q) => (
                <Button key={q} small variant={q === minutes ? 'primary' : 'soft'} title={durationLabel(q)} onPress={() => setMinutes(q)} />
              ))}
            </Row>
            <Button title="Empezar siesta" icon="timer-outline" style={{ marginTop: 18, alignSelf: 'stretch' }} onPress={start} />
            {Platform.OS === 'web' ? (
              <Txt variant="small" center style={{ marginTop: 8 }}>
                En la web el aviso aparece solo con esta página abierta. Con la app del móvil te llega una notificación aunque la cierres.
              </Txt>
            ) : null}
          </Card>
        </>
      )}
    </Screen>
  );
}
