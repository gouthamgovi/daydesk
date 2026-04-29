'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Area, Category, Task, TaskInput, Theme, Mode, Recurrence } from '@/types';
import { todayKey, today, toKey, fromKey } from '@/lib/dates';
import { showToast } from './Toast';

interface AppContextType {
  loading: boolean;
  user: { id: string; email: string } | null;
  tasks: Task[];
  areas: Area[];
  categories: Category[];
  theme: Theme;
  mode: Mode;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  view: string;
  setView: (v: string) => void;

  createTask: (input: TaskInput) => Promise<Task | null>;
  updateTask: (id: string, patch: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  toggleTaskDone: (id: string) => Promise<void>;

  createArea: (name: string) => Promise<void>;
  deleteArea: (id: string) => Promise<void>;
  createCategory: (name: string, color: string) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;

  toggleTheme: () => Promise<void>;
  toggleMode: () => Promise<void>;

  signOut: () => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}

export function AppProvider({
  children,
  initialUser,
}: {
  children: React.ReactNode;
  initialUser: { id: string; email: string };
}) {
  const supabase = createClient();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [theme, setTheme] = useState<Theme>('light');
  const [mode, setMode] = useState<Mode>('normal');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [view, setView] = useState('today');

  // Initial load + maintenance
  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [taskRes, areaRes, catRes, settingRes] = await Promise.all([
        supabase.from('tasks').select('*').order('created_at', { ascending: false }),
        supabase.from('areas').select('*').order('name'),
        supabase.from('categories').select('*').order('name'),
        supabase.from('user_settings').select('*').eq('user_id', initialUser.id).single(),
      ]);
      if (cancelled) return;

      if (taskRes.data) setTasks(taskRes.data as Task[]);
      if (areaRes.data) setAreas(areaRes.data as Area[]);
      if (catRes.data) setCategories(catRes.data as Category[]);

      if (settingRes.data) {
        const t = (settingRes.data.theme || 'light') as Theme;
        const m = (settingRes.data.mode || 'normal') as Mode;
        setTheme(t);
        setMode(m);
        document.documentElement.setAttribute('data-theme', t);
        document.documentElement.setAttribute('data-mode', m);
        localStorage.setItem('daydesk-theme', t);
        localStorage.setItem('daydesk-mode', m);
      }

      // Run daily maintenance: rollover + recurring instances
      await runDailyMaintenance(taskRes.data || [], settingRes.data?.last_maintenance);

      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [initialUser.id]);

  async function runDailyMaintenance(currentTasks: Task[], lastMaint: string | null) {
    const today = todayKey();
    if (lastMaint === today) return;

    let rolled = 0;
    let recurred = 0;

    // 1. Rollover: pending non-someday non-recurring-instance tasks with day < today → today
    const stale = currentTasks.filter(
      (t) =>
        t.status === 'pending' &&
        !t.is_someday &&
        !t.recurrence_template_id &&
        t.day !== null &&
        t.day < today
    );
    if (stale.length > 0) {
      const ids = stale.map((t) => t.id);
      await supabase.from('tasks').update({ day: today, rolled_over: true }).in('id', ids);
      rolled = stale.length;
    }

    // 2. Recurring: spawn today's instance if missing
    const templates = currentTasks.filter(
      (t) => t.recurrence && t.recurrence.type !== 'none' && !t.recurrence_template_id
    );
    const todayDate = new Date();
    const todayDow = todayDate.getDay();
    const todayDom = todayDate.getDate();

    for (const tpl of templates) {
      if (!recurrenceMatches(tpl.recurrence!, todayDow, todayDom)) continue;
      const existing = currentTasks.find(
        (t) => t.recurrence_template_id === tpl.id && t.day === today
      );
      if (existing) continue;
      const { data } = await supabase
        .from('tasks')
        .insert({
          user_id: initialUser.id,
          title: tpl.title,
          description: tpl.description,
          urgency: tpl.urgency,
          priority: tpl.priority,
          day: today,
          is_someday: false,
          area_id: tpl.area_id,
          category_id: tpl.category_id,
          tags: tpl.tags,
          subtasks: tpl.subtasks.map((s) => ({ title: s.title, done: false })),
          recurrence_template_id: tpl.id,
          status: 'pending',
        })
        .select('*')
        .single();
      if (data) recurred++;
    }

    await supabase
      .from('user_settings')
      .update({ last_maintenance: today })
      .eq('user_id', initialUser.id);

    if (rolled > 0 || recurred > 0) {
      // Reload tasks to reflect changes
      const { data } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });
      if (data) setTasks(data as Task[]);
      let msg = '';
      if (rolled > 0) msg += `Rolled over ${rolled} task${rolled === 1 ? '' : 's'}. `;
      if (recurred > 0) msg += `Added ${recurred} recurring task${recurred === 1 ? '' : 's'}.`;
      showToast(msg.trim());
    }
  }

  function recurrenceMatches(rec: Recurrence, dow: number, dom: number): boolean {
    if (!rec || rec.type === 'none') return false;
    if (rec.type === 'daily') return true;
    if (rec.type === 'weekdays') return dow >= 1 && dow <= 5;
    if (rec.type === 'weekly') return Array.isArray(rec.weekdays) && rec.weekdays.includes(dow);
    if (rec.type === 'monthly') return rec.dayOfMonth === dom;
    return false;
  }

  // ----- Mutations -----
  const createTask = useCallback(
    async (input: TaskInput): Promise<Task | null> => {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          user_id: initialUser.id,
          title: input.title.trim(),
          description: (input.description || '').trim(),
          urgency: input.urgency || 'must',
          priority: input.priority || 'none',
          day: input.is_someday ? null : input.day || todayKey(),
          is_someday: !!input.is_someday,
          area_id: input.area_id || null,
          category_id: input.category_id || null,
          tags: input.tags || [],
          subtasks: input.subtasks || [],
          due_date: input.due_date || null,
          recurrence: input.recurrence || null,
          status: 'pending',
        })
        .select('*')
        .single();

      if (error) {
        showToast('Save failed: ' + error.message);
        return null;
      }
      const task = data as Task;
      setTasks((prev) => [task, ...prev]);
      showToast('Task added');
      return task;
    },
    [initialUser.id]
  );

  const updateTask = useCallback(async (id: string, patch: Partial<Task>) => {
    // Optimistic update
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    const { error } = await supabase.from('tasks').update(patch).eq('id', id);
    if (error) showToast('Update failed: ' + error.message);
  }, []);

  const deleteTask = useCallback(async (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) showToast('Delete failed: ' + error.message);
    else showToast('Task deleted');
  }, []);

  const toggleTaskDone = useCallback(
    async (id: string) => {
      const t = tasks.find((x) => x.id === id);
      if (!t) return;
      const patch: Partial<Task> =
        t.status === 'done'
          ? { status: 'pending', completed_at: null }
          : { status: 'done', completed_at: new Date().toISOString() };
      await updateTask(id, patch);
    },
    [tasks, updateTask]
  );

  const createArea = useCallback(
    async (name: string) => {
      const { data, error } = await supabase
        .from('areas')
        .insert({ user_id: initialUser.id, name: name.trim() })
        .select('*')
        .single();
      if (error) {
        showToast('Failed: ' + error.message);
        return;
      }
      setAreas((prev) => [...prev, data as Area].sort((a, b) => a.name.localeCompare(b.name)));
      showToast('Area added');
    },
    [initialUser.id]
  );

  const deleteArea = useCallback(async (id: string) => {
    setAreas((prev) => prev.filter((a) => a.id !== id));
    setTasks((prev) => prev.map((t) => (t.area_id === id ? { ...t, area_id: null } : t)));
    const { error } = await supabase.from('areas').delete().eq('id', id);
    if (error) showToast('Delete failed: ' + error.message);
    else showToast('Area deleted');
  }, []);

  const createCategory = useCallback(
    async (name: string, color: string) => {
      const { data, error } = await supabase
        .from('categories')
        .insert({ user_id: initialUser.id, name: name.trim(), color })
        .select('*')
        .single();
      if (error) {
        showToast('Failed: ' + error.message);
        return;
      }
      setCategories((prev) =>
        [...prev, data as Category].sort((a, b) => a.name.localeCompare(b.name))
      );
      showToast('Category added');
    },
    [initialUser.id]
  );

  const deleteCategory = useCallback(async (id: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== id));
    setTasks((prev) => prev.map((t) => (t.category_id === id ? { ...t, category_id: null } : t)));
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) showToast('Delete failed: ' + error.message);
    else showToast('Category deleted');
  }, []);

  const toggleTheme = useCallback(async () => {
    const next: Theme = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('daydesk-theme', next);
    await supabase.from('user_settings').update({ theme: next }).eq('user_id', initialUser.id);
    showToast(next === 'dark' ? 'Dark mode' : 'Light mode');
  }, [theme, initialUser.id]);

  const toggleMode = useCallback(async () => {
    const next: Mode = mode === 'normal' ? 'focused' : 'normal';
    setMode(next);
    document.documentElement.setAttribute('data-mode', next);
    localStorage.setItem('daydesk-mode', next);
    await supabase.from('user_settings').update({ mode: next }).eq('user_id', initialUser.id);
    showToast(next === 'focused' ? '✦ Focused mode' : 'Normal mode');
  }, [mode, initialUser.id]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  }, []);

  return (
    <AppContext.Provider
      value={{
        loading,
        user: initialUser,
        tasks,
        areas,
        categories,
        theme,
        mode,
        searchQuery,
        setSearchQuery,
        view,
        setView,
        createTask,
        updateTask,
        deleteTask,
        toggleTaskDone,
        createArea,
        deleteArea,
        createCategory,
        deleteCategory,
        toggleTheme,
        toggleMode,
        signOut,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
