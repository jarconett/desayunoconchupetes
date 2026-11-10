import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAdmin } from '@/context/admin';
import { formatDate } from '@/lib/dates';
import { supabase } from '@/lib/supabase';
import { colors, radius, shadow } from '@/lib/theme';
import type { AdminTask } from '@/lib/types';

import { DatePicker } from './pickers';
import { Button, Chips, Icon, Input, Row, Txt, confirmAction, notify } from './ui';

/**
 * Ventana para gestionar una tarea añadida a mano:
 * marcar como realizada (o reabrir), editar texto/peque/fecha o eliminar.
 */
export function ManualTaskEditor({ taskId, onClose }: { taskId: string | null; onClose: () => void }) {
  const adm = useAdmin();
  const insets = useSafeAreaInsets();
  const task = adm.manual.find((t) => t.id === taskId) ?? null;
  const [title, setTitle] = useState('');
  const [childId, setChildId] = useState<string | null>(null);
  const [due, setDue] = useState<string | null>(null);
  const [pickDate, setPickDate] = useState(false);

  useEffect(() => {
    if (!task) return;
    setTitle(task.title);
    setChildId(task.child_id);
    setDue(task.due_date);
    setPickDate(false);
  }, [task]);

  if (!task) return null;

  const run = async (patch: Partial<AdminTask> | 'delete', ok: string) => {
    const q = supabase.from('admin_tasks');
    const { error } = patch === 'delete' ? await q.delete().eq('id', task.id) : await q.update(patch).eq('id', task.id);
    if (error) return notify('Error', error.message);
    await adm.reload();
    onClose();
    notify(ok);
  };

  const remove = async () => {
    if (await confirmAction('Eliminar tarea', `¿Seguro que quieres eliminar «${task.title}»?`, 'Eliminar')) run('delete', 'Tarea eliminada');
  };

  const kids = adm.children.filter((c) => c.status !== 'finalizada' || c.id === task.child_id);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: 'rgba(58,58,64,0.45)', justifyContent: 'flex-end', alignItems: 'center' }}>
        <Pressable
          onPress={() => {}}
          style={[
            {
              width: '100%',
              maxWidth: 560,
              maxHeight: '90%',
              backgroundColor: colors.bg,
              borderTopLeftRadius: radius.lg,
              borderTopRightRadius: radius.lg,
              paddingBottom: insets.bottom,
            },
            shadow,
          ]}>
          <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
            <Row style={{ marginBottom: 12 }}>
              <Icon name={task.done ? 'check-circle' : 'checkbox-blank-circle-outline'} color={task.done ? colors.mintDark : colors.primary} />
              <Txt variant="h2" style={{ flex: 1 }}>
                {task.done ? 'Tarea realizada' : 'Tarea'}
              </Txt>
              <Pressable onPress={onClose} accessibilityLabel="Cerrar" hitSlop={10}>
                <Icon name="close" color={colors.muted} />
              </Pressable>
            </Row>

            {task.done ? (
              <Button title="Reabrir tarea" icon="restore" variant="secondary" onPress={() => run({ done: false }, 'Tarea reabierta')} />
            ) : (
              <Button title="Marcar como realizada" icon="check-circle-outline" onPress={() => run({ done: true }, '¡Tarea realizada! ✓')} />
            )}

            <Txt variant="label" style={{ marginTop: 18 }}>
              Editar
            </Txt>
            <Input value={title} onChangeText={setTitle} placeholder="Qué hay que hacer" multiline />
            <Txt variant="label">Peque</Txt>
            <Chips
              options={[{ value: '' as string, label: 'General' }, ...kids.map((c) => ({ value: c.id, label: c.name }))]}
              value={childId ?? ''}
              onChange={(v) => setChildId(v || null)}
              wrap={false}
            />
            <Txt variant="label" style={{ marginTop: 12 }}>
              Fecha límite (opcional)
            </Txt>
            <Row gap={8} style={{ flexWrap: 'wrap' }}>
              <Button small variant="secondary" icon="calendar" title={due ? formatDate(due) : 'Sin fecha'} onPress={() => setPickDate(!pickDate)} />
              {due ? <Button small variant="ghost" icon="close" title="Quitar fecha" onPress={() => setDue(null)} /> : null}
            </Row>
            {pickDate ? (
              <View style={{ marginTop: 10 }}>
                <DatePicker
                  value={due}
                  onChange={(d) => {
                    setDue(d);
                    setPickDate(false);
                  }}
                />
              </View>
            ) : null}

            <Button
              title="Guardar cambios"
              icon="content-save-outline"
              variant="secondary"
              style={{ marginTop: 16 }}
              disabled={!title.trim()}
              onPress={() => run({ title: title.trim(), child_id: childId, due_date: due }, 'Tarea actualizada')}
            />
            <Button title="Eliminar tarea" icon="trash-can-outline" variant="danger" style={{ marginTop: 10 }} onPress={remove} />
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/** Lista plegable de tareas manuales ya realizadas (para reabrirlas o eliminarlas). */
export function DoneManualTasks({ childId, onOpen }: { childId?: string; onOpen: (id: string) => void }) {
  const adm = useAdmin();
  const [open, setOpen] = useState(false);
  const done = adm.manual.filter((t) => t.done && (childId === undefined || t.child_id === childId));
  if (done.length === 0) return null;
  const nameOf = (id: string | null) => adm.children.find((c) => c.id === id)?.name ?? 'General';
  return (
    <View style={{ marginTop: 10 }}>
      <Pressable onPress={() => setOpen(!open)} accessibilityRole="button" style={{ paddingVertical: 6 }}>
        <Row gap={6}>
          <Icon name={open ? 'chevron-down' : 'chevron-right'} size={18} color={colors.muted} />
          <Txt variant="small">Tareas realizadas ({done.length})</Txt>
        </Row>
      </Pressable>
      {open
        ? done.map((t) => (
            <Pressable
              key={t.id}
              onPress={() => onOpen(t.id)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 6 }}>
              <Icon name="check-circle" size={18} color={colors.mintDark} />
              <Txt variant="small" style={{ flex: 1, textDecorationLine: 'line-through' }}>
                {t.title}
                {childId === undefined ? ` · ${nameOf(t.child_id)}` : ''}
              </Txt>
              <Icon name="pencil-outline" size={16} color={colors.muted} />
            </Pressable>
          ))
        : null}
    </View>
  );
}
