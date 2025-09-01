export interface UserProfile {
  name?: string;
  age?: string;
  education?: string;
  experience?: string[] | string;
  duration?: string;
  technicalSkills?: string[];
  skillLevel?: string;
  softSkills?: string[];
  achievements?: string[];
  strengths?: string[];
  goals?: string;
  personality?: string[];
  motivation?: string;
  challenges?: string;
  teamwork?: string;
  leadership?: string;
  problemSolving?: string;
}

export type MessageType = 'text' | 'voice';

export interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  type?: MessageType; // Добавляем тип сообщения
} 

import { UserRole } from './roles';

export type AppUserRole = UserRole; // 'administrator' | 'manager' | 'employee'

export interface PrivacySettings {
  /** Видимость email для других пользователей */
  showEmail: boolean;
  /** Видимость должности для других пользователей */
  showPosition: boolean;
  /** Видимость контактной информации */
  showContactInfo: boolean;
  /** Видимость в поиске по организации */
  showInSearch: boolean;
  /** Разрешить прямые сообщения */
  allowDirectMessages: boolean;
}

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: AppUserRole;
  /** Должность пользователя для отображения в личном кабинете */
  position?: string;
  /**
   * Для менеджера: ID сотрудника в оргструктуре, являющийся корнем его отдела.
   * Если не задано, менеджеру будет предложено указать его в профиле.
   */
  rootEmployeeId?: string;
  /** Идентификатор компании (директору присваивается новый, сотрудники получают из инвайт-ссылки) */
  companyId?: string;
  /** URL аватара пользователя (base64 или внешняя ссылка) */
  avatar?: string;
  /** Настройки приватности профиля */
  privacy?: PrivacySettings;
}