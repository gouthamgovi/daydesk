'use client';

import { useEffect, useState } from 'react';
import { useApp } from './AppProvider';
import TopBar from './TopBar';
import NewTaskModal from './NewTaskModal';
import SidePanel from './SidePanel';
import {
  TodayView,
  WeekView,
  SomedayView,
  HistoryView,
  SearchView,
  ManageView,
} from './Views';

export default function AppShell() {
  const { view, loading, toggleTheme, toggleMode } = useApp();
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalDefaults, setModalDefaults] = useState<{
    day?: string | null;
    isSomeday?: boolean;
  }>({});

  function openTask(id: string) {
    setOpenTaskId(id);
  }
  function addTask(defaults: { day?: string | null; isSomeday?: boolean } = {}) {
    setModalDefaults(defaults);
    setModalOpen(true);
  }

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (modalOpen) return;
      const inField = ['INPUT', 'TEXTAREA', 'SELECT'].includes(
        (document.activeElement?.tagName || '') as string
      );
      if (inField) return;

      if (e.key === 'n') {
        e.preventDefault();
        addTask({ day: new Date().toISOString().slice(0, 10) });
      }
      if (e.key === 'f') {
        e.preventDefault();
        toggleMode();
      }
      if (e.key === 't') {
        e.preventDefault();
        toggleTheme();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        const input = document.querySelector<HTMLInputElement>('input[placeholder="Search tasks..."]');
        input?.focus();
        input?.select();
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [modalOpen, toggleMode, toggleTheme]);

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          color: 'var(--text-muted)',
        }}
      >
        Loading…
      </div>
    );
  }

  return (
    <>
      <TopBar />
      <main
        className="main"
        style={{
          maxWidth: 1500,
          margin: '0 auto',
          padding: '20px 28px 60px',
        }}
      >
        {view === 'today' && <TodayView onTaskClick={openTask} onAddTask={addTask} />}
        {view === 'week' && <WeekView onTaskClick={openTask} onAddTask={addTask} />}
        {view === 'someday' && <SomedayView onTaskClick={openTask} onAddTask={addTask} />}
        {view === 'history' && <HistoryView onTaskClick={openTask} onAddTask={addTask} />}
        {view === 'search' && <SearchView onTaskClick={openTask} onAddTask={addTask} />}
        {view === 'manage' && <ManageView />}
      </main>

      <NewTaskModal
        open={modalOpen}
        defaultDay={modalDefaults.day}
        defaultSomeday={modalDefaults.isSomeday}
        onClose={() => setModalOpen(false)}
      />
      <SidePanel taskId={openTaskId} onClose={() => setOpenTaskId(null)} />
    </>
  );
}
