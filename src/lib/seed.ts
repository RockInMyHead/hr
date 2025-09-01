import { STORAGE_KEYS } from '@/constants/storage';
import type { AppUser } from '@/types/profile';
import type { Employee } from '@/types/employee';

function generateStableId(): string {
  return (
    (globalThis.crypto as { randomUUID?: () => string })?.randomUUID?.() ??
    `${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
}

function readUsersFromStorage(): AppUser[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.users);
    return raw ? (JSON.parse(raw) as AppUser[]) : [];
  } catch (error) {
    console.warn('Failed to read users from localStorage:', error);
    return [] as AppUser[];
  }
}

function writeUsersToStorage(users: AppUser[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(users));
  } catch (error) {
    console.warn('Failed to write users to localStorage:', error);
  }
}

function upsertUserByEmail(users: AppUser[], candidate: AppUser): AppUser[] {
  const index = users.findIndex((u) => u.email.toLowerCase() === candidate.email.toLowerCase());
  if (index >= 0) {
    const existing = users[index];
    users[index] = {
      ...existing,
      // ensure demo name/role/company are correct, but keep stable id
      name: candidate.name ?? existing.name,
      role: candidate.role ?? existing.role,
      companyId: candidate.companyId ?? existing.companyId,
    } as AppUser;
    return users;
  }
  return [...users, candidate];
}

export function seedDemoUsers(): void {
  // Avoid seeding repeatedly if users already exist with demo emails
  let users = readUsersFromStorage();

  const hasAnyDemo = users.some((u) =>
    ['director@demo.local', 'manager@demo.local', 'employee@demo.local', 'director@example.com', 'manager@example.com', 'employee@example.com']
      .includes(u.email.toLowerCase())
  );

  // Determine companyId: prefer existing director's companyId if present
  const existingDirector = users.find((u) => u.role === 'administrator');
  const demoCompanyId = existingDirector?.companyId ?? generateStableId();

  const directorEmail = 'director@demo.local';
  const managerEmail = 'manager@demo.local';
  const employeeEmail = 'employee@demo.local';

  const demoDirector: AppUser = {
    id: generateStableId(),
    name: 'Администратор Демо',
    email: directorEmail,
    role: 'administrator',
    companyId: demoCompanyId,
    position: 'Генеральный директор',
  };

  const demoManager: AppUser = {
    id: generateStableId(),
    name: 'Менеджер Демо',
    email: managerEmail,
    role: 'manager',
    companyId: demoCompanyId,
    position: 'Руководитель отдела продаж',
  };

  const demoEmployee: AppUser = {
    id: generateStableId(),
    name: 'Сотрудник Демо',
    email: employeeEmail,
    role: 'employee',
    companyId: demoCompanyId,
    position: 'Специалист по обслуживанию клиентов',
  };

  // Дополнительные демо-пользователи для разных ролей
  const demoAdmin: AppUser = {
    id: generateStableId(),
    name: 'Администратор Демо',
    email: 'admin@demo.local',
    role: 'administrator',
    companyId: demoCompanyId,
    position: 'Системный администратор',
  };

  const demoManager2: AppUser = {
    id: generateStableId(),
    name: 'Руководитель отдела продаж',
    email: 'sales-manager@demo.local',
    role: 'manager',
    companyId: demoCompanyId,
    position: 'Руководитель отдела продаж',
  };

  // Always upsert (id and company will be preserved/merged for existing)
  users = upsertUserByEmail(users, demoDirector);
  users = upsertUserByEmail(users, demoManager);
  users = upsertUserByEmail(users, demoEmployee);
  users = upsertUserByEmail(users, demoAdmin);
  users = upsertUserByEmail(users, demoManager2);

  writeUsersToStorage(users);
}

function readEmployeesFromStorage(): Employee[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.employees);
    return raw ? (JSON.parse(raw) as Employee[]) : [];
  } catch (error) {
    console.warn('Failed to read employees from localStorage:', error);
    return [] as Employee[];
  }
}

function writeEmployeesToStorage(list: Employee[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.employees, JSON.stringify(list));
  } catch (error) {
    console.warn('Failed to write employees to localStorage:', error);
  }
}

export function seedDemoEmployees(): void {
  const existingEmployees = readEmployeesFromStorage();
  if (existingEmployees.length > 0) return; // не перезаписываем, если уже есть данные

  const users = readUsersFromStorage();
  const director = users.find(u => u.role === 'director');
  const manager = users.find(u => u.role === 'manager');
  const employee = users.find(u => u.role === 'employee');
  if (!director) return;
  const companyId = director.companyId ?? generateStableId();

  const dirEmp: Employee = {
    id: generateStableId(),
    name: director.name,
    email: director.email,
    role: 'subordinate',
    position: director.position ?? 'Директор',
    companyId,
    userRole: 'director',
    ratings: { communication: 5, leadership: 5, productivity: 5, reliability: 5, initiative: 5 },
    x: 100,
    y: 60,
  };

  const mgrEmp: Employee | undefined = manager ? {
    id: generateStableId(),
    name: manager.name,
    email: manager.email,
    role: 'subordinate',
    position: manager.position ?? 'Менеджер',
    companyId,
    userRole: 'manager',
    ratings: { communication: 4, leadership: 4, productivity: 4, reliability: 4, initiative: 4 },
    x: 140,
    y: 260,
  } : undefined;

  const empEmp: Employee | undefined = employee ? {
    id: generateStableId(),
    name: employee.name,
    email: employee.email,
    role: 'subordinate',
    position: employee.position ?? 'Сотрудник',
    companyId,
    userRole: 'employee',
    ratings: { communication: 4, leadership: 3, productivity: 4, reliability: 4, initiative: 4 },
    x: 360,
    y: 260,
  } : undefined;

  const list: Employee[] = [dirEmp];
  if (mgrEmp) list.push(mgrEmp);
  if (empEmp) list.push({ ...empEmp, managerId: mgrEmp?.id });
  writeEmployeesToStorage(list);
}

