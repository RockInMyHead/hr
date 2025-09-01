export const STORAGE_KEYS = {
  user: 'hr-chat-user',
  view: 'hr-chat-view',
  sessions: 'hr-chat-sessions',
  lastVisit: 'hr-last-visit',
  employees: 'hr-employees',
  companyId: 'hr-company-id',
  users: 'hr-users',
} as const;

export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];

