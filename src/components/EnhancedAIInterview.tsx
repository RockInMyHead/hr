import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Bot, 
  User, 
  Send, 
  Mic, 
  ArrowLeft,
  Brain,
  Target,
  CheckCircle,
  Clock,
  FileText,
  TrendingUp,
  Award,
  AlertTriangle,
  Lightbulb
} from 'lucide-react';
import { VoiceInput } from './VoiceInput';
import type { AppUser } from '@/types/profile';
import type { ExtendedEmployeeProfile, CandidateProfile } from '@/types/extended-profile';
import { STANDARD_COMPETENCIES } from '@/types/competencies';

interface EnhancedAIInterviewProps {
  user: AppUser;
  onBack: () => void;
  onComplete?: (profile: CandidateProfile) => void;
}

interface InterviewMessage {
  id: string;
  role: 'ai' | 'user';
  content: string;
  timestamp: Date;
  audioUrl?: string;
  analysis?: MessageAnalysis;
  questionType?: 'intro' | 'technical' | 'behavioral' | 'situational' | 'final';
}

interface MessageAnalysis {
  keywords: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
  confidence: number;
  competencyIndicators: Record<string, number>;
  experienceLevel: number; // 1-5
  communicationQuality: number; // 1-5
  technicalDepth: number; // 1-5
}

interface InterviewSession {
  id: string;
  candidateId: string;
  status: 'intro' | 'technical' | 'behavioral' | 'situational' | 'analysis' | 'completed';
  currentPhase: number;
  totalPhases: number;
  startTime: Date;
  endTime?: Date;
  messages: InterviewMessage[];
  cumulativeAnalysis: {
    overallScore: number;
    competencyScores: Record<string, number>;
    strengths: string[];
    weaknesses: string[];
    keyInsights: string[];
  };
  generatedProfile?: CandidateProfile;
}

interface QuestionTemplate {
  phase: string;
  questions: Array<{
    id: string;
    text: string;
    type: 'open' | 'behavioral' | 'technical' | 'situational';
    competency?: string;
    followUp?: string[];
  }>;
}

// Шаблоны вопросов для интервью
const INTERVIEW_TEMPLATES: QuestionTemplate[] = [
  {
    phase: 'intro',
    questions: [
      {
        id: 'intro_1',
        text: 'Расскажите о себе: ваше образование, опыт работы и ключевые достижения.',
        type: 'open',
        followUp: ['Какой проект считаете наиболее значимым?', 'Что мотивировало выбрать эту сферу?']
      },
      {
        id: 'intro_2', 
        text: 'Какими навыками и технологиями вы владеете? Оцените свой уровень по каждому.',
        type: 'technical',
        followUp: ['Какие технологии изучаете сейчас?', 'Какой навык хотели бы развить в первую очередь?']
      }
    ]
  },
  {
    phase: 'technical',
    questions: [
      {
        id: 'tech_1',
        text: 'Опишите самую сложную техническую задачу, которую вам приходилось решать. Какой подход использовали?',
        type: 'technical',
        competency: 'productivity',
        followUp: ['Как оценивали альтернативные решения?', 'Что бы сделали по-другому?']
      },
      {
        id: 'tech_2',
        text: 'Как вы подходите к изучению новых технологий или инструментов?',
        type: 'behavioral',
        competency: 'initiative',
        followUp: ['Можете привести конкретный пример?', 'Как делитесь знаниями с командой?']
      }
    ]
  },
  {
    phase: 'behavioral',
    questions: [
      {
        id: 'behav_1',
        text: 'Расскажите о ситуации, когда вам пришлось работать в команде под давлением времени. Как организовали работу?',
        type: 'behavioral',
        competency: 'leadership',
        followUp: ['Как распределяли ответственность?', 'Как мотивировали команду?']
      },
      {
        id: 'behav_2',
        text: 'Опишите конфликтную ситуацию на работе и как вы её разрешили.',
        type: 'behavioral',
        competency: 'communication',
        followUp: ['Что помогло найти компромисс?', 'Как избежать подобных ситуаций?']
      },
      {
        id: 'behav_3',
        text: 'Когда в последний раз вы проявили инициативу для улучшения рабочих процессов?',
        type: 'behavioral',
        competency: 'initiative',
        followUp: ['Какой результат получили?', 'Как коллеги отреагировали на изменения?']
      }
    ]
  },
  {
    phase: 'situational',
    questions: [
      {
        id: 'sit_1',
        text: 'Представьте: вы получили задачу с нечёткими требованиями и сжатыми сроками. Ваши действия?',
        type: 'situational',
        competency: 'reliability',
        followUp: ['Как приоритизируете требования?', 'К кому обратитесь за помощью?']
      },
      {
        id: 'sit_2',
        text: 'Как бы вы поступили, если заметили, что коллега делает ошибки, которые влияют на общий результат?',
        type: 'situational',
        competency: 'communication',
        followUp: ['Как построите разговор?', 'Что если коллега не согласен?']
      }
    ]
  }
];

export function EnhancedAIInterview({ user, onBack, onComplete }: EnhancedAIInterviewProps) {
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [useVoice, setUseVoice] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showAnalysis, setShowAnalysis] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Инициализация сессии
  useEffect(() => {
    initializeSession();
  }, []);

  // Автоскролл к последнему сообщению
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [session?.messages]);

  // Инициализация новой сессии интервью
  const initializeSession = () => {
    const newSession: InterviewSession = {
      id: Date.now().toString(),
      candidateId: user.email || user.name,
      status: 'intro',
      currentPhase: 0,
      totalPhases: INTERVIEW_TEMPLATES.length,
      startTime: new Date(),
      messages: [],
      cumulativeAnalysis: {
        overallScore: 0,
        competencyScores: {},
        strengths: [],
        weaknesses: [],
        keyInsights: []
      }
    };

    setSession(newSession);
    
    // Добавляем приветственное сообщение
    const welcomeMessage = generateWelcomeMessage();
    addAIMessage(newSession.id, welcomeMessage, 'intro');
  };

  // Генерация приветственного сообщения
  const generateWelcomeMessage = (): string => {
    return `Добро пожаловать на ИИ-интервью! Я проведу с вами структурированное собеседование для составления вашего профессионального профиля.

Интервью состоит из 4 этапов:
1. 🎯 Знакомство и общая информация
2. 🔧 Технические компетенции 
3. 🤝 Поведенческие вопросы
4. 💡 Ситуационные задачи

Вы можете отвечать текстом или голосом. Готовы начать?`;
  };

  // Добавление сообщения от ИИ
  const addAIMessage = (sessionId: string, content: string, questionType?: InterviewMessage['questionType']) => {
    const aiMessage: InterviewMessage = {
      id: Date.now().toString(),
      role: 'ai',
      content,
      timestamp: new Date(),
      questionType
    };

    setSession(prev => prev ? {
      ...prev,
      messages: [...prev.messages, aiMessage]
    } : null);
  };

  // Анализ ответа пользователя
  const analyzeUserResponse = (content: string, questionType?: string, competency?: string): MessageAnalysis => {
    // Извлечение ключевых слов
    const keywords = extractKeywords(content);
    
    // Определение тональности
    const sentiment = analyzeSentiment(content);
    
    // Оценка качества коммуникации
    const communicationQuality = analyzeCommunicationQuality(content);
    
    // Оценка технической глубины
    const technicalDepth = analyzeTechnicalDepth(content, questionType);
    
    // Оценка уровня опыта
    const experienceLevel = analyzeExperienceLevel(content);
    
    // Оценка компетенций
    const competencyIndicators = analyzeCompetencyIndicators(content, competency);

    return {
      keywords,
      sentiment,
      confidence: Math.min(95, Math.max(60, content.length / 10 + Math.random() * 20)),
      communicationQuality,
      technicalDepth,
      experienceLevel,
      competencyIndicators
    };
  };

  // Извлечение ключевых слов
  const extractKeywords = (text: string): string[] => {
    const commonWords = ['и', 'в', 'на', 'с', 'по', 'для', 'от', 'до', 'из', 'у', 'о', 'об', 'при', 'что', 'как', 'это', 'был', 'была', 'было', 'были'];
    const words = text.toLowerCase()
      .replace(/[^\w\sа-яё]/gi, '')
      .split(/\s+/)
      .filter(word => word.length > 3 && !commonWords.includes(word));
    
    // Подсчет частоты и возврат топ-10
    const frequency = words.reduce((acc, word) => {
      acc[word] = (acc[word] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(frequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([word]) => word);
  };

  // Анализ тональности (простая эвристика)
  const analyzeSentiment = (text: string): 'positive' | 'neutral' | 'negative' => {
    const positiveWords = ['хорошо', 'отлично', 'успешно', 'эффективно', 'качественно', 'достиг', 'улучшил', 'решил'];
    const negativeWords = ['плохо', 'сложно', 'проблема', 'ошибка', 'неудача', 'трудно', 'не получилось'];
    
    const positive = positiveWords.some(word => text.toLowerCase().includes(word));
    const negative = negativeWords.some(word => text.toLowerCase().includes(word));
    
    if (positive && !negative) return 'positive';
    if (negative && !positive) return 'negative';
    return 'neutral';
  };

  // Анализ качества коммуникации
  const analyzeCommunicationQuality = (text: string): number => {
    let score = 3; // Базовый уровень
    
    // Длина ответа
    if (text.length > 200) score += 0.5;
    if (text.length > 500) score += 0.5;
    
    // Структурированность
    if (text.includes('во-первых') || text.includes('сначала') || text.includes('затем')) score += 0.5;
    
    // Конкретность
    if (text.includes('например') || text.includes('конкретно') || text.includes('в частности')) score += 0.5;
    
    // Профессиональная лексика
    const professionalWords = ['анализ', 'стратегия', 'процесс', 'результат', 'эффективность', 'оптимизация'];
    if (professionalWords.some(word => text.toLowerCase().includes(word))) score += 0.5;
    
    return Math.min(5, score);
  };

  // Анализ технической глубины
  const analyzeTechnicalDepth = (text: string, questionType?: string): number => {
    if (questionType !== 'technical') return 0;
    
    let score = 2;
    
    // Технические термины
    const techTerms = ['алгоритм', 'архитектура', 'база данных', 'API', 'фреймворк', 'библиотека', 'паттерн'];
    const foundTerms = techTerms.filter(term => text.toLowerCase().includes(term));
    score += foundTerms.length * 0.3;
    
    // Конкретные технологии
    const technologies = ['javascript', 'python', 'react', 'node', 'sql', 'docker', 'kubernetes'];
    const foundTech = technologies.filter(tech => text.toLowerCase().includes(tech));
    score += foundTech.length * 0.2;
    
    return Math.min(5, score);
  };

  // Анализ уровня опыта
  const analyzeExperienceLevel = (text: string): number => {
    let score = 2;
    
    // Временные маркеры
    if (text.includes('лет') || text.includes('года')) score += 0.5;
    if (text.includes('проект') || text.includes('команд')) score += 0.5;
    if (text.includes('руководил') || text.includes('управлял')) score += 1;
    if (text.includes('архитектор') || text.includes('лид') || text.includes('senior')) score += 1;
    
    return Math.min(5, score);
  };

  // Анализ индикаторов компетенций
  const analyzeCompetencyIndicators = (text: string, competency?: string): Record<string, number> => {
    const indicators: Record<string, number> = {};
    
    // Анализ для каждой компетенции
    Object.keys(STANDARD_COMPETENCIES).forEach(comp => {
      let score = 2; // Базовый уровень
      
      switch (comp) {
        case 'communication':
          if (text.includes('объяснил') || text.includes('презентовал')) score += 1;
          if (text.includes('команд') || text.includes('коллег')) score += 0.5;
          break;
        case 'leadership':
          if (text.includes('руководил') || text.includes('возглавлял')) score += 1.5;
          if (text.includes('мотивировал') || text.includes('организовал')) score += 1;
          break;
        case 'productivity':
          if (text.includes('оптимизировал') || text.includes('ускорил')) score += 1;
          if (text.includes('результат') || text.includes('эффективность')) score += 0.5;
          break;
        case 'reliability':
          if (text.includes('соблюдал') || text.includes('гарантировал')) score += 1;
          if (text.includes('качество') || text.includes('надежно')) score += 0.5;
          break;
        case 'initiative':
          if (text.includes('предложил') || text.includes('инициировал')) score += 1;
          if (text.includes('улучшение') || text.includes('инновация')) score += 0.5;
          break;
      }
      
      indicators[comp] = Math.min(5, score);
    });
    
    return indicators;
  };

  // Обработка отправки сообщения
  const handleSendMessage = async () => {
    if (!currentMessage.trim() || !session) return;

    const userMessage: InterviewMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: currentMessage.trim(),
      timestamp: new Date()
    };

    // Анализ ответа
    const currentTemplate = INTERVIEW_TEMPLATES[session.currentPhase];
    const currentQuestion = currentTemplate?.questions[currentQuestionIndex];
    
    userMessage.analysis = analyzeUserResponse(
      currentMessage.trim(),
      currentQuestion?.type,
      currentQuestion?.competency
    );

    // Добавляем сообщение пользователя
    const updatedSession = {
      ...session,
      messages: [...session.messages, userMessage]
    };

    setSession(updatedSession);
    setCurrentMessage('');
    setIsLoading(true);

    // Обновляем кумулятивный анализ
    updateCumulativeAnalysis(updatedSession, userMessage.analysis!);

    // Генерируем следующий вопрос
    setTimeout(() => {
      generateNextQuestion(updatedSession);
      setIsLoading(false);
    }, 1000 + Math.random() * 2000);
  };

  // Обновление кумулятивного анализа
  const updateCumulativeAnalysis = (session: InterviewSession, analysis: MessageAnalysis) => {
    // Обновляем общий счет
    const messageCount = session.messages.filter(m => m.role === 'user').length;
    const newOverallScore = (session.cumulativeAnalysis.overallScore * (messageCount - 1) + 
      (analysis.communicationQuality + analysis.experienceLevel) / 2) / messageCount;

    // Обновляем счета компетенций
    const competencyScores = { ...session.cumulativeAnalysis.competencyScores };
    Object.entries(analysis.competencyIndicators).forEach(([comp, score]) => {
      competencyScores[comp] = competencyScores[comp] 
        ? (competencyScores[comp] + score) / 2 
        : score;
    });

    // Обновляем ключевые инсайты
    const insights = [...session.cumulativeAnalysis.keyInsights];
    if (analysis.sentiment === 'positive') {
      insights.push('Демонстрирует позитивный настрой');
    }
    if (analysis.technicalDepth > 3) {
      insights.push('Хорошие технические знания');
    }
    if (analysis.communicationQuality > 4) {
      insights.push('Отличные коммуникативные навыки');
    }

    session.cumulativeAnalysis = {
      overallScore: newOverallScore,
      competencyScores,
      strengths: generateStrengths(competencyScores),
      weaknesses: generateWeaknesses(competencyScores),
      keyInsights: [...new Set(insights)].slice(-5) // Последние 5 уникальных
    };
  };

  // Генерация сильных сторон
  const generateStrengths = (scores: Record<string, number>): string[] => {
    return Object.entries(scores)
      .filter(([, score]) => score >= 4)
      .map(([comp]) => STANDARD_COMPETENCIES[comp]?.name || comp)
      .slice(0, 3);
  };

  // Генерация слабых сторон
  const generateWeaknesses = (scores: Record<string, number>): string[] => {
    return Object.entries(scores)
      .filter(([, score]) => score < 3)
      .map(([comp]) => STANDARD_COMPETENCIES[comp]?.name || comp)
      .slice(0, 3);
  };

  // Генерация следующего вопроса
  const generateNextQuestion = (session: InterviewSession) => {
    const currentTemplate = INTERVIEW_TEMPLATES[session.currentPhase];
    
    if (currentQuestionIndex < currentTemplate.questions.length - 1) {
      // Следующий вопрос в текущей фазе
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      const nextQuestion = currentTemplate.questions[currentQuestionIndex + 1];
      addAIMessage(session.id, nextQuestion.text, nextQuestion.type as any);
    } else if (session.currentPhase < session.totalPhases - 1) {
      // Переход к следующей фазе
      const nextPhase = session.currentPhase + 1;
      setCurrentQuestionIndex(0);
      session.currentPhase = nextPhase;
      
      const phaseNames = ['Знакомство', 'Технические вопросы', 'Поведенческие вопросы', 'Ситуационные задачи'];
      const transitionMessage = `Отлично! Переходим к следующему этапу: "${phaseNames[nextPhase]}".`;
      addAIMessage(session.id, transitionMessage);
      
      setTimeout(() => {
        const nextTemplate = INTERVIEW_TEMPLATES[nextPhase];
        const firstQuestion = nextTemplate.questions[0];
        addAIMessage(session.id, firstQuestion.text, firstQuestion.type as any);
      }, 1500);
    } else {
      // Завершение интервью
      finishInterview(session);
    }
  };

  // Завершение интервью
  const finishInterview = (session: InterviewSession) => {
    session.status = 'completed';
    session.endTime = new Date();
    
    // Генерируем финальный профиль
    const profile = generateCandidateProfile(session);
    session.generatedProfile = profile;
    
    const completionMessage = `Спасибо за интервью! Я завершил анализ ваших ответов и сформировал профессиональный профиль. 

Общая оценка: ${session.cumulativeAnalysis.overallScore.toFixed(1)}/5.0

Вы можете просмотреть детальные результаты во вкладке "Анализ".`;
    
    addAIMessage(session.id, completionMessage, 'final');
    setShowAnalysis(true);
    
    // Сохраняем сессию
    const savedSessions = localStorage.getItem('ai-interview-sessions') || '[]';
    const sessions = JSON.parse(savedSessions);
    sessions.push(session);
    localStorage.setItem('ai-interview-sessions', JSON.stringify(sessions));
    
    if (onComplete && profile) {
      onComplete(profile);
    }
  };

  // Генерация профиля кандидата
  const generateCandidateProfile = (session: InterviewSession): CandidateProfile => {
    const analysis = session.cumulativeAnalysis;
    
    return {
      basicInfo: {
        name: user.name,
        position: 'Кандидат',
        experience: Math.round(analysis.overallScore),
        education: ['Образование указано в ответах']
      },
      competencyAssessment: Object.fromEntries(
        Object.entries(analysis.competencyScores).map(([comp, score]) => [
          comp,
          {
            score: Math.round(score * 10) / 10,
            evidence: [`Оценено на основе ответов в интервью`],
            confidence: 85
          }
        ])
      ),
      behavioralInsights: {
        workStyle: 'Определен на основе ответов',
        decisionMaking: 'Анализ принятия решений',
        problemSolving: 'Подход к решению проблем',
        communication: 'Стиль коммуникации',
        leadership: 'Лидерские качества',
        teamwork: 'Работа в команде'
      },
      motivationFactors: analysis.keyInsights,
      potentialRisks: analysis.weaknesses,
      fitAssessment: {
        roleAlignment: Math.round(analysis.overallScore * 20),
        cultureAlignment: Math.round(analysis.overallScore * 18),
        teamAlignment: Math.round(analysis.overallScore * 19),
        overallFit: Math.round(analysis.overallScore * 20)
      },
      developmentPlan: {
        immediateActions: ['Начать работу по плану развития'],
        shortTermGoals: analysis.weaknesses.map(w => `Развить ${w}`),
        longTermGoals: ['Достичь экспертного уровня'],
        requiredSupport: ['Менторинг', 'Обучение', 'Практика']
      }
    };
  };

  // Обработка голосового ввода
  const handleVoiceInput = (transcript: string) => {
    // Добавляем новый текст к существующему сообщению
    setCurrentMessage(prev => {
      const newText = transcript.trim();
      if (!newText) return prev;
      
      // Если предыдущий текст пустой, просто устанавливаем новый
      if (!prev.trim()) return newText;
      
      // Если новый текст уже содержится в предыдущем, не дублируем
      if (prev.includes(newText)) return prev;
      
      // Добавляем новый текст через пробел
      return prev + ' ' + newText;
    });
  };

  if (!session) {
    return <div>Загрузка...</div>;
  }

  const progress = session.currentPhase / session.totalPhases * 100;

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
              <h1 className="text-3xl font-bold text-white">ИИ-Интервью для профиля</h1>
              <p className="text-gray-400 text-sm">Автоматическое формирование профессионального профиля</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-blue-600 text-white">
              <Brain className="h-4 w-4 mr-1" />
              Фаза {session.currentPhase + 1}/{session.totalPhases}
            </Badge>
          </div>
        </div>

        {/* Прогресс */}
        <Card className="bg-white/5 border-white/10 text-white">
          <CardContent className="p-4">
            <div className="flex justify-between text-sm text-gray-400 mb-2">
              <span>Прогресс интервью</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </CardContent>
        </Card>

        {/* Основной контент */}
        <Tabs value={showAnalysis ? 'analysis' : 'interview'} onValueChange={(v) => setShowAnalysis(v === 'analysis')} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6 bg-white/5 border border-white/10 rounded-2xl p-1">
            <TabsTrigger value="interview" className="data-[state=active]:bg-white/10 data-[state=active]:text-white rounded-xl">
              <Bot className="h-4 w-4 mr-2" />
              Интервью
            </TabsTrigger>
            <TabsTrigger value="analysis" className="data-[state=active]:bg-white/10 data-[state=active]:text-white rounded-xl">
              <TrendingUp className="h-4 w-4 mr-2" />
              Анализ
            </TabsTrigger>
          </TabsList>

          {/* Интервью */}
          <TabsContent value="interview">
            <Card className="bg-white/5 border-white/10 text-white">
              <CardContent className="p-6">
                {/* Чат */}
                <div className="bg-black/20 rounded-xl p-4 h-96 overflow-y-auto space-y-4 mb-4">
                  {session.messages.map((message) => (
                    <div key={message.id} className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`flex gap-3 max-w-[80%] ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                        <div className="flex-shrink-0 mt-1">
                          {message.role === 'ai' ? (
                            <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
                              <Bot className="h-4 w-4" />
                            </div>
                          ) : (
                            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                              <User className="h-4 w-4" />
                            </div>
                          )}
                        </div>
                        <div className={`p-3 rounded-xl ${
                          message.role === 'user' 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-white/10 text-gray-100'
                        }`}>
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                          <span className="text-xs opacity-70 mt-1 block">
                            {message.timestamp.toLocaleTimeString()}
                          </span>
                          {message.analysis && (
                            <div className="mt-2 pt-2 border-t border-white/20">
                              <div className="flex gap-2 mb-1">
                                <Badge variant="outline" className="text-xs">
                                  Качество: {message.analysis.communicationQuality.toFixed(1)}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {message.analysis.sentiment === 'positive' ? '😊' : message.analysis.sentiment === 'negative' ? '😟' : '😐'}
                                </Badge>
                              </div>
                              <div className="text-xs text-gray-300">
                                Ключевые слова: {message.analysis.keywords.slice(0, 3).join(', ')}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {isLoading && (
                    <div className="flex gap-3 justify-start">
                      <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
                        <Bot className="h-4 w-4" />
                      </div>
                      <div className="bg-white/10 text-gray-100 p-3 rounded-xl">
                        <div className="flex items-center gap-2">
                          <div className="animate-spin h-4 w-4 border-2 border-purple-400 border-t-transparent rounded-full"></div>
                          <span className="text-sm">ИИ анализирует ответ...</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>

                {/* Ввод */}
                {session.status !== 'completed' && (
                  <div className="space-y-4">
                    {useVoice ? (
                      <VoiceInput
                        onTranscription={handleVoiceInput}
                        placeholder="Нажмите для записи ответа"
                        onClear={() => setCurrentMessage('')}
                      />
                    ) : (
                      <Textarea
                        placeholder="Введите ваш ответ..."
                        value={currentMessage}
                        onChange={(e) => setCurrentMessage(e.target.value)}
                        className="bg-white/5 border-white/10 text-white placeholder:text-gray-400"
                        rows={3}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                      />
                    )}
                    
                    <div className="flex justify-between items-center">
                      <Button
                        onClick={() => setUseVoice(!useVoice)}
                        variant="outline"
                        className="bg-white/5 border-white/10 text-white hover:bg-white/10"
                      >
                        <Mic className="h-4 w-4 mr-2" />
                        {useVoice ? 'Текстовый ввод' : 'Голосовой ввод'}
                      </Button>
                      
                      <Button 
                        onClick={handleSendMessage}
                        disabled={!currentMessage.trim() || isLoading}
                        className="bg-purple-600 hover:bg-purple-700"
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Отправить
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Анализ */}
          <TabsContent value="analysis">
            <div className="space-y-6">
              {/* Общая статистика */}
              <Card className="bg-white/5 border-white/10 text-white">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5" />
                    Результаты анализа
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-black/20 rounded-xl">
                      <div className="text-3xl font-bold text-blue-400">
                        {session.cumulativeAnalysis.overallScore.toFixed(1)}
                      </div>
                      <div className="text-sm text-gray-400">Общая оценка</div>
                    </div>
                    <div className="text-center p-4 bg-black/20 rounded-xl">
                      <div className="text-3xl font-bold text-green-400">
                        {session.cumulativeAnalysis.strengths.length}
                      </div>
                      <div className="text-sm text-gray-400">Сильных сторон</div>
                    </div>
                    <div className="text-center p-4 bg-black/20 rounded-xl">
                      <div className="text-3xl font-bold text-yellow-400">
                        {session.cumulativeAnalysis.keyInsights.length}
                      </div>
                      <div className="text-sm text-gray-400">Ключевых инсайтов</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Компетенции */}
              <Card className="bg-white/5 border-white/10 text-white">
                <CardHeader>
                  <CardTitle>Оценка компетенций</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(session.cumulativeAnalysis.competencyScores).map(([comp, score]) => (
                      <div key={comp} className="space-y-2">
                        <div className="flex justify-between">
                          <span className="font-medium">{STANDARD_COMPETENCIES[comp]?.name || comp}</span>
                          <span className="text-sm text-gray-400">{score.toFixed(1)}/5.0</span>
                        </div>
                        <Progress value={(score / 5) * 100} className="h-2" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Инсайты */}
              {session.cumulativeAnalysis.keyInsights.length > 0 && (
                <Card className="bg-white/5 border-white/10 text-white">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Lightbulb className="h-5 w-5" />
                      Ключевые инсайты
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {session.cumulativeAnalysis.keyInsights.map((insight, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                          <span className="text-sm">{insight}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
