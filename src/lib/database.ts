import Database from 'better-sqlite3';
import path from 'path';

// Типы для базы данных
export interface ChatSession {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  startTime: number;
  endTime?: number;
  status: 'active' | 'completed' | 'paused';
  sessionType: 'rag-chat' | 'enhanced-interview' | 'assessment-360' | 'mbti-chat';
  metadata?: string; // JSON строка с дополнительными данными
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  messageType?: 'text' | 'voice' | 'file';
  confidence?: number; // Для голосовых сообщений
  metadata?: string; // JSON строка с дополнительными данными
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
  technicalSkills: string; // JSON строка
  softSkills: string; // JSON строка
  summary: string;
  recommendations: string; // JSON массив
  strengths: string; // JSON массив
  weaknesses: string; // JSON массив
  aiAnalysis: string; // JSON объект
  individualDevelopmentPlan: string; // JSON объект
  createdAt: number;
  updatedAt: number;
}

export interface KnowledgeBaseItem {
  id: string;
  category: string;
  question: string;
  keywords: string; // JSON массив
  difficulty: 'junior' | 'middle' | 'senior';
  competency: string;
  createdAt: number;
  updatedAt: number;
  isActive: boolean;
}

export class ChatDatabase {
  private db: Database.Database;

  constructor(dbPath?: string) {
    const defaultPath = path.join(process.cwd(), 'data', 'hr-chat.db');
    this.db = new Database(dbPath || defaultPath);
    this.initializeTables();
  }

  private initializeTables() {
    // Таблица сессий чата
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS chat_sessions (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        userName TEXT NOT NULL,
        userEmail TEXT NOT NULL,
        startTime INTEGER NOT NULL,
        endTime INTEGER,
        status TEXT NOT NULL DEFAULT 'active',
        sessionType TEXT NOT NULL,
        metadata TEXT,
        FOREIGN KEY (userId) REFERENCES users (id)
      )
    `);

    // Таблица сообщений
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id TEXT PRIMARY KEY,
        sessionId TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        messageType TEXT DEFAULT 'text',
        confidence REAL,
        metadata TEXT,
        FOREIGN KEY (sessionId) REFERENCES chat_sessions (id) ON DELETE CASCADE
      )
    `);

    // Таблица профилей кандидатов
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS candidate_profiles (
        id TEXT PRIMARY KEY,
        sessionId TEXT NOT NULL,
        userId TEXT NOT NULL,
        fullName TEXT NOT NULL,
        email TEXT NOT NULL,
        position TEXT,
        department TEXT,
        overallScore INTEGER NOT NULL DEFAULT 0,
        technicalSkills TEXT NOT NULL DEFAULT '{}',
        softSkills TEXT NOT NULL DEFAULT '{}',
        summary TEXT NOT NULL DEFAULT '',
        recommendations TEXT NOT NULL DEFAULT '[]',
        strengths TEXT NOT NULL DEFAULT '[]',
        weaknesses TEXT NOT NULL DEFAULT '[]',
        aiAnalysis TEXT NOT NULL DEFAULT '{}',
        individualDevelopmentPlan TEXT NOT NULL DEFAULT '{}',
        createdAt INTEGER NOT NULL,
        updatedAt INTEGER NOT NULL,
        FOREIGN KEY (sessionId) REFERENCES chat_sessions (id) ON DELETE CASCADE
      )
    `);

    // Таблица базы знаний
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS knowledge_base (
        id TEXT PRIMARY KEY,
        category TEXT NOT NULL,
        question TEXT NOT NULL,
        keywords TEXT NOT NULL DEFAULT '[]',
        difficulty TEXT NOT NULL DEFAULT 'middle',
        competency TEXT NOT NULL,
        createdAt INTEGER NOT NULL,
        updatedAt INTEGER NOT NULL,
        isActive BOOLEAN NOT NULL DEFAULT 1
      )
    `);

    // Таблица пользователей (если еще не существует)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        role TEXT NOT NULL,
        createdAt INTEGER NOT NULL DEFAULT ${Date.now()},
        lastLoginAt INTEGER
      )
    `);

    // Создаем индексы для лучшей производительности
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(sessionId);
      CREATE INDEX IF NOT EXISTS idx_chat_messages_timestamp ON chat_messages(timestamp);
      CREATE INDEX IF NOT EXISTS idx_chat_sessions_user ON chat_sessions(userId);
      CREATE INDEX IF NOT EXISTS idx_chat_sessions_start_time ON chat_sessions(startTime);
      CREATE INDEX IF NOT EXISTS idx_candidate_profiles_session ON candidate_profiles(sessionId);
      CREATE INDEX IF NOT EXISTS idx_candidate_profiles_user ON candidate_profiles(userId);
      CREATE INDEX IF NOT EXISTS idx_knowledge_base_category ON knowledge_base(category);
      CREATE INDEX IF NOT EXISTS idx_knowledge_base_difficulty ON knowledge_base(difficulty);
    `);
  }

  // Методы для работы с сессиями
  createChatSession(session: Omit<ChatSession, 'id'>): ChatSession {
    const id = this.generateId();
    const newSession: ChatSession = { id, ...session };
    
    const stmt = this.db.prepare(`
      INSERT INTO chat_sessions (id, userId, userName, userEmail, startTime, endTime, status, sessionType, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      newSession.id,
      newSession.userId,
      newSession.userName,
      newSession.userEmail,
      newSession.startTime,
      newSession.endTime || null,
      newSession.status,
      newSession.sessionType,
      newSession.metadata || null
    );
    
    return newSession;
  }

  getChatSession(sessionId: string): ChatSession | null {
    const stmt = this.db.prepare('SELECT * FROM chat_sessions WHERE id = ?');
    return stmt.get(sessionId) as ChatSession | null;
  }

  updateChatSession(sessionId: string, updates: Partial<ChatSession>): void {
    const fields = Object.keys(updates).filter(key => key !== 'id');
    if (fields.length === 0) return;

    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const values = fields.map(field => updates[field as keyof ChatSession]);
    
    const stmt = this.db.prepare(`UPDATE chat_sessions SET ${setClause} WHERE id = ?`);
    stmt.run(...values, sessionId);
  }

  getUserChatSessions(userId: string, limit = 50): ChatSession[] {
    const stmt = this.db.prepare(`
      SELECT * FROM chat_sessions 
      WHERE userId = ? 
      ORDER BY startTime DESC 
      LIMIT ?
    `);
    return stmt.all(userId, limit) as ChatSession[];
  }

  // Методы для работы с сообщениями
  addChatMessage(message: Omit<ChatMessage, 'id'>): ChatMessage {
    const id = this.generateId();
    const newMessage: ChatMessage = { id, ...message };
    
    const stmt = this.db.prepare(`
      INSERT INTO chat_messages (id, sessionId, role, content, timestamp, messageType, confidence, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      newMessage.id,
      newMessage.sessionId,
      newMessage.role,
      newMessage.content,
      newMessage.timestamp,
      newMessage.messageType || 'text',
      newMessage.confidence || null,
      newMessage.metadata || null
    );
    
    return newMessage;
  }

  getChatMessages(sessionId: string): ChatMessage[] {
    const stmt = this.db.prepare(`
      SELECT * FROM chat_messages 
      WHERE sessionId = ? 
      ORDER BY timestamp ASC
    `);
    return stmt.all(sessionId) as ChatMessage[];
  }

  getRecentChatMessages(sessionId: string, limit = 20): ChatMessage[] {
    const stmt = this.db.prepare(`
      SELECT * FROM chat_messages 
      WHERE sessionId = ? 
      ORDER BY timestamp DESC 
      LIMIT ?
    `);
    const messages = stmt.all(sessionId, limit) as ChatMessage[];
    return messages.reverse(); // Возвращаем в правильном порядке
  }

  // Методы для работы с профилями кандидатов
  createCandidateProfile(profile: Omit<CandidateProfile, 'id' | 'createdAt' | 'updatedAt'>): CandidateProfile {
    const id = this.generateId();
    const now = Date.now();
    const newProfile: CandidateProfile = {
      id,
      ...profile,
      createdAt: now,
      updatedAt: now
    };
    
    const stmt = this.db.prepare(`
      INSERT INTO candidate_profiles (
        id, sessionId, userId, fullName, email, position, department,
        overallScore, technicalSkills, softSkills, summary, recommendations,
        strengths, weaknesses, aiAnalysis, individualDevelopmentPlan,
        createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      newProfile.id,
      newProfile.sessionId,
      newProfile.userId,
      newProfile.fullName,
      newProfile.email,
      newProfile.position || null,
      newProfile.department || null,
      newProfile.overallScore,
      newProfile.technicalSkills,
      newProfile.softSkills,
      newProfile.summary,
      newProfile.recommendations,
      newProfile.strengths,
      newProfile.weaknesses,
      newProfile.aiAnalysis,
      newProfile.individualDevelopmentPlan,
      newProfile.createdAt,
      newProfile.updatedAt
    );
    
    return newProfile;
  }

  updateCandidateProfile(profileId: string, updates: Partial<CandidateProfile>): void {
    const fields = Object.keys(updates).filter(key => !['id', 'createdAt'].includes(key));
    if (fields.length === 0) return;

    fields.push('updatedAt');
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const values = fields.map(field => field === 'updatedAt' ? Date.now() : updates[field as keyof CandidateProfile]);
    
    const stmt = this.db.prepare(`UPDATE candidate_profiles SET ${setClause} WHERE id = ?`);
    stmt.run(...values, profileId);
  }

  getCandidateProfile(sessionId: string): CandidateProfile | null {
    const stmt = this.db.prepare('SELECT * FROM candidate_profiles WHERE sessionId = ?');
    return stmt.get(sessionId) as CandidateProfile | null;
  }

  getAllCandidateProfiles(limit = 100): CandidateProfile[] {
    const stmt = this.db.prepare(`
      SELECT * FROM candidate_profiles 
      ORDER BY createdAt DESC 
      LIMIT ?
    `);
    return stmt.all(limit) as CandidateProfile[];
  }

  // Методы для работы с базой знаний
  addKnowledgeItem(item: Omit<KnowledgeBaseItem, 'id' | 'createdAt' | 'updatedAt'>): KnowledgeBaseItem {
    const id = this.generateId();
    const now = Date.now();
    const newItem: KnowledgeBaseItem = {
      id,
      ...item,
      createdAt: now,
      updatedAt: now
    };
    
    const stmt = this.db.prepare(`
      INSERT INTO knowledge_base (id, category, question, keywords, difficulty, competency, createdAt, updatedAt, isActive)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      newItem.id,
      newItem.category,
      newItem.question,
      newItem.keywords,
      newItem.difficulty,
      newItem.competency,
      newItem.createdAt,
      newItem.updatedAt,
      newItem.isActive ? 1 : 0
    );
    
    return newItem;
  }

  getKnowledgeItems(category?: string, difficulty?: string): KnowledgeBaseItem[] {
    let query = 'SELECT * FROM knowledge_base WHERE isActive = 1';
    const params: any[] = [];
    
    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }
    
    if (difficulty) {
      query += ' AND difficulty = ?';
      params.push(difficulty);
    }
    
    query += ' ORDER BY createdAt DESC';
    
    const stmt = this.db.prepare(query);
    return stmt.all(...params) as KnowledgeBaseItem[];
  }

  // Аналитические методы
  getChatStatistics(userId?: string): {
    totalSessions: number;
    totalMessages: number;
    averageSessionDuration: number;
    completedProfiles: number;
  } {
    let sessionsQuery = 'SELECT COUNT(*) as count, AVG(endTime - startTime) as avgDuration FROM chat_sessions WHERE endTime IS NOT NULL';
    let messagesQuery = 'SELECT COUNT(*) as count FROM chat_messages';
    let profilesQuery = 'SELECT COUNT(*) as count FROM candidate_profiles';
    
    const params: any[] = [];
    
    if (userId) {
      sessionsQuery += ' AND userId = ?';
      messagesQuery += ' WHERE sessionId IN (SELECT id FROM chat_sessions WHERE userId = ?)';
      profilesQuery += ' WHERE userId = ?';
      params.push(userId, userId, userId);
    }
    
    const sessionsStmt = this.db.prepare(sessionsQuery);
    const messagesStmt = this.db.prepare(messagesQuery);
    const profilesStmt = this.db.prepare(profilesQuery);
    
    const sessionsResult = sessionsStmt.get(...(userId ? [userId] : [])) as any;
    const messagesResult = messagesStmt.get(...(userId ? [userId] : [])) as any;
    const profilesResult = profilesStmt.get(...(userId ? [userId] : [])) as any;
    
    return {
      totalSessions: sessionsResult.count || 0,
      totalMessages: messagesResult.count || 0,
      averageSessionDuration: sessionsResult.avgDuration || 0,
      completedProfiles: profilesResult.count || 0
    };
  }

  // Утилитарные методы
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }

  // Закрытие базы данных
  close(): void {
    this.db.close();
  }

  // Очистка старых данных
  cleanupOldData(daysToKeep = 90): void {
    const cutoffTime = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
    
    // Удаляем старые сессии и связанные данные
    const stmt = this.db.prepare('DELETE FROM chat_sessions WHERE startTime < ?');
    stmt.run(cutoffTime);
  }
}

// Экспортируем единственный экземпляр
export const chatDatabase = new ChatDatabase();
export default chatDatabase;
