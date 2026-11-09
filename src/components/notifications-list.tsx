import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';

import { useAuth } from '@/context/auth';
import { formatDateTime } from '@/lib/dates';
import { supabase } from '@/lib/supabase';
import { colors } from '@/lib/theme';
import type { AppNotification } from '@/lib/types';

import { Button, Card, Empty, HeroHeader, IconBubble, Row, Screen, Txt } from './ui';

export function NotificationsScreen({ back, onChanged }: { back?: boolean; onChanged?: () => void }) {
  const { session } = useAuth();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!session) return;
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(100);
    setItems((data as AppNotification[]) ?? []);
    setLoading(false);
  }, [session]);

  useEffect(() => {
    load();
  }, [load]);

  const markAll = async () => {
    if (!session) return;
    await supabase.from('notifications').update({ read: true }).eq('user_id', session.user.id).eq('read', false);
    await load();
    onChanged?.();
  };

  const open = async (n: AppNotification) => {
    if (!n.read) {
      await supabase.from('notifications').update({ read: true }).eq('id', n.id);
      onChanged?.();
    }
    if (n.link) router.push(n.link as never);
    else load();
  };

  return (
    <Screen
      refreshing={loading}
      onRefresh={load}
      header={
        <HeroHeader
          back={back}
          title="Avisos"
          subtitle="Citas, documentos y novedades"
          right={items.some((i) => !i.read) ? <Button small variant="soft" title="Marcar leídos" onPress={markAll} /> : undefined}
        />
      }>
      {!loading && items.length === 0 ? <Empty icon="bell-sleep-outline" title="Sin avisos por ahora" text="Aquí aparecerán las confirmaciones de citas y novedades." /> : null}
      {items.map((n) => (
        <Card key={n.id} onPress={() => open(n)} style={{ marginBottom: 8, padding: 12 }} tint={n.read ? undefined : colors.primarySoft}>
          <Row style={{ alignItems: 'flex-start' }}>
            <IconBubble name={n.read ? 'bell-outline' : 'bell-ring-outline'} size={38} bg={n.read ? colors.bg : '#fff'} />
            <View style={{ flex: 1 }}>
              <Txt variant="h3">{n.title}</Txt>
              <Txt variant="small" color={colors.text}>
                {n.body}
              </Txt>
              <Txt variant="small" style={{ marginTop: 2 }}>
                {formatDateTime(n.created_at)}
              </Txt>
            </View>
          </Row>
        </Card>
      ))}
    </Screen>
  );
}
