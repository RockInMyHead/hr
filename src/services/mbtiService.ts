import { API_CONFIG } from '../config/api';
import type { MBTIProfile } from '../types/extended-profile';
import { getMBTITypeDescription } from '../types/extended-profile';

interface MBTIChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

interface MBTIConversationContext {
  conversationHistory: MBTIChatMessage[];
  personalityScores: Record<string, number>;
  currentPhase: 'intro' | 'questioning' | 'analysis' | 'completed';
  questionCount: number;
}

interface MBTIAnalysis {
  type: string;
  dimensions: {
    extraversion: number;
    sensing: number;
    thinking: number;
    judging: number;
  };
  confidence: number;
  reasoning: string;
}

class MBTIService {
  private conversationContext: MBTIConversationContext;

  constructor() {
    this.conversationContext = this.initializeContext();
  }

  private initializeContext(): MBTIConversationContext {
    return {
      conversationHistory: [],
      personalityScores: {
        E: 0, I: 0,
        S: 0, N: 0,
        T: 0, F: 0,
        J: 0, P: 0
      },
      currentPhase: 'intro',
      questionCount: 0
    };
  }

  // Системный промпт для MBTI анализа
  private getSystemPrompt(phase: string): string {
    const basePrompt = `Ты - опытный психолог, специализирующийся на тестировании личности по методике MBTI.
Ваш стиль: дружелюбный, профессиональный, эмпатичный.

Текущая фаза: ${phase}

Правила общения:
1. Общайся естественно и дружелюбно
2. Задавай открытые вопросы для выявления предпочтений
3. Анализируй каждую реплику на предмет MBTI индикаторов
4. Переходи к следующему вопросу логично
5. Поддерживай позитивную атмосферу

MBTI индикаторы для анализа:
Экстраверсия (E) vs Интроверсия (I):
- E: любит общаться, черпает энергию от людей, предпочитает групповую работу
- I: предпочитает уединение, работает лучше в одиночку, нуждается во времени для размышлений

Сенсорика (S) vs Интуиция (N):
- S: практичный, фокусируется на фактах, деталях, настоящем
- N: творческий, видит возможности, будущее, абстрактные концепции

Мышление (T) vs Чувства (F):
- T: логичный, объективный, ценит справедливость
- F: эмпатичный, ценит гармонию, учитывает чувства других

Суждение (J) vs Восприятие (P):
- J: организованный, планирует заранее, предпочитает структуру
- P: гибкий, спонтанный, адаптируется к изменениям

История беседы:
${this.conversationContext.conversationHistory.map(msg =>
  `${msg.role}: ${msg.content}`
).join('\n')}`;

    return basePrompt;
  }

  // Получить ответ AI на основе фазы беседы
  async getChatResponse(userMessage: string, phase: 'intro' | 'questioning' | 'analysis'): Promise<string> {
    try {
      // Добавляем сообщение пользователя в историю
      this.conversationContext.conversationHistory.push({
        role: 'user',
        content: userMessage,
        timestamp: Date.now()
      });

      // Определяем промпт в зависимости от фазы
      let systemPrompt = this.getSystemPrompt(phase);

      if (phase === 'intro') {
        systemPrompt += `

ФАЗА ВВЕДЕНИЯ:
Начни с приветствия и объяснения, что мы будем беседовать о предпочтениях в работе и жизни.
Спроси первый открытый вопрос о работе или хобби.`;
      } else if (phase === 'questioning') {
        systemPrompt += `

ФАЗА ОПРОСА:
Продолжай разговор естественно. Задавай уточняющие вопросы на основе ответов пользователя.
Анализируй каждую реплику на предмет признаков MBTI типов.
После 6-8 обменов репликами переходи к анализу.`;
      } else if (phase === 'analysis') {
        systemPrompt += `

ФАЗА АНАЛИЗА:
Проанализируй всю беседу и определи наиболее подходящий тип MBTI.
Учитывай:
- Количество указаний на каждый тип
- Контекст ответов
- Противоречия и нюансы

Дай краткий анализ типа личности и рекомендации.`;
      }

      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ];

      const response = await this.callOpenAI(messages, 'gpt-4o-mini');
      this.conversationContext.questionCount++;

      // Добавляем ответ AI в историю
      this.conversationContext.conversationHistory.push({
        role: 'assistant',
        content: response,
        timestamp: Date.now()
      });

      return response;
    } catch (error) {
      console.error('MBTI Chat error:', error);
      return 'Извините, произошла ошибка. Можете повторить ваш ответ?';
    }
  }

  // Анализ беседы для определения MBTI типа
  async analyzeConversation(): Promise<MBTIAnalysis> {
    try {
      const analysisPrompt = `Проанализируй эту беседу и определи тип личности по MBTI:

Беседа:
${this.conversationContext.conversationHistory.map(msg =>
  `${msg.role}: ${msg.content}`
).join('\n')}

Требуется определить:
1. Тип MBTI (4 буквы)
2. Процентные значения для каждой шкалы (0-100):
   - Экстраверсия (E) vs Интроверсия (I)
   - Сенсорика (S) vs Интуиция (N)
   - Мышление (T) vs Чувства (F)
   - Суждение (J) vs Восприятие (P)
3. Уровень уверенности в определении (0-100%)
4. Обоснование выбора типа

Верни результат в JSON формате:
{
  "type": "ENFP",
  "dimensions": {
    "extraversion": 75,
    "sensing": 30,
    "thinking": 40,
    "judging": 25
  },
  "confidence": 85,
  "reasoning": "Обоснование..."
}`;

      const messages = [
        { role: 'system', content: analysisPrompt }
      ];

      const response = await this.callOpenAI(messages, 'gpt-4o');
      const analysis: MBTIAnalysis = JSON.parse(response);

      return analysis;
    } catch (error) {
      console.error('MBTI Analysis error:', error);
      // Возвращаем дефолтный анализ
      return {
        type: 'ENFP',
        dimensions: {
          extraversion: 65,
          sensing: 40,
          thinking: 45,
          judging: 30
        },
        confidence: 50,
        reasoning: 'Анализ на основе доступных данных'
      };
    }
  }

  // Создание полного профиля MBTI
  async generateMBTIProfile(): Promise<MBTIProfile> {
    const analysis = await this.analyzeConversation();

    const mbtiType = analysis.type;
    const typeData = await getMBTITypeDescription(mbtiType as any);

    return {
      type: mbtiType,
      dimensions: analysis.dimensions,
      strengths: typeData.strengths,
      developmentAreas: typeData.challenges,
      workPreferences: ['Творческая работа', 'Работа с людьми', 'Гибкий график', 'Новые вызовы'],
      communicationStyle: typeData.workStyle,
      teamRole: 'Генератор идей и мотиватор команды',
      stressFactors: ['Рутина', 'Жесткие рамки', 'Отсутствие творчества'],
      motivators: typeData.motivators || ['Творческая свобода', 'Взаимодействие с людьми', 'Новые возможности']
    };
  }

  // Вызов OpenAI API
  private async callOpenAI(messages: MBTIChatMessage[], model: string = 'gpt-4o-mini'): Promise<string> {
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

  // Сброс контекста беседы
  resetConversation(): void {
    this.conversationContext = this.initializeContext();
  }

  // Генерация рабочих предпочтений для типа MBTI
  async generateWorkPreferences(mbtiType: string): Promise<string[]> {
    try {
      const prompt = `На основе типа личности MBTI ${mbtiType} сгенерируй 4 наиболее подходящих рабочих предпочтения.
Верни результат в формате JSON массива строк.

Примеры предпочтений для разных типов:
- INTJ: Автономная работа, Стратегическое планирование, Сложные проблемы, Долгосрочные цели
- ENFP: Творческие проекты, Командная работа, Разнообразие задач, Взаимодействие с людьми
- ISTJ: Четкие процедуры, Стабильная среда, Детальная работа, Ответственные задачи

Верни только JSON массив без дополнительных объяснений.`;

      const messages = [
        { role: 'system', content: prompt }
      ];

      const response = await this.callOpenAI(messages, 'gpt-4o-mini');
      const preferences = JSON.parse(response);

      return Array.isArray(preferences) ? preferences : ['Сбалансированная рабочая среда', 'Четкие цели', 'Обратная связь'];
    } catch (error) {
      console.error('Error generating work preferences:', error);
      return ['Сбалансированная рабочая среда', 'Четкие цели', 'Обратная связь'];
    }
  }

  // Генерация роли в команде
  async generateTeamRole(mbtiType: string): Promise<string> {
    try {
      const prompt = `На основе типа личности MBTI ${mbtiType} опиши наиболее подходящую роль в команде одним кратким предложением.

Примеры:
- INTJ: Стратег и аналитик
- ENFP: Генератор идей и мотиватор
- ISTJ: Исполнитель и координатор

Верни только краткое описание роли без дополнительных объяснений.`;

      const messages = [
        { role: 'system', content: prompt }
      ];

      const response = await this.callOpenAI(messages, 'gpt-4o-mini');
      return response.trim();
    } catch (error) {
      console.error('Error generating team role:', error);
      return 'Универсальный участник команды';
    }
  }

  // Генерация факторов стресса
  async generateStressFactors(mbtiType: string): Promise<string[]> {
    try {
      const prompt = `На основе типа личности MBTI ${mbtiType} сгенерируй 3 основных фактора, которые могут вызывать стресс у этого типа.
Верни результат в формате JSON массива строк.

Примеры факторов для разных типов:
- INTJ: Микроменеджмент, Неэффективные процессы, Частые перерывания
- ENFP: Рутинная работа, Жесткие ограничения, Изоляция от людей
- ISTJ: Постоянные изменения, Неопределенность, Хаотичная среда

Верни только JSON массив без дополнительных объяснений.`;

      const messages = [
        { role: 'system', content: prompt }
      ];

      const response = await this.callOpenAI(messages, 'gpt-4o-mini');
      const factors = JSON.parse(response);

      return Array.isArray(factors) ? factors : ['Неопределенность', 'Конфликты', 'Перегрузка'];
    } catch (error) {
      console.error('Error generating stress factors:', error);
      return ['Неопределенность', 'Конфликты', 'Перегрузка'];
    }
  }

  // Генерация мотиваторов
  async generateMotivators(mbtiType: string): Promise<string[]> {
    try {
      const prompt = `На основе типа личности MBTI ${mbtiType} сгенерируй 3 основных мотиватора, которые помогают этому типу эффективно работать.
Верни результат в формате JSON массива строк.

Примеры мотиваторов для разных типов:
- INTJ: Автономия, Интеллектуальные вызовы, Долгосрочное влияние
- ENFP: Признание, Творческая свобода, Развитие людей
- ISTJ: Стабильность, Признание надежности, Четкие стандарты

Верни только JSON массив без дополнительных объяснений.`;

      const messages = [
        { role: 'system', content: prompt }
      ];

      const response = await this.callOpenAI(messages, 'gpt-4o-mini');
      const motivators = JSON.parse(response);

      return Array.isArray(motivators) ? motivators : ['Достижение целей', 'Обратная связь', 'Развитие'];
    } catch (error) {
      console.error('Error generating motivators:', error);
      return ['Достижение целей', 'Обратная связь', 'Развитие'];
    }
  }

  // Получение истории беседы
  getConversationHistory(): MBTIChatMessage[] {
    return [...this.conversationContext.conversationHistory];
  }

  // Получение текущего контекста
  getCurrentContext(): MBTIConversationContext {
    return { ...this.conversationContext };
  }
}

export default MBTIService;
export type { MBTIChatMessage, MBTIConversationContext, MBTIAnalysis };
