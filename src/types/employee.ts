export type EmployeeRole = 'subordinate' | 'manager' | 'peer' | 'mentor' | 'other';
import type { AppUserRole } from '@/types/profile';

export interface EmployeeRatings {
  communication: number; // 1-5
  leadership: number; // 1-5
  productivity: number; // 1-5
  reliability: number; // 1-5
  initiative: number; // 1-5
}

export interface Employee {
  id: string;
  name: string;
  email?: string;
  role: EmployeeRole;
  position?: string;
  note?: string;
  managerId?: string; // связь руководитель
  x?: number; // позиция на диаграмме
  y?: number;
  /** Привязка к компании */
  companyId?: string;
  /** Роль пользователя в компании (для визуализации в оргструктуре) */
  userRole?: AppUserRole;
  /** Оценки по 5-балльной шкале */
  ratings?: EmployeeRatings;
}

