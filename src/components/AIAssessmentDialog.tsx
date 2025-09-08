import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Bot,
  User,
  Send,
  ArrowLeft,
  Brain,
  Target,
  CheckCircle,
  Clock,
  MessageSquare,
  TrendingUp,
  Award,
  AlertTriangle,
  Lightbulb,
  Sparkles
} from 'lucide-react';
import type { ChecklistVersion } from '@/types/assessment';
import type { AppUser } from '@/types/profile';
import ChecklistService, { AssessmentSession, ConversationMessage, AdaptiveQuestion } from '@/services/checklistService';

interface AIAssessmentDialogProps {
  user: AppUser;
  checklist: ChecklistVersion;
  onBack: () => void;
  onComplete?: (results: any) => void;
}

interface Message {
  id: string;
  role: 'ai' | 'user';
  content: string;
  timestamp: Date;
  analysis?: {
    sentiment: 'positive' | 'neutral' | 'negative';
    competencyIndicators: Record<string, number>;
    behavioralMarkers: string[];
  };
}

export function AIAssessmentDialog({ user, checklist, onBack, onComplete }: AIAssessmentDialogProps) {
  const [session, setSession] = useState<AssessmentSession | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<AdaptiveQuestion | null>(null);
  const [competencyProgress, setCompetencyProgress] = useState<Record<string, number>>({});
  const [isCompleted, setIsCompleted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [checklistService] = useState(() => new ChecklistService());

  // Инициализация сессии
  useEffect(() => {
    const newSession = checklistService.startAssessment(checklist.id);
    setSession(newSession);

    // Стартовое приветствие
    const welcomeMessage: Message = {
      id: 'welcome',
      role: 'ai',
      content: `Привет! 👋 Я помогу провести оценку компетенций по чек-листу "${checklist.name}".

Мы будем общаться в диалоговом формате - я задам вопросы, а вы ответите естественно, как в обычной беседе. На основе ваших ответов я смогу лучше понять ваши сильные стороны и области для развития.

Начнем с первого вопроса...`,
      timestamp: new Date()
    };

    setMessages([welcomeMessage]);
    generateNextQuestion(newSession);
  }, [checklist.id, checklist.name]);

  // Автопрокрутка к последнему сообщению
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Генерация следующего вопроса
  const generateNextQuestion = async (currentSession: AssessmentSession) => {
    setIsGenerating(true);
    try {
      const question = await checklistService.getNextAdaptiveQuestion(currentSession);
      setCurrentQuestion(question);

      const questionMessage: Message = {
        id: `question-${Date.now()}`,
        role: 'ai',
        content: question.question,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, questionMessage]);
    } catch (error) {
      console.error('Error generating question:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Отправка ответа пользователя
  const sendMessage = async () => {
    if (!currentMessage.trim() || !session || !currentQuestion) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: currentMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setCurrentMessage('');
    setIsTyping(true);

    try {
      // Обрабатываем ответ через сервис
      const result = await checklistService.processUserAnswer(session, currentMessage, currentQuestion);

      // Обновляем оценки компетенций
      setCompetencyProgress(prev => ({
        ...prev,
        ...result.competencyUpdate
      }));

      // Добавляем анализ в сообщение пользователя
      setMessages(prev => prev.map(msg =>
        msg.id === userMessage.id
          ? { ...msg, analysis: result.analysis }
          : msg
      ));

      // Обновляем сессию
      const updatedSession = { ...session, ...result.competencyUpdate };
      setSession(updatedSession);
      checklistService.saveSession(updatedSession);

      // Решаем, продолжать ли беседу
      if (result.shouldContinue) {
        // Генерируем следующий вопрос через небольшую задержку
        setTimeout(() => {
          generateNextQuestion(updatedSession);
        }, 1500);
      } else {
        // Завершаем оценку
        await completeAssessment(updatedSession);
      }
    } catch (error) {
      console.error('Error processing answer:', error);

      // Fallback - завершаем оценку
      await completeAssessment(session);
    } finally {
      setIsTyping(false);
    }
  };

  // Завершение оценки
  const completeAssessment = async (finalSession: AssessmentSession) => {
    setIsCompleted(true);

    try {
      const report = await checklistService.generateFinalReport(finalSession);

      const completionMessage: Message = {
        id: `completion-${Date.now()}`,
        role: 'ai',
        content: `Отлично! Мы завершили оценку компетенций. 

${report.overallAssessment}

**Основные результаты:**
• Оценено компетенций: ${Object.keys(report.competencyScores).length}
• Средний балл: ${Math.round(Object.values(report.competencyScores).reduce((a, b) => a + b, 0) / Object.values(report.competencyScores).length)}/100

Спасибо за участие в оценке! Результаты сохранены.`,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, completionMessage]);

      if (onComplete) {
        onComplete({
          session: finalSession,
          report,
          competencyScores: report.competencyScores
        });
      }
    } catch (error) {
      console.error('Error completing assessment:', error);
    }
  };

  // Получить цвет для оценки компетенции
  const getCompetencyColor = (score: number): string => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  // Рассчитать общий прогресс
  const calculateOverallProgress = (): number => {
    if (!session) return 0;
    const scores = Object.values(competencyProgress);
    if (scores.length === 0) return 0;
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  };

  if (!session) {
    return <div>Загрузка...</div>;
  }

  const overallProgress = calculateOverallProgress();

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Заголовок */}
        <div className="flex items-center justify-between bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-4 md:p-8 shadow-2xl">
          <div className="flex items-center gap-3">
            <Button onClick={onBack} variant="outline" size="sm" className="bg-white/5 border-white/10 text-white hover:bg-white/10">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Назад
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-white">ИИ Оценка компетенций</h1>
              <p className="text-gray-400 text-sm">{checklist.name} • Диалоговый режим</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Badge className="bg-purple-600 text-white">
              <Brain className="h-4 w-4 mr-1" />
              {overallProgress}%
            </Badge>
            <Badge className="bg-blue-600 text-white">
              <MessageSquare className="h-4 w-4 mr-1" />
              {messages.filter(m => m.role === 'user').length} ответов
            </Badge>
          </div>
        </div>

        {/* Прогресс по компетенциям */}
        <Card className="bg-white/5 border-white/10 text-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Прогресс по компетенциям
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(competencyProgress).map(([competency, score]) => (
                <div key={competency} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="truncate">{competency}</span>
                    <span className={getCompetencyColor(score)}>{score}/100</span>
                  </div>
                  <Progress value={score} className="h-2" />
                </div>
              ))}
            </div>
            {Object.keys(competencyProgress).length === 0 && (
              <p className="text-gray-400 text-center">Оценка еще не начата</p>
            )}
          </CardContent>
        </Card>

        {/* Чат */}
        <Card className="bg-white/5 border-white/10 text-white h-[500px] flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Диалог оценки
            </CardTitle>
            <CardDescription className="text-gray-400">
              Отвечайте естественно - ИИ анализирует ваши ответы для оценки компетенций
            </CardDescription>
          </CardHeader>

          <CardContent className="flex-1 overflow-y-auto space-y-4 p-4">
            {messages.map((message) => (
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
                      {message.role === 'ai' ? 'ИИ Оценщик' : 'Вы'}
                    </span>
                    <span className="text-xs text-gray-400">
                      {message.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="whitespace-pre-wrap">
                    {message.content}
                  </div>

                  {/* Анализ ответа пользователя */}
                  {message.analysis && (
                    <div className="mt-3 p-3 bg-black/20 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="h-4 w-4 text-yellow-400" />
                        <span className="text-xs font-medium text-yellow-400">Анализ ответа</span>
                      </div>
                      <div className="text-xs text-gray-300 space-y-1">
                        <div>Тон: <span className={`font-medium ${
                          message.analysis.sentiment === 'positive' ? 'text-green-400' :
                          message.analysis.sentiment === 'negative' ? 'text-red-400' : 'text-gray-400'
                        }`}>
                          {message.analysis.sentiment === 'positive' ? 'Положительный' :
                           message.analysis.sentiment === 'negative' ? 'Отрицательный' : 'Нейтральный'}
                        </span></div>
                        {message.analysis.behavioralMarkers.length > 0 && (
                          <div>Поведенческие маркеры: {message.analysis.behavioralMarkers.join(', ')}</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Индикатор генерации вопроса */}
            {isGenerating && (
              <div className="flex justify-start">
                <div className="bg-white/10 text-white p-4 rounded-xl mr-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Bot className="h-4 w-4 text-purple-400" />
                    <span className="text-sm font-medium">ИИ Оценщик</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    <span className="text-sm text-gray-400 ml-2">Формулирую следующий вопрос...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </CardContent>

          {/* Ввод сообщения */}
          {!isCompleted && (
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
                  rows={3}
                  disabled={isTyping || isGenerating}
                />
                <Button
                  onClick={sendMessage}
                  disabled={!currentMessage.trim() || isTyping || isGenerating}
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

        {/* Завершение оценки */}
        {isCompleted && (
          <Card className="bg-white/5 border-white/10 text-white text-center">
            <CardContent className="p-8">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Оценка завершена!</h2>
              <p className="text-gray-400 mb-6">
                Спасибо за участие! Результаты сохранены и доступны для анализа.
              </p>
              <div className="flex justify-center gap-4">
                <Button onClick={onBack} variant="outline" className="bg-white/5 border-white/10 text-white hover:bg-white/10">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Назад к списку
                </Button>
                <Button
                  onClick={() => window.print()}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  Сохранить отчет
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

