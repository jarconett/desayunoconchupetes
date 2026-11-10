import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import { useAuth } from '@/context/auth';
import { formatDateTime } from '@/lib/dates';
import { supabase } from '@/lib/supabase';
import { colors } from '@/lib/theme';
import type { AppNotification } from '@/lib/types';

import { Button, Card, Empty, HeroHeader, Icon, IconBubble, Row, Screen, Txt, confirmAction, notify } from './ui';

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

  /** Descartar (borrar) un aviso */
  const dismiss = async (n: AppNotification) => {
    setItems((prev) => prev.filter((x) => x.id !== n.id));
    const { error } = await supabase.from('notifications').delete().eq('id', n.id);
    if (error) {
      notify('No se pudo descartar', error.message);
      await load();
    }
    onChanged?.();
  };

  /** Descartar todos los avisos (o solo los ya leídos) */
  const dismissAll = async (onlyRead: boolean) => {
    if (!session) return;
    const ok = await confirmAction(
      onlyRead ? 'Borrar avisos leídos' : 'Borrar todos los avisos',
      onlyRead ? 'Se eliminarán los avisos que ya has leído.' : 'Se eliminarán todos tus avisos, también los no leídos.',
      'Borrar',
    );
    if (!ok) return;
    let q = supabase.from('notifications').delete().eq('user_id', session.user.id);
    if (onlyRead) q = q.eq('read', true);
    const { error } = await q;
    if (error) notify('No se pudo borrar', error.message);
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
      {items.length > 0 ? (
        <Row gap={8} style={{ flexWrap: 'wrap', marginBottom: 10 }}>
          {items.some((i) => i.read) ? <Button small variant="soft" icon="broom" title="Borrar leídos" onPress={() => dismissAll(true)} /> : null}
          <Button small variant="ghost" icon="trash-can-outline" title="Borrar todos" onPress={() => dismissAll(false)} />
        </Row>
      ) : null}
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
            <Pressable
              onPress={() => dismiss(n)}
              accessibilityRole="button"
              accessibilityLabel="Descartar aviso"
              hitSlop={10}
              style={{ padding: 4, borderRadius: 14, backgroundColor: n.read ? colors.bg : '#ffffffaa' }}>
              <Icon name="close" size={18} color={colors.muted} />
            </Pressable>
          </Row>
        </Card>
      ))}
    </Screen>
  );
}
