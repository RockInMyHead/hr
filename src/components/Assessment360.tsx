import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Users, 
  MessageSquare, 
  Brain, 
  Target, 
  Star,
  ArrowLeft,
  Send,
  Bot,
  User,
  CheckCircle,
  Clock,
  Eye
} from 'lucide-react';
import type { AppUser } from '@/types/profile';
import type { Employee } from '@/types/employee';
import type { Assessment360, ExtendedEmployeeProfile } from '@/types/extended-profile';
import { STANDARD_COMPETENCIES } from '@/types/competencies';

interface Assessment360Props {
  user: AppUser;
  onBack: () => void;
}

interface ChatMessage {
  id: string;
  role: 'ai' | 'user';
  content: string;
  timestamp: Date;
  competencyContext?: string;
}

interface AssessmentSession {
  id: string;
  assessorId: string;
  subjectId: string;
  assessorRole: 'self' | 'manager' | 'peer' | 'subordinate';
  currentCompetency?: string;
  messages: ChatMessage[];
  scores: Record<string, number>;
  behavioralObservations: {
    strengths: string[];
    developmentAreas: string[];
    specificExamples: string[];
  };
  status: 'setup' | 'in-progress' | 'completed';
}

export function Assessment360({ user, onBack }: Assessment360Props) {
  const [activeTab, setActiveTab] = useState<'new' | 'ongoing' | 'completed'>('new');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [sessions, setSessions] = useState<AssessmentSession[]>([]);
  const [currentSession, setCurrentSession] = useState<AssessmentSession | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [assessorRole, setAssessorRole] = useState<'self' | 'manager' | 'peer' | 'subordinate'>('self');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Загрузка данных
  useEffect(() => {
    try {
      const raw = localStorage.getItem('hr-employees');
      const employeeData: Employee[] = raw ? JSON.parse(raw) : [];
      setEmployees(employeeData);

      // Загрузка сохраненных сессий
      const savedSessions = localStorage.getItem('assessment-360-sessions');
      if (savedSessions) {
        setSessions(JSON.parse(savedSessions));
      }
    } catch (error) {
      console.error('Error loading 360 assessment data:', error);
    }
  }, []);

  // Сохранение сессий
  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem('assessment-360-sessions', JSON.stringify(sessions));
    }
  }, [sessions]);

  // Начало новой оценки
  const startNewAssessment = () => {
    if (!selectedSubject) return;

    const newSession: AssessmentSession = {
      id: Date.now().toString(),
      assessorId: user.email || user.name,
      subjectId: selectedSubject,
      assessorRole,
      messages: [],
      scores: {},
      behavioralObservations: {
        strengths: [],
        developmentAreas: [],
        specificExamples: []
      },
      status: 'setup'
    };

    setCurrentSession(newSession);
    setSessions(prev => [...prev, newSession]);

    // Добавляем начальное сообщение от ИИ
    const welcomeMessage = generateWelcomeMessage(assessorRole, selectedSubject);
    addAIMessage(newSession.id, welcomeMessage);
  };

  // Генерация приветственного сообщения
  const generateWelcomeMessage = (role: string, subjectName: string): string => {
    const subject = employees.find(emp => emp.id === subjectName)?.name || subjectName;
    
    const messages = {
      self: `Добро пожаловать на сессию самооценки! Мы проведем с вами оценку ваших компетенций. Я задам вам вопросы о ваших сильных сторонах, областях для развития и конкретных примерах вашей работы. Готовы начать?`,
      manager: `Добро пожаловать на сессию оценки 360°! Вы будете оценивать ${subject} как их руководитель. Я помогу вам провести структурированную оценку, задавая вопросы о компетенциях, поведении и результатах. Начнем?`,
      peer: `Привет! Сегодня мы проведем оценку вашего коллеги ${subject}. Как коллега, у вас есть уникальный взгляд на их работу в команде. Давайте обсудим их компетенции и сотрудничество. Готовы?`,
      subordinate: `Добро пожаловать! Вы будете оценивать ${subject} как вашего руководителя. Мне важно услышать вашу точку зрения на их лидерские качества и стиль управления. Начнем обсуждение?`
    };

    return messages[role] || messages.self;
  };

  // Добавление сообщения от ИИ
  const addAIMessage = (sessionId: string, content: string, competencyContext?: string) => {
    const aiMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'ai',
      content,
      timestamp: new Date(),
      competencyContext
    };

    setSessions(prev => prev.map(session => 
      session.id === sessionId 
        ? { ...session, messages: [...session.messages, aiMessage] }
        : session
    ));

    if (currentSession?.id === sessionId) {
      setCurrentSession(prev => prev ? {
        ...prev,
        messages: [...prev.messages, aiMessage]
      } : null);
    }
  };

  // Обработка отправки сообщения
  const handleSendMessage = async () => {
    if (!message.trim() || !currentSession) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: message.trim(),
      timestamp: new Date()
    };

    // Добавляем сообщение пользователя
    const updatedSession = {
      ...currentSession,
      messages: [...currentSession.messages, userMessage],
      status: 'in-progress' as const
    };

    setCurrentSession(updatedSession);
    setSessions(prev => prev.map(session => 
      session.id === currentSession.id ? updatedSession : session
    ));

    setMessage('');
    setIsLoading(true);

    // Генерируем ответ ИИ
    try {
      const aiResponse = await generateAIResponse(updatedSession, userMessage);
      setTimeout(() => {
        addAIMessage(currentSession.id, aiResponse);
        setIsLoading(false);
      }, 1000 + Math.random() * 2000); // Имитация времени обработки
    } catch (error) {
      console.error('Error generating AI response:', error);
      addAIMessage(currentSession.id, 'Извините, произошла ошибка. Давайте продолжим с другим вопросом.');
      setIsLoading(false);
    }
  };

  // Генерация ответа ИИ (имитация ChatGPT)
  const generateAIResponse = async (session: AssessmentSession, userMessage: ChatMessage): Promise<string> => {
    const messageCount = session.messages.filter(m => m.role === 'user').length;
    const competencies = Object.keys(STANDARD_COMPETENCIES);
    const currentCompetency = competencies[Math.floor(messageCount / 3) % competencies.length];
    
    // Анализ контекста и генерация релевантного вопроса
    const responses = [
      `Интересный пример! Расскажите подробнее о том, как вы подходили к решению этой задачи в области "${STANDARD_COMPETENCIES[currentCompetency]?.name}"?`,
      `Благодарю за ответ. Можете привести конкретный пример ситуации, где вы продемонстрировали эту компетенцию?`,
      `Понятно. А какие были основные вызовы в этой ситуации и как вы их преодолели?`,
      `Отлично! Теперь давайте обсудим "${STANDARD_COMPETENCIES[currentCompetency]?.name}". Как вы оцениваете этот навык у себя/коллеги?`,
      `Интересно. Какие конкретные действия или поведение привели к такому результату?`,
      `Спасибо за детальный ответ. Что бы вы сделали по-другому в похожей ситуации?`,
      `Понимаю. Как окружающие обычно реагируют на такой подход к работе?`,
      `Хорошо. Давайте перейдем к следующей компетенции. Расскажите о своем опыте в области лидерства.`
    ];

    // Если это завершающее сообщение
    if (messageCount >= 15) {
      return `Благодарю за подробные ответы! Мы завершили оценку. Сейчас я проанализирую всю информацию и подготовлю итоговый отчет с оценками компетенций и рекомендациями. Хотели бы добавить что-то еще?`;
    }

    return responses[messageCount % responses.length];
  };

  // Завершение оценки
  const completeAssessment = () => {
    if (!currentSession) return;

    // Генерируем итоговые оценки на основе диалога
    const finalScores = generateFinalScores(currentSession);
    const observations = generateObservations(currentSession);

    const completedSession = {
      ...currentSession,
      scores: finalScores,
      behavioralObservations: observations,
      status: 'completed' as const
    };

    setSessions(prev => prev.map(session => 
      session.id === currentSession.id ? completedSession : session
    ));

    setCurrentSession(null);
  };

  // Генерация итоговых оценок
  const generateFinalScores = (session: AssessmentSession): Record<string, number> => {
    const scores: Record<string, number> = {};
    const competencyKeys = Object.keys(STANDARD_COMPETENCIES);
    
    competencyKeys.forEach(key => {
      // Имитация анализа ответов для генерации оценки
      scores[key] = Math.round((Math.random() * 2 + 2.5) * 10) / 10; // 2.5-4.5 с округлением
    });

    return scores;
  };

  // Генерация наблюдений
  const generateObservations = (session: AssessmentSession) => {
    return {
      strengths: [
        'Проявляет инициативу в решении сложных задач',
        'Эффективно взаимодействует с командой',
        'Демонстрирует высокую надежность в выполнении обязательств'
      ],
      developmentAreas: [
        'Может улучшить навыки публичных выступлений',
        'Стоит развивать стратегическое мышление',
        'Необходимо работать над делегированием задач'
      ],
      specificExamples: [
        'Успешно руководил проектом внедрения новой системы',
        'Проявил лидерские качества в кризисной ситуации',
        'Эффективно наставлял новых сотрудников'
      ]
    };
  };

  const getSessionStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'in-progress': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getRoleLabel = (role: string) => {
    const labels = {
      self: 'Самооценка',
      manager: 'Оценка руководителя',
      peer: 'Оценка коллеги',
      subordinate: 'Оценка подчиненного'
    };
    return labels[role as keyof typeof labels] || role;
  };

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Заголовок */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-4 md:p-8 shadow-2xl">
          <div className="flex items-center gap-3">
            <Button onClick={onBack} variant="outline" size="sm" className="bg-white/5 border-white/10 text-white hover:bg-white/10">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Назад
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-white">360° Оценка с ИИ</h1>
              <p className="text-gray-400 text-sm">Интеллектуальная система оценки компетенций с ChatGPT</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-purple-600 text-white">
              <Brain className="h-4 w-4 mr-1" />
              ИИ-ассистент
            </Badge>
          </div>
        </div>

        {/* Активная сессия */}
        {currentSession && (
          <Card className="bg-white/5 border-white/10 text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Активная оценка
              </CardTitle>
              <CardDescription className="text-gray-400">
                {getRoleLabel(currentSession.assessorRole)} • {employees.find(emp => emp.id === currentSession.subjectId)?.name}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Чат */}
                <div className="bg-black/20 rounded-xl p-4 h-96 overflow-y-auto space-y-3">
                  {currentSession.messages.map((msg) => (
                    <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`flex gap-3 max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                        <div className="flex-shrink-0">
                          {msg.role === 'ai' ? (
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
                          msg.role === 'user' 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-white/10 text-gray-100'
                        }`}>
                          <p className="text-sm">{msg.content}</p>
                          <span className="text-xs opacity-70 mt-1 block">
                            {msg.timestamp.toLocaleTimeString()}
                          </span>
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
                </div>

                {/* Ввод сообщения */}
                <div className="flex gap-3">
                  <Textarea
                    placeholder="Введите ваш ответ..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="flex-1 bg-white/5 border-white/10 text-white placeholder:text-gray-400"
                    rows={2}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                  />
                  <Button 
                    onClick={handleSendMessage}
                    disabled={!message.trim() || isLoading}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>

                {/* Кнопка завершения */}
                {currentSession.messages.length >= 10 && (
                  <Button onClick={completeAssessment} className="w-full bg-green-600 hover:bg-green-700">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Завершить оценку
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Навигация */}
        {!currentSession && (
          <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6 bg-white/5 border border-white/10 rounded-2xl p-1">
              <TabsTrigger value="new" className="data-[state=active]:bg-white/10 data-[state=active]:text-white rounded-xl">
                <Target className="h-4 w-4 mr-2" />
                Новая оценка
              </TabsTrigger>
              <TabsTrigger value="ongoing" className="data-[state=active]:bg-white/10 data-[state=active]:text-white rounded-xl">
                <Clock className="h-4 w-4 mr-2" />
                В процессе
              </TabsTrigger>
              <TabsTrigger value="completed" className="data-[state=active]:bg-white/10 data-[state=active]:text-white rounded-xl">
                <CheckCircle className="h-4 w-4 mr-2" />
                Завершенные
              </TabsTrigger>
            </TabsList>

            {/* Новая оценка */}
            <TabsContent value="new" className="space-y-6">
              <Card className="bg-white/5 border-white/10 text-white">
                <CardHeader>
                  <CardTitle>Начать новую 360° оценку</CardTitle>
                  <CardDescription className="text-gray-400">
                    Выберите сотрудника и тип оценки для начала интерактивной сессии
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-300 mb-2 block">
                        Оцениваемый сотрудник
                      </label>
                      <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                        <SelectTrigger className="bg-white/5 border-white/10 text-white">
                          <SelectValue placeholder="Выберите сотрудника" />
                        </SelectTrigger>
                        <SelectContent>
                          {employees.map((emp) => (
                            <SelectItem key={emp.id} value={emp.id}>
                              {emp.name} ({emp.position})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-300 mb-2 block">
                        Роль оценивающего
                      </label>
                      <Select value={assessorRole} onValueChange={(value: any) => setAssessorRole(value)}>
                        <SelectTrigger className="bg-white/5 border-white/10 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="self">Самооценка</SelectItem>
                          <SelectItem value="manager">Оценка руководителя</SelectItem>
                          <SelectItem value="peer">Оценка коллеги</SelectItem>
                          <SelectItem value="subordinate">Оценка подчиненного</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Button 
                    onClick={startNewAssessment}
                    disabled={!selectedSubject}
                    className="w-full bg-purple-600 hover:bg-purple-700"
                  >
                    <Brain className="h-4 w-4 mr-2" />
                    Начать ИИ-оценку
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Сессии в процессе */}
            <TabsContent value="ongoing">
              <div className="space-y-4">
                {sessions.filter(s => s.status === 'in-progress').map((session) => (
                  <Card key={session.id} className="bg-white/5 border-white/10 text-white">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium">
                            {employees.find(emp => emp.id === session.subjectId)?.name}
                          </h3>
                          <p className="text-sm text-gray-400">{getRoleLabel(session.assessorRole)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getSessionStatusColor(session.status)}>
                            {session.status === 'in-progress' ? 'В процессе' : 'Настройка'}
                          </Badge>
                          <Button 
                            onClick={() => setCurrentSession(session)}
                            variant="outline" 
                            size="sm"
                            className="bg-white/5 border-white/10 text-white hover:bg-white/10"
                          >
                            Продолжить
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                {sessions.filter(s => s.status === 'in-progress').length === 0 && (
                  <div className="text-center py-12">
                    <Clock className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">Нет активных оценок</h3>
                    <p className="text-gray-400">Начните новую оценку на вкладке "Новая оценка"</p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Завершенные оценки */}
            <TabsContent value="completed">
              <div className="space-y-4">
                {sessions.filter(s => s.status === 'completed').map((session) => (
                  <Card key={session.id} className="bg-white/5 border-white/10 text-white">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium">
                            {employees.find(emp => emp.id === session.subjectId)?.name}
                          </h3>
                          <p className="text-sm text-gray-400">{getRoleLabel(session.assessorRole)}</p>
                          <p className="text-xs text-gray-500">
                            Средний балл: {Object.values(session.scores).length > 0 
                              ? (Object.values(session.scores).reduce((a, b) => a + b, 0) / Object.values(session.scores).length).toFixed(1)
                              : 'Н/А'
                            }
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getSessionStatusColor(session.status)}>
                            Завершено
                          </Badge>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="bg-white/5 border-white/10 text-white hover:bg-white/10"
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Просмотр
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                {sessions.filter(s => s.status === 'completed').length === 0 && (
                  <div className="text-center py-12">
                    <CheckCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">Нет завершенных оценок</h3>
                    <p className="text-gray-400">Завершенные оценки будут отображаться здесь</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
