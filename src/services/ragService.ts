import { API_CONFIG } from '../config/api';
import BehaviorAnalysisService, { BehaviorAnalysis, ConversationAnalysis } from './behaviorAnalysisService';

interface KnowledgeItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  tags: string[];
  difficulty: 'junior' | 'middle' | 'senior';
}

interface KnowledgeItemWithRelevance extends KnowledgeItem {
  relevanceScore: number;
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: number;
}

interface EvaluationResult {
  score: number; // 0-100
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  category: string;
  difficulty: string;
}

interface CandidateProfile {
  name?: string;
  overallScore: number;
  technicalSkills: Record<string, number>;
  softSkills: Record<string, number>;
  evaluations: EvaluationResult[];
  summary: string;
  recommendations: string[];
  timestamp: number;
}

class RAGService {
  private knowledgeBase: KnowledgeItem[] = [];
  private conversationHistory: ChatMessage[] = [];
  private currentProfile: CandidateProfile = this.initializeProfile();
  private behaviorAnalysisService: BehaviorAnalysisService;

  constructor() {
    this.loadKnowledgeBase();
    this.behaviorAnalysisService = new BehaviorAnalysisService();
  }

  // Инициализация профиля кандидата
  private initializeProfile(): CandidateProfile {
    return {
      overallScore: 0,
      technicalSkills: {},
      softSkills: {},
      evaluations: [],
      summary: '',
      recommendations: [],
      timestamp: Date.now()
    };
  }

  // Загрузка базы знаний из localStorage
  private loadKnowledgeBase(): void {
    try {
      const saved = localStorage.getItem('hr-knowledge-base');
      if (saved) {
        this.knowledgeBase = JSON.parse(saved);
      }
    } catch (error) {
      console.error('Error loading knowledge base:', error);
    }
  }

  // Обновление базы знаний
  updateKnowledgeBase(knowledge: KnowledgeItem[]): void {
    this.knowledgeBase = knowledge;
  }

  // Поиск релевантных вопросов на основе контекста
  private findRelevantQuestions(context: string, difficulty: string = 'middle'): KnowledgeItem[] {
    if (this.knowledgeBase.length === 0) return [];

    const keywords = context.toLowerCase().split(' ').filter(word => word.length > 2);

    return this.knowledgeBase
      .filter(item => item.difficulty === difficulty)
      .map(item => ({
        ...item,
        relevanceScore: this.calculateRelevance(item, keywords)
      } as KnowledgeItemWithRelevance))
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 5);
  }

  // Вычисление релевантности вопроса
  private calculateRelevance(item: KnowledgeItem, keywords: string[]): number {
    let score = 0;
    const text = `${item.question} ${item.answer} ${item.category} ${item.tags.join(' ')}`.toLowerCase();
    
    keywords.forEach(keyword => {
      if (text.includes(keyword)) {
        score += 1;
      }
    });

    return score;
  }

  // ИИ Интервьюер - человечное общение на основе базы знаний
  async conductInterview(userMessage: string, difficulty: string = 'middle'): Promise<string> {
    try {
      // Добавляем сообщение пользователя в историю
      this.conversationHistory.push({
        role: 'user',
        content: userMessage,
        timestamp: Date.now()
      });

      // Находим релевантные вопросы
      const relevantQuestions = this.findRelevantQuestions(userMessage, difficulty);
      
      // Формируем контекст для модели
      const knowledgeContext = relevantQuestions.map(q => 
        `Вопрос: ${q.question}\nПравильный ответ: ${q.answer}\nКатегория: ${q.category}`
      ).join('\n\n');

      const systemPrompt = `Ты - опытный HR-специалист, проводящий собеседование. Твоя задача:

1. Общаться естественно и дружелюбно
2. Задавать вопросы на основе предоставленной базы знаний
3. Поддерживать беседу, реагировать на ответы кандидата
4. Переходить к следующим вопросам логично
5. Быть эмпатичным и понимающим
6. ОЦЕНИВАТЬ ПОВЕДЕНИЕ И ЭМОЦИОНАЛЬНЫЙ ТОН кандидата

База знаний с вопросами:
${knowledgeContext}

Правила общения:
- Используй "ты" для более неформального общения
- Задавай уточняющие вопросы если ответ неполный
- Хвали хорошие ответы
- Мягко направляй при неточных ответах
- Поддерживай позитивную атмосферу
- Не показывай правильные ответы напрямую

ВАЖНО: Анализируй поведение кандидата и его эмоциональный тон!
- Если кандидат грубый, агрессивный или использует нецензурную лексику - отметь это
- Если кандидат немотивирован, дает односложные ответы - отметь это
- Если кандидат демонстрирует негативное отношение - отметь это
- Передай эту информацию в финальном анализе профиля

История беседы:
${this.conversationHistory.slice(-5).map(msg => `${msg.role}: ${msg.content}`).join('\n')}

Поведенческий анализ последнего ответа:
${await this.analyzeUserBehavior(userMessage)}`;

      const response = await this.callOpenAI([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ], 'gpt-4o-mini');

      // Добавляем ответ в историю
      this.conversationHistory.push({
        role: 'assistant',
        content: response,
        timestamp: Date.now()
      });

      return response;
    } catch (error) {
      console.error('Interview error:', error);
      return 'Извините, произошла ошибка. Можете повторить ваш ответ?';
    }
  }

  // Анализ поведения пользователя (новый ИИ-анализ)
  private async analyzeUserBehavior(message: string): Promise<string> {
    try {
      const analysis = await this.behaviorAnalysisService.analyzeMessageBehavior(message, 'HR собеседование');

      const behaviorAnalysis = [];

      // Основной эмоциональный тон
      behaviorAnalysis.push(`${analysis.sentiment.toUpperCase()}: ${analysis.emotionalState}`);

      // Уверенность в ответе
      behaviorAnalysis.push(`УВЕРЕННОСТЬ: ${analysis.confidence}%`);

      // Поведенческие маркеры
      if (analysis.behavioralMarkers.length > 0) {
        behaviorAnalysis.push(`МАРКЕРЫ: ${analysis.behavioralMarkers.join(', ')}`);
      }

      // Стиль коммуникации
      behaviorAnalysis.push(`СТИЛЬ: ${analysis.communicationStyle}`);

      // Уровень мотивации
      behaviorAnalysis.push(`МОТИВАЦИЯ: ${analysis.motivationLevel.toUpperCase()}`);

      // Проблемы и сильные стороны
      if (analysis.concerns.length > 0) {
        behaviorAnalysis.push(`ПРОБЛЕМЫ: ${analysis.concerns.join(', ')}`);
      }

      if (analysis.strengths.length > 0) {
        behaviorAnalysis.push(`СИЛЬНЫЕ СТОРОНЫ: ${analysis.strengths.join(', ')}`);
      }

      return behaviorAnalysis.join('; ');
    } catch (error) {
      console.error('Error in AI behavior analysis:', error);
      // Fallback к старому методу
      return this.fallbackBehaviorAnalysis(message);
    }
  }

  // Fallback анализ поведения (старый метод)
  private fallbackBehaviorAnalysis(message: string): string {
    const lowerMessage = message.toLowerCase().trim();
    const rudeWords = ['дурак', 'идиот', 'тупой', 'козел', 'сука', 'блядь', 'пизд', 'хуй', 'ебан', 'охуе'];
    const negativePhrases = ['отстань', 'валите', 'пошел', 'убирайся', 'заткнись'];
    const dismissiveWords = ['ничего', 'нет', 'не знаю', 'не помню'];

    let behaviorAnalysis = [];

    if (rudeWords.some(word => lowerMessage.includes(word))) {
      behaviorAnalysis.push('ГРУБОСТЬ: Использованы оскорбительные выражения');
    }

    if (negativePhrases.some(phrase => lowerMessage.includes(phrase))) {
      behaviorAnalysis.push('НЕГАТИВ: Агрессивное поведение');
    }

    if (lowerMessage.split(' ').length <= 3 && dismissiveWords.some(word => lowerMessage.includes(word))) {
      behaviorAnalysis.push('НЕМОТИВИРОВАННОСТЬ: Односложные ответы');
    }

    if (lowerMessage.length < 10) {
      behaviorAnalysis.push('КРАТКОСТЬ: Недостаточно информации');
    }

    if (behaviorAnalysis.length === 0) {
      behaviorAnalysis.push('НОРМАЛЬНО: Ответ соответствует ожиданиям');
    }

    return behaviorAnalysis.join('; ');
  }

  // Анализ поведения за всю беседу (новый ИИ-анализ)
  private async analyzeConversationBehavior(): Promise<string> {
    try {
      const analysis = await this.behaviorAnalysisService.analyzeConversationBehavior(this.conversationHistory);

      const analysisParts = [];

      // Общий эмоциональный тон
      analysisParts.push(`${analysis.overallSentiment.toUpperCase()}: ${analysis.averageConfidence}% уверенности`);

      // Поведенческие паттерны
      if (analysis.behavioralPatterns.length > 0) {
        analysisParts.push(`ПАТТЕРНЫ: ${analysis.behavioralPatterns.join(', ')}`);
      }

      // Эмоциональные тренды
      if (analysis.emotionalTrends.length > 0) {
        analysisParts.push(`ЭМОЦИИ: ${analysis.emotionalTrends.join(', ')}`);
      }

      // Оценка мотивации
      analysisParts.push(`МОТИВАЦИЯ: ${analysis.motivationAssessment}`);

      // Качество коммуникации
      analysisParts.push(`КОММУНИКАЦИЯ: ${analysis.communicationQuality}`);

      // Красные флаги
      if (analysis.redFlags.length > 0) {
        analysisParts.push(`ПРОБЛЕМЫ: ${analysis.redFlags.join(', ')}`);
      }

      // Положительные индикаторы
      if (analysis.positiveIndicators.length > 0) {
        analysisParts.push(`СИЛЬНЫЕ СТОРОНЫ: ${analysis.positiveIndicators.join(', ')}`);
      }

      // Области развития
      if (analysis.developmentAreas.length > 0) {
        analysisParts.push(`РАЗВИТИЕ: ${analysis.developmentAreas.join(', ')}`);
      }

      // Рекомендация по найму
      analysisParts.push(`РЕКОМЕНДАЦИЯ: ${analysis.hiringRecommendation}`);

      return analysisParts.join('; ');
    } catch (error) {
      console.error('Error in AI conversation behavior analysis:', error);
      // Fallback к старому методу
      return this.fallbackConversationAnalysis();
    }
  }

  // Fallback анализ беседы (старый метод)
  private fallbackConversationAnalysis(): string {
    const userMessages = this.conversationHistory.filter(msg => msg.role === 'user');
    const totalMessages = userMessages.length;

    if (totalMessages === 0) return 'Недостаточно данных для анализа поведения';

    let rudeCount = 0;
    let negativeCount = 0;
    let dismissiveCount = 0;
    let shortAnswersCount = 0;
    let totalWords = 0;

    const rudeWords = ['дурак', 'идиот', 'тупой', 'козел', 'сука', 'блядь', 'пизд', 'хуй', 'ебан', 'охуе'];
    const negativePhrases = ['отстань', 'валите', 'пошел', 'убирайся', 'заткнись'];
    const dismissiveWords = ['ничего', 'нет', 'не знаю', 'не помню'];

    userMessages.forEach(msg => {
      const text = msg.content.toLowerCase();
      totalWords += text.split(' ').length;

      if (rudeWords.some(word => text.includes(word))) rudeCount++;
      if (negativePhrases.some(phrase => text.includes(phrase))) negativeCount++;
      if (text.split(' ').length <= 3 && dismissiveWords.some(word => text.includes(word))) dismissiveCount++;
      if (text.length < 10) shortAnswersCount++;
    });

    const avgWordsPerMessage = totalWords / totalMessages;
    const rudePercentage = (rudeCount / totalMessages) * 100;
    const negativePercentage = (negativeCount / totalMessages) * 100;
    const dismissivePercentage = (dismissiveCount / totalMessages) * 100;

    let analysis = [];

    if (rudePercentage > 20) {
      analysis.push(`КРИТИЧНАЯ ПРОБЛЕМА: ${rudePercentage.toFixed(0)}% сообщений содержат грубость`);
    } else if (rudeCount > 0) {
      analysis.push(`ПРОБЛЕМА: ${rudeCount} сообщение(й) содержат грубость`);
    }

    if (negativePercentage > 30) {
      analysis.push(`КРИТИЧНАЯ ПРОБЛЕМА: ${negativePercentage.toFixed(0)}% сообщений негативны`);
    } else if (negativeCount > 0) {
      analysis.push(`ПРОБЛЕМА: ${negativeCount} негативное(ых) сообщение(й)`);
    }

    if (dismissivePercentage > 40) {
      analysis.push(`ПРОБЛЕМА: ${dismissivePercentage.toFixed(0)}% ответов односложные`);
    }

    if (avgWordsPerMessage < 5) {
      analysis.push(`ПРОБЛЕМА: Средняя длина ответа ${avgWordsPerMessage.toFixed(1)} слов`);
    }

    if (analysis.length === 0) {
      analysis.push('ПОВЕДЕНИЕ: Кандидат проявил нормальную коммуникацию');
    }

    return analysis.join('; ');
  }

  // ИИ Оценщик - анализ ответов и создание профиля
  async evaluateResponse(question: string, userAnswer: string, expectedAnswer: string, category: string): Promise<EvaluationResult> {
    try {
      const evaluationPrompt = `Ты - эксперт по оценке кандидатов на техническом собеседовании. 

Проанализируй ответ кандидата и оцени его по следующим критериям:

ВОПРОС: ${question}
ОТВЕТ КАНДИДАТА: ${userAnswer}
ОЖИДАЕМЫЙ ОТВЕТ: ${expectedAnswer}
КАТЕГОРИЯ: ${category}

Критерии оценки:
1. Техническая корректность (40%)
2. Полнота ответа (30%)
3. Ясность изложения (20%)
4. Практический опыт (10%)

Верни результат в JSON формате:
{
  "score": число от 0 до 100,
  "strengths": ["список сильных сторон"],
  "weaknesses": ["список слабых сторон"],
  "recommendations": ["рекомендации для улучшения"],
  "category": "${category}",
  "difficulty": "определи уровень сложности ответа"
}

Будь объективным, но конструктивным в оценке.`;

      const response = await this.callOpenAI([
        { role: 'system', content: evaluationPrompt }
      ], 'gpt-4o');

      const evaluation: EvaluationResult = JSON.parse(response);
      
      // Добавляем оценку в профиль
      this.currentProfile.evaluations.push(evaluation);
      this.updateCandidateProfile();

      return evaluation;
    } catch (error) {
      console.error('Evaluation error:', error);
      return {
        score: 50,
        strengths: ['Ответ получен'],
        weaknesses: ['Ошибка при анализе'],
        recommendations: ['Попробуйте еще раз'],
        category,
        difficulty: 'middle'
      };
    }
  }

  // Обновление профиля кандидата
  private updateCandidateProfile(): void {
    if (this.currentProfile.evaluations.length === 0) return;

    // Вычисляем общий рейтинг
    const totalScore = this.currentProfile.evaluations.reduce((sum, evaluation) => sum + evaluation.score, 0);
    this.currentProfile.overallScore = Math.round(totalScore / this.currentProfile.evaluations.length);

    // Группируем навыки по категориям
    const skillsByCategory: Record<string, number[]> = {};
    this.currentProfile.evaluations.forEach(evaluation => {
      if (!skillsByCategory[evaluation.category]) {
        skillsByCategory[evaluation.category] = [];
      }
      skillsByCategory[evaluation.category].push(evaluation.score);
    });

    // Вычисляем средние баллы по категориям
    Object.keys(skillsByCategory).forEach(category => {
      const scores = skillsByCategory[category];
      const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
      
      if (this.isTechnicalCategory(category)) {
        this.currentProfile.technicalSkills[category] = avgScore;
      } else {
        this.currentProfile.softSkills[category] = avgScore;
      }
    });

    // Собираем общие рекомендации
    this.currentProfile.recommendations = [
      ...new Set(this.currentProfile.evaluations.flatMap(evaluation => evaluation.recommendations))
    ];
  }

  // Проверка, является ли категория технической
  private isTechnicalCategory(category: string): boolean {
    const technicalCategories = [
      'javascript', 'react', 'node.js', 'database', 'алгоритмы', 
      'frontend', 'backend', 'api', 'testing', 'devops'
    ];
    return technicalCategories.some(tech => 
      category.toLowerCase().includes(tech.toLowerCase())
    );
  }

  // Генерация итогового профиля кандидата
  async generateFinalProfile(): Promise<CandidateProfile> {
    try {
      // Анализ поведения из истории беседы
      const behaviorAnalysis = await this.analyzeConversationBehavior();

      const profilePrompt = `На основе результатов собеседования создай развернутый профиль кандидата.
УЧТИ ПОВЕДЕНЧЕСКИЙ АНАЛИЗ: ${behaviorAnalysis}

ДАННЫЕ СОБЕСЕДОВАНИЯ:
- Общий балл: ${this.currentProfile.overallScore}/100
- Технические навыки: ${JSON.stringify(this.currentProfile.technicalSkills)}
- Софт скиллы: ${JSON.stringify(this.currentProfile.softSkills)}
- Количество вопросов: ${this.currentProfile.evaluations.length}

ИСТОРИЯ ОБЩЕНИЯ:
${this.conversationHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n')}

ДЕТАЛЬНЫЕ ОЦЕНКИ:
${this.currentProfile.evaluations.map(evaluation =>
  `Категория: ${evaluation.category}, Балл: ${evaluation.score}, Сильные стороны: ${evaluation.strengths.join(', ')}, Слабые стороны: ${evaluation.weaknesses.join(', ')}`
).join('\n')}

ВАЖНО: Проанализируй поведение кандидата в ходе беседы!
- Если кандидат был грубым, агрессивным или использовал нецензурную лексику - это серьезный минус
- Если кандидат давал односложные ответы типа "нет", "ничего" - это признак немотивированности
- Если кандидат отказывался общаться или проявлял негатив - это серьезная проблема
- Учти эмоциональный тон и готовность к коммуникации

Создай честный анализ кандидата, указав:
1. Общее впечатление от уровня подготовки И ПОВЕДЕНИЯ
2. Ключевые сильные стороны (если есть)
3. Основные проблемы и области для развития
4. ЧЕСТНАЯ рекомендация по найму с учетом поведения`;

      const summary = await this.callOpenAI([
        { role: 'system', content: profilePrompt }
      ], 'gpt-4o');

      this.currentProfile.summary = summary;
      this.currentProfile.timestamp = Date.now();

      return this.currentProfile;
    } catch (error) {
      console.error('Profile generation error:', error);
      this.currentProfile.summary = 'Ошибка при генерации профиля кандидата';
      return this.currentProfile;
    }
  }

  // Вызов OpenAI API
  private async callOpenAI(messages: ChatMessage[], model: string = 'gpt-4o-mini'): Promise<string> {
    const response = await fetch(API_CONFIG.openaiURL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || 'Ошибка получения ответа';
  }

  // Получение текущего профиля
  getCurrentProfile(): CandidateProfile {
    return { ...this.currentProfile };
  }

  // Сброс сессии
  resetSession(): void {
    this.conversationHistory = [];
    this.currentProfile = this.initializeProfile();
  }

  // Получение истории беседы
  getConversationHistory(): ChatMessage[] {
    return [...this.conversationHistory];
  }

  // Автоматическая оценка ответа (вызывается после каждого ответа)
  async autoEvaluateLastResponse(): Promise<void> {
    if (this.conversationHistory.length < 2) return;

    const lastUserMessage = this.conversationHistory
      .filter(msg => msg.role === 'user')
      .pop();

    const lastAssistantMessage = this.conversationHistory
      .filter(msg => msg.role === 'assistant')
      .pop();

    if (!lastUserMessage || !lastAssistantMessage) return;

    // Находим релевантный вопрос из базы знаний
    const relevantQuestion = this.findRelevantQuestions(lastUserMessage.content)[0];

    if (relevantQuestion) {
      // Синхронно оцениваем ответ
      try {
        await this.evaluateResponse(
          relevantQuestion.question,
          lastUserMessage.content,
          relevantQuestion.answer,
          relevantQuestion.category
        );
      } catch (error) {
        console.error('Auto evaluation error:', error);
      }
    }
  }
}

export default RAGService;
export type { KnowledgeItem, ChatMessage, EvaluationResult, CandidateProfile };