import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { REMINDERS } from './forms';
import { minutesToTime, timeToMinutes, isValidTime } from './dates';
import { supabase } from './supabase';
import type { PlanReminders } from './types';

const isNative = Platform.OS !== 'web';
export const remindersSupported = isNative;

const PREF_KEY = 'recordatorios_activos';
const REMINDER_EMOJI: Record<string, string> = { nap_start: '😴', nap_end: '☀️', routine_start: '🛁', bedtime: '🌙' };
const REMINDER_PREFIX = 'plan-';

if (isNative) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

const BRAND = '#8C7BB8';

async function ensureChannels() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('avisos', {
    name: 'Avisos de la asesoría',
    description: 'Citas, plan de sueño, resúmenes y mensajes de la asesora',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 180, 120, 180],
    lightColor: BRAND,
    sound: 'default',
    showBadge: true,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
  });
  await Notifications.setNotificationChannelAsync('recordatorios', {
    name: 'Recordatorios del plan de sueño',
    description: 'Siesta, rutina de buenas noches y hora de dormir',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 200, 150, 200],
    lightColor: BRAND,
    sound: 'default',
    showBadge: false,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });
}

/** Último error al registrar el token push (para el diagnóstico). */
let lastPushError: string | null = null;

export async function ensurePermission(): Promise<boolean> {
  if (!isNative) return false;
  await ensureChannels();
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const req = await Notifications.requestPermissionsAsync();
  return req.granted;
}

/** Registra el token push del dispositivo en el perfil (para avisos de la asesoría). */
export async function registerPushToken(userId: string) {
  if (!isNative || !Device.isDevice) return;
  try {
    const ok = await ensurePermission();
    if (!ok) return;
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId || (Constants as unknown as { easConfig?: { projectId?: string } }).easConfig?.projectId;
    if (!projectId) {
      lastPushError = 'Falta el projectId de Expo (app.json > extra.eas.projectId).';
      return;
    }
    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    await supabase.from('profiles').update({ push_token: token }).eq('id', userId);
    lastPushError = null;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    lastPushError = /firebase|FCM|google-services/i.test(msg)
      ? 'Falta configurar Firebase (google-services.json) en la app de Android.'
      : msg;
    console.warn('No se pudo registrar el token push', e);
  }
}

export async function getRemindersEnabled(): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(PREF_KEY);
    return v !== 'no';
  } catch {
    return true;
  }
}

export async function setRemindersEnabled(enabled: boolean) {
  try {
    await AsyncStorage.setItem(PREF_KEY, enabled ? 'si' : 'no');
  } catch {
    // sin almacenamiento disponible: no pasa nada
  }
}

export interface ReminderSource {
  childId: string;
  childName: string;
  reminders: PlanReminders;
}

/**
 * Programa (o reprograma) los recordatorios diarios en el dispositivo a partir
 * de los planes de sueño publicados. Se llama al abrir la app, al recibir un
 * aviso de "plan actualizado" y cuando cambia el plan en tiempo real, de forma
 * que los recordatorios siempre se ajustan al último plan.
 */
export async function syncPlanReminders(sources: ReminderSource[]): Promise<number> {
  if (!isNative) return 0;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => n.identifier.startsWith(REMINDER_PREFIX))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );

  if (!(await getRemindersEnabled())) return 0;
  if (!sources.some((s) => REMINDERS.some((r) => s.reminders[r.key]?.enabled))) return 0;
  if (!(await ensurePermission())) return 0;

  let count = 0;
  for (const src of sources) {
    const advance = src.reminders.advance_min ?? 0;
    for (const r of REMINDERS) {
      const cfg = src.reminders[r.key];
      if (!cfg?.enabled || !isValidTime(cfg.time)) continue;
      const at = minutesToTime(timeToMinutes(cfg.time) - advance);
      const [hour, minute] = at.split(':').map(Number);
      const body =
        advance > 0 ? `${r.message} En ${advance} minutos (${cfg.time}).` : `${r.message} (${cfg.time})`;
      await Notifications.scheduleNotificationAsync({
        identifier: `${REMINDER_PREFIX}${src.childId}-${r.key}`,
        content: {
          title: `${REMINDER_EMOJI[r.key] ?? '🌙'} ${src.childName} · ${r.label}`,
          body,
          sound: 'default',
          data: { link: '/plan' },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour,
          minute,
          channelId: 'recordatorios',
        },
      });
      count++;
    }
  }
  return count;
}

export function addNotificationTapListener(onLink: (link: string) => void) {
  if (!isNative) return () => {};
  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    const link = response.notification.request.content.data?.link;
    if (typeof link === 'string') onLink(link);
  });
  return () => sub.remove();
}

export function addNotificationReceivedListener(cb: (link: string | null) => void) {
  if (!isNative) return () => {};
  const sub = Notifications.addNotificationReceivedListener((n) => {
    const link = n.request.content.data?.link;
    cb(typeof link === 'string' ? link : null);
  });
  return () => sub.remove();
}

export interface NotificationDiagnostics {
  supported: boolean;
  permission: 'granted' | 'denied' | 'undetermined';
  pushToken: boolean;
  pushError: string | null;
  scheduledReminders: number;
}

/** Estado de las notificaciones en este dispositivo. */
export async function getNotificationDiagnostics(userId?: string): Promise<NotificationDiagnostics> {
  if (!isNative) return { supported: false, permission: 'undetermined', pushToken: false, pushError: null, scheduledReminders: 0 };
  if (userId) await registerPushToken(userId);
  const perm = await Notifications.getPermissionsAsync();
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  let pushToken = false;
  if (userId) {
    const { data } = await supabase.from('profiles').select('push_token').eq('id', userId).maybeSingle();
    pushToken = !!data?.push_token;
  }
  return {
    supported: true,
    permission: perm.granted ? 'granted' : perm.canAskAgain ? 'undetermined' : 'denied',
    pushToken,
    pushError: lastPushError,
    scheduledReminders: scheduled.filter((n) => n.identifier.startsWith(REMINDER_PREFIX)).length,
  };
}

/**
 * Prueba: muestra una notificación local al momento (comprueba permisos, canal e
 * icono) y pide al servidor un aviso push (comprueba Firebase/Expo).
 */
export async function sendTestNotifications(): Promise<{ local: boolean; push: 'push_enviado' | 'sin_token' | 'error'; error?: string }> {
  let local = false;
  if (isNative && (await ensurePermission())) {
    await Notifications.scheduleNotificationAsync({
      content: { title: '🌙 Desayuno con Chupetes', body: 'Así se verán los recordatorios del plan de sueño. ¡Todo listo!', sound: 'default' },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 2, channelId: 'recordatorios' },
    });
    local = true;
  }
  const { data, error } = await supabase.rpc('send_test_notification');
  if (error) return { local, push: 'error', error: error.message };
  return { local, push: data === 'push_enviado' ? 'push_enviado' : 'sin_token' };
}
