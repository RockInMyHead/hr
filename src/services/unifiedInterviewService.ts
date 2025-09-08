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
  currentPhase: 'intro' | 'questioning' | 'deep-dive' | 'completion';
  
  // Накопленные результаты
  ragProfile?: any;
  mbtiProfile?: any;
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
    const session: UnifiedInterviewSession = {
      id: `unified-${Date.now()}`,
      userId,
      startTime: new Date(),
      status: 'setup',
      totalMessages: 0,
      currentPhase: 'intro',
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

  // Определение целевого количества вопросов для каждого модуля
  private getTargetQuestions(moduleType: InterviewModule['type'], style: string): number {
    const baseQuestions = {
      rag: { comprehensive: 12, focused: 8, quick: 5 },
      mbti: { comprehensive: 10, focused: 7, quick: 5 },
      competency: { comprehensive: 8, focused: 6, quick: 4 },
      assessment360: { comprehensive: 10, focused: 7, quick: 5 },
      profile: { comprehensive: 6, focused: 4, quick: 3 }
    };

    return baseQuestions[moduleType][style as keyof typeof baseQuestions[typeof moduleType]] || 5;
  }

  // Получение следующего вопроса с учетом приоритетов и прогресса
  async getNextQuestion(userMessage?: string): Promise<string> {
    if (!this.activeSession) {
      throw new Error('No active interview session');
    }

    const session = this.activeSession;

    // Обновляем счетчик сообщений
    if (userMessage) {
      session.totalMessages++;
      await this.processUserResponse(userMessage);
    }

    // Определяем текущую фазу
    this.updateSessionPhase();

    // ПРИВЕТСТВИЕ И ДИАЛОГОВЫЙ ПОДХОД
    if (session.totalMessages === 1) {
      return await this.generateWelcomeMessage();
    }

    // РЕАКЦИЯ НА ПРЕДЫДУЩИЙ ОТВЕТ + НОВЫЙ ВОПРОС
    if (userMessage && session.totalMessages > 1) {
      return await this.generateConversationalResponse(userMessage);
    }

    // Выбираем следующий модуль для вопроса
    const nextModule = this.selectNextModule();
    
    if (!nextModule) {
      return await this.generateCompletionMessage();
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

  // Обработка ответа для конкретного модуля
  private async processModuleResponse(module: InterviewModule, userMessage: string): Promise<void> {
    const session = this.activeSession!;

    switch (module.type) {
      case 'rag':
        // Обновляем RAG профиль
        const ragResponse = await this.ragService.conductInterview(userMessage, session.settings.difficulty);
        session.ragProfile = this.ragService.getCurrentProfile();
        break;

      case 'mbti':
        // Анализируем ответ для MBTI
        const mbtiAnalysis = await this.mbtiService.analyzeResponse(userMessage, 'questioning');
        if (!session.mbtiProfile) {
          session.mbtiProfile = { scores: { E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 } };
        }
        // Обновляем MBTI scores
        Object.keys(mbtiAnalysis.personalityScores || {}).forEach(key => {
          if (session.mbtiProfile?.scores) {
            session.mbtiProfile.scores[key] += mbtiAnalysis.personalityScores[key];
          }
        });
        break;

      case 'competency':
        // Оценка компетенций через чек-лист сервис
        if (!session.competencyScores) {
          session.competencyScores = {};
        }
        const competencyEvaluation = await this.evaluateCompetencyResponse(userMessage);
        Object.assign(session.competencyScores, competencyEvaluation);
        break;

      case 'assessment360':
        // 360° оценка
        if (!session.assessment360Results) {
          session.assessment360Results = { scores: {}, observations: [] };
        }
        const assessment360Analysis = await this.analyze360Response(userMessage);
        Object.assign(session.assessment360Results.scores, assessment360Analysis.scores);
        session.assessment360Results.observations.push(assessment360Analysis.observation);
        break;

      case 'profile':
        // Обновление общего профиля кандидата
        await this.updateCandidateProfile(userMessage);
        break;
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
        return this.getFallbackQuestion(module.type);
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
    
    const prompt = `Ты - дружелюбный и опытный HR-специалист, начинающий собеседование с кандидатом.

ЗАДАЧА: Поприветствуй кандидата и создай комфортную атмосферу для начала интервью.

СТИЛЬ:
- Тепло и дружелюбно
- Профессионально, но не формально  
- Покажи заинтересованность в кандидате как в личности
- Объясни, что это будет беседа, а не допрос

СТРУКТУРА:
1. Приветствие по имени (используй "${session.userId}")
2. Краткое объяснение формата интервью
3. Первый легкий вопрос для знакомства

Сделай это естественно, как живой человек, а не робот.`;

    const messages = [{ role: 'system', content: prompt }];
    const response = await this.callOpenAI(messages, { model: 'gpt-4o-mini' });
    return response;
  }

  // Генерация диалогового ответа с реакцией на сообщение пользователя
  private async generateConversationalResponse(userMessage: string): Promise<string> {
    const session = this.activeSession!;
    
    // Получаем историю сообщений для контекста
    const conversationHistory = session.messages ? 
      session.messages.slice(-6).map(msg => `${msg.role}: ${msg.content}`).join('\n') : 
      'Начало беседы';

    // Выбираем следующий модуль для вопроса
    const nextModule = this.selectNextModule();
    if (!nextModule) {
      return await this.generateCompletionMessage();
    }

    const prompt = `Ты - опытный HR-специалист, ведущий живую беседу с кандидатом.

КОНТЕКСТ БЕСЕДЫ:
${conversationHistory}

ПОСЛЕДНИЙ ОТВЕТ КАНДИДАТА: "${userMessage}"

ТЕКУЩИЙ ФОКУС: ${nextModule.name} (${nextModule.questionsAsked}/${nextModule.targetQuestions} вопросов)

ЗАДАЧА:
1. ОТРЕАГИРУЙ на ответ кандидата - покажи, что ты его слушал:
   - Подтверди услышанное ("Понятно, значит вы...")
   - Покажи интерес ("Интересно!" / "Это впечатляет")
   - Задай уточняющий вопрос если нужно

2. ПЛАВНО ПЕРЕВЕДИ к новому вопросу по теме "${nextModule.name}":
   - Свяжи с предыдущим ответом если возможно
   - Объясни, почему этот вопрос важен
   - Задай новый вопрос

СТИЛЬ:
- Говори как живой человек, а не робот
- Используй естественные переходы
- Покажи эмпатию и понимание
- Будь кратким, но содержательным

ВАЖНО: Не задавай сразу новый вопрос - сначала отреагируй на ответ!`;

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

  // Оценка ответа по компетенциям
  private async evaluateCompetencyResponse(userMessage: string): Promise<Record<string, number>> {
    const prompt = `Оцени ответ кандидата по ключевым компетенциям.

Ответ кандидата: "${userMessage}"

Оцени по шкале от 1 до 5 следующие компетенции:
- communication (коммуникация)
- leadership (лидерство)
- productivity (продуктивность)
- reliability (надежность)
- initiative (инициативность)

Верни результат в формате JSON:
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
    // Логика обновления общего профиля кандидата
    const session = this.activeSession!;
    
    // Здесь может быть интеграция с существующими сервисами профилирования
    console.log('Updating candidate profile with message:', userMessage);
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
  private getFallbackQuestion(moduleType: InterviewModule['type']): string {
    const fallbackQuestions = {
      rag: "Расскажите о самом сложном техническом проекте, над которым вы работали.",
      mbti: "Как вы предпочитаете принимать важные решения - самостоятельно или советуясь с другими?",
      competency: "Приведите пример ситуации, когда вам пришлось проявить лидерские качества.",
      assessment360: "Как бы вас охарактеризовали ваши коллеги?",
      profile: "Какие у вас карьерные цели на ближайшие 3-5 лет?"
    };

    return fallbackQuestions[moduleType] || "Расскажите подробнее о своем опыте.";
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
}

// Регистрируем сервис
const unifiedInterviewService = new UnifiedInterviewService();
serviceManager.registerService('unifiedInterview', unifiedInterviewService);

export default unifiedInterviewService;
export { UnifiedInterviewService };
export type { UnifiedInterviewSession, InterviewModule, UnifiedQuestion };
