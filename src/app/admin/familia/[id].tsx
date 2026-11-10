import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, View } from 'react-native';

import { DatePicker } from '@/components/pickers';
import { WeekIndicator } from '@/components/progress';
import { Badge, Button, Card, Chips, Empty, HeroHeader, Input, ListItem, Row, Screen, SectionTitle, Toggle, Txt, confirmAction, notify, Loading } from '@/components/ui';
import { useAdmin } from '@/context/admin';
import { useAuth } from '@/context/auth';
import { CHILD_STATUS, SUBSCRIPTION_STATUS } from '@/lib/config';
import { addDays, ageLabel, formatDate, formatShortDate, toISODate } from '@/lib/dates';
import { supabase } from '@/lib/supabase';
import { colors } from '@/lib/theme';
import type { SubscriptionStatus } from '@/lib/types';

export default function FamiliaDetalle() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile: me } = useAuth();
  const adm = useAdmin();
  const profile = adm.profiles.find((p) => p.id === id);
  const sub = adm.subscriptions.find((s) => s.family_id === id);
  const kids = adm.children.filter((c) => c.family_id === id);

  const [status, setStatus] = useState<SubscriptionStatus>('sin_suscripcion');
  const [planName, setPlanName] = useState('Intervención 6 semanas');
  const [start, setStart] = useState<string | null>(null);
  const [end, setEnd] = useState<string | null>(null);
  const [price, setPrice] = useState('');
  const [paid, setPaid] = useState(false);
  const [notes, setNotes] = useState('');
  const [pick, setPick] = useState<'start' | 'end' | null>(null);

  useEffect(() => {
    if (!sub) return;
    setStatus(sub.status);
    setPlanName(sub.plan_name);
    setStart(sub.start_date);
    setEnd(sub.end_date);
    setPrice(sub.price != null ? String(sub.price) : '');
    setPaid(sub.paid);
    setNotes(sub.notes ?? '');
  }, [sub]);

  if (adm.loading) return <Loading />;
  if (!profile) return <Screen header={<HeroHeader back title="Usuario" />}><Empty title="No encontrado" /></Screen>;

  const save = async () => {
    const { error } = await supabase.from('subscriptions').upsert({
      family_id: profile.id,
      status,
      plan_name: planName,
      start_date: start,
      end_date: end,
      price: price ? Number(price.replace(',', '.')) : null,
      paid,
      notes: notes || null,
    });
    if (error) notify('Error', error.message);
    else notify('Suscripción guardada');
    adm.reload();
  };

  const activateNow = () => {
    const s = new Date();
    setStatus('activa');
    setStart(toISODate(s));
    setEnd(toISODate(addDays(s, 7 * 6 + 7)));
  };

  const toggleRole = async () => {
    const next = profile.role === 'admin' ? 'familia' : 'admin';
    const ok = await confirmAction(
      next === 'admin' ? 'Dar acceso de administradora' : 'Quitar acceso de administradora',
      next === 'admin' ? `${profile.full_name} podrá ver y gestionar todas las familias.` : `${profile.full_name} pasará a ser usuaria familia.`,
    );
    if (!ok) return;
    const { error } = await supabase.from('profiles').update({ role: next }).eq('id', profile.id);
    if (error) notify('Error', error.message);
    adm.reload();
  };

  const st = SUBSCRIPTION_STATUS[sub?.status ?? 'sin_suscripcion'];

  return (
    <Screen header={<HeroHeader back title={profile.full_name || 'Sin nombre'} subtitle={profile.role === 'admin' ? 'Administradora' : 'Familia'} />}>
      <Card>
        <Txt variant="caption">Contacto</Txt>
        <Txt style={{ marginTop: 4 }}>{profile.email}</Txt>
        {profile.phone ? <Txt>{profile.phone}</Txt> : null}
        <Txt variant="small" style={{ marginTop: 4 }}>
          Alta: {formatDate(profile.created_at)} · Notificaciones push: {profile.push_token ? 'activadas' : 'no'}
        </Txt>
        <Row style={{ marginTop: 10, flexWrap: 'wrap' }} gap={8}>
          {profile.email ? <Button small variant="soft" icon="email-outline" title="Email" onPress={() => Linking.openURL(`mailto:${profile.email}`)} /> : null}
          {profile.phone ? <Button small variant="soft" icon="phone-outline" title="Llamar" onPress={() => Linking.openURL(`tel:${profile.phone}`)} /> : null}
          {profile.phone ? (
            <Button small variant="soft" icon="whatsapp" title="WhatsApp" onPress={() => Linking.openURL(`https://wa.me/${profile.phone!.replace(/\D/g, '').replace(/^(?!34)(\d{9})$/, '34$1')}`)} />
          ) : null}
        </Row>
      </Card>

      {profile.role === 'familia' ? (
        <>
          <SectionTitle icon="card-account-details-star-outline" action={<Badge label={st.label} bg={st.color} color={st.text} />}>
            Suscripción del servicio
          </SectionTitle>
          <Card>
            <Txt variant="label">Estado</Txt>
            <Chips
              options={(Object.keys(SUBSCRIPTION_STATUS) as SubscriptionStatus[]).map((k) => ({ value: k, label: SUBSCRIPTION_STATUS[k].label }))}
              value={status}
              onChange={setStatus}
            />
            {status !== 'activa' ? (
              <Button small variant="soft" icon="lightning-bolt-outline" title="Activar 7 semanas desde hoy" style={{ alignSelf: 'flex-start', marginTop: 10 }} onPress={activateNow} />
            ) : null}
            <View style={{ height: 14 }} />
            <Input label="Servicio" value={planName} onChangeText={setPlanName} />
            <Row gap={10} style={{ flexWrap: 'wrap', marginBottom: 10 }}>
              <Button small variant="secondary" icon="calendar-start" title={start ? `Inicio: ${formatDate(start)}` : 'Fecha de inicio'} onPress={() => setPick(pick === 'start' ? null : 'start')} />
              <Button small variant="secondary" icon="calendar-end" title={end ? `Fin: ${formatDate(end)}` : 'Fecha de fin'} onPress={() => setPick(pick === 'end' ? null : 'end')} />
            </Row>
            {kids.some((k) => k.status === 'intervencion') ? (
              <Txt variant="small" style={{ marginBottom: 10 }}>
                🔗 La fecha de inicio está enlazada con la intervención:{' '}
                {kids
                  .filter((k) => k.status === 'intervencion')
                  .map((k) => `${k.name} (${k.intervention_start ? formatShortDate(k.intervention_start) : 'sin fecha'})`)
                  .join(', ')}
                . Al cambiarla aquí se actualizan también la intervención, las semanas del diario y se avisa a la familia.
              </Txt>
            ) : null}
            {pick ? (
              <View style={{ marginBottom: 12 }}>
                <DatePicker
                  value={pick === 'start' ? start : end}
                  onChange={(d) => {
                    if (pick === 'start') setStart(d);
                    else setEnd(d);
                    setPick(null);
                  }}
                />
              </View>
            ) : null}
            <Input label="Precio (€)" value={price} onChangeText={setPrice} keyboardType="decimal-pad" />
            <Toggle value={paid} onChange={setPaid} label="Pagado" />
            <View style={{ height: 12 }} />
            <Input label="Notas internas" value={notes} onChangeText={setNotes} multiline />
            <Button title="Guardar suscripción" icon="content-save-outline" onPress={save} />
          </Card>

          <SectionTitle icon="baby-face-outline">Peques</SectionTitle>
          {kids.length === 0 ? <Txt variant="small">Esta familia aún no ha añadido peques.</Txt> : null}
          {kids.map((k) => (
            <Card key={k.id} onPress={() => router.push(`/admin/nino/${k.id}`)} style={{ marginBottom: 10 }}>
              <Row style={{ justifyContent: 'space-between', marginBottom: 8 }}>
                <View>
                  <Txt variant="h3">{k.name}</Txt>
                  <Txt variant="small">{ageLabel(k.birth_date)}</Txt>
                </View>
                <Badge label={CHILD_STATUS[k.status].label} bg={CHILD_STATUS[k.status].color} color={CHILD_STATUS[k.status].text} />
              </Row>
              <WeekIndicator child={k} compact />
            </Card>
          ))}
        </>
      ) : null}

      {profile.id !== me?.id ? (
        <>
          <SectionTitle icon="shield-account-outline">Permisos</SectionTitle>
          <ListItem
            icon="shield-account-outline"
            title={profile.role === 'admin' ? 'Quitar acceso de administradora' : 'Dar acceso de administradora'}
            subtitle="Para otra asesora del equipo"
            onPress={toggleRole}
            iconBg={colors.lavender}
            iconColor={colors.lavenderDark}
          />
        </>
      ) : null}
    </Screen>
  );
}
