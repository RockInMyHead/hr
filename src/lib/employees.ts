import { STORAGE_KEYS } from '@/constants/storage';
import { Employee } from '@/types/employee';
import type { AppUser } from '@/types/profile';

export const readEmployees = (): Employee[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.employees);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const saveEmployees = (list: Employee[]) => {
  try {
    localStorage.setItem(STORAGE_KEYS.employees, JSON.stringify(list));
  } catch (error) {
    console.warn('Failed to save employees to localStorage:', error);
  }
};

export const upsertEmployee = (emp: Employee) => {
  const list = readEmployees();
  const idx = list.findIndex(e => e.id === emp.id);
  if (idx >= 0) {
    list[idx] = emp;
  } else {
    // Если характеристика не задана, подставим дефолтную по роли
    const withNote: Employee = {
      ...emp,
      note: emp.note ?? defaultNoteByEmployeeRole(emp.role),
      ratings: emp.ratings ?? defaultRatings(emp.userRole ?? 'employee'),
    };
    list.push(withNote);
  }
  saveEmployees(list);
};

export const deleteEmployee = (id: string) => {
  const list = readEmployees().filter(e => e.id !== id);
  saveEmployees(list);
};

/**
 * Синхронизировать пользователей выбранной компании в список сотрудников для диаграммы.
 * - Директор и менеджер получают userRole 'director' | 'manager', сотрудник — 'employee'
 * - Создаём записи, если их нет. Email — ключ для поиска.
 */
export const syncUsersToEmployees = (companyId: string) => {
  let employees = readEmployees();
  let users: AppUser[] = [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.users);
    users = raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.warn('Failed to load users from localStorage:', error);
  }

  const byEmail = new Map<string, Employee>(employees.map(e => [String(e.email||'').toLowerCase(), e]));

  for (const u of users) {
    if (u.companyId !== companyId) continue;
    const emailKey = u.email.toLowerCase();
    const existing = byEmail.get(emailKey);
    const base: Employee = existing ?? {
      id: existing?.id ?? (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`),
      name: u.name,
      role: 'subordinate',
    };
    const userRoleToPosition = u.role === 'director' ? 'Директор' : u.role === 'manager' ? 'Менеджер' : 'Сотрудник';
    const merged: Employee = {
      ...base,
      name: u.name,
      email: u.email,
      companyId,
      userRole: u.role,
      position: base.position || userRoleToPosition,
      note: base.note || defaultNoteByUserRole(u.role),
      ratings: base.ratings || defaultRatings(u.role),
    };
    byEmail.set(emailKey, merged);
  }

  employees = Array.from(byEmail.values());
  saveEmployees(employees);
};

function defaultNoteByUserRole(role: AppUser['role']): string {
  switch (role) {
    case 'director':
      return 'Стратегическое мышление, лидерство, ответственность за результат, умение принимать сложные решения.';
    case 'manager':
      return 'Организует процессы, развивает команду, ориентирован на результат и качество коммуникаций.';
    case 'employee':
    default:
      return 'Ответственный исполнитель: клиентоориентированность, аккуратность, соблюдение сроков.';
  }
}

function defaultNoteByEmployeeRole(role: Employee['role']): string {
  switch (role) {
    case 'manager':
      return 'Руководит направлением, распределяет задачи, поддерживает команду.';
    case 'peer':
      return 'Надежный коллега, эффективное взаимодействие и обмен знаниями.';
    case 'mentor':
      return 'Наставник: делится экспертизой, помогает в развитии.';
    case 'other':
      return 'Участник процессов, вовлечен в задачи по мере необходимости.';
    case 'subordinate':
    default:
      return 'Исполнитель: стабильно выполняет задачи, внимателен к деталям.';
  }
}

function defaultRatings(role: AppUser['role']): Employee['ratings'] {
  // Базовые оценки по ролям
  if (role === 'director') {
    return { communication: 5, leadership: 5, productivity: 5, reliability: 5, initiative: 5 };
  }
  if (role === 'manager') {
    return { communication: 4, leadership: 4, productivity: 4, reliability: 4, initiative: 4 };
  }
  return { communication: 4, leadership: 3, productivity: 4, reliability: 4, initiative: 4 };
}

