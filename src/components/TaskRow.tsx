'use client';

import type { Task, Area, Category } from '@/types';
import { dueState, fromKey, formatRelative } from '@/lib/dates';

interface Props {
  task: Task;
  areas: Area[];
  categories: Category[];
  onClick: () => void;
  onToggleDone: () => void;
  showLocation?: boolean;
  showCompletedDate?: boolean;
}

export default function TaskRow({
  task: t,
  areas,
  categories,
  onClick,
  onToggleDone,
  showLocation,
  showCompletedDate,
}: Props) {
  const cat = categories.find((c) => c.id === t.category_id);
  const area = areas.find((a) => a.id === t.area_id);

  const ds = dueState(t.due_date);

  return (
    <div
      onClick={onClick}
      className={`task-row${t.status === 'done' ? ' is-done' : ''}`}
      style={{
        padding: '13px 18px',
        display: 'grid',
        gridTemplateColumns: 'auto 4px 1fr',
        gap: 14,
        alignItems: 'flex-start',
        borderBottom: '1px solid var(--border)',
        cursor: 'pointer',
        transition: 'background 0.15s ease',
        opacity: t.status === 'done' ? 0.55 : 1,
      }}
    >
      <div
        onClick={(e) => {
          e.stopPropagation();
          onToggleDone();
        }}
        className={`checkbox${t.status === 'done' ? ' checked' : ''}`}
      />
      <div
        style={{
          width: 4,
          alignSelf: 'stretch',
          borderRadius: 2,
          background: cat ? cat.color : 'var(--text-faint)',
        }}
      />
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: 'var(--text)',
            wordBreak: 'break-word',
            textDecoration: t.status === 'done' ? 'line-through' : 'none',
          }}
        >
          {t.priority && t.priority !== 'none' && (
            <span className={`priority-pip ${t.priority}`} />
          )}
          {t.title}
        </div>
        {t.description && (
          <div
            style={{
              fontSize: 13,
              color: 'var(--text-muted)',
              marginTop: 3,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {t.description}
          </div>
        )}
        <div
          style={{
            display: 'flex',
            gap: 6,
            marginTop: 6,
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <span className={`task-badge ${t.urgency}`}>{t.urgency === 'must' ? 'Must' : 'Nice'}</span>
          {area && <span className="task-badge area">{area.name}</span>}
          {cat && (
            <span
              className="task-badge"
              style={{ background: cat.color + '22', color: cat.color }}
            >
              {cat.name}
            </span>
          )}
          {t.tags.map((tag) => (
            <span key={tag} className="task-badge tag">
              #{tag}
            </span>
          ))}
          {t.due_date && ds === 'overdue' && (
            <span className="task-badge overdue">
              Overdue · {formatRelative(fromKey(t.due_date))}
            </span>
          )}
          {t.due_date && ds === 'today' && <span className="task-badge due-today">Due today</span>}
          {t.due_date && ds === 'future' && (
            <span className="task-badge nice">Due {formatRelative(fromKey(t.due_date))}</span>
          )}
          {t.rolled_over && t.status === 'pending' && (
            <span className="task-badge rolled">↻ Rolled over</span>
          )}
          {t.recurrence_template_id && <span className="task-badge recur">↻ Recurring</span>}
          {t.subtasks.length > 0 && (
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              ☑ {t.subtasks.filter((s) => s.done).length}/{t.subtasks.length}
            </span>
          )}
          {showLocation && (
            <span className="task-badge nice">
              {t.is_someday
                ? 'Someday'
                : t.day
                ? formatRelative(fromKey(t.day))
                : ''}
            </span>
          )}
          {showCompletedDate && t.completed_at && (
            <span className="task-badge nice">
              Done {new Date(t.completed_at).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
