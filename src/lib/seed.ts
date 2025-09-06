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
      name: candidate.name ?? existing.name,
      role: candidate.role ?? existing.role,
      companyId: candidate.companyId ?? existing.companyId,
    } as AppUser;
    return users;
  }
  return [...users, candidate];
}

export function seedDemoUsers(): void {
  // Demo users seeding disabled
  return;
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
  // Demo employees seeding disabled
  return;
}

