// Типы для базы данных (клиентская версия)
export interface ChatSession {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  startTime: number;
  endTime?: number;
  status: 'active' | 'completed' | 'paused';
  sessionType: 'rag-chat' | 'enhanced-interview' | 'assessment-360' | 'mbti-chat';
  metadata?: any; // Объект с дополнительными данными
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  messageType?: 'text' | 'voice' | 'file';
  confidence?: number; // Для голосовых сообщений
  metadata?: any; // Объект с дополнительными данными
}

export interface CandidateProfile {
  id: string;
  sessionId: string;
  userId: string;
  fullName: string;
  email: string;
  position?: string;
  department?: string;
  overallScore: number;
  technicalSkills: any; // Объект
  softSkills: any; // Объект
  summary: string;
  recommendations: any[]; // Массив
  strengths: any[]; // Массив
  weaknesses: any[]; // Массив
  aiAnalysis: any; // Объект
  individualDevelopmentPlan: any; // Объект
  createdAt: number;
  updatedAt: number;
}

export interface KnowledgeBaseItem {
  id: string;
  category: string;
  question: string;
  keywords: any[]; // Массив
  difficulty: 'junior' | 'middle' | 'senior';
  competency: string;
  createdAt: number;
  updatedAt: number;
  isActive: boolean;
}

export interface ChatStatistics {
  totalSessions: number;
  totalMessages: number;
  averageSessionDuration: number;
  completedProfiles: number;
}

// Клиентская версия ChatDatabase - работает через API
export class ChatDatabase {
  private apiBase = '/api';

  // Методы для работы с сессиями
  async createChatSession(session: Omit<ChatSession, 'id'>): Promise<ChatSession> {
    const response = await fetch(`${this.apiBase}/chat-sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(session)
    });

    if (!response.ok) {
      throw new Error(`Failed to create session: ${response.statusText}`);
    }

    return response.json();
  }

  async getChatSession(sessionId: string): Promise<ChatSession | null> {
    const response = await fetch(`${this.apiBase}/chat-sessions/${sessionId}`);

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`Failed to get session: ${response.statusText}`);
    }

    return response.json();
  }

  async updateChatSession(sessionId: string, updates: Partial<ChatSession>): Promise<void> {
    const response = await fetch(`${this.apiBase}/chat-sessions/${sessionId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });

    if (!response.ok) {
      throw new Error(`Failed to update session: ${response.statusText}`);
    }
  }

  async getUserChatSessions(userId: string, limit = 50): Promise<ChatSession[]> {
    const response = await fetch(`${this.apiBase}/chat-sessions?userId=${encodeURIComponent(userId)}&limit=${limit}`);

    if (!response.ok) {
      throw new Error(`Failed to get sessions: ${response.statusText}`);
    }

    return response.json();
  }

  // Методы для работы с сообщениями
  async addChatMessage(message: Omit<ChatMessage, 'id'>): Promise<ChatMessage> {
    const response = await fetch(`${this.apiBase}/chat-messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message)
    });

    if (!response.ok) {
      throw new Error(`Failed to add message: ${response.statusText}`);
    }

    return response.json();
  }

  async getChatMessages(sessionId: string): Promise<ChatMessage[]> {
    const response = await fetch(`${this.apiBase}/chat-messages/${sessionId}`);

    if (!response.ok) {
      throw new Error(`Failed to get messages: ${response.statusText}`);
    }

    return response.json();
  }

  async getRecentChatMessages(sessionId: string, limit = 20): Promise<ChatMessage[]> {
    const response = await fetch(`${this.apiBase}/chat-messages/${sessionId}/recent?limit=${limit}`);

    if (!response.ok) {
      throw new Error(`Failed to get recent messages: ${response.statusText}`);
    }

    return response.json();
  }

  // Методы для работы с профилями кандидатов
  async createCandidateProfile(profile: Omit<CandidateProfile, 'id' | 'createdAt' | 'updatedAt'>): Promise<CandidateProfile> {
    const response = await fetch(`${this.apiBase}/candidate-profiles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile)
    });

    if (!response.ok) {
      throw new Error(`Failed to create profile: ${response.statusText}`);
    }

    return response.json();
  }

  async updateCandidateProfile(profileId: string, updates: Partial<CandidateProfile>): Promise<void> {
    const response = await fetch(`${this.apiBase}/candidate-profiles/${profileId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });

    if (!response.ok) {
      throw new Error(`Failed to update profile: ${response.statusText}`);
    }
  }

  async getCandidateProfile(sessionId: string): Promise<CandidateProfile | null> {
    const response = await fetch(`${this.apiBase}/candidate-profiles/${sessionId}`);

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`Failed to get profile: ${response.statusText}`);
    }

    return response.json();
  }

  async getAllCandidateProfiles(limit = 100): Promise<CandidateProfile[]> {
    // This would need a new API endpoint
    // For now, return empty array as this method might not be used
    return [];
  }

  // Методы для работы с базой знаний
  async addKnowledgeItem(item: Omit<KnowledgeBaseItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<KnowledgeBaseItem> {
    // This would need API implementation
    throw new Error('Knowledge base API not implemented yet');
  }

  async getKnowledgeItems(category?: string, difficulty?: string): Promise<KnowledgeBaseItem[]> {
    // This would need API implementation
    return [];
  }

  // Аналитические методы
  async getChatStatistics(userId?: string): Promise<ChatStatistics> {
    const url = userId
      ? `${this.apiBase}/statistics?userId=${encodeURIComponent(userId)}`
      : `${this.apiBase}/statistics`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to get statistics: ${response.statusText}`);
    }

    return response.json();
  }

  // Утилитарные методы
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }

  // Закрытие базы данных (не нужно в клиентской версии)
  close(): void {
    // No-op in client version
  }

  // Очистка старых данных (не нужно в клиентской версии)
  cleanupOldData(daysToKeep = 90): void {
    // No-op in client version
  }
}

// Экспортируем единственный экземпляр
export const chatDatabase = new ChatDatabase();
export default chatDatabase;
