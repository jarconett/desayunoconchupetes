import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { supabase } from '@/lib/supabase';
import { computeAdminTasks, type PendingTask } from '@/lib/tasks';
import type {
  AdminTask,
  Appointment,
  Child,
  InterventionRequest,
  Profile,
  SessionSummary,
  SleepDiary,
  SleepPlan,
  Subscription,
} from '@/lib/types';

import { useAuth } from './auth';

export interface AdminData {
  profiles: Profile[];
  subscriptions: Subscription[];
  children: Child[];
  appointments: Appointment[];
  requests: InterventionRequest[];
  sheets: { child_id: string; updated_at: string }[];
  diaries: Pick<SleepDiary, 'id' | 'child_id' | 'week_number' | 'submitted' | 'submitted_at' | 'updated_at'>[];
  plans: Pick<SleepPlan, 'child_id' | 'published' | 'updated_at' | 'version'>[];
  summaries: Pick<SessionSummary, 'id' | 'appointment_id' | 'child_id' | 'title' | 'week_number' | 'sent' | 'created_at' | 'read_at'>[];
  manual: AdminTask[];
  pathologies: { child_id: string; submitted: boolean }[];
  unreadNotifications: number;
}

interface AdminState extends AdminData {
  loading: boolean;
  reload: () => Promise<void>;
  tasks: PendingTask[];
  familyName: (familyId: string) => string;
}

const empty: AdminData = {
  profiles: [],
  subscriptions: [],
  children: [],
  appointments: [],
  requests: [],
  sheets: [],
  diaries: [],
  plans: [],
  summaries: [],
  manual: [],
  pathologies: [],
  unreadNotifications: 0,
};

const AdminContext = createContext<AdminState | null>(null);

export function AdminProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const uid = session?.user.id;
  const [data, setData] = useState<AdminData>(empty);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!uid) return;
    const [p, s, c, a, r, sh, d, pl, su, t, ph, n] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('subscriptions').select('*'),
      supabase.from('children').select('*').order('created_at', { ascending: false }),
      supabase.from('appointments').select('*').order('starts_at'),
      supabase.from('intervention_requests').select('*').order('created_at', { ascending: false }),
      supabase.from('sleep_sheets').select('child_id, updated_at'),
      supabase.from('sleep_diaries').select('id, child_id, week_number, submitted, submitted_at, updated_at').order('week_number'),
      supabase.from('sleep_plans').select('child_id, published, updated_at, version'),
      supabase.from('session_summaries').select('id, appointment_id, child_id, title, week_number, sent, created_at, read_at').order('created_at', { ascending: false }),
      supabase.from('admin_tasks').select('*').order('created_at', { ascending: false }),
      supabase.from('pathology_histories').select('child_id, submitted'),
      supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', uid).eq('read', false),
    ]);
    setData({
      profiles: (p.data as Profile[]) ?? [],
      subscriptions: (s.data as Subscription[]) ?? [],
      children: (c.data as Child[]) ?? [],
      appointments: (a.data as Appointment[]) ?? [],
      requests: (r.data as InterventionRequest[]) ?? [],
      sheets: (sh.data as AdminData['sheets']) ?? [],
      diaries: (d.data as AdminData['diaries']) ?? [],
      plans: (pl.data as AdminData['plans']) ?? [],
      summaries: (su.data as AdminData['summaries']) ?? [],
      manual: (t.data as AdminTask[]) ?? [],
      pathologies: (ph.data as AdminData['pathologies']) ?? [],
      unreadNotifications: n.count ?? 0,
    });
    setLoading(false);
  }, [uid]);

  useEffect(() => {
    if (!uid) return;
    reload();
    const channel = supabase
      .channel(`admin-${uid}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => reload())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${uid}` }, () => reload())
      .subscribe();
    const appSub = AppState.addEventListener('change', (st) => st === 'active' && reload());
    return () => {
      supabase.removeChannel(channel);
      appSub.remove();
    };
  }, [uid, reload]);

  const familyNames = useMemo(() => Object.fromEntries(data.profiles.map((p) => [p.id, p.full_name || p.email || 'Familia'])), [data.profiles]);
  const tasks = useMemo(() => computeAdminTasks({ ...data, familyNames }), [data, familyNames]);

  return (
    <AdminContext.Provider value={{ ...data, loading, reload, tasks, familyName: (id) => familyNames[id] ?? 'Familia' }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error('useAdmin debe usarse dentro de AdminProvider');
  return ctx;
}
