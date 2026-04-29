'use client';

import { useState, useEffect } from 'react';
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
} from '@/lib/dates';
import type { Recurrence, RecurrenceType, Subtask } from '@/types';

interface Props {
  open: boolean;
  defaultDay?: string | null;
  defaultSomeday?: boolean;
  onClose: () => void;
}

export default function NewTaskModal({ open, defaultDay, defaultSomeday, onClose }: Props) {
  const { createTask, areas, categories } = useApp();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [urgency, setUrgency] = useState<'must' | 'nice'>('must');
  const [priority, setPriority] = useState<'none' | 'high' | 'medium' | 'low'>('none');
  const [day, setDay] = useState<string>(defaultSomeday ? '__someday__' : defaultDay || todayKey());
  const [dueDate, setDueDate] = useState<string>('');
  const [areaId, setAreaId] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>('none');
  const [weekdays, setWeekdays] = useState<Set<number>>(new Set());

  // Reset when opened
  useEffect(() => {
    if (open) {
      setTitle('');
      setDescription('');
      setUrgency('must');
      setPriority('none');
      setDay(defaultSomeday ? '__someday__' : defaultDay || todayKey());
      setDueDate('');
      setAreaId('');
      setCategoryId('');
      setTags([]);
      setTagInput('');
      setSubtasks([]);
      setRecurrenceType('none');
      setWeekdays(new Set());
    }
  }, [open, defaultDay, defaultSomeday]);

  if (!open) return null;

  const dayOptions = (() => {
    const t = today();
    const days: Date[] = [];
    for (let i = 0; i < 28; i++) days.push(addDays(t, i));
    return days;
  })();

  const tomorrow = addDays(today(), 1);

  function commitTagInput() {
    const v = tagInput.trim().replace(/^#/, '');
    if (v && !tags.includes(v)) setTags([...tags, v]);
    setTagInput('');
  }

  function onTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',' || e.key === 'Tab') {
      if (tagInput.trim()) {
        e.preventDefault();
        commitTagInput();
      }
    } else if (e.key === 'Backspace' && tagInput === '' && tags.length > 0) {
      setTags(tags.slice(0, -1));
    }
  }

  function toggleWeekday(d: number) {
    const next = new Set(weekdays);
    if (next.has(d)) next.delete(d);
    else next.add(d);
    setWeekdays(next);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    commitTagInput();
    const finalTags = [...tags];
    const v = tagInput.trim().replace(/^#/, '');
    if (v && !finalTags.includes(v)) finalTags.push(v);

    let recurrence: Recurrence | null = null;
    if (recurrenceType !== 'none') {
      recurrence = { type: recurrenceType };
      if (recurrenceType === 'weekly') {
        recurrence.weekdays = Array.from(weekdays).sort();
        if (recurrence.weekdays.length === 0) {
          alert('Pick at least one weekday for weekly recurrence');
          return;
        }
      }
      if (recurrenceType === 'monthly') {
        recurrence.dayOfMonth = new Date().getDate();
      }
    }

    const isSomeday = day === '__someday__';

    const task = await createTask({
      title: title.trim(),
      description: description.trim(),
      urgency,
      priority,
      day: isSomeday ? null : day,
      is_someday: isSomeday,
      area_id: areaId || null,
      category_id: categoryId || null,
      tags: finalTags,
      subtasks: subtasks.filter((s) => s.title.trim()),
      due_date: dueDate || null,
      recurrence,
    });

    if (task) onClose();
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '14px 20px',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>
            {defaultSomeday ? 'New Someday item' : 'New task'}
          </h3>
          <button className="icon-btn" onClick={onClose}>
            ×
          </button>
        </header>

        <form
          onSubmit={onSubmit}
          style={{
            padding: '18px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            overflowY: 'auto',
          }}
        >
          <Field label="Title">
            <input
              required
              maxLength={200}
              autoComplete="off"
              autoFocus
              className="field-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs doing?"
            />
          </Field>

          <Field label="Description" hint="optional">
            <textarea
              className="field-textarea"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Notes, links, context..."
            />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <Field label="Urgency">
              <select
                className="field-select"
                value={urgency}
                onChange={(e) => setUrgency(e.target.value as any)}
              >
                <option value="must">Must do</option>
                <option value="nice">Nice to do</option>
              </select>
            </Field>
            <Field label="Priority">
              <select
                className="field-select"
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
              >
                <option value="none">— None —</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </Field>
            <Field label="Day">
              <select
                className="field-select"
                value={day}
                onChange={(e) => setDay(e.target.value)}
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
            </Field>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Due date" hint="optional">
              <input
                type="date"
                className="field-input"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </Field>
            <Field label="Area">
              <select
                className="field-select"
                value={areaId}
                onChange={(e) => setAreaId(e.target.value)}
              >
                <option value="">— None —</option>
                {areas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Category">
              <select
                className="field-select"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                <option value="">— None —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Recurrence">
              <select
                className="field-select"
                value={recurrenceType}
                onChange={(e) => setRecurrenceType(e.target.value as RecurrenceType)}
              >
                <option value="none">Does not repeat</option>
                <option value="daily">Daily</option>
                <option value="weekdays">Weekdays (Mon–Fri)</option>
                <option value="weekly">Weekly on selected days</option>
                <option value="monthly">Monthly (same date)</option>
              </select>
            </Field>
          </div>

          {recurrenceType === 'weekly' && (
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: 'var(--text-faint)', marginRight: 6 }}>
                Repeat on:
              </span>
              {[
                { d: 1, l: 'M' },
                { d: 2, l: 'T' },
                { d: 3, l: 'W' },
                { d: 4, l: 'T' },
                { d: 5, l: 'F' },
                { d: 6, l: 'S' },
                { d: 0, l: 'S' },
              ].map(({ d, l }) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleWeekday(d)}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    border: weekdays.has(d) ? 'none' : '1px solid var(--border-strong)',
                    background: weekdays.has(d) ? 'var(--accent)' : 'var(--surface)',
                    color: weekdays.has(d) ? 'white' : 'var(--text-muted)',
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {l}
                </button>
              ))}
            </div>
          )}

          <Field label="Tags" hint="press Enter to add">
            <div
              onClick={() => document.getElementById('tagInput')?.focus()}
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border-strong)',
                borderRadius: 'var(--radius)',
                padding: '5px 8px',
                display: 'flex',
                gap: 4,
                flexWrap: 'wrap',
                alignItems: 'center',
                minHeight: 32,
              }}
            >
              {tags.map((t) => (
                <span
                  key={t}
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
                  #{t}
                  <span
                    style={{ cursor: 'pointer', fontSize: 14, opacity: 0.7 }}
                    onClick={() => setTags(tags.filter((x) => x !== t))}
                  >
                    ×
                  </span>
                </span>
              ))}
              <input
                id="tagInput"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={onTagKeyDown}
                placeholder="Add a tag..."
                style={{
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  padding: 4,
                  fontSize: 13,
                  flex: 1,
                  minWidth: 80,
                  color: 'var(--text)',
                  fontFamily: 'inherit',
                }}
              />
            </div>
          </Field>

          <Field
            label="Subtasks"
            hint="optional"
            extra={
              <button
                type="button"
                onClick={() => setSubtasks([...subtasks, { title: '', done: false }])}
                style={{
                  fontSize: 12,
                  color: 'var(--accent)',
                  fontWeight: 500,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                + Add subtask
              </button>
            }
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {subtasks.map((s, i) => (
                <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <button
                    type="button"
                    className={`checkbox${s.done ? ' checked' : ''}`}
                    onClick={() =>
                      setSubtasks(
                        subtasks.map((x, j) => (j === i ? { ...x, done: !x.done } : x))
                      )
                    }
                  />
                  <input
                    value={s.title}
                    onChange={(e) =>
                      setSubtasks(
                        subtasks.map((x, j) => (j === i ? { ...x, title: e.target.value } : x))
                      )
                    }
                    placeholder="Subtask..."
                    style={{
                      flex: 1,
                      background: 'var(--surface)',
                      border: '1px solid var(--border-strong)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '6px 8px',
                      fontSize: 13,
                      outline: 'none',
                      color: 'var(--text)',
                      fontFamily: 'inherit',
                    }}
                  />
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => setSubtasks(subtasks.filter((_, j) => j !== i))}
                    style={{ width: 24, height: 24, fontSize: 16 }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </Field>

          <footer
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 8,
              paddingTop: 8,
              borderTop: '1px solid var(--border)',
              marginTop: 4,
            }}
          >
            <button type="button" className="btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Save task
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  extra,
  children,
}: {
  label: string;
  hint?: string;
  extra?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <span
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>
          {label}
          {hint && (
            <span style={{ fontSize: 11, color: 'var(--text-faint)', marginLeft: 4 }}>
              {hint}
            </span>
          )}
        </span>
        {extra}
      </span>
      {children}
    </label>
  );
}
