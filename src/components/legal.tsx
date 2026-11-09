import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/context/auth';
import { COOKIES_POLICY, COOKIES_SUMMARY, COOKIES_TITLE, COOKIES_VERSION, type LegalSection } from '@/lib/legal';
import { supabase } from '@/lib/supabase';
import { colors, fonts, radius, shadow } from '@/lib/theme';

import { Button, Icon, Logo, Row, Txt } from './ui';

/** Muestra un documento legal por secciones. */
export function LegalDoc({ sections }: { sections: LegalSection[] }) {
  return (
    <View>
      {sections.map((s) => (
        <View key={s.title} style={{ marginBottom: 14 }}>
          <Txt variant="h3" color={colors.night} style={{ marginBottom: 4 }}>
            {s.title}
          </Txt>
          {s.paragraphs.map((p, i) => (
            <Txt key={i} style={{ marginBottom: 6, fontSize: 14 }}>
              {p}
            </Txt>
          ))}
          {s.bullets?.map((b, i) => (
            <Row key={i} gap={8} style={{ alignItems: 'flex-start', marginBottom: 4 }}>
              <Txt color={colors.primary} style={{ fontFamily: fonts.bold }}>
                •
              </Txt>
              <Txt style={{ flex: 1, fontSize: 14 }}>{b}</Txt>
            </Row>
          ))}
        </View>
      ))}
    </View>
  );
}

/** Casilla de verificación con texto. */
export function CheckBox({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      onPress={() => onChange(!checked)}
      style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 8 }}>
      <View
        style={{
          width: 24,
          height: 24,
          borderRadius: 7,
          borderWidth: 2,
          borderColor: checked ? colors.primary : '#CFC8D6',
          backgroundColor: checked ? colors.primary : '#fff',
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: 1,
        }}>
        {checked ? <Icon name="check-bold" size={15} color="#fff" /> : null}
      </View>
      <Txt style={{ flex: 1, fontSize: 14 }}>{label}</Txt>
    </Pressable>
  );
}

const localKey = (uid: string) => `consentimiento:${COOKIES_VERSION}:${uid}`;

/**
 * La primera vez que una persona inicia sesión (en cada dispositivo y versión
 * de la política) se le muestra el aviso de cookies y se registra su aceptación.
 */
export function CookieConsentGate() {
  const { session, profile, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const uid = session?.user.id;
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!uid || !profile) {
      setVisible(false);
      return;
    }
    (async () => {
      try {
        if (await AsyncStorage.getItem(localKey(uid))) return;
      } catch {
        // sin almacenamiento local: se consulta la base de datos
      }
      const { data } = await supabase
        .from('consents')
        .select('id')
        .eq('user_id', uid)
        .eq('kind', 'cookies')
        .eq('version', COOKIES_VERSION)
        .limit(1);
      if (cancelled) return;
      if (data && data.length > 0) {
        AsyncStorage.setItem(localKey(uid), new Date().toISOString()).catch(() => {});
        return;
      }
      setVisible(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [uid, profile]);

  if (!visible || !uid) return null;

  const accept = async () => {
    await supabase.from('consents').insert({ user_id: uid, kind: 'cookies', version: COOKIES_VERSION, accepted: true, platform: Platform.OS });
    try {
      await AsyncStorage.setItem(localKey(uid), new Date().toISOString());
    } catch {
      // nada
    }
    setVisible(false);
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => {}}>
      <View style={{ flex: 1, backgroundColor: 'rgba(58,58,64,0.45)', justifyContent: 'flex-end', alignItems: 'center' }}>
        <View
          style={[
            {
              width: '100%',
              maxWidth: 560,
              maxHeight: '88%',
              backgroundColor: colors.bg,
              borderTopLeftRadius: radius.lg,
              borderTopRightRadius: radius.lg,
              padding: 20,
              paddingBottom: 20 + insets.bottom,
            },
            shadow,
          ]}>
          <Row gap={12} style={{ marginBottom: 10 }}>
            <Logo size={52} />
            <View style={{ flex: 1 }}>
              <Txt variant="h2" color={colors.night}>
                Antes de empezar 🍪
              </Txt>
              <Txt variant="small">{COOKIES_TITLE}</Txt>
            </View>
          </Row>
          <Txt style={{ marginBottom: 10 }}>{COOKIES_SUMMARY}</Txt>
          {expanded ? (
            <ScrollView style={{ flexGrow: 0, maxHeight: 360, marginBottom: 12 }} contentContainerStyle={{ paddingRight: 4 }}>
              <LegalDoc sections={COOKIES_POLICY} />
            </ScrollView>
          ) : (
            <Pressable onPress={() => setExpanded(true)} accessibilityRole="button" style={{ marginBottom: 14 }}>
              <Row gap={6}>
                <Icon name="file-document-outline" size={18} color={colors.primaryDark} />
                <Txt color={colors.primaryDark} style={{ fontFamily: fonts.bold }}>
                  Leer la política de cookies completa
                </Txt>
              </Row>
            </Pressable>
          )}
          <Button title="Aceptar y continuar" icon="check-circle-outline" onPress={accept} />
          <Button title="No acepto (cerrar sesión)" variant="ghost" small style={{ marginTop: 6 }} onPress={signOut} />
        </View>
      </View>
    </Modal>
  );
}
