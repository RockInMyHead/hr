import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Send,
  Bot,
  User,
  ArrowLeft,
  Play,
  Pause,
  Download,
  BarChart3,
  Brain,
  Target,
  Users,
  ClipboardList,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  Mic,
  MicOff
} from 'lucide-react';
import { toast } from 'sonner';
import type { AppUser } from '@/types/profile';

// Расширяем window для SpeechRecognition
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface SpeechRecognitionEvent {
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string;
        confidence: number;
      };
      isFinal: boolean;
    };
  };
}
import unifiedInterviewService, { 
  UnifiedInterviewSession, 
  InterviewModule 
} from '@/services/unifiedInterviewService';

interface UnifiedAIInterviewProps {
  user: AppUser;
  onBack: () => void;
  onComplete?: (session: UnifiedInterviewSession) => void;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  moduleType?: InterviewModule['type'];
}

export function UnifiedAIInterview({ user, onBack, onComplete }: UnifiedAIInterviewProps) {
  // Состояния компонента
  const [session, setSession] = useState<UnifiedInterviewSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSessionStarted, setIsSessionStarted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Состояния голосового ввода
  const [isListening, setIsListening] = useState(false);
  const [speechRecognition, setSpeechRecognition] = useState<any>(null);
  
  // Фиксированные настройки интервью (Middle, Comprehensive, 45 мин)
  const defaultSettings = {
    difficulty: 'middle' as const,
    duration: 45,
    focusAreas: ['technical', 'behavioral'],
    style: 'comprehensive' as const
  };

  // Ссылки
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const startTimeRef = useRef<Date | null>(null);

  // Автопрокрутка к последнему сообщению
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Автоматический запуск интервью при загрузке компонента
  useEffect(() => {
    if (!isSessionStarted && !session) {
      startInterview();
    }
  }, []);

  // Инициализация SpeechRecognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'ru-RU'; // Русский язык

        recognition.onstart = () => {
          setIsListening(true);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognition.onresult = (event: SpeechRecognitionEvent) => {
          const transcript = event.results[0][0].transcript;
          if (transcript) {
            setCurrentMessage(prev => prev + (prev ? ' ' : '') + transcript);
            toast.success('Голос распознан');
          }
        };

        recognition.onerror = (event: { error: string }) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
          toast.error('Ошибка распознавания речи');
        };

        setSpeechRecognition(recognition);
      } else {
        console.warn('Speech recognition not supported');
      }
    }
  }, []);

  // Создание иконки для модуля
  const getModuleIcon = (type: InterviewModule['type']) => {
    switch (type) {
      case 'rag': return <Brain className="h-4 w-4" />;
      case 'mbti': return <Target className="h-4 w-4" />;
      case 'competency': return <ClipboardList className="h-4 w-4" />;
      case 'assessment360': return <Users className="h-4 w-4" />;
      case 'profile': return <User className="h-4 w-4" />;
      default: return <Bot className="h-4 w-4" />;
    }
  };

  // Получение цвета для статуса модуля
  const getModuleStatusColor = (status: InterviewModule['status']) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'in-progress': return 'bg-blue-500';
      case 'pending': return 'bg-gray-400';
      default: return 'bg-gray-400';
    }
  };

  // Начало интервью
  const startInterview = async () => {
    if (!user.email && !user.name) {
      toast.error('Требуется авторизация для проведения интервью');
      return;
    }

    setIsLoading(true);
    
    try {
      // Создаем новую сессию
      const newSession = await unifiedInterviewService.createSession(
        user.email || user.name,
        defaultSettings
      );

      setSession(newSession);
      setIsSessionStarted(true);
      startTimeRef.current = new Date();

      // Получаем первое приветственное сообщение
      const welcomeMessage = await unifiedInterviewService.getNextQuestion();
      
      const initialMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: welcomeMessage,
        timestamp: new Date()
      };

      setMessages([initialMessage]);
      toast.success('Интервью началось!');

    } catch (error) {
      console.error('Error starting interview:', error);
      toast.error('Ошибка при запуске интервью');
    } finally {
      setIsLoading(false);
    }
  };

  // Отправка сообщения
  const sendMessage = async () => {
    if (!currentMessage.trim() || isLoading || !session || isPaused) return;

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: currentMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setCurrentMessage('');
    setIsLoading(true);

    try {
      // Получаем следующий вопрос от сервиса
      const nextQuestion = await unifiedInterviewService.getNextQuestion(currentMessage);
      
      // Обновляем сессию
      const updatedSession = unifiedInterviewService.getCurrentSession();
      if (updatedSession) {
        setSession(updatedSession);
      }

      const assistantMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: nextQuestion,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Проверяем, завершено ли интервью
      if (updatedSession?.status === 'completed') {
        await handleInterviewCompletion(updatedSession);
      }

    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Ошибка при отправке сообщения');
      
      setMessages(prev => [...prev, {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: 'Извините, произошла ошибка. Попробуйте еще раз.',
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Обработка завершения интервью
  const handleInterviewCompletion = async (completedSession: UnifiedInterviewSession) => {
    try {
      // Генерируем сводку результатов
      const resultsSummary = await unifiedInterviewService.generateResultsSummary(completedSession);

      const summaryMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: `🎉 **Интервью завершено!**\n\n${resultsSummary}`,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, summaryMessage]);

      // Сохраняем результаты
      if (onComplete) {
        onComplete(completedSession);
      }

      toast.success('Интервью успешно завершено!');

    } catch (error) {
      console.error('Error completing interview:', error);
      toast.error('Ошибка при завершении интервью');
    }
  };

  // Приостановка/возобновление интервью
  const togglePause = () => {
    setIsPaused(!isPaused);
    toast.info(isPaused ? 'Интервью возобновлено' : 'Интервью приостановлено');
  };

  // Досрочное завершение интервью
  const forceComplete = async () => {
    if (!session) {
      toast.error('Нет активной сессии интервью');
      return;
    }

    try {
      const completedSession = unifiedInterviewService.completeSession();
      if (completedSession) {
        await handleInterviewCompletion(completedSession);
      } else {
        toast.error('Не удалось завершить интервью');
      }
    } catch (error) {
      console.error('Error in forceComplete:', error);
      toast.error('Ошибка при завершении интервью');
    }
  };

  // Расчет общего прогресса
  const calculateOverallProgress = (): number => {
    if (!session) return 0;
    
    const totalProgress = session.modules.reduce((sum, module) => sum + module.progress, 0);
    return Math.round(totalProgress / session.modules.length);
  };

  // Расчет времени интервью
  const calculateDuration = (): string => {
    if (!startTimeRef.current) return '0:00';
    
    const now = new Date();
    const diff = Math.floor((now.getTime() - startTimeRef.current.getTime()) / 1000);
    const minutes = Math.floor(diff / 60);
    const seconds = diff % 60;
    
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Обработка Enter для отправки сообщения
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Переключение голосового ввода
  const toggleVoiceInput = () => {
    if (!speechRecognition) {
      toast.error('Распознавание речи не поддерживается в этом браузере');
      return;
    }

    if (isListening) {
      speechRecognition.stop();
    } else {
      try {
        speechRecognition.start();
        toast.info('Слушаю... Говорите в микрофон');
      } catch (error) {
        console.error('Error starting speech recognition:', error);
        toast.error('Не удалось запустить распознавание речи');
      }
    }
  };

  // Экспорт результатов
  const exportResults = () => {
    if (!session) return;

    const exportData = {
      session,
      messages,
      exportDate: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `interview-results-${session.id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('Результаты экспортированы');
  };

  return (
    <div className="min-h-[100dvh] bg-black text-white p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6 md:space-y-8">
        
        {/* Заголовок */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-4 md:p-8 shadow-2xl">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              👔 HR-интервью
            </h1>
            <p className="text-gray-300 text-lg">
              Комплексная оценка кандидата
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={onBack} className="text-white hover:bg-white/10">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Назад
            </Button>
          
            {isSessionStarted && (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="flex items-center gap-1 text-white border-white/20">
                  <Clock className="h-3 w-3" />
                  {calculateDuration()}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={togglePause}
                  disabled={session?.status === 'completed'}
                  className="text-white border-white/20 hover:bg-white/10"
                >
                  {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportResults}
                  disabled={!session}
                  className="text-white border-white/20 hover:bg-white/10"
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Боковая панель с настройками и прогрессом */}
          <div className="lg:col-span-1">
            {/* Прогресс интервью */}
            {session && (
              <Card className="mb-4 bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <BarChart3 className="h-5 w-5" />
                    Прогресс интервью
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-white">Общий прогресс</span>
                      <span className="text-sm text-gray-300">{calculateOverallProgress()}%</span>
                    </div>
                    <Progress value={calculateOverallProgress()} className="mb-4" />

                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={forceComplete}
                      disabled={!session || session.status === 'completed' || isLoading}
                      className="w-full"
                    >
                      Завершить интервью
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Прогресс модулей */}
            {session && (
              <Card className="bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <BarChart3 className="h-5 w-5" />
                    Модули
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {session.modules.map((module) => (
                      <div key={module.type} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {getModuleIcon(module.type)}
                            <span className="text-sm font-medium truncate text-white">
                              {module.name}
                            </span>
                          </div>
                          <Badge
                            variant="outline"
                            className={`text-xs ${getModuleStatusColor(module.status)} text-white border-0`}
                          >
                            {module.status === 'pending' && 'Ожидает'}
                            {module.status === 'in-progress' && 'В работе'}
                            {module.status === 'completed' && 'Завершен'}
                          </Badge>
                        </div>

                        <div className="space-y-1">
                          <Progress value={module.progress} className="h-2" />
                          <div className="flex justify-between text-xs text-gray-400">
                            <span>{module.questionsAsked}/{module.targetQuestions} вопросов</span>
                            <span>{Math.round(module.progress)}%</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Основная область чата */}
          <div className="lg:col-span-3">
            <Card className="h-[600px] flex flex-col bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Bot className="h-5 w-5" />
                  Чат интервью
                  {isPaused && (
                    <Badge variant="secondary" className="ml-2 text-black">
                      <Pause className="h-3 w-3 mr-1" />
                      Приостановлено
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="text-gray-300">
                  {session ? (
                    `Фаза: ${session.currentPhase} • Сообщений: ${session.totalMessages}`
                  ) : (
                    'Интервью автоматически начнется через несколько секунд'
                  )}
                </CardDescription>
              </CardHeader>

              {/* Область сообщений */}
              <CardContent className="flex-1 flex flex-col min-h-0">
                <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
                  {messages.length === 0 && !isSessionStarted && (
                    <div className="text-center py-12">
                      <Bot className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                      <h3 className="text-lg font-medium text-gray-300 mb-2">
                        Готов к интервью
                      </h3>
                      <p className="text-gray-400">
                        Интервью автоматически начнется через несколько секунд
                      </p>
                    </div>
                  )}

                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex items-start gap-3 ${
                        message.role === 'user' ? 'flex-row-reverse' : ''
                      } w-full overflow-hidden`}
                    >
                      <div
                        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                          message.role === 'user'
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-200 text-gray-600'
                        }`}
                      >
                        {message.role === 'user' ? (
                          <User className="h-4 w-4" />
                        ) : (
                          <Bot className="h-4 w-4" />
                        )}
                      </div>
                      
                      <div
                        className={`flex-1 max-w-[80%] min-w-0 ${
                          message.role === 'user' ? 'text-right' : ''
                        }`}
                      >
                        <div
                        className={`inline-block p-3 rounded-lg break-words ${
                          message.role === 'user'
                            ? 'bg-blue-500 text-white'
                            : 'bg-white/10 text-white border border-white/20'
                        }`}
                        >
                          <div className="whitespace-pre-wrap break-words overflow-wrap-anywhere">{message.content}</div>
                        </div>
                        <div
                          className={`text-xs text-gray-400 mt-1 ${
                            message.role === 'user' ? 'text-right' : ''
                          }`}
                        >
                          {message.timestamp.toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  ))}

                  {isLoading && (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center">
                        <Bot className="h-4 w-4 text-white" />
                      </div>
                      <div className="bg-white/10 p-3 rounded-lg border border-white/20">
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-sm text-white">AI думает...</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Поле ввода сообщения */}
                {isSessionStarted && session?.status !== 'completed' && (
                  <div className="flex gap-2">
                    <Input
                      value={currentMessage}
                      onChange={(e) => setCurrentMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder={isPaused ? "Интервью приостановлено..." : "Введите ваш ответ..."}
                      disabled={isLoading || isPaused}
                      className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:border-white/40"
                    />
                    <Button
                      onClick={toggleVoiceInput}
                      disabled={isLoading || isPaused}
                      size="sm"
                      variant={isListening ? "destructive" : "secondary"}
                      className={`${isListening ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-600 hover:bg-gray-700'} text-white`}
                      title={isListening ? "Остановить запись" : "Голосовой ввод"}
                    >
                      {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    </Button>
                    <Button
                      onClick={sendMessage}
                      disabled={!currentMessage.trim() || isLoading || isPaused}
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                {session?.status === 'completed' && (
                  <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 text-center">
                    <CheckCircle className="h-8 w-8 text-green-400 mx-auto mb-2" />
                    <h3 className="font-medium text-green-300 mb-1">
                      Интервью завершено!
                    </h3>
                    <p className="text-sm text-green-400">
                      Все модули пройдены. Результаты готовы к экспорту.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
