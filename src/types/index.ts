export type Urgency = 'must' | 'nice';
export type Priority = 'none' | 'high' | 'medium' | 'low';
export type TaskStatus = 'pending' | 'done';
export type Theme = 'light' | 'dark';
export type Mode = 'normal' | 'focused';
export type RecurrenceType = 'none' | 'daily' | 'weekdays' | 'weekly' | 'monthly';

export interface Subtask {
  title: string;
  done: boolean;
}

export interface Recurrence {
  type: RecurrenceType;
  weekdays?: number[]; // 0=Sun..6=Sat
  dayOfMonth?: number;
}

export interface Area {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description: string;
  urgency: Urgency;
  priority: Priority;
  day: string | null;            // YYYY-MM-DD
  is_someday: boolean;
  area_id: string | null;
  category_id: string | null;
  tags: string[];
  subtasks: Subtask[];
  due_date: string | null;
  recurrence: Recurrence | null;
  recurrence_template_id: string | null;
  status: TaskStatus;
  rolled_over: boolean;
  created_at: string;
  completed_at: string | null;
}

export interface UserSettings {
  user_id: string;
  theme: Theme;
  mode: Mode;
  last_maintenance: string | null;
  seeded: boolean;
  updated_at: string;
}

// ---- Form payloads (used when creating/updating) ----
export interface TaskInput {
  title: string;
  description?: string;
  urgency?: Urgency;
  priority?: Priority;
  day?: string | null;
  is_someday?: boolean;
  area_id?: string | null;
  category_id?: string | null;
  tags?: string[];
  subtasks?: Subtask[];
  due_date?: string | null;
  recurrence?: Recurrence | null;
}
