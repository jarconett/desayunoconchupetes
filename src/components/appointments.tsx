import { Linking, View } from 'react-native';

import { APPOINTMENT_LABEL, APPOINTMENT_STATUS, MODALITY_LABEL } from '@/lib/config';
import { formatDateTime } from '@/lib/dates';
import { colors } from '@/lib/theme';
import type { Appointment } from '@/lib/types';

import { Badge, Button, Card, IconBubble, Row, Txt } from './ui';

export function AppointmentCard({
  appt,
  who,
  actions,
}: {
  appt: Appointment;
  who?: string;
  actions?: React.ReactNode;
}) {
  const st = APPOINTMENT_STATUS[appt.status];
  const isInterview = appt.kind === 'entrevista_inicial';
  return (
    <Card style={{ marginBottom: 10 }}>
      <Row style={{ alignItems: 'flex-start' }}>
        <IconBubble
          name={isInterview ? 'account-heart-outline' : 'calendar-check-outline'}
          bg={isInterview ? colors.peach : colors.lavender}
          color={isInterview ? colors.peachDark : colors.lavenderDark}
        />
        <View style={{ flex: 1, gap: 2 }}>
          <Txt variant="h3">
            {APPOINTMENT_LABEL[appt.kind]}
            {appt.week_number ? ` · semana ${appt.week_number}` : ''}
          </Txt>
          {who ? <Txt variant="small">{who}</Txt> : null}
          <Txt>{formatDateTime(appt.starts_at)}</Txt>
          <Txt variant="small">
            {MODALITY_LABEL[appt.modality]} · {appt.duration_min} min
          </Txt>
          <View style={{ marginTop: 6 }}>
            <Badge label={st.label} bg={st.color} color={st.text} />
          </View>
          {appt.family_notes ? (
            <Txt variant="small" style={{ marginTop: 6 }}>
              Nota de la familia: {appt.family_notes}
            </Txt>
          ) : null}
          {appt.admin_notes ? (
            <Txt variant="small" style={{ marginTop: 6 }} color={colors.primaryDark}>
              Nota de la asesora: {appt.admin_notes}
            </Txt>
          ) : null}
          {appt.meeting_link && appt.status === 'confirmada' ? (
            <Button
              small
              variant="soft"
              icon="video-outline"
              title="Unirse a la videollamada"
              style={{ alignSelf: 'flex-start', marginTop: 8 }}
              onPress={() => Linking.openURL(appt.meeting_link!)}
            />
          ) : null}
        </View>
      </Row>
      {actions ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>{actions}</View> : null}
    </Card>
  );
}
