'use client';

import { useEffect, useMemo, useState } from 'react';
import { useApp } from './AppProvider';
import TaskRow from './TaskRow';
import {
  addDays,
  formatRelative,
  formatShort,
  fromKey,
  mondayOf,
  todayKey,
  toKey,
  weekDays,
  weekday,
  today as dToday,
  dueState,
} from '@/lib/dates';
import type { Task } from '@/types';
import { showToast } from './Toast';

function applyFilters(tasks: Task[], areaFilter: string, categoryFilter: string) {
  return tasks.filter((t) => {
    if (areaFilter !== 'all' && t.area_id !== areaFilter) return false;
    if (categoryFilter !== 'all' && t.category_id !== categoryFilter) return false;
    return true;
  });
}

function taskSort(a: Task, b: Task) {
  if (a.status !== b.status) return a.status === 'pending' ? -1 : 1;
  if (a.urgency !== b.urgency) return a.urgency === 'must' ? -1 : 1;
  return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
}

interface ViewProps {
  onTaskClick: (id: string) => void;
  onAddTask: (defaults?: { day?: string | null; isSomeday?: boolean }) => void;
}

// ============ TODAY VIEW ============

export function TodayView({ onTaskClick, onAddTask }: ViewProps) {
  const { tasks, areas, categories, toggleTaskDone } = useApp();
  const [areaFilter, setAreaFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const today = todayKey();
  const todayTasks = useMemo(
    () => tasks.filter((t) => t.day === today && !t.is_someday).sort(taskSort),
    [tasks, today]
  );
  const filtered = applyFilters(todayTasks, areaFilter, categoryFilter);

  return (
    <div className="view-host">
      <ViewHead eyebrow="Focus" title="Today">
        <button className="btn-primary" onClick={() => onAddTask({ day: today })}>
          + Add task
        </button>
      </ViewHead>

      <Dashboard todayTasks={todayTasks} onTaskClick={onTaskClick} />

      {(areas.length > 0 || categories.length > 0) && (
        <FilterBar
          areaFilter={areaFilter}
          categoryFilter={categoryFilter}
          onAreaChange={setAreaFilter}
          onCategoryChange={setCategoryFilter}
        />
      )}

      {filtered.length === 0 ? (
        <Empty>
          {todayTasks.length === 0
            ? 'No tasks for today. Click "+ Add task" above, or plan ahead in Week view.'
            : 'No tasks match your current filters.'}
        </Empty>
      ) : (
        <TaskList>
          {filtered.map((t) => (
            <TaskRow
              key={t.id}
              task={t}
              areas={areas}
              categories={categories}
              onClick={() => onTaskClick(t.id)}
              onToggleDone={() => toggleTaskDone(t.id)}
            />
          ))}
        </TaskList>
      )}
    </div>
  );
}

// ============ DASHBOARD ============

function Dashboard({
  todayTasks,
  onTaskClick,
}: {
  todayTasks: Task[];
  onTaskClick: (id: string) => void;
}) {
  const { tasks } = useApp();
  const today = todayKey();

  const total = todayTasks.length;
  const done = todayTasks.filter((t) => t.status === 'done').length;
  const must = todayTasks.filter((t) => t.urgency === 'must' && t.status === 'pending').length;
  const nice = todayTasks.filter((t) => t.urgency === 'nice' && t.status === 'pending').length;
  const overdue = todayTasks.filter(
    (t) => t.status === 'pending' && t.due_date && t.due_date < today
  ).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const t = dToday();
  const sevenOut = toKey(addDays(t, 7));
  const threeOut = toKey(addDays(t, 3));

  const priorityPipeline = useMemo(
    () =>
      tasks
        .filter(
          (x) =>
            x.status === 'pending' &&
            !x.is_someday &&
            x.day &&
            x.day > today &&
            x.day <= sevenOut &&
            x.priority === 'high'
        )
        .sort((a, b) => (a.day || '').localeCompare(b.day || ''))
        .slice(0, 5),
    [tasks, today, sevenOut]
  );

  const upcoming = useMemo(
    () =>
      tasks
        .filter(
          (x) =>
            x.status === 'pending' &&
            !x.is_someday &&
            x.day &&
            x.day > today &&
            x.day <= threeOut
        )
        .sort((a, b) => (a.day || '').localeCompare(b.day || ''))
        .slice(0, 5),
    [tasks, today, threeOut]
  );

  return (
    <div
      className="dashboard"
      style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1fr 1fr',
        gap: 14,
        marginBottom: 22,
      }}
    >
      <DashCard
        title="Today at a glance"
        glow
        cssVar="card-gradient-1"
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
          <Stat num={total} label="Total" />
          <Stat num={must} label="Must do" cls="must" />
          <Stat num={nice} label="Nice to do" />
          <Stat num={overdue} label="Overdue" cls="overdue" />
        </div>
        {total > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
            <div
              style={{
                flex: 1,
                height: 8,
                background: 'var(--surface-alt)',
                borderRadius: 4,
                overflow: 'hidden',
                boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.06)',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${pct}%`,
                  background: 'linear-gradient(90deg, var(--success) 0%, #7baa5f 100%)',
                  transition: 'width 0.6s cubic-bezier(0.2, 0.9, 0.3, 1)',
                  boxShadow: '0 0 8px rgba(92, 138, 74, 0.4)',
                }}
              />
            </div>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>
              {done}/{total} done · {pct}%
            </span>
          </div>
        )}
      </DashCard>

      <DashCard
        title="Priority Pipeline"
        meta="High priority · next 7d"
        cssVar="card-gradient-pipeline"
      >
        {priorityPipeline.length === 0 ? (
          <DashEmpty>Nothing high-priority coming up</DashEmpty>
        ) : (
          <PipelineList items={priorityPipeline} onClick={onTaskClick} />
        )}
      </DashCard>

      <DashCard title="Coming up" meta="Next 3 days" cssVar="card-gradient-upcoming">
        {upcoming.length === 0 ? (
          <DashEmpty>Nothing planned for the next few days</DashEmpty>
        ) : (
          <PipelineList items={upcoming} onClick={onTaskClick} />
        )}
      </DashCard>
    </div>
  );
}

function DashCard({
  title,
  meta,
  glow,
  cssVar,
  children,
}: {
  title: string;
  meta?: string;
  glow?: boolean;
  cssVar?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: cssVar ? `var(--${cssVar})` : 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '18px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        boxShadow: 'var(--shadow-sm)',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {glow && (
        <div
          style={{
            content: '""',
            position: 'absolute',
            top: -40,
            right: -40,
            width: 120,
            height: 120,
            background: 'radial-gradient(circle, var(--accent-glow) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span
          style={{
            fontSize: 11,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: 'var(--text-muted)',
            fontWeight: 700,
          }}
        >
          {title}
        </span>
        {meta && (
          <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>{meta}</span>
        )}
      </div>
      {children}
    </div>
  );
}

function Stat({ num, label, cls }: { num: number; label: string; cls?: string }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (num === 0) {
      setDisplay(0);
      return;
    }
    const duration = 700;
    const start = performance.now();
    let raf: number;
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(num * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
      else setDisplay(num);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [num]);

  let color = 'var(--text)';
  if (cls === 'must') color = 'var(--must)';
  if (cls === 'overdue') color = 'var(--overdue)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <div
        style={{
          fontSize: 28,
          fontWeight: 700,
          letterSpacing: '-0.03em',
          lineHeight: 1.05,
          color,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {display}
      </div>
      <div
        style={{
          fontSize: 11,
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          fontWeight: 500,
        }}
      >
        {label}
      </div>
    </div>
  );
}

function DashEmpty({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 12,
        color: 'var(--text-faint)',
        textAlign: 'center',
        padding: 16,
        fontStyle: 'italic',
      }}
    >
      {children}
    </div>
  );
}

function PipelineList({ items, onClick }: { items: Task[]; onClick: (id: string) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
      {items.map((t) => (
        <div
          key={t.id}
          onClick={() => onClick(t.id)}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '8px 10px',
            background: 'var(--surface)',
            borderRadius: 'var(--radius-sm)',
            fontSize: 12.5,
            cursor: 'pointer',
            gap: 8,
            border: '1px solid transparent',
            transition: 'all 0.15s',
          }}
        >
          <span
            style={{
              flex: 1,
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {t.priority && t.priority !== 'none' && (
              <span className={`priority-pip ${t.priority}`} />
            )}
            {t.title}
          </span>
          <span
            style={{
              fontSize: 11,
              color: 'var(--text-muted)',
              fontWeight: 500,
              whiteSpace: 'nowrap',
            }}
          >
            {t.day ? formatRelative(fromKey(t.day)) : ''}
          </span>
        </div>
      ))}
    </div>
  );
}

// ============ WEEK VIEW ============

export function WeekView({ onTaskClick, onAddTask }: ViewProps) {
  const { tasks, areas, categories } = useApp();
  const [anchor, setAnchor] = useState(mondayOf(new Date()));
  const [areaFilter, setAreaFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const monday = anchor;
  const sunday = addDays(monday, 6);
  const mondayKey = toKey(monday);
  const sundayKey = toKey(sunday);
  const today = todayKey();

  const sameMonth = monday.getMonth() === sunday.getMonth();
  const label = sameMonth
    ? `${monday.toLocaleDateString(undefined, { month: 'long' })} ${monday.getDate()} – ${sunday.getDate()}`
    : `${formatShort(monday)} – ${formatShort(sunday)}`;

  const weekTasks = useMemo(
    () =>
      tasks.filter((t) => t.day && t.day >= mondayKey && t.day <= sundayKey).sort(taskSort),
    [tasks, mondayKey, sundayKey]
  );
  const filtered = applyFilters(weekTasks, areaFilter, categoryFilter);

  const byDay: Record<string, Task[]> = {};
  for (const t of filtered) {
    if (!t.day) continue;
    if (!byDay[t.day]) byDay[t.day] = [];
    byDay[t.day].push(t);
  }

  return (
    <div className="view-host">
      <ViewHead eyebrow="Plan" title={label}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button className="btn-ghost" onClick={() => setAnchor(mondayOf(addDays(anchor, -7)))}>
            ‹
          </button>
          <button className="btn-ghost" onClick={() => setAnchor(mondayOf(new Date()))}>
            This week
          </button>
          <button className="btn-ghost" onClick={() => setAnchor(mondayOf(addDays(anchor, 7)))}>
            ›
          </button>
        </div>
      </ViewHead>

      {(areas.length > 0 || categories.length > 0) && (
        <FilterBar
          areaFilter={areaFilter}
          categoryFilter={categoryFilter}
          onAreaChange={setAreaFilter}
          onCategoryChange={setCategoryFilter}
        />
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: 8,
        }}
      >
        {weekDays(monday).map((d) => {
          const key = toKey(d);
          const isToday = key === today;
          const isPast = d < dToday() && !isToday;
          const dayTasks = byDay[key] || [];

          return (
            <div
              key={key}
              className="day-col"
              style={{
                background: isToday ? 'var(--card-gradient-1)' : 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
                padding: 14,
                minHeight: 280,
                display: 'flex',
                flexDirection: 'column',
                boxShadow: isToday ? 'var(--shadow-glow)' : 'var(--shadow-sm)',
                borderColor: isToday ? 'var(--accent)' : 'var(--border)',
                transition: 'all 0.2s ease',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  marginBottom: 10,
                  paddingBottom: 8,
                  borderBottom: '1px solid var(--border)',
                  opacity: isPast ? 0.55 : 1,
                }}
              >
                <span>
                  <span
                    style={{
                      fontSize: 11,
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      color: isToday ? 'var(--accent)' : 'var(--text-muted)',
                      fontWeight: 600,
                    }}
                  >
                    {weekday(d)}
                  </span>{' '}
                  <span style={{ fontSize: 16, fontWeight: 600 }}>{d.getDate()}</span>
                </span>
                {dayTasks.length > 0 && (
                  <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>
                    {dayTasks.length}
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
                {dayTasks.map((t) => (
                  <DayTask
                    key={t.id}
                    task={t}
                    categoryColor={
                      categories.find((c) => c.id === t.category_id)?.color || null
                    }
                    onClick={() => onTaskClick(t.id)}
                  />
                ))}
              </div>

              <button
                onClick={() => onAddTask({ day: key })}
                style={{
                  marginTop: 6,
                  fontSize: 12,
                  color: 'var(--text-muted)',
                  padding: 5,
                  borderRadius: 'var(--radius-sm)',
                  textAlign: 'center',
                  border: '1px dashed var(--border)',
                  background: 'transparent',
                  cursor: 'pointer',
                  transition: 'all 0.12s ease',
                }}
              >
                + Add
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DayTask({
  task: t,
  categoryColor,
  onClick,
}: {
  task: Task;
  categoryColor: string | null;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`day-task${t.urgency} ${t.status === 'done' ? 'is-done' : ''}`}
      style={{
        background: 'var(--surface-alt)',
        padding: '6px 8px',
        borderRadius: 'var(--radius-sm)',
        fontSize: 12.5,
        cursor: 'pointer',
        borderLeft: `3px solid ${
          categoryColor || (t.urgency === 'must' ? 'var(--must)' : 'var(--text-faint)')
        }`,
        transition: 'background 0.12s ease',
        wordBreak: 'break-word',
        lineHeight: 1.35,
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
        opacity: t.status === 'done' ? 0.5 : 1,
        textDecoration: t.status === 'done' ? 'line-through' : 'none',
      }}
    >
      <div>
        {t.priority && t.priority !== 'none' && (
          <span className={`priority-pip ${t.priority}`} />
        )}
        {t.title}
      </div>
    </div>
  );
}

// ============ SOMEDAY VIEW ============

export function SomedayView({ onTaskClick, onAddTask }: ViewProps) {
  const { tasks, areas, categories, toggleTaskDone } = useApp();
  const [areaFilter, setAreaFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const allSomeday = useMemo(
    () => tasks.filter((t) => t.is_someday).sort(taskSort),
    [tasks]
  );
  const filtered = applyFilters(allSomeday, areaFilter, categoryFilter);

  return (
    <div className="view-host">
      <ViewHead eyebrow="Long-term" title="Someday / Maybe">
        <button className="btn-primary" onClick={() => onAddTask({ isSomeday: true })}>
          + Add to Someday
        </button>
      </ViewHead>

      {(areas.length > 0 || categories.length > 0) && (
        <FilterBar
          areaFilter={areaFilter}
          categoryFilter={categoryFilter}
          onAreaChange={setAreaFilter}
          onCategoryChange={setCategoryFilter}
        />
      )}

      {filtered.length === 0 ? (
        <Empty>
          {allSomeday.length === 0
            ? 'Your Someday list is empty. Use it for things to think about, not necessarily do today.'
            : 'No items match your current filters.'}
        </Empty>
      ) : (
        <TaskList>
          {filtered.map((t) => (
            <TaskRow
              key={t.id}
              task={t}
              areas={areas}
              categories={categories}
              onClick={() => onTaskClick(t.id)}
              onToggleDone={() => toggleTaskDone(t.id)}
            />
          ))}
        </TaskList>
      )}
    </div>
  );
}

// ============ HISTORY VIEW ============

export function HistoryView({ onTaskClick }: ViewProps) {
  const { tasks, areas, categories, toggleTaskDone } = useApp();
  const completed = useMemo(
    () =>
      tasks
        .filter((t) => t.status === 'done')
        .sort(
          (a, b) =>
            new Date(b.completed_at || 0).getTime() - new Date(a.completed_at || 0).getTime()
        ),
    [tasks]
  );

  const groups = useMemo(() => {
    const g: Record<string, { label: string; tasks: Task[] }> = {};
    for (const t of completed) {
      if (!t.completed_at) continue;
      const completedDate = new Date(t.completed_at);
      const monday = mondayOf(completedDate);
      const key = toKey(monday);
      const sunday = addDays(monday, 6);
      const label = `${formatShort(monday)} – ${formatShort(sunday)}, ${monday.getFullYear()}`;
      if (!g[key]) g[key] = { label, tasks: [] };
      g[key].tasks.push(t);
    }
    return g;
  }, [completed]);

  const sortedKeys = Object.keys(groups).sort().reverse();

  return (
    <div className="view-host">
      <ViewHead eyebrow="Completed" title="History" />
      {completed.length === 0 ? (
        <Empty>Nothing here yet. Completed tasks will show up here.</Empty>
      ) : (
        sortedKeys.map((key) => {
          const g = groups[key];
          return (
            <div
              key={key}
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
                marginBottom: 12,
                overflow: 'hidden',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <div
                style={{
                  padding: '10px 16px',
                  background: 'var(--surface-alt)',
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  borderBottom: '1px solid var(--border)',
                }}
              >
                {g.label} — {g.tasks.length} task{g.tasks.length === 1 ? '' : 's'}
              </div>
              <div>
                {g.tasks.map((t) => (
                  <TaskRow
                    key={t.id}
                    task={t}
                    areas={areas}
                    categories={categories}
                    onClick={() => onTaskClick(t.id)}
                    onToggleDone={() => toggleTaskDone(t.id)}
                    showCompletedDate
                  />
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

// ============ SEARCH VIEW ============

export function SearchView({ onTaskClick }: ViewProps) {
  const { tasks, areas, categories, toggleTaskDone, searchQuery } = useApp();
  const q = searchQuery.trim().toLowerCase();

  const results = useMemo(() => {
    if (!q) return [];
    return tasks
      .filter((t) => {
        const hay = [t.title, t.description, ...t.tags].join(' ').toLowerCase();
        return hay.includes(q);
      })
      .sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
  }, [tasks, q]);

  return (
    <div className="view-host">
      <ViewHead eyebrow="Results" title={q ? `Search: "${q}"` : 'Search'} />
      {!q ? (
        <Empty>Type to search across all your tasks.</Empty>
      ) : results.length === 0 ? (
        <Empty>{`No matches for "${q}".`}</Empty>
      ) : (
        <>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 10 }}>
            {results.length} result{results.length === 1 ? '' : 's'}
          </p>
          <TaskList>
            {results.map((t) => (
              <TaskRow
                key={t.id}
                task={t}
                areas={areas}
                categories={categories}
                onClick={() => onTaskClick(t.id)}
                onToggleDone={() => toggleTaskDone(t.id)}
                showLocation
              />
            ))}
          </TaskList>
        </>
      )}
    </div>
  );
}

// ============ MANAGE VIEW ============

export function ManageView() {
  const {
    areas,
    categories,
    tasks,
    createArea,
    deleteArea,
    createCategory,
    deleteCategory,
  } = useApp();
  const [newArea, setNewArea] = useState('');
  const [newCat, setNewCat] = useState('');
  const [newCatColor, setNewCatColor] = useState('#6B7280');

  function exportJson() {
    const data = {
      app: 'DayDesk',
      version: 1,
      exportedAt: new Date().toISOString(),
      tasks,
      areas,
      categories,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `daydesk-backup-${todayKey()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast('Backup downloaded');
  }

  function exportCsv() {
    const areaMap = new Map(areas.map((a) => [a.id, a.name]));
    const catMap = new Map(categories.map((c) => [c.id, c.name]));
    const headers = [
      'id',
      'title',
      'description',
      'urgency',
      'priority',
      'day',
      'is_someday',
      'area',
      'category',
      'tags',
      'due_date',
      'status',
      'subtasks',
      'created_at',
      'completed_at',
    ];
    const rows = [headers.join(',')];
    for (const t of tasks) {
      rows.push(
        [
          t.id,
          csvEscape(t.title),
          csvEscape(t.description),
          t.urgency,
          t.priority,
          t.day || '',
          t.is_someday ? 'true' : 'false',
          csvEscape(areaMap.get(t.area_id || '') || ''),
          csvEscape(catMap.get(t.category_id || '') || ''),
          csvEscape(t.tags.join('; ')),
          t.due_date || '',
          t.status,
          csvEscape(t.subtasks.map((s) => `[${s.done ? 'x' : ' '}] ${s.title}`).join('; ')),
          t.created_at,
          t.completed_at || '',
        ].join(',')
      );
    }
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `daydesk-tasks-${todayKey()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast('CSV downloaded');
  }

  return (
    <div className="view-host">
      <ViewHead eyebrow="Settings" title="Manage" />

      <ManageSection title="Areas" hint="your themes / focus areas">
        {areas.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--text-muted)', padding: '8px 0' }}>
            No areas yet. Add one below.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {areas.map((a) => {
              const count = tasks.filter((t) => t.area_id === a.id).length;
              return (
                <ManageItem
                  key={a.id}
                  name={a.name}
                  count={count}
                  onDelete={async () => {
                    if (
                      confirm(
                        `Delete area "${a.name}"? Tasks will keep working but lose this area assignment.`
                      )
                    ) {
                      await deleteArea(a.id);
                    }
                  }}
                />
              );
            })}
          </div>
        )}
        <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
          <input
            className="field-input"
            placeholder="New area name (e.g. Hiring, Marketing)"
            value={newArea}
            onChange={(e) => setNewArea(e.target.value)}
            onKeyDown={async (e) => {
              if (e.key === 'Enter' && newArea.trim()) {
                await createArea(newArea);
                setNewArea('');
              }
            }}
          />
          <button
            className="btn-primary"
            onClick={async () => {
              if (newArea.trim()) {
                await createArea(newArea);
                setNewArea('');
              }
            }}
          >
            Add
          </button>
        </div>
      </ManageSection>

      <ManageSection title="Categories" hint="work types — drives task color">
        {categories.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--text-muted)', padding: '8px 0' }}>
            No categories yet.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {categories.map((c) => {
              const count = tasks.filter((t) => t.category_id === c.id).length;
              return (
                <ManageItem
                  key={c.id}
                  name={c.name}
                  count={count}
                  color={c.color}
                  onDelete={async () => {
                    if (confirm(`Delete category "${c.name}"?`)) await deleteCategory(c.id);
                  }}
                />
              );
            })}
          </div>
        )}
        <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
          <input
            className="field-input"
            placeholder="New category"
            value={newCat}
            onChange={(e) => setNewCat(e.target.value)}
          />
          <input
            type="color"
            value={newCatColor}
            onChange={(e) => setNewCatColor(e.target.value)}
            style={{ width: 50, padding: 2 }}
          />
          <button
            className="btn-primary"
            onClick={async () => {
              if (newCat.trim()) {
                await createCategory(newCat, newCatColor);
                setNewCat('');
              }
            }}
          >
            Add
          </button>
        </div>
      </ManageSection>

      <ManageSection title="Backup">
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
          Export your data as a backup file.
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-ghost" onClick={exportJson}>
            Export JSON
          </button>
          <button className="btn-ghost" onClick={exportCsv}>
            Export CSV
          </button>
        </div>
      </ManageSection>
    </div>
  );
}

function csvEscape(s: string | null | undefined): string {
  if (!s) return '';
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function ManageSection({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: 16,
        marginBottom: 16,
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <h3
        style={{
          fontSize: 14,
          fontWeight: 600,
          marginBottom: 12,
          margin: '0 0 12px 0',
        }}
      >
        {title}
        {hint && (
          <span
            style={{ fontWeight: 400, fontSize: 11, color: 'var(--text-faint)', marginLeft: 6 }}
          >
            {hint}
          </span>
        )}
      </h3>
      {children}
    </div>
  );
}

function ManageItem({
  name,
  count,
  color,
  onDelete,
}: {
  name: string;
  count: number;
  color?: string;
  onDelete: () => void;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 10px',
        background: 'var(--surface-alt)',
        borderRadius: 'var(--radius-sm)',
        fontSize: 13,
      }}
    >
      {color && (
        <span
          style={{
            width: 12,
            height: 12,
            borderRadius: '50%',
            background: color,
            flexShrink: 0,
          }}
        />
      )}
      <span style={{ flex: 1 }}>{name}</span>
      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
        {count} task{count === 1 ? '' : 's'}
      </span>
      <button className="icon-btn" onClick={onDelete}>
        ×
      </button>
    </div>
  );
}

// ============ Shared sub-components ============

function ViewHead({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        marginBottom: 18,
        gap: 24,
        flexWrap: 'wrap',
      }}
    >
      <div>
        <p
          style={{
            fontSize: 11,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--text-muted)',
            marginBottom: 4,
            fontWeight: 600,
          }}
        >
          {eyebrow}
        </p>
        <h2
          className="view-title"
          style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.01em', margin: 0 }}
        >
          {title}
        </h2>
      </div>
      {children}
    </div>
  );
}

function FilterBar({
  areaFilter,
  categoryFilter,
  onAreaChange,
  onCategoryChange,
}: {
  areaFilter: string;
  categoryFilter: string;
  onAreaChange: (v: string) => void;
  onCategoryChange: (v: string) => void;
}) {
  const { areas, categories } = useApp();
  return (
    <div
      className="filters"
      style={{
        display: 'flex',
        gap: 8,
        alignItems: 'center',
        marginBottom: 16,
        padding: '10px 12px',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        flexWrap: 'wrap',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      {areas.length > 0 && (
        <>
          <FilterLabel>Area</FilterLabel>
          <Pill active={areaFilter === 'all'} onClick={() => onAreaChange('all')}>
            All
          </Pill>
          {areas.map((a) => (
            <Pill key={a.id} active={areaFilter === a.id} onClick={() => onAreaChange(a.id)}>
              {a.name}
            </Pill>
          ))}
        </>
      )}
      {categories.length > 0 && areas.length > 0 && (
        <span style={{ width: 1, height: 18, background: 'var(--border)', margin: '0 4px' }} />
      )}
      {categories.length > 0 && (
        <>
          <FilterLabel>Category</FilterLabel>
          <Pill active={categoryFilter === 'all'} onClick={() => onCategoryChange('all')}>
            All
          </Pill>
          {categories.map((c) => (
            <Pill
              key={c.id}
              active={categoryFilter === c.id}
              onClick={() => onCategoryChange(c.id)}
            >
              {c.name}
            </Pill>
          ))}
        </>
      )}
    </div>
  );
}

function FilterLabel({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        fontSize: 11,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        color: 'var(--text-muted)',
        fontWeight: 600,
        marginRight: 4,
      }}
    >
      {children}
    </span>
  );
}

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '4px 10px',
        borderRadius: 12,
        fontSize: 12,
        border: '1px solid',
        borderColor: active ? 'var(--accent)' : 'var(--border)',
        background: active ? 'var(--accent-soft)' : 'var(--surface)',
        color: active ? 'var(--accent)' : 'var(--text-muted)',
        cursor: 'pointer',
        transition: 'all 0.12s ease',
        fontFamily: 'inherit',
      }}
    >
      {children}
    </button>
  );
}

function TaskList({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      {children}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        textAlign: 'center',
        padding: '60px 20px',
        color: 'var(--text-muted)',
        fontSize: 14,
        background: 'var(--surface)',
        border: '1px dashed var(--border)',
        borderRadius: 'var(--radius)',
      }}
    >
      {children}
    </div>
  );
}
