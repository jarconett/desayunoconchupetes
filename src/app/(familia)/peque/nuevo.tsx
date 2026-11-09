import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { DatePicker } from '@/components/pickers';
import { Button, Card, Chips, HeroHeader, Input, Screen, Txt, notify } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { useFamily } from '@/context/family';
import { ageLabel, formatDate } from '@/lib/dates';
import { supabase } from '@/lib/supabase';
import type { Child } from '@/lib/types';

/** Alta y edición de los datos básicos del peque. */
export default function NuevoPeque() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { session } = useAuth();
  const fam = useFamily();
  const existing = fam.children.find((c) => c.id === id);
  const [name, setName] = useState('');
  const [sex, setSex] = useState<Child['sex']>(null);
  const [birth, setBirth] = useState<string | null>(null);
  const [parents, setParents] = useState('');
  const [showCal, setShowCal] = useState(false);

  useEffect(() => {
    if (existing) {
      setName(existing.name);
      setSex(existing.sex);
      setBirth(existing.birth_date);
      setParents(existing.parents_names ?? '');
    }
  }, [existing]);

  const save = async () => {
    if (!session) return;
    const payload = { name: name.trim(), sex, birth_date: birth, parents_names: parents.trim() || null };
    const res = existing
      ? await supabase.from('children').update(payload).eq('id', existing.id)
      : await supabase.from('children').insert({ ...payload, family_id: session.user.id });
    if (res.error) {
      notify('No se pudo guardar', res.error.message);
      return;
    }
    await fam.reload();
    if (existing) router.back();
    else {
      notify('¡Listo!', `Ahora puedes solicitar la entrevista inicial para ${payload.name}.`);
      router.replace('/citas');
    }
  };

  return (
    <Screen header={<HeroHeader back title={existing ? `Datos de ${existing.name}` : 'Añadir peque'} subtitle="Datos básicos para preparar la asesoría" />}>
      <Card>
        <Input label="Nombre" value={name} onChangeText={setName} placeholder="Hugo" />
        <Txt variant="label">Sexo</Txt>
        <Chips
          options={[
            { value: 'niño', label: 'Niño' },
            { value: 'niña', label: 'Niña' },
            { value: 'otro', label: 'Prefiero no decirlo' },
          ]}
          value={sex ?? undefined}
          onChange={(v) => setSex(v as Child['sex'])}
        />
        <View style={{ height: 14 }} />
        <Txt variant="label">Fecha de nacimiento</Txt>
        <Button
          variant="secondary"
          icon="cake-variant-outline"
          title={birth ? `${formatDate(birth)} · ${ageLabel(birth)}` : 'Elegir fecha'}
          onPress={() => setShowCal(!showCal)}
          style={{ alignSelf: 'flex-start', marginBottom: 10 }}
        />
        {showCal ? (
          <View style={{ marginBottom: 14 }}>
            <DatePicker
              value={birth}
              onChange={(d) => {
                setBirth(d);
                setShowCal(false);
              }}
              isDisabled={(d) => d > new Date()}
            />
            <Txt variant="small" style={{ marginTop: 6 }}>
              Usa las flechas para cambiar de mes.
            </Txt>
          </View>
        ) : null}
        <Input label="Nombres de los padres / madres" value={parents} onChangeText={setParents} placeholder="Lucía y Javier" />
        <Button title={existing ? 'Guardar cambios' : 'Añadir'} icon="check" onPress={save} disabled={!name.trim() || !birth} />
      </Card>
    </Screen>
  );
}
