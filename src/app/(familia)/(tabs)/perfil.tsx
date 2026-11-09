import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, View } from 'react-native';

import { NotificationTestCard } from '@/components/notification-test';
import { Badge, Button, Card, HeroHeader, Input, ListItem, Row, Screen, SectionTitle, Txt, notify } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { useFamily } from '@/context/family';
import { CHILD_STATUS, SUBSCRIPTION_STATUS } from '@/lib/config';
import { ageLabel, formatShortDate } from '@/lib/dates';
import { supabase } from '@/lib/supabase';
import { CONTACT, colors } from '@/lib/theme';

export default function Perfil() {
  const { profile, refreshProfile, signOut } = useAuth();
  const fam = useFamily();
  const [name, setName] = useState(profile?.full_name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');

  useEffect(() => {
    setName(profile?.full_name ?? '');
    setPhone(profile?.phone ?? '');
  }, [profile]);

  const save = async () => {
    if (!profile) return;
    const { error } = await supabase.from('profiles').update({ full_name: name.trim(), phone: phone.trim() }).eq('id', profile.id);
    if (error) notify('Error', error.message);
    else {
      notify('Datos guardados');
      refreshProfile();
    }
  };

  const sub = fam.subscription;
  const st = SUBSCRIPTION_STATUS[sub?.status ?? 'sin_suscripcion'];

  return (
    <Screen header={<HeroHeader title="Perfil" subtitle={profile?.email ?? ''} />}>
      <SectionTitle icon="card-account-details-star-outline">Mi suscripción</SectionTitle>
      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt variant="h3">{sub?.plan_name ?? 'Asesoría de sueño'}</Txt>
          <Badge label={st.label} bg={st.color} color={st.text} />
        </Row>
        {sub?.start_date || sub?.end_date ? (
          <Txt variant="small" style={{ marginTop: 6 }}>
            {sub.start_date ? `Desde el ${formatShortDate(sub.start_date)}` : ''}
            {sub.end_date ? ` hasta el ${formatShortDate(sub.end_date)}` : ''}
          </Txt>
        ) : null}
        {sub?.status !== 'activa' ? (
          <Txt variant="small" style={{ marginTop: 6 }}>
            La suscripción la gestiona la asesora. Si tienes dudas, escríbenos.
          </Txt>
        ) : null}
      </Card>

      <SectionTitle icon="baby-face-outline" action={<Button small variant="ghost" icon="plus" title="Añadir" onPress={() => router.push('/peque/nuevo')} />}>
        Peques
      </SectionTitle>
      {fam.children.map((c) => (
        <ListItem
          key={c.id}
          icon="baby-face-outline"
          iconBg={colors.peach}
          iconColor={colors.peachDark}
          title={c.name}
          subtitle={`${ageLabel(c.birth_date)} · ${CHILD_STATUS[c.status].label}`}
          onPress={() => router.push(`/peque/nuevo?id=${c.id}`)}
        />
      ))}

      <SectionTitle icon="account-edit-outline">Mis datos</SectionTitle>
      <Card>
        <Input label="Nombre" value={name} onChangeText={setName} />
        <Input label="Teléfono" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <Button title="Guardar" icon="content-save-outline" onPress={save} />
      </Card>

      <SectionTitle icon="bell-ring-outline">Notificaciones</SectionTitle>
      <NotificationTestCard />

      <SectionTitle icon="chat-processing-outline">Contacto</SectionTitle>
      <ListItem icon="email-outline" title="Escríbenos" subtitle={CONTACT.email} onPress={() => Linking.openURL(`mailto:${CONTACT.email}`)} />
      <ListItem icon="instagram" iconBg={colors.rose} iconColor={colors.roseDark} title="Síguenos en Instagram" subtitle={CONTACT.instagram} onPress={() => Linking.openURL(CONTACT.instagramUrl)} />

      <View style={{ marginTop: 20 }}>
        <Button title="Cerrar sesión" variant="danger" icon="logout" onPress={signOut} />
      </View>
    </Screen>
  );
}
