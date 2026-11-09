import { Pressable, Text, TextInput, View } from 'react-native';

import { PATHOLOGY_FORMS } from '@/lib/forms';
import { colors, fonts, radius } from '@/lib/theme';
import type { PathologyHistory, PathologyRange, YesNo } from '@/lib/types';

import { Card, Row, SectionTitle, Txt } from './ui';

type Answers = PathologyHistory['answers'];

export function PathologyForm({
  range,
  answers,
  onChange,
  readOnly,
}: {
  range: PathologyRange;
  answers: Answers;
  onChange?: (a: Answers) => void;
  readOnly?: boolean;
}) {
  const form = PATHOLOGY_FORMS[range];
  const set = (key: string, patch: Answers[string]) => onChange?.({ ...answers, [key]: { ...answers[key], ...patch } });

  return (
    <View>
      {form.sections.map((s) => (
        <View key={s.title}>
          <SectionTitle>{s.title}</SectionTitle>
          {s.note ? (
            <Txt variant="small" style={{ marginBottom: 8 }}>
              {s.note}
            </Txt>
          ) : null}
          <Card style={{ paddingVertical: 6 }}>
            {s.questions.map((q, i) => {
              const a = answers[q.key] ?? {};
              return (
                <View key={q.key} style={{ paddingVertical: 12, borderTopWidth: i ? 1 : 0, borderTopColor: colors.border }}>
                  <Txt>{q.label}</Txt>
                  {q.help ? <Txt variant="small">{q.help}</Txt> : null}
                  {q.type === 'text' ? (
                    readOnly ? (
                      <Txt color={colors.primaryDark} style={{ marginTop: 4 }}>
                        {a.text || '—'}
                      </Txt>
                    ) : (
                      <TextInput
                        value={a.text ?? ''}
                        onChangeText={(t) => set(q.key, { text: t })}
                        multiline
                        placeholder="Escribe aquí…"
                        placeholderTextColor="#B0AEB8"
                        style={inputStyle}
                      />
                    )
                  ) : (
                    <>
                      <Row style={{ marginTop: 8 }} gap={8}>
                        <YesNoButton label="Sí" selected={a.value === 'si'} onPress={() => !readOnly && set(q.key, { value: a.value === 'si' ? '' : ('si' as YesNo) })} />
                        <YesNoButton label="No" selected={a.value === 'no'} onPress={() => !readOnly && set(q.key, { value: a.value === 'no' ? '' : ('no' as YesNo) })} />
                      </Row>
                      {a.value === 'si' ? (
                        readOnly ? (
                          a.comment ? (
                            <Txt variant="small" color={colors.primaryDark} style={{ marginTop: 6 }}>
                              {a.comment}
                            </Txt>
                          ) : null
                        ) : (
                          <TextInput
                            value={a.comment ?? ''}
                            onChangeText={(t) => set(q.key, { comment: t })}
                            placeholder="Si quieres, cuéntanos un poco más"
                            placeholderTextColor="#B0AEB8"
                            style={inputStyle}
                          />
                        )
                      ) : null}
                    </>
                  )}
                </View>
              );
            })}
          </Card>
        </View>
      ))}
    </View>
  );
}

function YesNoButton({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      style={{
        minWidth: 70,
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: radius.pill,
        borderWidth: 1.5,
        borderColor: selected ? colors.primary : colors.border,
        backgroundColor: selected ? colors.primary : '#fff',
      }}>
      <Text style={{ fontFamily: fonts.bold, color: selected ? '#fff' : colors.text }}>{label}</Text>
    </Pressable>
  );
}

const inputStyle = {
  marginTop: 8,
  borderWidth: 1.5,
  borderColor: colors.border,
  borderRadius: radius.sm,
  padding: 10,
  minHeight: 44,
  fontFamily: fonts.medium,
  fontSize: 14,
  color: colors.text,
  backgroundColor: '#FDFBF8',
};

export function pathologyProgress(range: PathologyRange, answers: Answers) {
  const qs = PATHOLOGY_FORMS[range].sections.flatMap((s) => s.questions).filter((q) => q.type === 'yesno');
  const done = qs.filter((q) => answers[q.key]?.value).length;
  return { done, total: qs.length };
}
