import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { addNotificationReceivedListener, syncPlanReminders } from '@/lib/notifications';
import { supabase } from '@/lib/supabase';
import { computeFamilyTasks, type PendingTask } from '@/lib/tasks';
import type {
  Appointment,
  Child,
  InterventionRequest,
  PathologyHistory,
  SessionSummary,
  SleepDiary,
  SleepPlan,
  Subscription,
} from '@/lib/types';

import { useAuth } from './auth';

export interface FamilyData {
  children: Child[];
  subscription: Subscription | null;
  appointments: Appointment[];
  requests: InterventionRequest[];
  pathologies: PathologyHistory[];
  diaries: SleepDiary[];
  plans: SleepPlan[];
  summaries: SessionSummary[];
  reads: string[];
  unreadNotifications: number;
}

interface FamilyState extends FamilyData {
  loading: boolean;
  tasks: PendingTask[];
  reload: () => Promise<void>;
  subscriptionActive: boolean;
}

const empty: FamilyData = {
  children: [],
  subscription: null,
  appointments: [],
  requests: [],
  pathologies: [],
  diaries: [],
  plans: [],
  summaries: [],
  reads: [],
  unreadNotifications: 0,
};

const FamilyContext = createContext<FamilyState | null>(null);

export function FamilyProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const uid = session?.user.id;
  const [data, setData] = useState<FamilyData>(empty);
  const [loading, setLoading] = useState(true);
  const lastPlanSignature = useRef<string>('');

  const reload = useCallback(async () => {
    if (!uid) return;
    const [kids, sub, appts, reqs, reads, notif] = await Promise.all([
      supabase.from('children').select('*').eq('family_id', uid).order('created_at'),
      supabase.from('subscriptions').select('*').eq('family_id', uid).maybeSingle(),
      supabase.from('appointments').select('*').eq('family_id', uid).order('starts_at', { ascending: false }),
      supabase.from('intervention_requests').select('*').eq('family_id', uid).order('created_at', { ascending: false }),
      supabase.from('document_reads').select('doc_key').eq('user_id', uid),
      supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', uid).eq('read', false),
    ]);
    const childList = (kids.data as Child[]) ?? [];
    const ids = childList.map((c) => c.id);
    let pathologies: PathologyHistory[] = [];
    let diaries: SleepDiary[] = [];
    let plans: SleepPlan[] = [];
    let summaries: SessionSummary[] = [];
    if (ids.length) {
      const [p, d, pl, s] = await Promise.all([
        supabase.from('pathology_histories').select('*').in('child_id', ids),
        supabase.from('sleep_diaries').select('*').in('child_id', ids).order('week_number'),
        supabase.from('sleep_plans').select('*').in('child_id', ids),
        supabase.from('session_summaries').select('*').in('child_id', ids).order('created_at', { ascending: false }),
      ]);
      pathologies = (p.data as PathologyHistory[]) ?? [];
      diaries = (d.data as SleepDiary[]) ?? [];
      plans = (pl.data as SleepPlan[]) ?? [];
      summaries = (s.data as SessionSummary[]) ?? [];
    }
    setData({
      children: childList,
      subscription: (sub.data as Subscription) ?? null,
      appointments: (appts.data as Appointment[]) ?? [],
      requests: (reqs.data as InterventionRequest[]) ?? [],
      pathologies,
      diaries,
      plans,
      summaries,
      reads: ((reads.data as { doc_key: string }[]) ?? []).map((r) => r.doc_key),
      unreadNotifications: notif.count ?? 0,
    });
    setLoading(false);

    // Recordatorios: se reprograman solo si el plan ha cambiado
    const sources = plans
      .filter((p) => p.published)
      .map((p) => ({
        childId: p.child_id,
        childName: childList.find((c) => c.id === p.child_id)?.name ?? 'Peque',
        reminders: p.reminders ?? {},
      }));
    const signature = JSON.stringify(sources);
    if (signature !== lastPlanSignature.current) {
      lastPlanSignature.current = signature;
      syncPlanReminders(sources).catch((e) => console.warn('Recordatorios', e));
    }
  }, [uid]);

  useEffect(() => {
    if (!uid) return;
    reload();
    // Tiempo real: plan, citas, avisos y cambios en los peques (fechas de intervención)
    const channel = supabase
      .channel(`familia-${uid}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sleep_plans' }, () => reload())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments', filter: `family_id=eq.${uid}` }, () => reload())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${uid}` }, () => reload())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'children', filter: `family_id=eq.${uid}` }, () => reload())
      .subscribe();
    const appSub = AppState.addEventListener('change', (s) => s === 'active' && reload());
    const removeListener = addNotificationReceivedListener(() => reload());
    return () => {
      supabase.removeChannel(channel);
      appSub.remove();
      removeListener();
    };
  }, [uid, reload]);

  const subscriptionActive = useMemo(() => {
    const s = data.subscription;
    if (!s || s.status !== 'activa') return false;
    if (s.end_date && new Date(s.end_date + 'T23:59:59') < new Date()) return false;
    return true;
  }, [data.subscription]);

  const tasks = useMemo(() => computeFamilyTasks(data, subscriptionActive), [data, subscriptionActive]);

  return (
    <FamilyContext.Provider value={{ ...data, loading, reload, tasks, subscriptionActive }}>{children}</FamilyContext.Provider>
  );
}

export function useFamily() {
  const ctx = useContext(FamilyContext);
  if (!ctx) throw new Error('useFamily debe usarse dentro de FamilyProvider');
  return ctx;
}
