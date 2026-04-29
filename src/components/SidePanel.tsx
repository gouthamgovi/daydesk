'use client';

import { useEffect, useState, useRef } from 'react';
import { useApp } from './AppProvider';
import {
  addDays,
  fromKey,
  isSameDay,
  toKey,
  today,
  formatLong,
  formatShort,
  todayKey,
  formatRelative,
} from '@/lib/dates';
import type { Task, Subtask } from '@/types';

interface Props {
  taskId: string | null;
  onClose: () => void;
}

export default function SidePanel({ taskId, onClose }: Props) {
  const { tasks, areas, categories, updateTask, deleteTask, toggleTaskDone } = useApp();
  const task = tasks.find((t) => t.id === taskId) || null;
  const open = !!task;

  // Mounted state controls the slide animation
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => setMounted(true));
    } else {
      setMounted(false);
    }
  }, [open]);

  // Local form state — synced from task on mount, debounced save back
  const [draft, setDraft] = useState<Task | null>(null);
  const [tagInput, setTagInput] = useState('');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');
  const saveTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (task) setDraft({ ...task });
    setTagInput('');
  }, [task?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  function queueSave(patch: Partial<Task>) {
    if (!draft) return;
    setSaveStatus('saving');
    setDraft({ ...draft, ...patch } as Task);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      await updateTask(draft.id, patch);
      setSaveStatus('saved');
    }, 400);
  }

  function commitTagInput() {
    if (!draft) return;
    const v = tagInput.trim().replace(/^#/, '');
    if (!v) return;
    if (draft.tags.includes(v)) {
      setTagInput('');
      return;
    }
    const newTags = [...draft.tags, v];
    setTagInput('');
    queueSave({ tags: newTags });
  }

  function close() {
    setMounted(false);
    setTimeout(onClose, 250);
  }

  // Esc to close
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && open) close();
    }
    if (open) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open || !draft) return null;

  let eyebrow = 'Task';
  if (draft.is_someday) eyebrow = 'Someday';
  else if (draft.day === todayKey()) eyebrow = 'Today';
  else if (draft.day) eyebrow = formatRelative(fromKey(draft.day));

  // Day options
  const dayOptions: Date[] = [];
  const t = today();
  for (let i = 0; i < 28; i++) dayOptions.push(addDays(t, i));
  if (draft.day) {
    const inWindow = dayOptions.some((d) => toKey(d) === draft.day);
    if (!inWindow) {
      const d = fromKey(draft.day);
      if (d < t) dayOptions.unshift(d);
      else dayOptions.push(d);
    }
  }
  const tomorrow = addDays(today(), 1);

  return (
    <>
      <div
        className={`side-panel-overlay${mounted ? ' open' : ''}`}
        onClick={close}
      />
      <aside className={`side-panel${mounted ? ' open' : ''}`}>
        <header
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '14px 18px',
            borderBottom: '1px solid var(--border)',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              className={`checkbox${draft.status === 'done' ? ' checked' : ''}`}
              onClick={async () => {
                await toggleTaskDone(draft.id);
              }}
            />
            <span
              style={{
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--text-muted)',
                fontWeight: 700,
              }}
            >
              {eyebrow}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              className="icon-btn"
              title="Delete"
              onClick={async () => {
                if (confirm('Delete this task?')) {
                  await deleteTask(draft.id);
                  close();
                }
              }}
            >
              🗑
            </button>
            <button className="icon-btn" onClick={close}>
              ×
            </button>
          </div>
        </header>

        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: 18,
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          <input
            value={draft.title}
            onChange={(e) => queueSave({ title: e.target.value })}
            placeholder="Task title"
            style={{
              fontSize: 18,
              fontWeight: 600,
              border: 'none',
              background: 'transparent',
              outline: 'none',
              width: '100%',
              padding: '4px 0',
              borderBottom: '1px solid transparent',
              color: 'var(--text)',
              textDecoration: draft.status === 'done' ? 'line-through' : 'none',
              fontFamily: 'inherit',
            }}
          />

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '110px 1fr',
              gap: '10px 14px',
              fontSize: 13,
              alignItems: 'center',
            }}
          >
            <Label>Day</Label>
            <select
              className="field-select"
              value={draft.is_someday ? '__someday__' : draft.day || ''}
              onChange={(e) => {
                const v = e.target.value;
                if (v === '__someday__') {
                  queueSave({ is_someday: true, day: null });
                } else {
                  queueSave({ is_someday: false, day: v });
                }
              }}
            >
              {dayOptions.map((d) => {
                const key = toKey(d);
                let label: string;
                if (isSameDay(d, today())) label = `Today — ${formatShort(d)}`;
                else if (isSameDay(d, tomorrow)) label = `Tomorrow — ${formatShort(d)}`;
                else label = formatLong(d);
                return (
                  <option key={key} value={key}>
                    {label}
                  </option>
                );
              })}
              <option disabled>──────────</option>
              <option value="__someday__">Someday / Maybe</option>
            </select>

            <Label>Urgency</Label>
            <select
              className="field-select"
              value={draft.urgency}
              onChange={(e) => queueSave({ urgency: e.target.value as any })}
            >
              <option value="must">Must do</option>
              <option value="nice">Nice to do</option>
            </select>

            <Label>Priority</Label>
            <select
              className="field-select"
              value={draft.priority}
              onChange={(e) => queueSave({ priority: e.target.value as any })}
            >
              <option value="none">— None —</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            <Label>Due date</Label>
            <input
              type="date"
              className="field-input"
              value={draft.due_date || ''}
              onChange={(e) => queueSave({ due_date: e.target.value || null })}
            />

            <Label>Area</Label>
            <select
              className="field-select"
              value={draft.area_id || ''}
              onChange={(e) => queueSave({ area_id: e.target.value || null })}
            >
              <option value="">— None —</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>

            <Label>Category</Label>
            <select
              className="field-select"
              value={draft.category_id || ''}
              onChange={(e) => queueSave({ category_id: e.target.value || null })}
            >
              <option value="">— None —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <Section label="Description">
            <textarea
              className="field-textarea"
              value={draft.description}
              onChange={(e) => queueSave({ description: e.target.value })}
              placeholder="Add a description..."
            />
          </Section>

          <Section label="Tags">
            <div
              style={{
                background: 'var(--surface-alt)',
                border: '1px solid transparent',
                borderRadius: 'var(--radius)',
                padding: '6px 8px',
                display: 'flex',
                flexWrap: 'wrap',
                gap: 4,
                alignItems: 'center',
                minHeight: 38,
              }}
            >
              {draft.tags.map((tag) => (
                <span
                  key={tag}
                  style={{
                    background: 'var(--accent-soft)',
                    color: 'var(--accent)',
                    padding: '2px 6px 2px 8px',
                    borderRadius: 3,
                    fontSize: 12,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  #{tag}
                  <span
                    style={{ cursor: 'pointer', fontSize: 14, opacity: 0.7 }}
                    onClick={() => queueSave({ tags: draft.tags.filter((x) => x !== tag) })}
                  >
                    ×
                  </span>
                </span>
              ))}
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ',' || e.key === 'Tab') {
                    if (tagInput.trim()) {
                      e.preventDefault();
                      commitTagInput();
                    }
                  } else if (e.key === 'Backspace' && tagInput === '' && draft.tags.length > 0) {
                    queueSave({ tags: draft.tags.slice(0, -1) });
                  }
                }}
                placeholder="Add a tag..."
                style={{
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  fontSize: 13,
                  flex: 1,
                  minWidth: 80,
                  fontFamily: 'inherit',
                  color: 'var(--text)',
                }}
              />
            </div>
          </Section>

          <Section label="Subtasks">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {draft.subtasks.map((s, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button
                    className={`checkbox${s.done ? ' checked' : ''}`}
                    onClick={() => {
                      const newSubs = draft.subtasks.map((x, j) =>
                        j === i ? { ...x, done: !x.done } : x
                      );
                      queueSave({ subtasks: newSubs });
                    }}
                  />
                  <input
                    value={s.title}
                    onChange={(e) => {
                      const newSubs = draft.subtasks.map((x, j) =>
                        j === i ? { ...x, title: e.target.value } : x
                      );
                      queueSave({ subtasks: newSubs });
                    }}
                    placeholder="Subtask..."
                    style={{
                      flex: 1,
                      border: 'none',
                      background: 'transparent',
                      fontSize: 13,
                      outline: 'none',
                      padding: 4,
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--text)',
                      textDecoration: s.done ? 'line-through' : 'none',
                      fontFamily: 'inherit',
                    }}
                  />
                  <button
                    className="icon-btn"
                    style={{ width: 22, height: 22, fontSize: 14 }}
                    onClick={() =>
                      queueSave({ subtasks: draft.subtasks.filter((_, j) => j !== i) })
                    }
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                onClick={() =>
                  queueSave({ subtasks: [...draft.subtasks, { title: '', done: false }] })
                }
                style={{
                  fontSize: 12,
                  color: 'var(--accent)',
                  padding: '4px 0',
                  alignSelf: 'flex-start',
                  fontWeight: 500,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                + Add subtask
              </button>
            </div>
          </Section>
        </div>

        <footer
          style={{
            padding: '12px 18px',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            flexShrink: 0,
            background: 'var(--surface-alt)',
          }}
        >
          <span
            style={{
              fontSize: 11,
              color: saveStatus === 'saved' ? 'var(--success)' : 'var(--text-muted)',
            }}
          >
            {saveStatus === 'saved' ? '✓ Saved' : 'Saving...'}
          </span>
          <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>
            Created {new Date(draft.created_at).toLocaleDateString()}
          </span>
        </footer>
      </aside>
    </>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 500 }}>{children}</span>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span
        style={{
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: 'var(--text-muted)',
          fontWeight: 600,
        }}
      >
        {label}
      </span>
      {children}
    </div>
  );
}
