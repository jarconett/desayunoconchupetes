import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CONTACT, colors } from '@/lib/theme';

import { VersionInfo } from './version-info';

import { Card, Icon, Logo, Row, Txt } from './ui';

export function AuthShell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <LinearGradient colors={['#DCE2F2', '#E8E1F5', '#FBF7F2', '#FBF7F2']} style={{ flex: 1 }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 20, paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }}>
          <View style={{ width: '100%', maxWidth: 440, alignSelf: 'center' }}>
            <View style={{ alignItems: 'center', marginBottom: 8 }}>
              <Logo size={170} />
              <Txt variant="caption" color={colors.night}>
                Asesoría de sueño infantil
              </Txt>
            </View>
            <Card style={{ marginTop: 16, padding: 22 }}>
              <Txt variant="h2">{title}</Txt>
              {subtitle ? (
                <Txt variant="small" style={{ marginTop: 4, marginBottom: 6 }}>
                  {subtitle}
                </Txt>
              ) : null}
              <View style={{ marginTop: 14 }}>{children}</View>
            </Card>
            <Row style={{ justifyContent: 'center', marginTop: 18, gap: 18, flexWrap: 'wrap' }}>
              <Pressable onPress={() => Linking.openURL(`mailto:${CONTACT.email}`)}>
                <Row gap={6}>
                  <Icon name="email-outline" size={16} color={colors.muted} />
                  <Txt variant="small">{CONTACT.email}</Txt>
                </Row>
              </Pressable>
              <Pressable onPress={() => Linking.openURL(CONTACT.instagramUrl)}>
                <Row gap={6}>
                  <Icon name="instagram" size={16} color={colors.muted} />
                  <Txt variant="small">{CONTACT.instagram}</Txt>
                </Row>
              </Pressable>
            </Row>
            <View style={{ marginTop: 10 }}>
              <VersionInfo center />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}
