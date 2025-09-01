import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Brain,
  ArrowLeft,
  Send,
  Bot,
  User,
  CheckCircle,
  Users,
  Lightbulb,
  Heart,
  Target,
  Eye,
  MessageSquare,
  Sparkles,
  Clock,
  AlertTriangle
} from 'lucide-react';
import type { AppUser } from '@/types/profile';
import type { MBTIProfile, MBTI_TYPES } from '@/types/extended-profile';

interface MBTIChatTestProps {
  user: AppUser;
  onBack: () => void;
  onComplete?: (profile: MBTIProfile) => void;
}

interface ChatMessage {
  id: string;
  role: 'ai' | 'user';
  content: string;
  timestamp: Date;
  analysis?: MessageAnalysis;
}

interface MessageAnalysis {
  keywords: string[];
  personalityIndicators: Record<string, number>;
  confidence: number;
  category: 'EI' | 'SN' | 'TF' | 'JP';
}

interface ChatSession {
  id: string;
  userId: string;
  status: 'intro' | 'questioning' | 'analysis' | 'completed';
  currentPhase: number;
  totalPhases: number;
  messages: ChatMessage[];
  analysis: {
    personalityScores: Record<string, number>;
    confidence: number;
    keyInsights: string[];
  };
  mbtiResult?: MBTIProfile;
}

// Система промптов для ChatGPT
const MBTI_SYSTEM_PROMPTS = {
  intro: `Вы - опытный психолог, специализирующийся на тестировании личности по методике MBTI.
Ваш стиль: дружелюбный, профессиональный, эмпатичный.
Цель: провести естественный разговор для определения типа личности.

Начните с приветствия и объяснения, что мы будем беседовать о предпочтениях в работе и жизни.
Спросите первый открытый вопрос о работе или хобби.`,
  questioning: `Продолжайте разговор естественно. Задавайте уточняющие вопросы на основе ответов пользователя.
Анализируйте каждую реплику на предмет признаков MBTI типов:

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

Задавайте вопросы, которые помогут выявить эти предпочтения. После 8-10 обменов репликами переходите к анализу.`,
  analysis: `Проанализируйте всю беседу и определите тип MBTI. Учитывайте:
- Количество указаний на каждый тип
- Контекст ответов
- Противоречия и нюансы

Определите наиболее подходящий 4-буквенный тип и объясните почему.
Дайте рекомендации по работе и развитию.`
};

export function MBTIChatTest({ user, onBack, onComplete }: MBTIChatTestProps) {
  const [session, setSession] = useState<ChatSession | null>(null);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Инициализация сессии
  useEffect(() => {
    const newSession: ChatSession = {
      id: `mbti-${Date.now()}`,
      userId: user.email || user.name,
      status: 'intro',
      currentPhase: 1,
      totalPhases: 10,
      messages: [],
      analysis: {
        personalityScores: {
          E: 0, I: 0,
          S: 0, N: 0,
          T: 0, F: 0,
          J: 0, P: 0
        },
        confidence: 0,
        keyInsights: []
      }
    };

    setSession(newSession);

    // Стартовое сообщение от AI
    setTimeout(() => {
      addAIMessage("Привет! 👋 Я помогу определить ваш тип личности по методике MBTI. Это поможет лучше понять ваши предпочтения в работе и жизни.\n\nРасскажите немного о себе: чем вы занимаетесь, какие у вас интересы или хобби? Я задам несколько вопросов, чтобы лучше вас узнать.");
    }, 1000);
  }, [user]);

  // Автопрокрутка к последнему сообщению
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [session?.messages]);

  // Симуляция ответа ChatGPT
  const simulateChatGPTResponse = async (userMessage: string, phase: number): Promise<string> => {
    await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 2000));

    const responses = {
      1: `Спасибо за рассказ! ${userMessage.length > 50 ? 'Вы довольно подробно описали свои интересы.' : 'Интересные детали!'}

Теперь давайте поговорим о работе. Расскажите, как вы обычно работаете над проектами - предпочитаете работать в команде или самостоятельно? Что вам больше нравится в рабочем процессе?`,

      2: `Отличный ответ! Теперь я понимаю ваш подход к работе.

Следующий вопрос: когда вам нужно принять важное решение, вы обычно:
• Обсуждаете варианты с коллегами или друзьями?
• Или предпочитаете сначала все обдумать самостоятельно?

Расскажите о каком-то конкретном случае из вашей жизни.`,

      3: `Спасибо, это очень показательный пример! 

Давайте поговорим о вашем отношении к деталям. Вы больше любите:
• Работа с конкретными фактами, инструкциями и проверенными методами?
• Или предпочитаете творческий подход, поиск новых возможностей и идей?

Приведите пример из вашей работы или учебы.`,

      4: `Интересный подход! 

А теперь вопрос о планировании: как вы относитесь к дедлайнам и планированию?
• Вам комфортнее, когда все четко спланировано и структурировано?
• Или вы предпочитаете гибкость и возможность адаптироваться к изменениям?

Расскажите о вашем опыте.`,

      5: `Понятно! Теперь давайте поговорим о том, как вы общаетесь с другими.

В конфликтных ситуациях или при обсуждении сложных тем вы обычно:
• Фокусируетесь на логике, фактах и объективных аргументах?
• Или учитываете чувства других людей и стараетесь сохранить гармонию?

Приведите пример.`,

      6: `Отличный пример! Теперь последний блок вопросов.

Как вы проводите свое свободное время после работы?
• Предпочитаете активное общение с людьми, вечеринки, мероприятия?
• Или отдыхаете в одиночестве, читаете, занимаетесь хобби наедине?

Расскажите подробнее.`,

      7: `Спасибо! Еще один вопрос: когда вы узнаете что-то новое, вам легче:
• Осваивать практические навыки, работать с конкретными инструментами?
• Или понимать теоретические концепции, видеть связи между идеями?

Приведите пример из недавнего опыта.`,

      8: `Прекрасно! Теперь у меня достаточно информации для анализа.

Дайте мне минутку, чтобы проанализировать нашу беседу и определить ваш тип личности по MBTI...`,

      9: `Анализ завершен! 

На основе нашей беседы, я определил ваш тип личности:

**ENFP - "Вдохновитель"**

Почему этот тип?
• Вы показали высокую экстраверсию в общении и работе с людьми
• Ваши ответы демонстрируют развитую интуицию и интерес к возможностям
• Вы цените чувства и гармонию в отношениях
• Предпочитаете гибкость и адаптивность в работе

Это предварительный анализ. Для более точного определения рекомендую пройти полный тест MBTI.`,

      10: `Спасибо за интересную беседу! 

Ваш тип ENFP говорит о том, что вы:
• Творческий и вдохновляющий лидер
• Любите работать с людьми и помогать им развиваться
• Хорошо видите возможности и будущее
• Цените гармонию в отношениях

В работе вам подойдут роли, где можно:
• Генерировать новые идеи
• Вдохновлять команду
• Работать с людьми
• Иметь творческую свободу`
    };

    return responses[phase as keyof typeof responses] || responses[1];
  };

  // Добавление сообщения от AI
  const addAIMessage = (content: string) => {
    if (!session) return;

    const aiMessage: ChatMessage = {
      id: `ai-${Date.now()}`,
      role: 'ai',
      content,
      timestamp: new Date()
    };

    setSession(prev => prev ? {
      ...prev,
      messages: [...prev.messages, aiMessage]
    } : null);
  };

  // Отправка сообщения пользователя
  const sendMessage = async () => {
    if (!currentMessage.trim() || !session) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: currentMessage,
      timestamp: new Date()
    };

    // Добавляем сообщение пользователя
    setSession(prev => prev ? {
      ...prev,
      messages: [...prev.messages, userMessage]
    } : null);

    setCurrentMessage('');
    setIsTyping(true);

    // Получаем ответ от "ChatGPT"
    const aiResponse = await simulateChatGPTResponse(currentMessage, session.currentPhase);

    setIsTyping(false);

    // Добавляем ответ AI
    const aiMessage: ChatMessage = {
      id: `ai-${Date.now()}`,
      role: 'ai',
      content: aiResponse,
      timestamp: new Date()
    };

    // Обновляем сессию
    setSession(prev => {
      if (!prev) return null;

      const newPhase = prev.currentPhase < prev.totalPhases ? prev.currentPhase + 1 : prev.currentPhase;
      const newStatus = newPhase >= prev.totalPhases ? 'analysis' : prev.status;

      return {
        ...prev,
        currentPhase: newPhase,
        status: newStatus,
        messages: [...prev.messages, aiMessage]
      };
    });
  };

  // Завершение анализа
  const completeAnalysis = () => {
    if (!session) return;

    // Создаем профиль на основе анализа
    const personalityScores = {
      E: 65, I: 35,
      S: 40, N: 60,
      T: 45, F: 55,
      J: 30, P: 70
    };

    const mbtiType = 'ENFP' as keyof typeof MBTI_TYPES;

    const profile: MBTIProfile = {
      type: mbtiType,
      dimensions: {
        extraversion: personalityScores.E,
        sensing: personalityScores.S,
        thinking: personalityScores.T,
        judging: personalityScores.J
      },
      strengths: MBTI_TYPES[mbtiType]?.strengths || ['Творческий подход', 'Эмпатия', 'Генерация идей'],
      developmentAreas: MBTI_TYPES[mbtiType]?.challenges || ['Организованность', 'Детализация', 'Дисциплина'],
      workPreferences: ['Творческая работа', 'Работа с людьми', 'Гибкий график', 'Новые вызовы'],
      communicationStyle: 'Вдохновляющий и эмпатичный',
      teamRole: 'Генератор идей и мотиватор команды',
      stressFactors: ['Рутина', 'Жесткие рамки', 'Отсутствие творчества'],
      motivators: ['Творческая свобода', 'Взаимодействие с людьми', 'Новые возможности']
    };

    setSession(prev => prev ? {
      ...prev,
      status: 'completed',
      mbtiResult: profile
    } : null);

    if (onComplete) {
      onComplete(profile);
    }
  };

  if (!session) {
    return <div>Загрузка...</div>;
  }

  const progress = (session.currentPhase / session.totalPhases) * 100;

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Заголовок */}
        <div className="flex items-center justify-between bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-4 md:p-8 shadow-2xl">
          <div className="flex items-center gap-3">
            <Button onClick={onBack} variant="outline" size="sm" className="bg-white/5 border-white/10 text-white hover:bg-white/10">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Назад
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-white">MBTI Чат-тест</h1>
              <p className="text-gray-400 text-sm">Общение с ИИ для определения типа личности</p>
            </div>
          </div>
          <Badge className="bg-purple-600 text-white">
            <Brain className="h-4 w-4 mr-1" />
            {Math.round(progress)}%
          </Badge>
        </div>

        {/* Прогресс */}
        <Card className="bg-white/5 border-white/10 text-white">
          <CardContent className="p-6">
            <div className="flex justify-between text-sm text-gray-400 mb-2">
              <span>Фаза {session.currentPhase} из {session.totalPhases}</span>
              <span>{session.messages.filter(m => m.role === 'user').length} вопросов пройдено</span>
            </div>
            <Progress value={progress} className="h-2" />
          </CardContent>
        </Card>

        {/* Чат */}
        <Card className="bg-white/5 border-white/10 text-white h-[600px] flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Беседа с психологом
            </CardTitle>
            <CardDescription className="text-gray-400">
              Отвечайте естественно - это поможет точно определить ваш тип личности
            </CardDescription>
          </CardHeader>

          <CardContent className="flex-1 overflow-y-auto space-y-4 p-4">
            {session.messages.map((message) => (
              <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-4 rounded-xl ${
                  message.role === 'user'
                    ? 'bg-purple-600 text-white ml-4'
                    : 'bg-white/10 text-white mr-4'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    {message.role === 'ai' ? (
                      <Bot className="h-4 w-4 text-purple-400" />
                    ) : (
                      <User className="h-4 w-4 text-blue-400" />
                    )}
                    <span className="text-sm font-medium">
                      {message.role === 'ai' ? 'Психолог' : 'Вы'}
                    </span>
                    <span className="text-xs text-gray-400">
                      {message.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="whitespace-pre-wrap">
                    {message.content}
                  </div>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white/10 text-white p-4 rounded-xl mr-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Bot className="h-4 w-4 text-purple-400" />
                    <span className="text-sm font-medium">Психолог</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </CardContent>

          {/* Ввод сообщения */}
          {session.status !== 'completed' && (
            <div className="p-4 border-t border-white/10">
              <div className="flex gap-3">
                <Textarea
                  placeholder="Введите ваш ответ..."
                  value={currentMessage}
                  onChange={(e) => setCurrentMessage(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  className="bg-white/5 border-white/10 text-white placeholder:text-gray-400 flex-1"
                  rows={2}
                  disabled={isTyping}
                />
                <Button
                  onClick={sendMessage}
                  disabled={!currentMessage.trim() || isTyping}
                  className="bg-purple-600 hover:bg-purple-700 px-6"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <div className="text-xs text-gray-400 mt-2">
                Нажмите Enter для отправки • Shift+Enter для новой строки
              </div>
            </div>
          )}
        </Card>

        {/* Завершение анализа */}
        {session.status === 'analysis' && !session.mbtiResult && (
          <Card className="bg-white/5 border-white/10 text-white text-center">
            <CardContent className="p-8">
              <Sparkles className="h-16 w-16 text-purple-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Анализ завершен!</h2>
              <p className="text-gray-400 mb-6">
                На основе нашей беседы я определил ваш тип личности по методике MBTI.
              </p>
              <Button onClick={completeAnalysis} className="bg-purple-600 hover:bg-purple-700">
                Показать результаты
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Результаты */}
        {session.status === 'completed' && session.mbtiResult && (
          <div className="space-y-6">
            {/* Заголовок результатов */}
            <div className="text-center bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Brain className="h-10 w-10 text-white" />
              </div>
              <h1 className="text-4xl font-bold text-white mb-2">Ваш тип личности</h1>
              <div className="text-6xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent mb-2">
                {session.mbtiResult.type}
              </div>
              <p className="text-xl text-gray-300">
                {MBTI_TYPES[session.mbtiResult.type]?.name || 'Уникальная личность'}
              </p>
              <p className="text-gray-400 mt-2">
                {MBTI_TYPES[session.mbtiResult.type]?.description || 'Индивидуальная комбинация качеств'}
              </p>
            </div>

            {/* Измерения */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-white/5 border-white/10 text-white">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Источник энергии
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Интроверсия</span>
                      <span>Экстраверсия</span>
                    </div>
                    <Progress value={session.mbtiResult.dimensions.extraversion} className="h-3" />
                    <p className="text-center text-sm text-gray-400">
                      {session.mbtiResult.dimensions.extraversion}% экстраверсия
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/5 border-white/10 text-white">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="h-5 w-5" />
                    Восприятие информации
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Интуиция</span>
                      <span>Сенсорика</span>
                    </div>
                    <Progress value={session.mbtiResult.dimensions.sensing} className="h-3" />
                    <p className="text-center text-sm text-gray-400">
                      {session.mbtiResult.dimensions.sensing}% сенсорика
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/5 border-white/10 text-white">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5" />
                    Принятие решений
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Чувства</span>
                      <span>Мышление</span>
                    </div>
                    <Progress value={session.mbtiResult.dimensions.thinking} className="h-3" />
                    <p className="text-center text-sm text-gray-400">
                      {session.mbtiResult.dimensions.thinking}% мышление
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/5 border-white/10 text-white">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Образ жизни
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Восприятие</span>
                      <span>Суждение</span>
                    </div>
                    <Progress value={session.mbtiResult.dimensions.judging} className="h-3" />
                    <p className="text-center text-sm text-gray-400">
                      {session.mbtiResult.dimensions.judging}% суждение
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Детальные результаты */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-white/5 border-white/10 text-white">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    Сильные стороны
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {session.mbtiResult.strengths.map((strength, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="h-2 w-2 bg-green-500 rounded-full" />
                        <span className="text-sm">{strength}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/5 border-white/10 text-white">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 text-orange-500" />
                    Области развития
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {session.mbtiResult.developmentAreas.map((area, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="h-2 w-2 bg-orange-500 rounded-full" />
                        <span className="text-sm">{area}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/5 border-white/10 text-white">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Heart className="h-5 w-5 text-pink-500" />
                    Мотиваторы
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {session.mbtiResult.motivators.map((motivator, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="h-2 w-2 bg-pink-500 rounded-full" />
                        <span className="text-sm">{motivator}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/5 border-white/10 text-white">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-blue-500" />
                    Рабочие предпочтения
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {session.mbtiResult.workPreferences.map((preference, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="h-2 w-2 bg-blue-500 rounded-full" />
                        <span className="text-sm">{preference}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Кнопки действий */}
            <div className="flex justify-center gap-4">
              <Button onClick={onBack} variant="outline" className="bg-white/5 border-white/10 text-white hover:bg-white/10">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Назад в профиль
              </Button>
              <Button
                onClick={() => window.print()}
                className="bg-purple-600 hover:bg-purple-700"
              >
                Сохранить результат
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
