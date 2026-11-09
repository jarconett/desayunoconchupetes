import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { Button, Card, HeroHeader, IconBubble, Row, Screen, Txt } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { useFamily } from '@/context/family';
import { DESCANSO_DOC, DESCANSO_DOC_KEY } from '@/lib/forms';
import { supabase } from '@/lib/supabase';
import { colors, fonts } from '@/lib/theme';

export default function Descanso() {
  const { session } = useAuth();
  const fam = useFamily();
  const read = fam.reads.includes(DESCANSO_DOC_KEY);
  const [saving, setSaving] = useState(false);

  const markRead = async () => {
    if (!session) return;
    setSaving(true);
    await supabase.from('document_reads').upsert({ user_id: session.user.id, doc_key: DESCANSO_DOC_KEY });
    await fam.reload();
    setSaving(false);
  };

  return (
    <Screen header={<HeroHeader back title="1, 2, 3 del descanso" subtitle="Revisad cada uno de los puntos" />}>
      {DESCANSO_DOC.map((ch) => (
        <Card key={ch.number} style={{ marginBottom: 14 }}>
          <Row style={{ marginBottom: 10 }}>
            <IconBubble name={ch.icon} bg={ch.color} color={colors.night} size={50} />
            <View>
              <Txt variant="caption">Punto {ch.number}</Txt>
              <Txt variant="h2">{ch.title}</Txt>
            </View>
          </Row>
          {ch.blocks.map((b, i) => (
            <View key={i} style={{ marginTop: 8 }}>
              {b.heading ? (
                <Txt variant="h3" color={colors.primaryDark}>
                  {b.heading}
                </Txt>
              ) : null}
              {b.paragraphs?.map((p, j) => (
                <Txt key={j} style={{ marginTop: 4 }}>
                  {p}
                </Txt>
              ))}
              {b.bullets?.map((p, j) => (
                <Row key={j} style={{ alignItems: 'flex-start', marginTop: 6 }} gap={8}>
                  <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: ch.color, borderWidth: 1, borderColor: colors.primary, marginTop: 8 }} />
                  <Txt style={{ flex: 1 }}>{p}</Txt>
                </Row>
              ))}
            </View>
          ))}
          {ch.table ? (
            <View style={{ marginTop: 14 }}>
              <Txt variant="caption" style={{ marginBottom: 6 }}>
                Tabla orientativa de siestas
              </Txt>
              <ScrollView horizontal>
                <View style={{ borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: colors.border }}>
                  {[ch.table.headers, ...ch.table.rows].map((row, ri) => (
                    <View key={ri} style={{ flexDirection: 'row', backgroundColor: ri === 0 ? ch.color : ri % 2 ? '#fff' : '#FBF8F4' }}>
                      {row.map((cell, ci) => (
                        <Text
                          key={ci}
                          style={{
                            width: ci === 0 ? 96 : 112,
                            padding: 8,
                            fontFamily: ri === 0 || ci === 0 ? fonts.bold : fonts.medium,
                            fontSize: 12.5,
                            color: colors.text,
                          }}>
                          {cell}
                        </Text>
                      ))}
                    </View>
                  ))}
                </View>
              </ScrollView>
            </View>
          ) : null}
        </Card>
      ))}
      {read ? (
        <Card tint={colors.mint}>
          <Row>
            <IconBubble name="check" bg="#fff" color={colors.mintDark} />
            <Txt style={{ flex: 1 }}>¡Ya lo habéis leído! Volved aquí siempre que lo necesitéis.</Txt>
          </Row>
        </Card>
      ) : (
        <Button title="Lo he leído" icon="check-circle-outline" onPress={markRead} loading={saving} />
      )}
    </Screen>
  );
}
