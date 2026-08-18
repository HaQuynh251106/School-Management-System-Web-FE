import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

export type RoleId = 'admin' | 'teacher' | 'student' | 'parent';
export type AttendanceStatus = 'present' | 'late' | 'absent';
export type PageId = 'dashboard' | string;

export type RoleDefinition = {
  id: RoleId;
  label: string;
  title: string;
  subtitle: string;
  sessionName: string;
  Icon: LucideIcon;
  color: string;
};

export type Metric = {
  label: string;
  value: string;
  hint: string;
  Icon: LucideIcon;
  tone: 'blue' | 'green' | 'orange' | 'red' | 'violet';
};

export type ModuleItem = {
  code: string;
  title: string;
  phase: 'GĐ1' | 'GĐ2';
  priority: number;
  summary: string;
  Icon: LucideIcon;
};

export type TabItem = {
  id: string;
  label: string;
  description?: string;
  Icon: LucideIcon;
  content: ReactNode;
};
