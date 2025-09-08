import type { AppUser } from '@/types/profile';

// Интерфейсы для API
export interface ChatSession {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  startTime: number;
  endTime?: number;
  status: 'active' | 'completed' | 'paused';
  sessionType: 'rag-chat' | 'enhanced-interview' | 'assessment-360' | 'mbti-chat';
  metadata?: string;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  messageType?: 'text' | 'voice' | 'file';
  confidence?: number;
  metadata?: string;
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
  technicalSkills: string;
  softSkills: string;
  summary: string;
  recommendations: string;
  strengths: string;
  weaknesses: string;
  aiAnalysis: string;
  individualDevelopmentPlan: string;
  createdAt: number;
  updatedAt: number;
}

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
  private apiBaseUrl = '/api';

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

    const response = await fetch(`${this.apiBaseUrl}/chat-sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sessionData)
    });

    if (!response.ok) {
      throw new Error('Failed to create chat session');
    }

    this.activeSession = await response.json();
    
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
    const response = await fetch(`${this.apiBaseUrl}/chat-sessions/${sessionId}`);
    if (!response.ok) {
      return null;
    }
    const session = await response.json();
    if (session) {
      this.activeSession = session;
    }
    return session;
  }

  // Завершение сессии
  async endSession(sessionId?: string): Promise<void> {
    const targetSessionId = sessionId || this.activeSession?.id;
    if (!targetSessionId) return;

    await fetch(`${this.apiBaseUrl}/chat-sessions/${targetSessionId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endTime: Date.now(),
        status: 'completed'
      })
    });

    if (this.activeSession?.id === targetSessionId) {
      this.activeSession = null;
    }
  }

  // Добавление сообщения в чат
  async addMessage(sessionId: string, messageData: ChatMessageData): Promise<ChatMessage> {
    console.log('ChatService: Adding message to session:', sessionId, 'role:', messageData.role);
    
    const message = {
      sessionId,
      role: messageData.role,
      content: messageData.content,
      timestamp: Date.now(),
      messageType: messageData.messageType || 'text',
      confidence: messageData.confidence,
      metadata: messageData.metadata ? JSON.stringify(messageData.metadata) : undefined
    };

    console.log('ChatService: Sending message to API:', {
      sessionId: message.sessionId,
      role: message.role,
      contentLength: message.content.length,
      timestamp: message.timestamp
    });

    const response = await fetch(`${this.apiBaseUrl}/chat-messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message)
    });

    console.log('ChatService: API response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ChatService: Failed to add message. Response:', errorText);
      throw new Error(`Failed to add message: ${response.status} ${response.statusText}`);
    }

    const savedMessage = await response.json();
    console.log('ChatService: Message saved successfully:', savedMessage.id);
    return savedMessage;
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
    const response = await fetch(`${this.apiBaseUrl}/chat-messages/${sessionId}`);
    if (!response.ok) {
      return [];
    }
    return response.json();
  }

  // Получение последних сообщений сессии
  async getRecentMessages(sessionId: string, limit = 20): Promise<ChatMessage[]> {
    const response = await fetch(`${this.apiBaseUrl}/chat-messages/${sessionId}/recent?limit=${limit}`);
    if (!response.ok) {
      return [];
    }
    return response.json();
  }

  // Получение истории чатов пользователя
  async getUserChatHistory(userId: string, limit = 10): Promise<ChatHistory[]> {
    const response = await fetch(`${this.apiBaseUrl}/chat-sessions?userId=${userId}&limit=${limit}`);
    if (!response.ok) {
      return [];
    }
    const sessions = await response.json();
    
    const history: ChatHistory[] = [];
    
    for (const session of sessions) {
      const messages = await this.getSessionMessages(session.id);
      const profile = await this.getCandidateProfile(session.id);
      
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
    const session = await this.loadSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const existingProfile = await this.getCandidateProfile(sessionId);
    
    if (existingProfile) {
      // Обновляем существующий профиль
      const response = await fetch(`${this.apiBaseUrl}/candidate-profiles/${existingProfile.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData)
      });
      
      if (!response.ok) {
        throw new Error('Failed to update profile');
      }
      
      return this.getCandidateProfile(sessionId)!;
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
      
      const response = await fetch(`${this.apiBaseUrl}/candidate-profiles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProfileData)
      });
      
      if (!response.ok) {
        throw new Error('Failed to create profile');
      }
      
      return response.json();
    }
  }

  // Получение профиля кандидата
  async getCandidateProfile(sessionId: string): Promise<CandidateProfile | null> {
    const response = await fetch(`${this.apiBaseUrl}/candidate-profiles/${sessionId}`);
    if (!response.ok) {
      return null;
    }
    return response.json();
  }

  // Поиск по сообщениям
  async searchMessages(query: string, userId?: string, limit = 50): Promise<ChatMessage[]> {
    // Простой поиск по содержимому (можно расширить для полнотекстового поиска)
    const sessions = userId 
      ? await this.getUserChatHistory(userId, 100).then(h => h.map(h => h.session))
      : [];
    
    const results: ChatMessage[] = [];
    
    for (const session of sessions) {
      const messages = await this.getSessionMessages(session.id);
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
    const url = userId 
      ? `${this.apiBaseUrl}/statistics?userId=${userId}`
      : `${this.apiBaseUrl}/statistics`;
    
    const response = await fetch(url);
    if (!response.ok) {
      return {
        totalSessions: 0,
        totalMessages: 0,
        averageSessionDuration: 0,
        completedProfiles: 0
      };
    }
    return response.json();
  }

  // Экспорт данных чата в JSON
  async exportChatData(sessionId: string): Promise<{
    session: ChatSession;
    messages: ChatMessage[];
    profile?: CandidateProfile;
  }> {
    const session = await this.loadSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }
    
    const messages = await this.getSessionMessages(sessionId);
    const profile = await this.getCandidateProfile(sessionId);
    
    return {
      session,
      messages,
      profile: profile || undefined
    };
  }

  // Очистка старых данных (только для сервера)
  async cleanupOldChats(daysToKeep = 90): Promise<void> {
    // Этот метод должен вызываться только на сервере
    console.warn('cleanupOldChats should be called on server side only');
  }

  // Восстановление сессии из localStorage
  async restoreSessionFromStorage(user: AppUser): Promise<ChatSession | null> {
    try {
      console.log('ChatService: Restoring session for user:', user.email);
      const savedSessionId = localStorage.getItem(`active-chat-session-${user.email}`);
      console.log('ChatService: Found saved session ID:', savedSessionId);
      
      if (savedSessionId) {
        const session = await this.loadSession(savedSessionId);
        console.log('ChatService: Loaded session:', session?.id, 'status:', session?.status);
        if (session && session.status === 'active') {
          console.log('ChatService: Using active session:', session.id);
          return session;
        }
      }
      
      // Для отладки: попробуем найти любую активную сессию для этого пользователя
      if (user.email === 'jfff@mail.ru') {
        console.log('ChatService: Special case for jfff@mail.ru - looking for existing session');
        try {
          const response = await fetch(`${this.apiBaseUrl}/chat-sessions?userId=${encodeURIComponent(user.email)}`);
          if (response.ok) {
            const sessions = await response.json();
            const activeSession = sessions.find((s: ChatSession) => s.status === 'active');
            if (activeSession) {
              console.log('ChatService: Found existing active session:', activeSession.id);
              // Сохраним в localStorage
              this.saveSessionToStorage(user, activeSession.id);
              return activeSession;
            }
          }
        } catch (error) {
          console.warn('ChatService: Failed to find existing session:', error);
        }
      }
    } catch (error) {
      console.warn('ChatService: Failed to restore session from storage:', error);
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
    await fetch(`${this.apiBaseUrl}/chat-sessions/${sessionId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        metadata: JSON.stringify(metadata)
      })
    });
  }

  // Получение всех профилей кандидатов (для администраторов)
  async getAllCandidateProfiles(limit = 100): Promise<CandidateProfile[]> {
    // Этот метод требует дополнительной реализации на сервере
    console.warn('getAllCandidateProfiles not implemented in API yet');
    return [];
  }
}

// Экспортируем единственный экземпляр сервиса
export const chatService = new ChatService();
export default chatService;
