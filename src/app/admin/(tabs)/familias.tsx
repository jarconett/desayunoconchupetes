import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { Badge, Card, Chips, HeroHeader, IconBubble, Input, Row, Screen, Txt } from '@/components/ui';
import { WeekIndicator } from '@/components/progress';
import { useAdmin } from '@/context/admin';
import { CHILD_STATUS, SUBSCRIPTION_STATUS } from '@/lib/config';
import { ageLabel } from '@/lib/dates';
import { colors } from '@/lib/theme';

type Filter = 'todas' | 'entrevista' | 'intervencion' | 'finalizada' | 'admin';

export default function Familias() {
  const adm = useAdmin();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('todas');

  const rows = useMemo(() => {
    return adm.profiles
      .filter((p) => (filter === 'admin' ? p.role === 'admin' : p.role === 'familia'))
      .map((p) => ({
        profile: p,
        kids: adm.children.filter((c) => c.family_id === p.id),
        sub: adm.subscriptions.find((s) => s.family_id === p.id),
      }))
      .filter((r) => filter === 'todas' || filter === 'admin' || r.kids.some((k) => k.status === filter))
      .filter((r) => {
        const s = q.toLowerCase().trim();
        if (!s) return true;
        return [r.profile.full_name, r.profile.email, r.profile.phone, ...r.kids.map((k) => k.name)].join(' ').toLowerCase().includes(s);
      });
  }, [adm.profiles, adm.children, adm.subscriptions, q, filter]);

  return (
    <Screen header={<HeroHeader title="Usuarios" subtitle={`${adm.profiles.filter((p) => p.role === 'familia').length} familias registradas`} />}>
      <Input placeholder="Buscar por nombre, email, teléfono o peque…" value={q} onChangeText={setQ} />
      <Chips
        wrap={false}
        options={[
          { value: 'todas' as Filter, label: 'Todas' },
          { value: 'entrevista' as Filter, label: 'Entrevista' },
          { value: 'intervencion' as Filter, label: 'En intervención' },
          { value: 'finalizada' as Filter, label: 'Finalizadas' },
          { value: 'admin' as Filter, label: 'Administradoras' },
        ]}
        value={filter}
        onChange={setFilter}
      />
      <View style={{ height: 12 }} />
      {rows.length === 0 ? <Txt variant="small">No hay resultados.</Txt> : null}
      {rows.map(({ profile, kids, sub }) => {
        const st = SUBSCRIPTION_STATUS[sub?.status ?? 'sin_suscripcion'];
        return (
          <Card key={profile.id} onPress={() => router.push(`/admin/familia/${profile.id}`)} style={{ marginBottom: 10 }}>
            <Row style={{ alignItems: 'flex-start' }}>
              <IconBubble name={profile.role === 'admin' ? 'shield-account-outline' : 'account-heart-outline'} />
              <View style={{ flex: 1 }}>
                <Txt variant="h3">{profile.full_name || 'Sin nombre'}</Txt>
                <Txt variant="small">
                  {profile.email}
                  {profile.phone ? ` · ${profile.phone}` : ''}
                </Txt>
                {profile.role === 'familia' ? (
                  <View style={{ marginTop: 6 }}>
                    <Badge label={`Suscripción: ${st.label}`} bg={st.color} color={st.text} />
                  </View>
                ) : null}
              </View>
            </Row>
            {kids.map((k) => (
              <View key={k.id} style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border }}>
                <Row style={{ justifyContent: 'space-between', marginBottom: 6 }}>
                  <Txt variant="h3">
                    {k.name} <Txt variant="small">· {ageLabel(k.birth_date)}</Txt>
                  </Txt>
                  <Badge label={CHILD_STATUS[k.status].label} bg={CHILD_STATUS[k.status].color} color={CHILD_STATUS[k.status].text} />
                </Row>
                {k.status !== 'entrevista' ? <WeekIndicator child={k} compact /> : null}
              </View>
            ))}
          </Card>
        );
      })}
    </Screen>
  );
}
