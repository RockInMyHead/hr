import { BaseService } from './baseService';
import type { ChatMessage, AIService, CompanyContext } from './types';
import RAGService from './ragService';
import MBTIService from './mbtiService';
import ChecklistService from './checklistService';
import BehaviorAnalysisService from './behaviorAnalysisService';
import serviceManager from './serviceManager';

// Интерфейсы для единого интервью
export interface InterviewModule {
  name: string;
  type: 'rag' | 'mbti' | 'assessment360' | 'competency' | 'profile';
  status: 'pending' | 'in-progress' | 'completed';
  progress: number; // 0-100
  questionsAsked: number;
  targetQuestions: number;
  priority: number; // 1-5, где 1 - самый высокий приоритет
}

export interface UnifiedInterviewSession {
  id: string;
  userId: string;
  startTime: Date;
  endTime?: Date;
  status: 'setup' | 'in-progress' | 'completed';
  modules: InterviewModule[];
  totalMessages: number;
  userMessageCount?: number; // счетчик пользовательских сообщений
  currentPhase: 'intro' | 'questioning' | 'deep-dive' | 'completion';

  // История сообщений для контекста
  messages?: Array<{role: 'user' | 'assistant', content: string, timestamp: Date}>;

  // Счетчик для чередования ответов: true = следующий ответ должен быть вопросом
  nextResponseShouldBeQuestion?: boolean;

  // Накопленные результаты
  ragProfile?: any;
  mbtiProfile?: any;
  candidateProfile?: any;
  competencyScores?: Record<string, number>;
  assessment360Results?: any;
  behaviorAnalysis?: any;

  // Настройки интервью
  settings: {
    difficulty: 'junior' | 'middle' | 'senior';
    duration: number; // минуты
    focusAreas: string[]; // области фокусировки
    style: 'comprehensive' | 'focused' | 'quick';
  };
}

export interface UnifiedQuestion {
  id: string;
  moduleType: InterviewModule['type'];
  phase: string;
  text: string;
  context?: string;
  followUpQuestions?: string[];
  competencyFocus?: string[];
  priority: number;
  estimatedDuration: number; // секунды
}

class UnifiedInterviewService extends BaseService implements AIService {
  private ragService: RAGService;
  private mbtiService: MBTIService;
  private checklistService: ChecklistService;
  private behaviorAnalysisService: BehaviorAnalysisService;
  private activeSession: UnifiedInterviewSession | null = null;

  constructor() {
    super();
    this.ragService = new RAGService();
    this.mbtiService = new MBTIService();
    this.checklistService = new ChecklistService();
    this.behaviorAnalysisService = new BehaviorAnalysisService();
  }

  // Создание новой сессии интервью
  async createSession(
    userId: string,
    settings: UnifiedInterviewSession['settings']
  ): Promise<UnifiedInterviewSession> {
    // Принудительно сбрасываем любую существующую сессию
    this.activeSession = null;
    const session: UnifiedInterviewSession = {
      id: `unified-${Date.now()}`,
      userId,
      startTime: new Date(),
      status: 'setup',
      totalMessages: 0,
      userMessageCount: 0, // инициализируем счетчик пользовательских сообщений
      currentPhase: 'intro',
      messages: [], // инициализируем историю сообщений
      nextResponseShouldBeQuestion: true, // первый ответ после приветствия должен быть вопросом
      settings,
      modules: [
        {
          name: 'Профессиональное интервью (RAG)',
          type: 'rag',
          status: 'pending',
          progress: 0,
          questionsAsked: 0,
          targetQuestions: this.getTargetQuestions('rag', settings.style),
          priority: 1
        },
        {
          name: 'MBTI типирование',
          type: 'mbti',
          status: 'pending',
          progress: 0,
          questionsAsked: 0,
          targetQuestions: this.getTargetQuestions('mbti', settings.style),
          priority: 2
        },
        {
          name: 'Оценка компетенций',
          type: 'competency',
          status: 'pending',
          progress: 0,
          questionsAsked: 0,
          targetQuestions: this.getTargetQuestions('competency', settings.style),
          priority: 3
        },
        {
          name: '360° оценка',
          type: 'assessment360',
          status: 'pending',
          progress: 0,
          questionsAsked: 0,
          targetQuestions: this.getTargetQuestions('assessment360', settings.style),
          priority: 4
        },
        {
          name: 'Профиль кандидата',
          type: 'profile',
          status: 'pending',
          progress: 0,
          questionsAsked: 0,
          targetQuestions: this.getTargetQuestions('profile', settings.style),
          priority: 5
        }
      ]
    };

    this.activeSession = session;
    return session;
  }

  // Определение целевого количества вопросов для каждого модуля (оптимизировано для 15-20 минут)
  private getTargetQuestions(moduleType: InterviewModule['type'], style: string): number {
    // Уменьшаем количество вопросов для быстрого интервью 15-20 минут
    const baseQuestions = {
      rag: { comprehensive: 6, focused: 4, quick: 3 },
      mbti: { comprehensive: 4, focused: 3, quick: 2 },
      competency: { comprehensive: 4, focused: 3, quick: 2 },
      assessment360: { comprehensive: 4, focused: 3, quick: 2 },
      profile: { comprehensive: 3, focused: 2, quick: 1 }
    };

    return baseQuestions[moduleType][style as keyof typeof baseQuestions[typeof moduleType]] || 3;
  }

  // Получение следующего вопроса с учетом приоритетов и прогресса
  async getNextQuestion(userMessage?: string): Promise<string> {
    if (!this.activeSession) {
      throw new Error('No active interview session');
    }
    const session = this.activeSession;

    // Handle greeting
    if (!userMessage && session.totalMessages === 0) {
      const welcomeMessage = await this.generateWelcomeMessage();
      // Сохраняем приветственное сообщение в истории
      if (session.messages) {
        session.messages.push({
          role: 'assistant',
          content: welcomeMessage,
          timestamp: new Date()
        });
      }
      return welcomeMessage;
    }

    // Increment message count and analyze
    if (userMessage) {
      session.totalMessages++;
      session.userMessageCount = (session.userMessageCount || 0) + 1;

      // Сохраняем сообщение пользователя в истории
      if (!session.messages) session.messages = [];
      session.messages.push({
        role: 'user',
        content: userMessage,
        timestamp: new Date()
      });

      await this.processUserResponse(userMessage);
    }

    // Friendly chat for first 3 user messages
    if (userMessage && session.userMessageCount && session.userMessageCount <= 3) {
      const friendlyResponse = await this.generateFriendlyResponse(userMessage, session.userMessageCount);
      // Сохраняем дружеский ответ в истории
      if (session.messages) {
        session.messages.push({
          role: 'assistant',
          content: friendlyResponse,
          timestamp: new Date()
        });
      }
      return friendlyResponse;
    }

    // Ensure that after friendly responses, we generate a question when needed
    if (userMessage && session.userMessageCount === 4) {
      // Force question generation for the 4th user message (after friendly chat)
      session.nextResponseShouldBeQuestion = true;
    }

    // Determine phase
    this.updateSessionPhase();

    // Generate conversational response for subsequent messages
    if (userMessage) {
      return await this.generateConversationalResponse(userMessage);
    }

    // Выбираем следующий модуль для вопроса
    const nextModule = this.selectNextModule();

    if (!nextModule) {
      const completionMessage = await this.generateCompletionMessage();
      // Сохраняем завершающее сообщение в истории
      if (session.messages) {
        session.messages.push({
          role: 'assistant',
          content: completionMessage,
          timestamp: new Date()
        });
      }
      // Завершение интервью - сбрасываем флаг
      session.nextResponseShouldBeQuestion = false;
      return completionMessage;
    }

    // Генерируем вопрос для выбранного модуля
    const question = await this.generateModuleQuestion(nextModule);

    // Обновляем прогресс модуля
    nextModule.questionsAsked++;
    nextModule.progress = Math.min(100, (nextModule.questionsAsked / nextModule.targetQuestions) * 100);

    if (nextModule.questionsAsked >= nextModule.targetQuestions) {
      nextModule.status = 'completed';
    } else if (nextModule.status === 'pending') {
      nextModule.status = 'in-progress';
    }

    // Сохраняем сгенерированный вопрос в истории
    if (session.messages) {
      session.messages.push({
        role: 'assistant',
        content: question,
        timestamp: new Date()
      });
    }

    // Следующий ответ должен быть реакцией
    session.nextResponseShouldBeQuestion = false;

    return question;
  }

  // Обработка ответа пользователя
  private async processUserResponse(userMessage: string): Promise<void> {
    if (!this.activeSession) return;

    const session = this.activeSession;

    try {
      // Анализ поведения для всех ответов
      const behaviorAnalysis = await this.behaviorAnalysisService.analyzeMessageBehavior(
        userMessage, 
        'Объединенное HR интервью'
      );

      // Сохраняем анализ поведения
      if (!session.behaviorAnalysis) {
        session.behaviorAnalysis = [];
      }
      session.behaviorAnalysis.push({
        message: userMessage,
        analysis: behaviorAnalysis,
        timestamp: new Date()
      });

      // Определяем активный модуль и обрабатываем ответ
      const activeModule = session.modules.find(m => m.status === 'in-progress');
      
      if (activeModule) {
        await this.processModuleResponse(activeModule, userMessage);
      }

    } catch (error) {
      console.error('Error processing user response:', error);
    }
  }

  // Обработка ответа для ВСЕХ модулей одновременно
  private async processModuleResponse(module: InterviewModule, userMessage: string): Promise<void> {
    const session = this.activeSession!;

    // ВСЕГДА обрабатываем ответ для всех модулей одновременно
    await this.processAllModulesSimultaneously(userMessage);
  }

  // Обработка всех модулей одновременно из любого ответа
  private async processAllModulesSimultaneously(userMessage: string): Promise<void> {
    const session = this.activeSession!;

    try {
      // Параллельная обработка всех модулей
      await Promise.all([
        this.extractRAGData(userMessage),
        this.extractMBTIData(userMessage),
        this.extractCompetencyData(userMessage),
        this.extract360Data(userMessage),
        this.extractProfileData(userMessage)
      ]);
    } catch (error) {
      console.error('Error processing modules simultaneously:', error);
    }
  }

  // Извлечение данных для RAG модуля
  private async extractRAGData(userMessage: string): Promise<void> {
    const session = this.activeSession!;
    try {
      await this.ragService.conductInterview(userMessage, session.settings.difficulty);
      session.ragProfile = this.ragService.getCurrentProfile();
    } catch (error) {
      console.error('Error extracting RAG data:', error);
      // Создаем базовый профиль в случае ошибки
      if (!session.ragProfile) {
        session.ragProfile = {
          name: session.userId,
          overallScore: 0,
          technicalSkills: {},
          softSkills: {},
          evaluations: [],
          summary: '',
          recommendations: [],
          timestamp: Date.now()
        };
      }
    }
  }

  // Извлечение MBTI данных из любого ответа
  private async extractMBTIData(userMessage: string): Promise<void> {
    const session = this.activeSession!;
    try {
      const mbtiAnalysis = await this.mbtiService.analyzeResponse(userMessage, 'questioning');
      if (!session.mbtiProfile) {
        session.mbtiProfile = { scores: { E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 } };
      }
      
      // Обновляем MBTI scores
      if (mbtiAnalysis.personalityScores) {
        Object.keys(mbtiAnalysis.personalityScores).forEach(key => {
          if (session.mbtiProfile?.scores && session.mbtiProfile.scores[key] !== undefined) {
            session.mbtiProfile.scores[key] += mbtiAnalysis.personalityScores[key];
          }
        });
      }
    } catch (error) {
      console.error('Error extracting MBTI data:', error);
    }
  }

  // Извлечение компетенций из любого ответа
  private async extractCompetencyData(userMessage: string): Promise<void> {
    const session = this.activeSession!;
    try {
      if (!session.competencyScores) {
        session.competencyScores = {};
      }
      const competencyEvaluation = await this.evaluateCompetencyResponse(userMessage);
      Object.assign(session.competencyScores, competencyEvaluation);
    } catch (error) {
      console.error('Error extracting competency data:', error);
      // Создаем базовые оценки в случае ошибки
      if (!session.competencyScores) {
        session.competencyScores = {
          communication: 3,
          leadership: 3,
          productivity: 3,
          reliability: 3,
          initiative: 3
        };
      }
    }
  }

  // Извлечение 360° данных из любого ответа
  private async extract360Data(userMessage: string): Promise<void> {
    const session = this.activeSession!;
    try {
      if (!session.assessment360Results) {
        session.assessment360Results = { scores: {}, observations: [] };
      }
      const assessment360Analysis = await this.analyze360Response(userMessage);
      Object.assign(session.assessment360Results.scores, assessment360Analysis.scores);
      session.assessment360Results.observations.push(assessment360Analysis.observation);
    } catch (error) {
      console.error('Error extracting 360 data:', error);
    }
  }

  // Извлечение профильных данных
  private async extractProfileData(userMessage: string): Promise<void> {
    try {
      await this.updateCandidateProfile(userMessage);
    } catch (error) {
      console.error('Error extracting profile data:', error);
      // Создаем базовый профиль в случае ошибки
      const session = this.activeSession!;
      if (!session.candidateProfile) {
        session.candidateProfile = {
          id: `profile-${Date.now()}`,
          sessionId: session.id,
          userId: session.userId,
          fullName: session.userId,
          email: session.userId,
          position: '',
          department: '',
          overallScore: 0,
          technicalSkills: {},
          softSkills: {},
          summary: '',
          recommendations: [],
          strengths: [],
          weaknesses: [],
          aiAnalysis: {},
          individualDevelopmentPlan: {},
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
      }
    }
  }

  // Обновление фазы сессии
  private updateSessionPhase(): void {
    if (!this.activeSession) return;

    const session = this.activeSession;
    const completedModules = session.modules.filter(m => m.status === 'completed').length;
    const totalModules = session.modules.length;
    const progress = completedModules / totalModules;

    if (session.totalMessages <= 2) {
      session.currentPhase = 'intro';
    } else if (progress < 0.5) {
      session.currentPhase = 'questioning';
    } else if (progress < 0.9) {
      session.currentPhase = 'deep-dive';
    } else {
      session.currentPhase = 'completion';
    }
  }

  // Выбор следующего модуля для вопроса
  private selectNextModule(): InterviewModule | null {
    if (!this.activeSession) return null;

    const session = this.activeSession;
    
    // Фильтруем модули, которые еще не завершены
    const availableModules = session.modules.filter(m => m.status !== 'completed');
    
    if (availableModules.length === 0) {
      return null;
    }

    // Сортируем по приоритету и прогрессу
    availableModules.sort((a, b) => {
      // Сначала по приоритету
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      // Затем по прогрессу (меньший прогресс = выше приоритет)
      return a.progress - b.progress;
    });

    // Логика чередования: не задаваем подряд более 3 вопросов из одного модуля
    const lastQuestions = this.getLastQuestionTypes(3);
    const candidateModule = availableModules[0];

    if (lastQuestions.filter(type => type === candidateModule.type).length >= 3) {
      // Ищем альтернативный модуль
      const alternativeModule = availableModules.find(m => 
        m.type !== candidateModule.type && lastQuestions.includes(m.type) === false
      );
      return alternativeModule || candidateModule;
    }

    return candidateModule;
  }

  // Получение типов последних N вопросов
  private getLastQuestionTypes(count: number): InterviewModule['type'][] {
    // Эта функция должна отслеживать историю вопросов
    // Для простоты возвращаем пустой массив
    return [];
  }

  // Генерация вопроса для конкретного модуля
  private async generateModuleQuestion(module: InterviewModule): Promise<string> {
    const session = this.activeSession!;
    const cacheKey = this.generateCacheKey('module_question', module.type, module.questionsAsked, session.currentPhase);

    return this.withCache(cacheKey, async () => {
      try {
        switch (module.type) {
          case 'rag':
            return await this.generateRAGQuestion();

          case 'mbti':
            return await this.generateMBTIQuestion();

          case 'competency':
            return await this.generateCompetencyQuestion();

          case 'assessment360':
            return await this.generate360Question();

          case 'profile':
            return await this.generateProfileQuestion();

          default:
            return "Расскажите подробнее о своем опыте работы.";
        }
      } catch (error) {
        console.error(`Error generating question for module ${module.type}:`, error);
        return await this.getFallbackQuestion(module.type);
      }
    }, 5); // Кешируем на 5 минут
  }

  // Генерация RAG вопроса
  private async generateRAGQuestion(): Promise<string> {
    const session = this.activeSession!;
    
    const prompt = `Сгенерируй следующий вопрос для технического собеседования уровня ${session.settings.difficulty}.

Контекст: Это часть объединенного интервью, где нужно оценить профессиональные навыки кандидата.

Учитывай:
- Уровень сложности: ${session.settings.difficulty}
- Фазу интервью: ${session.currentPhase}
- Вопрос должен быть открытым и провоцировать детальный ответ
- Фокус на практическом опыте и решении задач

Верни только текст вопроса без дополнительных пояснений.`;

    const messages = [{ role: 'system', content: prompt }];
    const response = await this.callOpenAI(messages, { model: 'gpt-4o-mini' });
    return response;
  }

  // Генерация MBTI вопроса
  private async generateMBTIQuestion(): Promise<string> {
    const session = this.activeSession!;
    
    return await this.mbtiService.getChatResponse(
      `Продолжаем определение типа личности. Фаза: ${session.currentPhase}`,
      'questioning'
    );
  }

  // Генерация вопроса по компетенциям
  private async generateCompetencyQuestion(): Promise<string> {
    const session = this.activeSession!;
    const module = session.modules.find(m => m.type === 'competency')!;
    
    const competencies = ['communication', 'leadership', 'productivity', 'reliability', 'initiative'];
    const targetCompetency = competencies[module.questionsAsked % competencies.length];

    return await this.checklistService.generateAdaptiveQuestion(
      `Оценка компетенции: ${targetCompetency}`,
      session.settings.difficulty,
      'behavioral'
    );
  }

  // Генерация вопроса для 360° оценки
  private async generate360Question(): Promise<string> {
    const session = this.activeSession!;
    
    const prompt = `Сгенерируй вопрос для 360-градусной оценки сотрудника.

Контекст: Это часть комплексного интервью для понимания, как кандидат взаимодействует с разными уровнями иерархии.

Фокус на:
- Взаимодействие с коллегами, подчиненными, руководителями
- Обратную связь и восприятие кандидата другими
- Командную работу и влияние на команду

Фаза интервью: ${session.currentPhase}

Верни только текст вопроса.`;

    const messages = [{ role: 'system', content: prompt }];
    const response = await this.callOpenAI(messages, { model: 'gpt-4o-mini' });
    return response;
  }

  // Генерация вопроса для профиля
  private async generateProfileQuestion(): Promise<string> {
    const session = this.activeSession!;
    
    const prompt = `Сгенерируй вопрос для завершения профиля кандидата.

Контекст: Финальная стадия интервью, нужно получить информацию для полного профиля.

Фокус на:
- Карьерные цели и мотивацию
- Ожидания от новой роли
- Личностные качества и ценности
- Планы развития

Фаза интервью: ${session.currentPhase}

Верни только текст вопроса.`;

    const messages = [{ role: 'system', content: prompt }];
    const response = await this.callOpenAI(messages, { model: 'gpt-4o-mini' });
    return response;
  }

  // Генерация приветственного сообщения
  private async generateWelcomeMessage(): Promise<string> {
    const session = this.activeSession!;
    
    const prompt = `Сгенерируй приветственное сообщение для начала HR интервью.

КОНТЕКСТ:
- Пользователь: ${session.userId}
- Уровень сложности: ${session.settings.difficulty}
- Стиль интервью: ${session.settings.style}
- Продолжительность: ${session.settings.duration} минут

ЗАДАЧА:
Создай дружелюбное приветствие, которое:
- Поприветствует кандидата по имени
- Объяснит формат интервью
- Создаст позитивную атмосферу
- Задаст первый простой вопрос для знакомства

СТИЛЬ:
- Профессиональный, но дружелюбный
- Располагающий к открытой беседе
- Не формальный, используй "ты"

Верни только текст приветствия.`;

    const messages = [{ role: 'system', content: prompt }];
    const response = await this.callOpenAI(messages, { model: 'gpt-4o-mini' });
    return response;
  }

  // Генерация дружеских ответов для первых сообщений
  private async generateFriendlyResponse(userMessage: string, messageCount: number): Promise<string> {
    const session = this.activeSession!;

    const prompt = `Сгенерируй дружелюбный ответ HR-специалиста в неформальной части интервью.

КОНТЕКСТ:
- Ответ кандидата: "${userMessage}"
- Номер обмена: ${messageCount}
- Фаза: Знакомство и создание rapport

ЗАДАЧА:
${messageCount === 1 ? 
  'Отреагируй на ответ о хобби/увлечениях кандидата. Покажи интерес и задай уточняющий вопрос.' : 
  messageCount === 2 ?
  'Продолжи беседу о личных интересах, углубись в тему или спроси о других увлечениях.' :
  'Поблагодари за рассказ и плавно переведи беседу к профессиональным темам, задав первый вопрос о работе.'
}

СТИЛЬ:
- Дружелюбный и искренний
- Показывай заинтересованность
- Используй "ты"
- ${messageCount < 3 ? 'Не переходи к профессиональным темам' : 'Плавно переходи к профессиональным вопросам'}

Верни только текст ответа.`;

    const messages = [{ role: 'system', content: prompt }];
    const response = await this.callOpenAI(messages, { model: 'gpt-4o-mini' });

    // После 3-го ответа следующий ответ должен быть вопросом
    if (messageCount === 3 && session) {
      session.nextResponseShouldBeQuestion = true;
    }

    return response;
  }

  // Генерация диалогового ответа с реакцией на сообщение пользователя
  private async generateConversationalResponse(userMessage: string): Promise<string> {
    const session = this.activeSession!;

    // Для первых нескольких сообщений ведем дружескую беседу без переключения на технические темы
    if (session.userMessageCount && session.userMessageCount <= 3) {
      return await this.generateFriendlyResponse(userMessage, session.userMessageCount);
    }

    // Получаем историю сообщений для контекста
    const conversationHistory = session.messages ?
      session.messages.slice(-6).map(msg => `${msg.role}: ${msg.content}`).join('\n') :
      'Начало беседы';

    // ВСЕГДА генерируем реакцию + вопрос для динамичного интервью 15-20 минут
    const combinedResponse = await this.generateReactionOnly(userMessage, conversationHistory);
    
    // Сохраняем комбинированный ответ в истории
    if (session.messages) {
      session.messages.push({
        role: 'assistant',
        content: combinedResponse,
        timestamp: new Date()
      });
    }
    
    // Следующий ответ тоже будет реакцией + вопросом
    session.nextResponseShouldBeQuestion = false;
    return combinedResponse;
  }

  // Определение, нужно ли генерировать вопрос или реакцию
  private shouldGenerateQuestion(): boolean {
    const session = this.activeSession!;
    // Используем флаг nextResponseShouldBeQuestion для чередования
    return session.nextResponseShouldBeQuestion ?? true;
  }

  // Генерация реакции с последующим вопросом
  private async generateReactionOnly(userMessage: string, conversationHistory: string): Promise<string> {
    const session = this.activeSession!;
    const nextModule = this.selectNextModule();

    const prompt = `Ты - опытный HR-специалист, ведущий динамичное интервью. Тебе нужно ВСЕГДА совмещать реакцию с новым вопросом.

КОНТЕКСТ БЕСЕДЫ:
${conversationHistory}

ПОСЛЕДНИЙ ОТВЕТ КАНДИДАТА: "${userMessage}"

ТЕКУЩИЙ МОДУЛЬ: ${nextModule ? nextModule.name : 'Завершение'}
ПРОГРЕСС ИНТЕРВЬЮ: ${Math.round((session.modules.filter(m => m.status === 'completed').length / session.modules.length) * 100)}%

ЗАДАЧА:
1. КРАТКО отреагируй на ответ кандидата (1-2 предложения)
2. СРАЗУ же задай новый релевантный вопрос
3. ИЗВЛЕКАЙ данные для ВСЕХ модулей одновременно из любого ответа:
   - Хобби → психология, командная работа, лидерство
   - Проекты → технические навыки, решение проблем
   - Опыт → компетенции, адаптивность

ФОРМАТ ОТВЕТА:
"[КРАТКАЯ РЕАКЦИЯ]. [НОВЫЙ ВОПРОС]"

СТИЛЬ:
- Динамичный и энергичный
- Интервью должно длиться 15-20 минут максимум
- Получай максимум информации из каждого ответа

Пример: "Понятно, значит у вас есть опыт в командных проектах! А расскажите, как вы обычно разрешаете конфликты в команде?"`;

    const messages = [{ role: 'system', content: prompt }];
    const response = await this.callOpenAI(messages, { model: 'gpt-4o-mini' });

    // Обновляем прогресс модуля после генерации комбинированного ответа
    if (nextModule) {
      nextModule.questionsAsked++;
      nextModule.progress = Math.min(100, (nextModule.questionsAsked / nextModule.targetQuestions) * 100);
      
      if (nextModule.questionsAsked >= nextModule.targetQuestions) {
        nextModule.status = 'completed';
      } else if (nextModule.status === 'pending') {
        nextModule.status = 'in-progress';
      }
    }

    return response;
  }

  // Генерация только нового вопроса
  private async generateQuestionOnly(userMessage: string): Promise<string> {
    const session = this.activeSession!;

    // Выбираем следующий модуль для вопроса
    const nextModule = this.selectNextModule();
    if (!nextModule) {
      return await this.generateCompletionMessage();
    }


    const prompt = `Ты - опытный HR-специалист, задающий следующий вопрос в интервью.

КОНТЕКСТ:
- Предыдущий ответ кандидата: "${userMessage}"
- Текущий модуль: ${nextModule.name}
- Прогресс: ${nextModule.questionsAsked}/${nextModule.targetQuestions} вопросов
- Фаза интервью: ${session.currentPhase}

ЗАДАЧА:
Задай ТОЛЬКО ОДИН новый вопрос по теме "${nextModule.name}":
- Свяжи вопрос с предыдущим ответом кандидата если возможно
- Объясни кратко, почему этот вопрос важен
- Задай один конкретный вопрос
- НЕ добавляй реакцию на предыдущий ответ - это уже было сделано

СТИЛЬ:
- Профессиональный, но дружелюбный
- Краткий и по существу
- Один вопрос без дополнительных комментариев

Верни только текст вопроса с кратким введением.`;

    const messages = [{ role: 'system', content: prompt }];
    const response = await this.callOpenAI(messages, { model: 'gpt-4o-mini' });

    // Обновляем прогресс модуля после генерации вопроса
    nextModule.questionsAsked++;
    nextModule.progress = Math.min(100, (nextModule.questionsAsked / nextModule.targetQuestions) * 100);

    if (nextModule.questionsAsked >= nextModule.targetQuestions) {
      nextModule.status = 'completed';
    } else if (nextModule.status === 'pending') {
      nextModule.status = 'in-progress';
    }

    return response;
  }

  // Умная оценка ответа по компетенциям с учетом контекста
  private async evaluateCompetencyResponse(userMessage: string): Promise<Record<string, number>> {
    const prompt = `Проанализируй ответ кандидата и извлеки данные для ВСЕХ компетенций, даже если вопрос не был напрямую о них.

ОТВЕТ КАНДИДАТА: "${userMessage}"

ИНСТРУКЦИИ ДЛЯ АНАЛИЗА:
- Хобби спорт (особенно командный) → лидерство +1, коммуникация +1
- Хобби чтение/обучение → инициативность +1, продуктивность +1
- Упоминание проектов → лидерство +1, продуктивность +1
- Работа в команде → коммуникация +2, лидерство +1
- Решение проблем → инициативность +2, продуктивность +1
- Соблюдение дедлайнов → надежность +2
- Самостоятельная работа → инициативность +1, надежность +1
- Обучение других → лидерство +2, коммуникация +1
- Творческие хобби → инициативность +1

Оцени по шкале от 1 до 5:
- communication (коммуникация)
- leadership (лидерство) 
- productivity (продуктивность)
- reliability (надежность)
- initiative (инициативность)

Верни JSON:
{
  "communication": оценка,
  "leadership": оценка,
  "productivity": оценка,
  "reliability": оценка,
  "initiative": оценка
}`;

    const messages = [{ role: 'system', content: prompt }];
    const response = await this.callOpenAI(messages, { model: 'gpt-4o-mini' });
    
    try {
      return JSON.parse(response);
    } catch (error) {
      console.error('Error parsing competency evaluation:', error);
      return {
        communication: 3,
        leadership: 3,
        productivity: 3,
        reliability: 3,
        initiative: 3
      };
    }
  }

  // Анализ ответа для 360° оценки
  private async analyze360Response(userMessage: string): Promise<{scores: Record<string, number>, observation: string}> {
    const prompt = `Проанализируй ответ кандидата с точки зрения 360-градусной оценки.

Ответ кандидата: "${userMessage}"

Оцени по шкале от 1 до 5:
- teamwork (командная работа)
- communication (коммуникация)
- leadership (лидерство)
- adaptability (адаптивность)
- collaboration (сотрудничество)

Также сформулируй краткое наблюдение о поведенческих особенностях.

Верни результат в формате JSON:
{
  "scores": {
    "teamwork": оценка,
    "communication": оценка,
    "leadership": оценка,
    "adaptability": оценка,
    "collaboration": оценка
  },
  "observation": "краткое наблюдение"
}`;

    const messages = [{ role: 'system', content: prompt }];
    const response = await this.callOpenAI(messages, { model: 'gpt-4o-mini' });
    
    try {
      return JSON.parse(response);
    } catch (error) {
      console.error('Error parsing 360 analysis:', error);
      return {
        scores: {
          teamwork: 3,
          communication: 3,
          leadership: 3,
          adaptability: 3,
          collaboration: 3
        },
        observation: "Требуется дополнительная информация для полной оценки."
      };
    }
  }

  // Обновление профиля кандидата
  private async updateCandidateProfile(userMessage: string): Promise<void> {
    const session = this.activeSession!;

    try {
      const prompt = `Проанализируй ответ кандидата и извлеки информацию для профиля.

ОТВЕТ КАНДИДАТА: "${userMessage}"

ЗАДАЧА:
Извлеки следующую информацию если она присутствует:
- Имя кандидата
- Должность/позиция
- Опыт работы (лет/месяцев)
- Области специализации
- Ключевые навыки
- Достижения
- Карьерные цели
- Личные качества

Верни JSON с найденной информацией:
{
  "name": "имя или null",
  "position": "должность или null",
  "experience": "опыт или null",
  "skills": ["навык1", "навык2"],
  "achievements": ["достижение1"],
  "goals": "цели или null",
  "qualities": ["качество1", "качество2"]
}

Если информация не найдена, верни null для соответствующих полей.`;

      const messages = [{ role: 'system', content: prompt }];
      const response = await this.callOpenAI(messages, { model: 'gpt-4o-mini' });
      const profileData = JSON.parse(response);

      // Инициализируем профиль если его нет
      if (!session.candidateProfile) {
        session.candidateProfile = {
          id: `profile-${Date.now()}`,
          sessionId: session.id,
          userId: session.userId,
          fullName: session.userId,
          email: session.userId,
          position: '',
          department: '',
          overallScore: 0,
          technicalSkills: {},
          softSkills: {},
          summary: '',
          recommendations: [],
          strengths: [],
          weaknesses: [],
          aiAnalysis: {},
          individualDevelopmentPlan: {},
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
      }

      // Обновляем профиль данными
      if (profileData.name) session.candidateProfile.fullName = profileData.name;
      if (profileData.position) session.candidateProfile.position = profileData.position;
      if (profileData.experience) session.candidateProfile.summary += ` Опыт: ${profileData.experience}`;
      if (profileData.skills && profileData.skills.length > 0) {
        profileData.skills.forEach(skill => {
          if (!session.candidateProfile!.technicalSkills[skill]) {
            session.candidateProfile!.technicalSkills[skill] = Math.floor(Math.random() * 40) + 60; // 60-100
          }
        });
      }
      if (profileData.achievements && profileData.achievements.length > 0) {
        session.candidateProfile.strengths.push(...profileData.achievements);
      }
      if (profileData.goals) session.candidateProfile.summary += ` Цели: ${profileData.goals}`;
      if (profileData.qualities && profileData.qualities.length > 0) {
        profileData.qualities.forEach(quality => {
          if (!session.candidateProfile!.softSkills[quality]) {
            session.candidateProfile!.softSkills[quality] = Math.floor(Math.random() * 40) + 60; // 60-100
          }
        });
      }

      session.candidateProfile.updatedAt = Date.now();

    } catch (error) {
      console.error('Error updating candidate profile:', error);
      // Создаем базовый профиль в случае ошибки
      if (!session.candidateProfile) {
        session.candidateProfile = {
          id: `profile-${Date.now()}`,
          sessionId: session.id,
          userId: session.userId,
          fullName: session.userId,
          email: session.userId,
          position: '',
          department: '',
          overallScore: 0,
          technicalSkills: {},
          softSkills: {},
          summary: '',
          recommendations: [],
          strengths: [],
          weaknesses: [],
          aiAnalysis: {},
          individualDevelopmentPlan: {},
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
      }
    }
  }

  // Генерация сообщения о завершении
  private async generateCompletionMessage(): Promise<string> {
    const session = this.activeSession!;
    session.status = 'completed';
    session.endTime = new Date();

    const prompt = `Сгенерируй завершающее сообщение для объединенного HR интервью.

Контекст:
- Интервью завершено
- Все модули пройдены: RAG, MBTI, компетенции, 360° оценка, профиль
- Общее количество сообщений: ${session.totalMessages}
- Продолжительность: ${Math.round((Date.now() - session.startTime.getTime()) / 60000)} минут

Сообщение должно:
1. Поблагодарить кандидата
2. Кратко резюмировать что было пройдено
3. Сообщить о следующих шагах
4. Быть профессиональным и дружелюбным

Верни только текст сообщения.`;

    const messages = [{ role: 'system', content: prompt }];
    const response = await this.callOpenAI(messages, { model: 'gpt-4o-mini' });
    return response;
  }

  // Получение фолбэк вопроса
  private async getFallbackQuestion(moduleType: InterviewModule['type']): Promise<string> {
    const prompt = `Сгенерируй фолбэк вопрос для модуля интервью "${moduleType}".

КОНТЕКСТ:
- Модуль: ${moduleType}
- Это резервный вопрос на случай ошибки генерации

ЗАДАЧА:
Создай универсальный вопрос, подходящий для данного модуля:
- rag: технические вопросы о проектах и опыте
- mbti: вопросы о предпочтениях и стиле работы
- competency: поведенческие вопросы о навыках
- assessment360: вопросы о взаимодействии с командой
- profile: вопросы о карьерных целях

СТИЛЬ:
- Открытый вопрос
- Провоцирующий детальный ответ
- Профессиональный тон

Верни только текст вопроса.`;

    try {
      const messages = [{ role: 'system', content: prompt }];
      const response = await this.callOpenAI(messages, { model: 'gpt-4o-mini' });
      return response;
    } catch (error) {
      console.error('Error generating fallback question:', error);
      return "Расскажите подробнее о своем опыте работы.";
    }
  }

  // Получение текущей сессии
  getCurrentSession(): UnifiedInterviewSession | null {
    return this.activeSession;
  }

  // Завершение сессии
  completeSession(): UnifiedInterviewSession | null {
    if (this.activeSession) {
      this.activeSession.status = 'completed';
      this.activeSession.endTime = new Date();

      // Здесь можно добавить сохранение результатов
      const completedSession = { ...this.activeSession };

      // Очищаем активную сессию
      this.activeSession = null;

      return completedSession;
    }

    console.warn('No active session to complete');
    return null;
  }

  // Получение сводки результатов
  async generateResultsSummary(session: UnifiedInterviewSession): Promise<string> {
    // Сохраняем результаты компетенций в базу данных
    if (session.competencyScores && Object.keys(session.competencyScores).length > 0) {
      await this.saveCompetencyAssessments(session);
    }

    const prompt = `Создай подробную сводку результатов объединенного HR интервью.

Данные сессии:
- ID: ${session.id}
- Пользователь: ${session.userId}
- Продолжительность: ${session.endTime ? Math.round((session.endTime.getTime() - session.startTime.getTime()) / 60000) : 0} минут
- Всего сообщений: ${session.totalMessages}
- Уровень сложности: ${session.settings.difficulty}

Модули и прогресс:
${session.modules.map(m => `- ${m.name}: ${m.progress}% (${m.questionsAsked}/${m.targetQuestions} вопросов)`).join('\n')}

Результаты:
- RAG профиль: ${session.ragProfile ? 'Доступен' : 'Не завершен'}
- MBTI профиль: ${session.mbtiProfile ? 'Доступен' : 'Не завершен'}
- Оценки компетенций: ${session.competencyScores ? Object.keys(session.competencyScores).length + ' компетенций' : 'Не оценены'}
- 360° результаты: ${session.assessment360Results ? 'Доступны' : 'Не завершены'}

Создай структурированную сводку с:
1. Общей оценкой интервью
2. Ключевыми выводами по каждому модулю
3. Рекомендациями для кандидата
4. Предлагаемыми следующими шагами

Формат: профессиональный отчет HR специалиста.`;

    const messages = [{ role: 'system', content: prompt }];
    const response = await this.callOpenAI(messages, { model: 'gpt-4o-mini' });
    return response;
  }

  // Сохранение результатов компетенций в базу данных
  private async saveCompetencyAssessments(session: UnifiedInterviewSession): Promise<void> {
    if (!session.competencyScores || Object.keys(session.competencyScores).length === 0) {
      return;
    }

    try {
      const assessments = Object.entries(session.competencyScores).map(([competencyId, currentValue]) => ({
        competencyId,
        currentValue: typeof currentValue === 'number' ? currentValue : parseFloat(currentValue.toString()) || 3,
        targetValue: Math.min(5, (typeof currentValue === 'number' ? currentValue : parseFloat(currentValue.toString()) || 3) + 1),
        category: this.getCompetencyCategory(competencyId),
        lastAssessed: session.endTime?.getTime() || Date.now(),
        improvementPlan: this.generateImprovementPlan(competencyId, typeof currentValue === 'number' ? currentValue : parseFloat(currentValue.toString()) || 3)
      }));

      const response = await fetch('/api/competency-assessments/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: session.userId,
          sessionId: session.id,
          assessments,
          source: 'interview'
        })
      });

      if (!response.ok) {
        console.error('Failed to save competency assessments:', await response.text());
      } else {
        console.log('Competency assessments saved successfully');
      }
    } catch (error) {
      console.error('Error saving competency assessments:', error);
    }
  }

  // Получение категории компетенции
  private getCompetencyCategory(competencyId: string): string {
    const categories: Record<string, string> = {
      'communication': 'soft',
      'leadership': 'leadership',
      'productivity': 'business',
      'reliability': 'soft',
      'initiative': 'soft',
      'problem-solving': 'technical',
      'teamwork': 'soft',
      'adaptability': 'soft',
      'innovation': 'business',
      'customer-focus': 'business'
    };
    return categories[competencyId] || 'soft';
  }

  // Генерация плана развития компетенции
  private generateImprovementPlan(competencyId: string, currentValue: number): string[] {
    const plans: Record<string, string[]> = {
      communication: [
        'Практиковать активное слушание в ежедневных беседах',
        'Записаться на курс публичных выступлений',
        'Попросить обратную связь о стиле общения у коллег',
        'Изучить техники невербальной коммуникации'
      ],
      leadership: [
        'Возглавить небольшой проект или инициативу',
        'Найти ментора среди опытных руководителей',
        'Изучить книги по лидерству и управлению',
        'Практиковать делегирование задач'
      ],
      productivity: [
        'Освоить методы тайм-менеджмента (GTD, Pomodoro)',
        'Автоматизировать рутинные задачи',
        'Установить четкие приоритеты по методу Эйзенхауэра',
        'Измерять и анализировать свою эффективность'
      ],
      reliability: [
        'Вести учет всех обязательств в планировщике',
        'Устанавливать напоминания для важных задач',
        'Регулярно информировать о прогрессе работы',
        'Всегда держать слово, данное коллегам'
      ],
      initiative: [
        'Еженедельно предлагать одну идею для улучшения',
        'Изучать новые технологии и методы работы',
        'Участвовать в brainstorming сессиях',
        'Брать на себя дополнительные проекты'
      ]
    };

    return plans[competencyId] || ['Продолжать развиваться в данной области'];
  }
}

// Регистрируем сервис
const unifiedInterviewService = new UnifiedInterviewService();
serviceManager.registerService('unifiedInterview', unifiedInterviewService);

export default unifiedInterviewService;
export { UnifiedInterviewService };
export type { UnifiedInterviewSession, InterviewModule, UnifiedQuestion };
