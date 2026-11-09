import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';

import { CheckBox, LegalDoc } from '@/components/legal';
import { Button, Card, HeroHeader, IconBubble, Input, Row, Screen, Txt, notify } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { useFamily } from '@/context/family';
import { formatShortDate } from '@/lib/dates';
import { DATOS_TITLE, PROTECCION_DATOS_VERSION, proteccionDatos } from '@/lib/legal';
import { supabase } from '@/lib/supabase';
import { colors } from '@/lib/theme';

interface ConsentRow {
  id: string;
  signer_name: string | null;
  signer_dni: string | null;
  created_at: string;
  version: string;
}

/**
 * Documento de protección de datos.
 * - ?solicitar=1 → se firma y, a continuación, se envía la solicitud de intervención.
 * - sin parámetro → consulta del documento firmado.
 */
export default function ProteccionDatos() {
  const { childId, solicitar, mensaje } = useLocalSearchParams<{ childId: string; solicitar?: string; mensaje?: string }>();
  const { session, profile } = useAuth();
  const fam = useFamily();
  const child = fam.children.find((c) => c.id === childId);
  const [signed, setSigned] = useState<ConsentRow | null>(null);
  const [studies, setStudies] = useState<ConsentRow | null>(null);
  const [name, setName] = useState(profile?.full_name ?? '');
  const [dni, setDni] = useState('');
  const [accept, setAccept] = useState(false);
  const [acceptStudies, setAcceptStudies] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!childId) return;
    supabase
      .from('consents')
      .select('id, signer_name, signer_dni, created_at, version, kind, accepted')
      .eq('child_id', childId)
      .eq('kind', 'proteccion_datos')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        const rows = (data ?? []) as (ConsentRow & { accepted: boolean })[];
        setSigned(rows.find((r) => r.accepted && !r.version.endsWith(':estudios')) ?? null);
        setStudies(rows.find((r) => r.accepted && r.version.endsWith(':estudios')) ?? null);
      });
  }, [childId]);

  if (!child) {
    return (
      <Screen header={<HeroHeader back title="Protección de datos" />}>
        <Txt>No se ha encontrado el peque.</Txt>
      </Screen>
    );
  }

  const sign = async () => {
    setError('');
    if (!session) return;
    if (name.trim().length < 5) return setError('Escribe tu nombre y apellidos');
    if (!/^[0-9XYZxyz]\d{7}[A-Za-z]$|^[A-Za-z]{1,3}\d{5,9}[A-Za-z]?$/.test(dni.trim().replace(/[\s.-]/g, '')))
      return setError('Escribe un DNI/NIE válido (o el nº de pasaporte)');
    if (!accept) return setError('Para continuar tienes que marcar la casilla de autorización');

    const base = {
      user_id: session.user.id,
      child_id: child.id,
      kind: 'proteccion_datos',
      accepted: true,
      signer_name: name.trim(),
      signer_dni: dni.trim().toUpperCase(),
      platform: Platform.OS,
    };
    const rows = [{ ...base, version: PROTECCION_DATOS_VERSION }];
    if (acceptStudies) rows.push({ ...base, version: `${PROTECCION_DATOS_VERSION}:estudios` });
    const { error: e1 } = await supabase.from('consents').insert(rows);
    if (e1) return setError(e1.message);

    if (solicitar) {
      const { error: e2 } = await supabase.from('intervention_requests').insert({
        child_id: child.id,
        family_id: session.user.id,
        message: (mensaje ?? '').trim() || null,
      });
      if (e2) return setError(e2.message);
      await fam.reload();
      notify('¡Solicitud enviada!', 'La asesora la revisará y te avisaremos cuando se desbloqueen tus documentos.');
      router.replace('/mi-espacio');
      return;
    }
    notify('Documento firmado', 'Gracias. Puedes consultarlo cuando quieras en Mi espacio.');
    router.back();
  };

  const decline = () => {
    notify(
      'No autorizado',
      'Sin vuestra autorización no podemos tratar los datos de sueño y salud del peque, por lo que no es posible realizar la intervención. Si tenéis dudas, escribidnos y os las resolvemos.',
    );
    router.back();
  };

  return (
    <Screen header={<HeroHeader back title="Protección de datos" subtitle={`Consentimiento para ${child.name}`} />}>
      {signed ? (
        <Card tint={colors.mint} style={{ marginBottom: 14 }}>
          <Row>
            <IconBubble name="shield-check-outline" bg="#fff" color={colors.mintDark} />
            <View style={{ flex: 1 }}>
              <Txt variant="h3">Documento firmado</Txt>
              <Txt variant="small">
                Por {signed.signer_name ?? '—'}
                {signed.signer_dni ? ` (${signed.signer_dni})` : ''} el {formatShortDate(signed.created_at)}.
                {studies ? ' Autoriza el uso anonimizado para estudios.' : ''}
              </Txt>
            </View>
          </Row>
        </Card>
      ) : null}

      <Card style={{ marginBottom: 14 }}>
        <Txt variant="h2" color={colors.night} style={{ marginBottom: 10 }}>
          {DATOS_TITLE}
        </Txt>
        <LegalDoc sections={proteccionDatos(child.name)} />
      </Card>

      {!signed ? (
        <Card tint={colors.lavender}>
          <Txt variant="h3" style={{ marginBottom: 8 }}>
            Firma del consentimiento
          </Txt>
          <Input label="Nombre y apellidos (madre, padre o tutor/a legal)" value={name} onChangeText={setName} autoComplete="name" />
          <Input label="DNI / NIE" value={dni} onChangeText={setDni} autoCapitalize="characters" placeholder="00000000T" />
          <CheckBox
            checked={accept}
            onChange={setAccept}
            label={`AUTORIZO el tratamiento de los datos personales y de salud de ${child.name} y de los míos propios con las finalidades descritas, y declaro ser su madre, padre o tutor/a legal. (Obligatorio para la intervención)`}
          />
          <CheckBox
            checked={acceptStudies}
            onChange={setAcceptStudies}
            label="Autorizo además el uso ANONIMIZADO de los registros de sueño para formación y estudios sobre el sueño infantil. (Opcional)"
          />
          {error ? (
            <Txt variant="small" color={colors.danger} style={{ marginVertical: 8 }}>
              {error}
            </Txt>
          ) : null}
          <Button
            title={solicitar ? 'Autorizo y solicito la intervención' : 'Firmar el documento'}
            icon="draw-pen"
            style={{ marginTop: 8 }}
            onPress={sign}
          />
          <Button title="No autorizo" variant="ghost" small style={{ marginTop: 6 }} onPress={decline} />
        </Card>
      ) : solicitar ? (
        <Button
          title="Solicitar la intervención"
          icon="heart-outline"
          onPress={async () => {
            if (!session) return;
            const { error: e } = await supabase.from('intervention_requests').insert({
              child_id: child.id,
              family_id: session.user.id,
              message: (mensaje ?? '').trim() || null,
            });
            if (e) return notify('Error', e.message);
            await fam.reload();
            notify('¡Solicitud enviada!', 'La asesora la revisará y te avisaremos cuando se desbloqueen tus documentos.');
            router.replace('/mi-espacio');
          }}
        />
      ) : null}
    </Screen>
  );
}
