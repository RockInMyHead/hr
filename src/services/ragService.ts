import { API_CONFIG } from '../config/api';

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

  constructor() {
    this.loadKnowledgeBase();
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

  // ChatGPT Интервьюер - человечное общение на основе базы знаний
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

База знаний с вопросами:
${knowledgeContext}

Правила общения:
- Используй "ты" для более неформального общения
- Задавай уточняющие вопросы если ответ неполный
- Хвали хорошие ответы
- Мягко направляй при неточных ответах
- Поддерживай позитивную атмосферу
- Не показывай правильные ответы напрямую

История беседы:
${this.conversationHistory.slice(-5).map(msg => `${msg.role}: ${msg.content}`).join('\n')}`;

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

  // ChatGPT Оценщик - анализ ответов и создание профиля
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
      const profilePrompt = `На основе результатов собеседования создай развернутый профиль кандидата.

ДАННЫЕ СОБЕСЕДОВАНИЯ:
- Общий балл: ${this.currentProfile.overallScore}/100
- Технические навыки: ${JSON.stringify(this.currentProfile.technicalSkills)}
- Софт скиллы: ${JSON.stringify(this.currentProfile.softSkills)}
- Количество вопросов: ${this.currentProfile.evaluations.length}

ДЕТАЛЬНЫЕ ОЦЕНКИ:
${this.currentProfile.evaluations.map(evaluation =>
  `Категория: ${evaluation.category}, Балл: ${evaluation.score}, Сильные стороны: ${evaluation.strengths.join(', ')}, Слабые стороны: ${evaluation.weaknesses.join(', ')}`
).join('\n')}

Создай краткое резюме кандидата (2-3 предложения), указав:
1. Общее впечатление от уровня подготовки
2. Ключевые сильные стороны
3. Основные области для развития
4. Рекомендации по найму (подходит/не подходит для позиции)`;

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

  // Автоматическая оценка в фоне (вызывается после каждого ответа)
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
      // Автоматически оцениваем ответ в фоне
      setTimeout(() => {
        this.evaluateResponse(
          relevantQuestion.question,
          lastUserMessage.content,
          relevantQuestion.answer,
          relevantQuestion.category
        ).catch(console.error);
      }, 1000);
    }
  }
}

export default RAGService;
export type { KnowledgeItem, ChatMessage, EvaluationResult, CandidateProfile };