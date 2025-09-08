import { API_CONFIG } from '../config/api';
import type { ChecklistVersion } from '../types/assessment';

interface ChecklistQuestion {
  id: string;
  text: string;
  indicators: {
    positive: string[];
    negative: string[];
  };
  competency: string;
  scale?: 'five' | 'ten' | 'boolean';
}

interface AssessmentSession {
  checklistId: string;
  currentQuestion: number;
  answers: Record<string, any>;
  conversationHistory: ConversationMessage[];
  competencyScores: Record<string, number>;
  completedQuestions: string[];
  status: 'active' | 'completed';
}

interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  context?: {
    competency?: string;
    questionId?: string;
    analysis?: MessageAnalysis;
  };
}

interface MessageAnalysis {
  keywords: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
  confidence: number;
  competencyIndicators: Record<string, number>;
  behavioralMarkers: string[];
}

interface AdaptiveQuestion {
  question: string;
  competency: string;
  context: string;
  followUpQuestions: string[];
  expectedIndicators: {
    positive: string[];
    negative: string[];
  };
}

class ChecklistService {
  private knowledgeBase: ChecklistQuestion[] = [];
  private currentSession: AssessmentSession | null = null;

  constructor() {
    this.loadKnowledgeBase();
  }

  // Загрузка базы знаний из чек-листов
  private loadKnowledgeBase(): void {
    try {
      // Импортируем чек-листы динамически
      import('../constants/checklists').then(({ HARDCODED_CHECKLIST, MANAGER_CHECKLIST, SELF_CHECKLIST, SUBORDINATE_CHECKLIST }) => {
        const checklists = [HARDCODED_CHECKLIST, MANAGER_CHECKLIST, SELF_CHECKLIST, SUBORDINATE_CHECKLIST];

        this.knowledgeBase = [];

        checklists.forEach(checklist => {
          if (checklist?.competencies) {
            checklist.competencies.forEach(competency => {
              competency.questions.forEach(question => {
                this.knowledgeBase.push({
                  id: question.id,
                  text: question.text,
                  indicators: question.indicators || { positive: [], negative: [] },
                  competency: competency.name,
                  scale: (question as any).scale || 'five'
                });
              });
            });
          }
        });

        console.log(`Loaded ${this.knowledgeBase.length} questions into knowledge base`);
      });
    } catch (error) {
      console.error('Error loading checklist knowledge base:', error);
    }
  }

  // Начать новую сессию оценки
  startAssessment(checklistId: string): AssessmentSession {
    this.currentSession = {
      checklistId,
      currentQuestion: 0,
      answers: {},
      conversationHistory: [],
      competencyScores: {},
      completedQuestions: [],
      status: 'active'
    };

    return this.currentSession;
  }

  // Получить следующий адаптивный вопрос
  async getNextAdaptiveQuestion(session: AssessmentSession): Promise<AdaptiveQuestion> {
    try {
      const conversationContext = this.buildConversationContext(session);
      const relevantQuestions = this.findRelevantQuestions(conversationContext);

      const prompt = `Ты - опытный HR-специалист, проводящий оценку компетенций сотрудника.
На основе беседы и базы знаний вопросов, сгенерируй следующий наиболее подходящий вопрос для оценки.

КОНТЕКСТ БЕСЕДЫ:
${conversationContext}

БАЗА ЗНАНИЙ (релевантные вопросы):
${relevantQuestions.map(q => `- ${q.competency}: ${q.text}`).join('\n')}

ИНСТРУКЦИИ:
1. Задай открытый вопрос для естественного диалога
2. Фокусируйся на компетенциях, которые еще не полностью оценены
3. Учитывай предыдущие ответы кандидата
4. Задавай вопросы, которые помогут выявить поведенческие паттерны
5. Избегай дублирования тем, которые уже обсуждались

Верни результат в JSON формате:
{
  "question": "Твой вопрос здесь",
  "competency": "Название компетенции",
  "context": "Краткое объяснение, почему этот вопрос сейчас актуален",
  "followUpQuestions": ["Возможный уточняющий вопрос 1", "Возможный уточняющий вопрос 2"],
  "expectedIndicators": {
    "positive": ["Признаки положительного ответа"],
    "negative": ["Признаки отрицательного ответа"]
  }
}`;

      const messages = [
        { role: 'system', content: prompt }
      ];

      const response = await this.callOpenAI(messages, 'gpt-4o-mini');
      const adaptiveQuestion: AdaptiveQuestion = JSON.parse(response);

      return adaptiveQuestion;
    } catch (error) {
      console.error('Error generating adaptive question:', error);

      // Fallback к случайному вопросу из базы
      const randomQuestion = this.knowledgeBase[Math.floor(Math.random() * this.knowledgeBase.length)];
      return {
        question: randomQuestion.text,
        competency: randomQuestion.competency,
        context: 'Автоматический выбор вопроса',
        followUpQuestions: [],
        expectedIndicators: randomQuestion.indicators
      };
    }
  }

  // Обработать ответ пользователя
  async processUserAnswer(session: AssessmentSession, userAnswer: string, currentQuestion: AdaptiveQuestion): Promise<{
    analysis: MessageAnalysis;
    competencyUpdate: Record<string, number>;
    shouldContinue: boolean;
    nextQuestionSuggestion?: string;
  }> {
    try {
      const conversationContext = this.buildConversationContext(session);

      const prompt = `Проанализируй ответ кандидата на вопрос о компетенции и оцени проявление этой компетенции.

ВОПРОС: ${currentQuestion.question}
ОТВЕТ КАНДИДАТА: ${userAnswer}
КОМПЕТЕНЦИЯ: ${currentQuestion.competency}

ОЖИДАЕМЫЕ ИНДИКАТОРЫ:
ПОЛОЖИТЕЛЬНЫЕ: ${currentQuestion.expectedIndicators.positive.join(', ')}
ОТРИЦАТЕЛЬНЫЕ: ${currentQuestion.expectedIndicators.negative.join(', ')}

КОНТЕКСТ БЕСЕДЫ:
${conversationContext}

ЗАДАЧА:
1. Определи ключевые слова и фразы в ответе
2. Оцени эмоциональный тон (positive/neutral/negative)
3. Определи уровень уверенности в оценке (0-100%)
4. Выяви поведенческие маркеры компетенции
5. Оцени проявление компетенции по шкале (0-100%)
6. Реши, нужно ли продолжать беседу по этой компетенции

Верни результат в JSON формате:
{
  "keywords": ["ключевое", "слово"],
  "sentiment": "positive|neutral|negative",
  "confidence": 85,
  "competencyIndicators": {"${currentQuestion.competency}": 75},
  "behavioralMarkers": ["поведенческий маркер 1", "маркер 2"],
  "competencyScore": 75,
  "shouldContinue": true|false,
  "nextQuestionSuggestion": "Предложение для следующего вопроса или null"
}`;

      const messages = [
        { role: 'system', content: prompt }
      ];

      const response = await this.callOpenAI(messages, 'gpt-4o-mini');
      const analysis: any = JSON.parse(response);

      // Обновляем сессию
      session.conversationHistory.push({
        id: Date.now().toString(),
        role: 'user',
        content: userAnswer,
        timestamp: Date.now(),
        context: {
          competency: currentQuestion.competency,
          analysis: {
            keywords: analysis.keywords || [],
            sentiment: analysis.sentiment || 'neutral',
            confidence: analysis.confidence || 50,
            competencyIndicators: analysis.competencyIndicators || {},
            behavioralMarkers: analysis.behavioralMarkers || []
          }
        }
      });

      // Обновляем оценки компетенций
      const competencyUpdate = analysis.competencyIndicators || {};
      Object.keys(competencyUpdate).forEach(comp => {
        if (!session.competencyScores[comp]) {
          session.competencyScores[comp] = 0;
        }
        // Взвешенное среднее
        const currentScore = session.competencyScores[comp];
        const newScore = competencyUpdate[comp];
        session.competencyScores[comp] = Math.round((currentScore + newScore) / 2);
      });

      return {
        analysis: {
          keywords: analysis.keywords || [],
          sentiment: analysis.sentiment || 'neutral',
          confidence: analysis.confidence || 50,
          competencyIndicators: analysis.competencyIndicators || {},
          behavioralMarkers: analysis.behavioralMarkers || []
        },
        competencyUpdate,
        shouldContinue: analysis.shouldContinue !== false,
        nextQuestionSuggestion: analysis.nextQuestionSuggestion
      };
    } catch (error) {
      console.error('Error processing user answer:', error);
      return {
        analysis: {
          keywords: [],
          sentiment: 'neutral',
          confidence: 50,
          competencyIndicators: {},
          behavioralMarkers: []
        },
        competencyUpdate: {},
        shouldContinue: true
      };
    }
  }

  // Построить контекст беседы
  private buildConversationContext(session: AssessmentSession): string {
    const recentMessages = session.conversationHistory.slice(-5);
    return recentMessages.map(msg => `${msg.role}: ${msg.content}`).join('\n');
  }

  // Найти релевантные вопросы из базы знаний
  private findRelevantQuestions(context: string): ChecklistQuestion[] {
    if (this.knowledgeBase.length === 0) return [];

    // Простой поиск по ключевым словам
    const contextWords = context.toLowerCase().split(' ').filter(word => word.length > 3);

    return this.knowledgeBase
      .filter(question => {
        const questionText = question.text.toLowerCase();
        return contextWords.some(word => questionText.includes(word));
      })
      .slice(0, 10); // Ограничиваем до 10 релевантных вопросов
  }

  // Завершить сессию и сгенерировать финальный отчет
  async generateFinalReport(session: AssessmentSession): Promise<{
    competencyScores: Record<string, number>;
    strengths: string[];
    developmentAreas: string[];
    recommendations: string[];
    overallAssessment: string;
  }> {
    try {
      const conversationSummary = session.conversationHistory
        .filter(msg => msg.role === 'user')
        .map(msg => msg.content)
        .join(' ');

      const prompt = `На основе проведенной оценки сгенерируй финальный отчет по компетенциям.

ИСТОРИЯ ОЦЕНКИ:
${conversationSummary}

ТЕКУЩИЕ ОЦЕНКИ КОМПЕТЕНЦИЙ:
${Object.entries(session.competencyScores).map(([comp, score]) => `${comp}: ${score}/100`).join('\n')}

ЗАДАЧА:
Создай всесторонний отчет включающий:
1. Сильные стороны кандидата
2. Области для развития
3. Конкретные рекомендации по улучшению
4. Общую оценку кандидата

Верни результат в JSON формате:
{
  "strengths": ["Сильная сторона 1", "Сильная сторона 2"],
  "developmentAreas": ["Область развития 1", "Область развития 2"],
  "recommendations": ["Рекомендация 1", "Рекомендация 2"],
  "overallAssessment": "Общая оценка кандидата"
}`;

      const messages = [
        { role: 'system', content: prompt }
      ];

      const response = await this.callOpenAI(messages, 'gpt-4o');
      const report = JSON.parse(response);

      return {
        competencyScores: session.competencyScores,
        strengths: report.strengths || [],
        developmentAreas: report.developmentAreas || [],
        recommendations: report.recommendations || [],
        overallAssessment: report.overallAssessment || 'Оценка завершена'
      };
    } catch (error) {
      console.error('Error generating final report:', error);
      return {
        competencyScores: session.competencyScores,
        strengths: [],
        developmentAreas: [],
        recommendations: [],
        overallAssessment: 'Ошибка при генерации отчета'
      };
    }
  }

  // Вызов OpenAI API
  private async callOpenAI(messages: ConversationMessage[], model: string = 'gpt-4o-mini'): Promise<string> {
    const response = await fetch(API_CONFIG.openaiURL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: 1500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || 'Ошибка получения ответа';
  }

  // Получить текущую сессию
  getCurrentSession(): AssessmentSession | null {
    return this.currentSession;
  }

  // Сохранить сессию
  saveSession(session: AssessmentSession): void {
    const sessions = JSON.parse(localStorage.getItem('checklist-assessment-sessions') || '[]');
    const existingIndex = sessions.findIndex((s: AssessmentSession) => s.checklistId === session.checklistId);

    if (existingIndex >= 0) {
      sessions[existingIndex] = session;
    } else {
      sessions.push(session);
    }

    localStorage.setItem('checklist-assessment-sessions', JSON.stringify(sessions));
  }

  // Загрузить сессию
  loadSession(checklistId: string): AssessmentSession | null {
    try {
      const sessions = JSON.parse(localStorage.getItem('checklist-assessment-sessions') || '[]');
      return sessions.find((s: AssessmentSession) => s.checklistId === checklistId) || null;
    } catch (error) {
      console.error('Error loading session:', error);
      return null;
    }
  }
}

export default ChecklistService;
export type { AssessmentSession, ConversationMessage, MessageAnalysis, AdaptiveQuestion };

