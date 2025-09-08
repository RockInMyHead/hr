import { API_CONFIG } from '../config/api';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: number;
}

interface BehaviorAnalysis {
  sentiment: 'positive' | 'neutral' | 'negative';
  confidence: number; // 0-100
  behavioralMarkers: string[];
  emotionalState: string;
  motivationLevel: 'high' | 'medium' | 'low';
  communicationStyle: string;
  concerns: string[];
  strengths: string[];
  recommendations: string[];
}

interface ConversationAnalysis {
  overallSentiment: 'positive' | 'neutral' | 'negative';
  averageConfidence: number;
  behavioralPatterns: string[];
  emotionalTrends: string[];
  motivationAssessment: string;
  communicationQuality: string;
  redFlags: string[];
  positiveIndicators: string[];
  developmentAreas: string[];
  hiringRecommendation: string;
  detailedFeedback: string;
}

class BehaviorAnalysisService {
  private cache: Map<string, BehaviorAnalysis> = new Map();

  // Анализ отдельного сообщения кандидата
  async analyzeMessageBehavior(message: string, context?: string): Promise<BehaviorAnalysis> {
    try {
      // Создаем уникальный ключ для кеширования
      const cacheKey = `${message.length}_${message.slice(0, 50)}`;

      // Проверяем кеш
      if (this.cache.has(cacheKey)) {
        return this.cache.get(cacheKey)!;
      }

      const prompt = `Проанализируй поведение кандидата на основе его сообщения в контексте собеседования.

СООБЩЕНИЕ КАНДИДАТА: "${message}"
КОНТЕКСТ: ${context || 'Общее собеседование'}

ЗАДАЧА:
1. Определи эмоциональный тон (positive/neutral/negative)
2. Оцени уверенность в ответе (0-100%)
3. Выяви поведенческие маркеры (профессионализм, мотивация, коммуникация)
4. Определи эмоциональное состояние
5. Оцени уровень мотивации (high/medium/low)
6. Опиши стиль коммуникации
7. Выяви потенциальные проблемы/концерны
8. Найди сильные стороны
9. Дай рекомендации по улучшению

Верни результат в JSON формате:
{
  "sentiment": "positive|neutral|negative",
  "confidence": 85,
  "behavioralMarkers": ["маркер 1", "маркер 2", "маркер 3"],
  "emotionalState": "описание эмоционального состояния",
  "motivationLevel": "high|medium|low",
  "communicationStyle": "описание стиля коммуникации",
  "concerns": ["проблема 1", "проблема 2"],
  "strengths": ["сила 1", "сила 2"],
  "recommendations": ["рекомендация 1", "рекомендация 2"]
}

Будь объективным и конструктивным в анализе. Учитывай культурный контекст и профессиональную среду.`;

      const messages = [
        { role: 'system', content: prompt }
      ];

      const response = await this.callOpenAI(messages, 'gpt-4o-mini');
      // Удаляем кодовые ограждения (``` или ```json)
      const cleanedResponse = response.replace(/```(?:json)?/g, '').trim();
      const analysis: BehaviorAnalysis = JSON.parse(cleanedResponse);

      // Кешируем результат
      this.cache.set(cacheKey, analysis);

      return analysis;
    } catch (error) {
      console.error('Error analyzing message behavior:', error);

      // Fallback анализ
      return this.getFallbackAnalysis(message);
    }
  }

  // Анализ всей беседы
  async analyzeConversationBehavior(conversationHistory: ChatMessage[]): Promise<ConversationAnalysis> {
    try {
      const userMessages = conversationHistory.filter(msg => msg.role === 'user');

      if (userMessages.length === 0) {
        return this.getFallbackConversationAnalysis();
      }

      // Подготавливаем контекст беседы
      const conversationContext = userMessages
        .map((msg, index) => `Сообщение ${index + 1}: "${msg.content}"`)
        .join('\n');

      const prompt = `Проанализируй поведение кандидата на основе всей беседы.

ИСТОРИЯ БЕСЕДЫ:
${conversationContext}

СТАТИСТИКА:
- Всего сообщений: ${userMessages.length}
- Средняя длина сообщения: ${Math.round(userMessages.reduce((sum, msg) => sum + msg.content.length, 0) / userMessages.length)} символов
- Временной диапазон: ${userMessages.length > 1 ? 'множественные ответы' : 'один ответ'}

ЗАДАЧА:
Проанализируй кандидата по следующим аспектам:

1. ОБЩИЙ ЭМОЦИОНАЛЬНЫЙ ТОН (positive/neutral/negative)
2. СРЕДНЯЯ УВЕРЕННОСТЬ в ответах (0-100%)
3. ПОВЕДЕНЧЕСКИЕ ПАТТЕРНЫ (профессионализм, мотивация, адаптивность)
4. ЭМОЦИОНАЛЬНЫЕ ТРЕНДЫ (стабильность, изменения)
5. ОЦЕНКА МОТИВАЦИИ (высокая/средняя/низкая с обоснованием)
6. КАЧЕСТВО КОММУНИКАЦИИ (ясность, структура, вовлеченность)
7. КРАСНЫЕ ФЛАГИ (проблемы, требующие внимания)
8. ПОЛОЖИТЕЛЬНЫЕ ИНДИКАТОРЫ (сильные стороны)
9. ОБЛАСТИ РАЗВИТИЯ (потенциал для роста)
10. РЕКОМЕНДАЦИЯ ПО НАЙМУ (да/нет/условно с обоснованием)
11. ПОДРОБНАЯ ОБРАТНАЯ СВЯЗЬ (конструктивный анализ)

Верни результат в JSON формате:
{
  "overallSentiment": "positive|neutral|negative",
  "averageConfidence": 75,
  "behavioralPatterns": ["паттерн 1", "паттерн 2", "паттерн 3"],
  "emotionalTrends": ["тренд 1", "тренд 2"],
  "motivationAssessment": "подробная оценка мотивации",
  "communicationQuality": "оценка качества коммуникации",
  "redFlags": ["красный флаг 1", "красный флаг 2"],
  "positiveIndicators": ["положительный индикатор 1", "положительный индикатор 2"],
  "developmentAreas": ["область развития 1", "область развития 2"],
  "hiringRecommendation": "рекомендация по найму с обоснованием",
  "detailedFeedback": "подробный анализ кандидата"
}

Будь максимально объективным и предоставь конкретные примеры из беседы.`;

      const messages = [
        { role: 'system', content: prompt }
      ];

      const response = await this.callOpenAI(messages, 'gpt-4o');
      // Удаляем кодовые ограждения
      const cleanedConvResponse = response.replace(/```(?:json)?/g, '').trim();
      const analysis: ConversationAnalysis = JSON.parse(cleanedConvResponse);

      return analysis;
    } catch (error) {
      console.error('Error analyzing conversation behavior:', error);
      return this.getFallbackConversationAnalysis();
    }
  }

  // Анализ эмоционального состояния
  async analyzeEmotionalState(message: string): Promise<{
    primaryEmotion: string;
    intensity: number; // 0-100
    secondaryEmotions: string[];
    context: string;
    recommendations: string[];
  }> {
    try {
      const prompt = `Определи эмоциональное состояние кандидата на основе его сообщения.

СООБЩЕНИЕ: "${message}"

ЗАДАЧА:
1. Выяви основную эмоцию
2. Оцени интенсивность эмоции (0-100%)
3. Найди вторичные эмоции
4. Опиши контекст эмоции
5. Дай рекомендации по работе с кандидатом

Верни результат в JSON формате:
{
  "primaryEmotion": "радость|гнев|страх|грусть|удивление|отвращение|нейтрально",
  "intensity": 75,
  "secondaryEmotions": ["эмоция 1", "эмоция 2"],
  "context": "описание контекста эмоции",
  "recommendations": ["рекомендация 1", "рекомендация 2"]
}`;

      const messages = [
        { role: 'system', content: prompt }
      ];

      const response = await this.callOpenAI(messages, 'gpt-4o-mini');
      return JSON.parse(response);
    } catch (error) {
      console.error('Error analyzing emotional state:', error);
      return {
        primaryEmotion: 'нейтрально',
        intensity: 50,
        secondaryEmotions: [],
        context: 'Не удалось определить эмоциональное состояние',
        recommendations: ['Продолжить беседу для лучшего понимания']
      };
    }
  }

  // Оценка мотивации кандидата
  async assessMotivation(conversationHistory: ChatMessage[]): Promise<{
    motivationLevel: 'high' | 'medium' | 'low';
    indicators: string[];
    concerns: string[];
    recommendations: string[];
    detailedAssessment: string;
  }> {
    try {
      const userMessages = conversationHistory.filter(msg => msg.role === 'user');
      const conversationText = userMessages.map(msg => msg.content).join(' ');

      const prompt = `Оцени уровень мотивации кандидата на основе его ответов в беседе.

БЕСЕДА КАНДИДАТА:
"${conversationText}"

ЗАДАЧА:
Проанализируй мотивацию по следующим критериям:

1. Энтузиазм и энергия в ответах
2. Конкретность планов и целей
3. Готовность к вызовам и изменениям
4. Интерес к компании и роли
5. Самомотивация и инициативность
6. Долгосрочные перспективы

Верни результат в JSON формате:
{
  "motivationLevel": "high|medium|low",
  "indicators": ["индикатор мотивации 1", "индикатор мотивации 2"],
  "concerns": ["потенциальная проблема 1", "потенциальная проблема 2"],
  "recommendations": ["рекомендация 1", "рекомендация 2"],
  "detailedAssessment": "подробная оценка мотивации кандидата"
}`;

      const messages = [
        { role: 'system', content: prompt }
      ];

      const response = await this.callOpenAI(messages, 'gpt-4o-mini');
      return JSON.parse(response);
    } catch (error) {
      console.error('Error assessing motivation:', error);
      return {
        motivationLevel: 'medium',
        indicators: ['Нейтральные ответы'],
        concerns: [],
        recommendations: ['Продолжить оценку мотивации'],
        detailedAssessment: 'Недостаточно данных для оценки мотивации'
      };
    }
  }

  // Очистить кеш
  clearCache(): void {
    this.cache.clear();
  }

  // Вызов OpenAI API
  private async callOpenAI(messages: any[], model: string = 'gpt-4o-mini'): Promise<string> {
    const response = await fetch(API_CONFIG.openaiURL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: 1500,
        temperature: 0.3, // Более детерминированные результаты для анализа
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || 'Ошибка получения ответа';
  }

  // Fallback анализ для отдельного сообщения
  private getFallbackAnalysis(message: string): BehaviorAnalysis {
    const lowerMessage = message.toLowerCase();

    let sentiment: 'positive' | 'neutral' | 'negative' = 'neutral';
    let confidence = 50;
    const behavioralMarkers: string[] = [];
    let emotionalState = 'спокойное';
    let motivationLevel: 'high' | 'medium' | 'low' = 'medium';
    let communicationStyle = 'нейтральный';
    const concerns: string[] = [];
    const strengths: string[] = [];
    const recommendations: string[] = [];

    // Простой анализ на основе ключевых слов
    if (lowerMessage.includes('!') || lowerMessage.includes('отлично') || lowerMessage.includes('замечательно')) {
      sentiment = 'positive';
      confidence = 70;
      emotionalState = 'восторженное';
      behavioralMarkers.push('энтузиазм');
      strengths.push('положительное отношение');
    } else if (lowerMessage.includes('плохо') || lowerMessage.includes('ужасно') || lowerMessage.length < 10) {
      sentiment = 'negative';
      confidence = 60;
      emotionalState = 'негативное';
      concerns.push('негативный тон');
      recommendations.push('улучшить эмоциональный фон');
    }

    if (message.split(' ').length > 10) {
      behavioralMarkers.push('подробные ответы');
      strengths.push('коммуникативность');
    }

    return {
      sentiment,
      confidence,
      behavioralMarkers,
      emotionalState,
      motivationLevel,
      communicationStyle,
      concerns,
      strengths,
      recommendations
    };
  }

  // Fallback анализ для беседы
  private getFallbackConversationAnalysis(): ConversationAnalysis {
    return {
      overallSentiment: 'neutral',
      averageConfidence: 50,
      behavioralPatterns: ['стандартное поведение'],
      emotionalTrends: ['стабильное эмоциональное состояние'],
      motivationAssessment: 'Средний уровень мотивации - требует дополнительной оценки',
      communicationQuality: 'Адекватное качество коммуникации',
      redFlags: [],
      positiveIndicators: ['Участвует в беседе'],
      developmentAreas: ['Требуется более детальный анализ'],
      hiringRecommendation: 'Требуется дополнительная оценка',
      detailedFeedback: 'Недостаточно данных для полного анализа поведения кандидата'
    };
  }
}

export default BehaviorAnalysisService;
export type { BehaviorAnalysis, ConversationAnalysis };

