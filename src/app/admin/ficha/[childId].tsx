import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Button, Card, Empty, HeroHeader, Input, Loading, Screen, SectionTitle, Txt, notify } from '@/components/ui';
import { useAdmin } from '@/context/admin';
import { SLEEP_SHEET_SECTIONS } from '@/lib/forms';
import { ageLabel, formatShortDate } from '@/lib/dates';
import { supabase } from '@/lib/supabase';
import type { SleepSheet } from '@/lib/types';

/** Ficha de sueño de la entrevista inicial (la completa la administradora). */
export default function Ficha() {
  const { childId } = useLocalSearchParams<{ childId: string }>();
  const adm = useAdmin();
  const child = adm.children.find((c) => c.id === childId);
  const [data, setData] = useState<Record<string, string>>({});
  const [loaded, setLoaded] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!childId || !child) return;
    supabase
      .from('sleep_sheets')
      .select('*')
      .eq('child_id', childId)
      .maybeSingle()
      .then(({ data: row }) => {
        const sheet = row as SleepSheet | null;
        if (sheet) {
          setData(sheet.data ?? {});
          setUpdatedAt(sheet.updated_at);
        } else {
          // Rellenamos lo que ya sabemos
          const fam = adm.profiles.find((p) => p.id === child.family_id);
          setData({
            fecha: formatShortDate(new Date()),
            nombre: child.name,
            sexo: child.sex ?? '',
            edad: child.birth_date ? `${ageLabel(child.birth_date)} (${formatShortDate(child.birth_date)})` : '',
            padres: child.parents_names ?? fam?.full_name ?? '',
            telefono: fam?.phone ?? '',
            email: fam?.email ?? '',
          });
        }
        setLoaded(true);
      });
    // Solo al abrir la ficha
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childId, !!child]);

  if (adm.loading) return <Loading />;
  if (!child) return <Screen header={<HeroHeader back title="Ficha de sueño" />}><Empty title="No encontrado" /></Screen>;
  if (!loaded) return <Loading />;

  const save = async () => {
    const now = new Date().toISOString();
    const { error } = await supabase.from('sleep_sheets').upsert({ child_id: child.id, data, updated_at: now });
    if (error) return notify('Error', error.message);
    setUpdatedAt(now);
    setDirty(false);
    adm.reload();
    notify('Ficha guardada');
  };

  return (
    <Screen header={<HeroHeader back title="Ficha de sueño" subtitle={`${child.name}${updatedAt ? ` · guardada el ${formatShortDate(updatedAt)}` : ' · nueva'}`} />}>
      <Txt variant="small">Completa la ficha durante o después de la entrevista inicial. Solo la ve la asesora.</Txt>
      {SLEEP_SHEET_SECTIONS.map((s) => (
        <View key={s.title}>
          <SectionTitle icon={s.icon}>{s.title}</SectionTitle>
          <Card>
            {s.fields.map((f) => (
              <Input
                key={f.key}
                label={f.label}
                value={data[f.key] ?? ''}
                multiline={f.multiline}
                onChangeText={(t) => {
                  setData({ ...data, [f.key]: t });
                  setDirty(true);
                }}
              />
            ))}
          </Card>
        </View>
      ))}
      <Button title="Guardar ficha" icon="content-save-outline" onPress={save} disabled={!dirty} style={{ marginTop: 18 }} />
    </Screen>
  );
}
