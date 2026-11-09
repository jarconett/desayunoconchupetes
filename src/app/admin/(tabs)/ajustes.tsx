import { useEffect, useState } from 'react';
import { Linking, View } from 'react-native';

import { Button, Card, HeroHeader, Input, ListItem, Screen, SectionTitle, Txt, notify } from '@/components/ui';
import { useAdmin } from '@/context/admin';
import { useAuth } from '@/context/auth';
import { MIN_NOTICE_HOURS, SLOT_END, SLOT_START, SLOT_STEP_MIN } from '@/lib/config';
import { supabase } from '@/lib/supabase';
import { CONTACT, colors } from '@/lib/theme';

export default function Ajustes() {
  const { profile, refreshProfile, signOut } = useAuth();
  const adm = useAdmin();
  const [name, setName] = useState(profile?.full_name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');

  useEffect(() => {
    setName(profile?.full_name ?? '');
    setPhone(profile?.phone ?? '');
  }, [profile]);

  const save = async () => {
    if (!profile) return;
    const { error } = await supabase.from('profiles').update({ full_name: name, phone }).eq('id', profile.id);
    if (error) notify('Error', error.message);
    else {
      notify('Guardado');
      refreshProfile();
    }
  };

  const families = adm.profiles.filter((p) => p.role === 'familia').length;
  const active = adm.subscriptions.filter((s) => s.status === 'activa').length;
  const done = adm.children.filter((c) => c.status === 'finalizada').length;

  return (
    <Screen header={<HeroHeader title="Ajustes" subtitle={profile?.email ?? ''} />}>
      <SectionTitle icon="chart-box-outline">Resumen del servicio</SectionTitle>
      <Card>
        <Txt>Familias registradas: {families}</Txt>
        <Txt>Suscripciones activas: {active}</Txt>
        <Txt>Intervenciones finalizadas: {done}</Txt>
      </Card>

      <SectionTitle icon="account-edit-outline">Mis datos</SectionTitle>
      <Card>
        <Input label="Nombre" value={name} onChangeText={setName} />
        <Input label="Teléfono" value={phone} onChangeText={setPhone} />
        <Button title="Guardar" icon="content-save-outline" onPress={save} />
      </Card>

      <SectionTitle icon="calendar-clock">Disponibilidad para citas</SectionTitle>
      <Card>
        <Txt>
          Franjas de {SLOT_START} a {SLOT_END}, cada {SLOT_STEP_MIN} minutos, de lunes a viernes. Las familias deben solicitar con {MIN_NOTICE_HOURS} h de antelación.
        </Txt>
        <Txt variant="small" style={{ marginTop: 6 }}>
          Puedes cambiarlo en src/lib/config.ts. Desde la Agenda puedes crear citas a cualquier hora.
        </Txt>
      </Card>

      <SectionTitle icon="chat-processing-outline">Contacto del servicio</SectionTitle>
      <ListItem icon="email-outline" title="Email" subtitle={CONTACT.email} onPress={() => Linking.openURL(`mailto:${CONTACT.email}`)} />
      <ListItem icon="instagram" iconBg={colors.rose} iconColor={colors.roseDark} title="Instagram" subtitle={CONTACT.instagram} onPress={() => Linking.openURL(CONTACT.instagramUrl)} />

      <View style={{ marginTop: 20 }}>
        <Button title="Cerrar sesión" variant="danger" icon="logout" onPress={signOut} />
      </View>
    </Screen>
  );
}
