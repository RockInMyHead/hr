import { chatDatabase, ChatSession, ChatMessage, CandidateProfile } from '@/lib/database';
import type { AppUser } from '@/types/profile';

// Интерфейс для создания сессии чата
export interface CreateChatSessionData {
  user: AppUser;
  sessionType: 'rag-chat' | 'enhanced-interview' | 'assessment-360' | 'mbti-chat';
  metadata?: any;
}

// Интерфейс для сообщения чата
export interface ChatMessageData {
  role: 'user' | 'assistant' | 'system';
  content: string;
  messageType?: 'text' | 'voice' | 'file';
  confidence?: number;
  metadata?: any;
}

// Интерфейс для истории чата
export interface ChatHistory {
  session: ChatSession;
  messages: ChatMessage[];
  profile?: CandidateProfile;
}

export class ChatService {
  private activeSession: ChatSession | null = null;

  // Создание новой сессии чата
  async createChatSession(data: CreateChatSessionData): Promise<ChatSession> {
    const sessionData = {
      userId: data.user.email, // Используем email как уникальный идентификатор
      userName: data.user.name,
      userEmail: data.user.email,
      startTime: Date.now(),
      status: 'active' as const,
      sessionType: data.sessionType,
      metadata: data.metadata ? JSON.stringify(data.metadata) : undefined
    };

    this.activeSession = chatDatabase.createChatSession(sessionData);
    
    // Добавляем системное сообщение о начале сессии
    await this.addSystemMessage(
      this.activeSession.id,
      `Начата сессия ${data.sessionType} для пользователя ${data.user.name} (${data.user.email})`
    );

    return this.activeSession;
  }

  // Получение активной сессии
  getActiveSession(): ChatSession | null {
    return this.activeSession;
  }

  // Загрузка существующей сессии
  async loadSession(sessionId: string): Promise<ChatSession | null> {
    const session = chatDatabase.getChatSession(sessionId);
    if (session) {
      this.activeSession = session;
    }
    return session;
  }

  // Завершение сессии
  async endSession(sessionId?: string): Promise<void> {
    const targetSessionId = sessionId || this.activeSession?.id;
    if (!targetSessionId) return;

    chatDatabase.updateChatSession(targetSessionId, {
      endTime: Date.now(),
      status: 'completed'
    });

    if (this.activeSession?.id === targetSessionId) {
      this.activeSession = null;
    }
  }

  // Добавление сообщения в чат
  async addMessage(sessionId: string, messageData: ChatMessageData): Promise<ChatMessage> {
    const message = {
      sessionId,
      role: messageData.role,
      content: messageData.content,
      timestamp: Date.now(),
      messageType: messageData.messageType || 'text',
      confidence: messageData.confidence,
      metadata: messageData.metadata ? JSON.stringify(messageData.metadata) : undefined
    };

    return chatDatabase.addChatMessage(message);
  }

  // Добавление системного сообщения
  async addSystemMessage(sessionId: string, content: string): Promise<ChatMessage> {
    return this.addMessage(sessionId, {
      role: 'system',
      content,
      messageType: 'text'
    });
  }

  // Получение всех сообщений сессии
  async getSessionMessages(sessionId: string): Promise<ChatMessage[]> {
    return chatDatabase.getChatMessages(sessionId);
  }

  // Получение последних сообщений сессии
  async getRecentMessages(sessionId: string, limit = 20): Promise<ChatMessage[]> {
    return chatDatabase.getRecentChatMessages(sessionId, limit);
  }

  // Получение истории чатов пользователя
  async getUserChatHistory(userId: string, limit = 10): Promise<ChatHistory[]> {
    const sessions = chatDatabase.getUserChatSessions(userId, limit);
    
    const history: ChatHistory[] = [];
    
    for (const session of sessions) {
      const messages = chatDatabase.getChatMessages(session.id);
      const profile = chatDatabase.getCandidateProfile(session.id);
      
      history.push({
        session,
        messages,
        profile: profile || undefined
      });
    }
    
    return history;
  }

  // Сохранение профиля кандидата
  async saveCandidateProfile(sessionId: string, profileData: Partial<CandidateProfile>): Promise<CandidateProfile> {
    const session = chatDatabase.getChatSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const existingProfile = chatDatabase.getCandidateProfile(sessionId);
    
    if (existingProfile) {
      // Обновляем существующий профиль
      chatDatabase.updateCandidateProfile(existingProfile.id, profileData);
      return chatDatabase.getCandidateProfile(sessionId)!;
    } else {
      // Создаем новый профиль
      const newProfileData = {
        sessionId,
        userId: session.userId,
        fullName: profileData.fullName || session.userName,
        email: profileData.email || session.userEmail,
        position: profileData.position || '',
        department: profileData.department || '',
        overallScore: profileData.overallScore || 0,
        technicalSkills: profileData.technicalSkills || '{}',
        softSkills: profileData.softSkills || '{}',
        summary: profileData.summary || '',
        recommendations: profileData.recommendations || '[]',
        strengths: profileData.strengths || '[]',
        weaknesses: profileData.weaknesses || '[]',
        aiAnalysis: profileData.aiAnalysis || '{}',
        individualDevelopmentPlan: profileData.individualDevelopmentPlan || '{}'
      };
      
      return chatDatabase.createCandidateProfile(newProfileData);
    }
  }

  // Получение профиля кандидата
  async getCandidateProfile(sessionId: string): Promise<CandidateProfile | null> {
    return chatDatabase.getCandidateProfile(sessionId);
  }

  // Поиск по сообщениям
  async searchMessages(query: string, userId?: string, limit = 50): Promise<ChatMessage[]> {
    // Простой поиск по содержимому (можно расширить для полнотекстового поиска)
    const sessions = userId 
      ? chatDatabase.getUserChatSessions(userId, 100)
      : chatDatabase.getAllCandidateProfiles(100).map(p => ({ id: p.sessionId }));
    
    const results: ChatMessage[] = [];
    
    for (const session of sessions) {
      const messages = chatDatabase.getChatMessages(session.id);
      const matchingMessages = messages.filter(msg => 
        msg.content.toLowerCase().includes(query.toLowerCase())
      );
      results.push(...matchingMessages);
      
      if (results.length >= limit) break;
    }
    
    return results.slice(0, limit);
  }

  // Получение статистики
  async getChatStatistics(userId?: string) {
    return chatDatabase.getChatStatistics(userId);
  }

  // Экспорт данных чата в JSON
  async exportChatData(sessionId: string): Promise<{
    session: ChatSession;
    messages: ChatMessage[];
    profile?: CandidateProfile;
  }> {
    const session = chatDatabase.getChatSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }
    
    const messages = chatDatabase.getChatMessages(sessionId);
    const profile = chatDatabase.getCandidateProfile(sessionId);
    
    return {
      session,
      messages,
      profile: profile || undefined
    };
  }

  // Очистка старых данных
  async cleanupOldChats(daysToKeep = 90): Promise<void> {
    chatDatabase.cleanupOldData(daysToKeep);
  }

  // Восстановление сессии из localStorage
  async restoreSessionFromStorage(user: AppUser): Promise<ChatSession | null> {
    try {
      const savedSessionId = localStorage.getItem(`active-chat-session-${user.email}`);
      if (savedSessionId) {
        const session = await this.loadSession(savedSessionId);
        if (session && session.status === 'active') {
          return session;
        }
      }
    } catch (error) {
      console.warn('Failed to restore session from storage:', error);
    }
    return null;
  }

  // Сохранение активной сессии в localStorage
  saveSessionToStorage(user: AppUser, sessionId: string): void {
    localStorage.setItem(`active-chat-session-${user.email}`, sessionId);
  }

  // Удаление сессии из localStorage
  removeSessionFromStorage(user: AppUser): void {
    localStorage.removeItem(`active-chat-session-${user.email}`);
  }

  // Получение контекста для AI (последние сообщения)
  async getAIContext(sessionId: string, contextLength = 10): Promise<string> {
    const recentMessages = await this.getRecentMessages(sessionId, contextLength);
    
    return recentMessages
      .filter(msg => msg.role !== 'system')
      .map(msg => `${msg.role === 'user' ? 'Пользователь' : 'Ассистент'}: ${msg.content}`)
      .join('\n\n');
  }

  // Обновление метаданных сессии
  async updateSessionMetadata(sessionId: string, metadata: any): Promise<void> {
    chatDatabase.updateChatSession(sessionId, {
      metadata: JSON.stringify(metadata)
    });
  }

  // Получение всех профилей кандидатов (для администраторов)
  async getAllCandidateProfiles(limit = 100): Promise<CandidateProfile[]> {
    return chatDatabase.getAllCandidateProfiles(limit);
  }
}

// Экспортируем единственный экземпляр сервиса
export const chatService = new ChatService();
export default chatService;
