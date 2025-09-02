import { STORAGE_KEYS } from '@/constants/storage';

export interface StoredMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: string; // ISO
}

export interface StoredSession {
  id: string;
  startedAt: string; // ISO
  endedAt: string; // ISO
  messages: StoredMessage[];
  profile?: Record<string, unknown>;
  userId: string;
  companyId?: string;
}

export function readSessions(): StoredSession[] {
  try {
    // Try server first
    let currentUser: { id?: string } | null = null;
    try {
      currentUser = JSON.parse(localStorage.getItem(STORAGE_KEYS.user) || 'null');
    } catch (error) {
      console.warn('Failed to parse current user:', error);
    }
    const userId = currentUser?.id ?? 'anonymous';
    const xhr = new XMLHttpRequest();
    xhr.open('GET', `/api/chat-sessions?userId=${encodeURIComponent(userId)}`, false);
    xhr.send(null);
    if (xhr.status >= 200 && xhr.status < 300 && xhr.responseText) {
      const serverSessions = JSON.parse(xhr.responseText);
      return Array.isArray(serverSessions) ? serverSessions : [];
    }
  } catch (error) {
    console.warn('Failed to fetch sessions from server:', error);
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.sessions);
    const parsed = raw ? JSON.parse(raw) : [];
    // Filter out potentially corrupted sessions
    return parsed
      .filter((s: Record<string, unknown>) => s && typeof s === 'object' && s.id)
      .map((s: Record<string, unknown>) => ({ ...s, userId: (s.userId as string) ?? 'anonymous' }));
  } catch (error) {
    console.warn('Failed to read sessions from localStorage:', error);
    return [];
  }
}

export function appendSession(session: Omit<StoredSession, 'userId' | 'companyId'>) {
  const list = readSessions();
  let currentUser: { id?: string; companyId?: string } | null = null;
  try {
    currentUser = JSON.parse(localStorage.getItem(STORAGE_KEYS.user) || 'null');
  } catch (error) {
    console.warn('Failed to parse current user in appendSession:', error);
  }
  const withUser: StoredSession = {
    ...session,
    userId: currentUser?.id ?? 'anonymous',
    companyId: currentUser?.companyId,
  } as StoredSession;
  const idx = list.findIndex((s) => s.id === withUser.id);
  if (idx >= 0) {
    list[idx] = withUser;
  } else {
    list.push(withUser);
  }
  localStorage.setItem(STORAGE_KEYS.sessions, JSON.stringify(list));

  // Best-effort send to server (non-blocking)
  try {
    fetch('/api/chat-sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(withUser),
    }).catch((error) => {
      console.warn('Failed to send session to server:', error);
    });
  } catch (error) {
    console.warn('Failed to initiate session sync:', error);
  }
}

export function saveLastVisit(date: Date = new Date()) {
  localStorage.setItem(STORAGE_KEYS.lastVisit, date.toISOString());
}

export function readLastVisit(): string | null {
  return localStorage.getItem(STORAGE_KEYS.lastVisit);
}

export function formatMinutes(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h} ч ${m} мин` : `${m} мин`;
}

// Простая локальная "база" пользователей
export function readUsers(): Record<string, unknown>[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.users);
    const parsed = raw ? JSON.parse(raw) : [];
    // Filter out potentially corrupted user data
    return Array.isArray(parsed) ? parsed.filter(u => u && typeof u === 'object') : [];
  } catch (error) {
    console.warn('Failed to read users from localStorage:', error);
    return [];
  }
}

// Function to clean up potentially problematic localStorage data
export function cleanupLocalStorage(): void {
  try {
    const keys = Object.keys(localStorage);
    for (const key of keys) {
      if (key.includes('vite') || key.includes('chunk') || key.includes('module')) {
        localStorage.removeItem(key);
      }
    }
    console.log('Cleaned up localStorage');
  } catch (error) {
    console.warn('Failed to cleanup localStorage:', error);
  }
}

export function saveUser(user: Record<string, unknown>) {
  const users = readUsers();
  const idx = users.findIndex((u: Record<string, unknown>) => (u.email as string) === (user.email as string));
  if (idx >= 0) users[idx] = user; else users.push(user);
  localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(users));
}

export function findUserByEmail(email: string): Record<string, unknown> | null {
  return readUsers().find((u: Record<string, unknown>) => (u.email as string) === email) ?? null;
}

