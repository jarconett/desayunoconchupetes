import { useEffect, useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';

import { Button, Card, Chips, HeroHeader, Icon, Row, Screen, SectionTitle, Txt } from '@/components/ui';
import { WheelPicker } from '@/components/wheel-picker';
import { endTimePreview } from '@/lib/dates';
import { colors, fonts, radius } from '@/lib/theme';
import {
  NOISE_SOUNDS,
  getNoiseState,
  playNoise,
  setNoiseTimer,
  setNoiseVolume,
  stopNoise,
  subscribeNoise,
  type NoiseKey,
  type NoiseState,
} from '@/lib/white-noise';

const HOURS = Array.from({ length: 13 }, (_, i) => i); // 0..12 h
const MINS = Array.from({ length: 12 }, (_, i) => i * 5); // 0..55 min
const VOLUMES = [0.2, 0.4, 0.6, 0.8, 1];

const pad = (n: number) => String(n).padStart(2, '0');
const left = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h ? `${h} h ${pad(m)} min` : `${m} min ${pad(s % 60)} s`;
};

/** Ruido blanco para dormir: sonidos en bucle, con apagado automático opcional. */
export default function RuidoBlanco() {
  const [st, setSt] = useState<NoiseState>(getNoiseState());
  const [selected, setSelected] = useState<NoiseKey>(st.sound ?? 'estatica');
  const [mode, setMode] = useState<'libre' | 'tiempo'>('tiempo');
  const [hours, setHours] = useState(1);
  const [mins, setMins] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [showCredits, setShowCredits] = useState(false);

  useEffect(() => subscribeNoise(setSt), []);
  useEffect(() => {
    if (!st.playing) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [st.playing]);

  const total = hours * 60 + mins;
  const preview = endTimePreview(total);
  const minutes = mode === 'tiempo' && total > 0 ? total : null;

  const choose = (k: NoiseKey) => {
    setSelected(k);
    // Si ya está sonando, cambia de sonido manteniendo la hora de apagado
    if (st.playing) playNoise(k, st.endsAt ? Math.max(1, Math.round((st.endsAt - Date.now()) / 60000)) : null);
  };

  const current = NOISE_SOUNDS.find((s) => s.key === (st.playing ? st.sound : selected))!;

  return (
    <Screen header={<HeroHeader back title="Ruido blanco" subtitle="Sonidos suaves para ayudar a dormir" />}>
      {/* Reproduciendo */}
      {st.playing ? (
        <Card tint={current.color} style={{ alignItems: 'center', paddingVertical: 22, marginBottom: 12 }}>
          <View style={{ width: 76, height: 76, borderRadius: 38, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={current.icon} size={40} color={colors.night} />
          </View>
          <Txt variant="h2" color={colors.night} style={{ marginTop: 10 }}>
            {current.label}
          </Txt>
          <Txt variant="small" center>
            {st.endsAt ? `Se apagará a las ${endTimePreview((st.endsAt - Date.now()) / 60000).label} · quedan ${left(st.endsAt - now)}` : 'Sonando sin límite de tiempo'}
          </Txt>
          <Button title="Detener" icon="stop-circle-outline" variant="danger" style={{ marginTop: 16, alignSelf: 'stretch' }} onPress={stopNoise} />
        </Card>
      ) : null}

      {/* Sonidos */}
      <SectionTitle icon="music-note-outline">Elige un sonido</SectionTitle>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {NOISE_SOUNDS.map((s) => {
          const active = (st.playing ? st.sound : selected) === s.key;
          return (
            <Pressable
              key={s.key}
              onPress={() => choose(s.key)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={{
                flexBasis: '30%',
                flexGrow: 1,
                minWidth: 96,
                alignItems: 'center',
                paddingVertical: 14,
                paddingHorizontal: 6,
                borderRadius: radius.md,
                backgroundColor: active ? s.color : '#fff',
                borderWidth: 2,
                borderColor: active ? colors.night + '55' : colors.border,
              }}>
              <Icon name={s.icon} size={30} color={active ? colors.night : colors.muted} />
              <Text style={{ marginTop: 6, fontFamily: fonts.bold, fontSize: 13, color: active ? colors.night : colors.text, textAlign: 'center' }}>{s.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* Duración */}
      <SectionTitle icon="timer-outline">¿Cuánto tiempo?</SectionTitle>
      <Card>
        <Chips
          options={[
            { value: 'tiempo' as const, label: 'Apagar a una hora', icon: 'timer-outline' },
            { value: 'libre' as const, label: 'Sin límite', icon: 'infinity' },
          ]}
          value={mode}
          onChange={(m) => {
            setMode(m);
            if (st.playing) setNoiseTimer(m === 'tiempo' && total > 0 ? total : null);
          }}
        />
        {mode === 'tiempo' ? (
          <>
            <Row style={{ justifyContent: 'center', marginTop: 12 }} gap={10}>
              <View style={{ alignItems: 'center' }}>
                <Txt variant="label">Horas</Txt>
                <WheelPicker values={HOURS} value={hours} onChange={setHours} format={(v) => `${v} h`} width={120} />
              </View>
              <View style={{ alignItems: 'center' }}>
                <Txt variant="label">Minutos</Txt>
                <WheelPicker values={MINS} value={mins} onChange={setMins} format={(v) => `${pad(v)} min`} width={120} />
              </View>
            </Row>
            <View style={{ marginTop: 12, padding: 12, borderRadius: radius.md, backgroundColor: colors.nightSoft, alignItems: 'center' }}>
              {total > 0 ? (
                <>
                  <Txt variant="small" color={colors.night}>
                    Sonará {[hours ? `${hours} h` : '', mins ? `${mins} min` : ''].filter(Boolean).join(' ')} y se apagará a las
                  </Txt>
                  <Row gap={6}>
                    <Text style={{ fontFamily: fonts.bold, fontSize: 30, color: colors.night }}>{preview.time}</Text>
                    {preview.days > 0 ? (
                      <View style={{ backgroundColor: colors.lavenderDark, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 }}>
                        <Text style={{ fontFamily: fonts.bold, fontSize: 13, color: '#fff' }}>+{preview.days}d</Text>
                      </View>
                    ) : null}
                  </Row>
                </>
              ) : (
                <Txt variant="small" color={colors.night}>
                  Elige al menos 5 minutos
                </Txt>
              )}
            </View>
            {st.playing ? (
              <Button title="Aplicar este tiempo" small variant="soft" icon="check" style={{ marginTop: 10 }} disabled={!total} onPress={() => setNoiseTimer(total)} />
            ) : null}
          </>
        ) : (
          <Txt variant="small" style={{ marginTop: 10 }}>
            Sonará hasta que pulses Detener.
          </Txt>
        )}
      </Card>

      {/* Volumen */}
      <SectionTitle icon="volume-high">Volumen</SectionTitle>
      <Card>
        <Row gap={6} style={{ justifyContent: 'space-between' }}>
          <Icon name="volume-low" color={colors.muted} />
          {VOLUMES.map((v) => (
            <Pressable
              key={v}
              onPress={() => setNoiseVolume(v)}
              accessibilityLabel={`Volumen ${Math.round(v * 100)}%`}
              style={{
                flex: 1,
                height: 14 + v * 22,
                alignSelf: 'flex-end',
                borderRadius: 6,
                backgroundColor: st.volume >= v - 0.01 ? colors.primary : colors.border,
              }}
            />
          ))}
          <Icon name="volume-high" color={colors.muted} />
        </Row>
        <Txt variant="small" style={{ marginTop: 8 }}>
          Consejo: pon el móvil a unos 2 metros de la cuna y a un volumen suave (como una ducha de fondo).
        </Txt>
      </Card>

      {!st.playing ? (
        <Button
          title={`Reproducir: ${NOISE_SOUNDS.find((s) => s.key === selected)?.label}`}
          icon="play"
          style={{ marginTop: 16 }}
          disabled={mode === 'tiempo' && !total}
          onPress={() => playNoise(selected, minutes)}
        />
      ) : (
        <Button title="Detener" icon="stop-circle-outline" variant="danger" style={{ marginTop: 16 }} onPress={stopNoise} />
      )}
      {Platform.OS === 'web' ? (
        <Txt variant="small" center style={{ marginTop: 8 }}>
          En la web suena mientras esta pestaña esté abierta. En la app del móvil sigue sonando con la pantalla bloqueada.
        </Txt>
      ) : null}

      <Pressable onPress={() => setShowCredits(!showCredits)} style={{ marginTop: 18, alignItems: 'center' }}>
        <Txt variant="small" color={colors.primaryDark}>
          {showCredits ? 'Ocultar créditos de los sonidos' : 'Créditos de los sonidos'}
        </Txt>
      </Pressable>
      {showCredits ? (
        <Card style={{ marginTop: 8 }}>
          {NOISE_SOUNDS.map((s) => (
            <Txt key={s.key} variant="small" style={{ marginBottom: 4 }}>
              <Text style={{ fontFamily: fonts.bold }}>{s.label}: </Text>
              {s.credit}
            </Txt>
          ))}
        </Card>
      ) : null}
    </Screen>
  );
}
