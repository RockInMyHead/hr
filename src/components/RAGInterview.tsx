import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback } from './ui/avatar';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { Progress } from './ui/progress';
import { 
  MessageCircle, 
  Send, 
  Bot, 
  User, 
  BarChart3, 
  FileText, 
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';
import RAGService, { ChatMessage, CandidateProfile, EvaluationResult, KnowledgeItem } from '../services/ragService';

interface RAGInterviewProps {
  knowledgeBase?: KnowledgeItem[];
  onProfileGenerated?: (profile: CandidateProfile) => void;
}

export const RAGInterview: React.FC<RAGInterviewProps> = ({ 
  knowledgeBase = [], 
  onProfileGenerated 
}) => {
  const [ragService] = useState(() => new RAGService());
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentProfile, setCurrentProfile] = useState<CandidateProfile | null>(null);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [difficulty, setDifficulty] = useState<'junior' | 'middle' | 'senior'>('middle');
  const [candidateName, setCandidateName] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Автопрокрутка сообщений
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Обновление базы знаний в RAG сервисе
  useEffect(() => {
    if (knowledgeBase.length > 0) {
      ragService.updateKnowledgeBase(knowledgeBase);
    }
  }, [knowledgeBase, ragService]);

  // Начало сессии собеседования
  const startInterview = async () => {
    if (!candidateName.trim()) {
      alert('Пожалуйста, введите имя кандидата');
      return;
    }

    setSessionStarted(true);
    setIsLoading(true);

    // Приветственное сообщение от ассистента
    const welcomeMessage = await ragService.conductInterview(
      `Привет! Меня зовут ${candidateName}, готов к собеседованию на позицию ${difficulty} разработчика.`,
      difficulty
    );

    const newMessages: ChatMessage[] = [
      {
        role: 'assistant',
        content: welcomeMessage,
        timestamp: Date.now()
      }
    ];

    setMessages(newMessages);
    setIsLoading(false);
  };

  // Отправка сообщения
  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: inputMessage,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Получаем ответ от интервьюера
      const response = await ragService.conductInterview(inputMessage, difficulty);
      
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response,
        timestamp: Date.now()
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Автоматическая оценка ответа
      await ragService.autoEvaluateLastResponse();
      
      // Обновляем профиль
      const updatedProfile = ragService.getCurrentProfile();
      setCurrentProfile(updatedProfile);

    } catch (error) {
      console.error('Send message error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Извините, произошла ошибка. Попробуйте еще раз.',
        timestamp: Date.now()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Завершение интервью и генерация финального профиля
  const finishInterview = async () => {
    setIsLoading(true);
    try {
      const finalProfile = await ragService.generateFinalProfile();
      setCurrentProfile(finalProfile);
      onProfileGenerated?.(finalProfile);
      
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Спасибо за собеседование! Ваш профиль кандидата готов. Вы можете ознакомиться с результатами в разделе оценки.',
        timestamp: Date.now()
      }]);
    } catch (error) {
      console.error('Finish interview error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Сброс сессии
  const resetSession = () => {
    ragService.resetSession();
    setMessages([]);
    setCurrentProfile(null);
    setSessionStarted(false);
    setCandidateName('');
  };

  // Обработка Enter для отправки сообщения
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
      {/* Главная область чата */}
      <div className="lg:col-span-2">
        <Card className="h-full flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              AI HR Интервьюер
              {sessionStarted && (
                <Badge variant="outline" className="ml-auto">
                  {difficulty.toUpperCase()}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          
          <CardContent className="flex-1 flex flex-col">
            {!sessionStarted ? (
              // Настройка интервью
              <div className="space-y-6 max-w-md mx-auto mt-8">
                <div className="text-center">
                  <h3 className="text-lg font-semibold mb-2">Настройка собеседования</h3>
                  <p className="text-gray-600 text-sm">
                    Настройте параметры для проведения AI-собеседования
                  </p>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium block mb-2">
                      Имя кандидата
                    </label>
                    <Input
                      placeholder="Введите имя кандидата"
                      value={candidateName}
                      onChange={(e) => setCandidateName(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium block mb-2">
                      Уровень сложности
                    </label>
                    <select 
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      value={difficulty}
                      onChange={(e) => setDifficulty(e.target.value as 'junior' | 'middle' | 'senior')}
                    >
                      <option value="junior">Junior Developer</option>
                      <option value="middle">Middle Developer</option>
                      <option value="senior">Senior Developer</option>
                    </select>
                  </div>
                  
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Убедитесь, что база знаний загружена для проведения качественного собеседования.
                      Доступно вопросов: {knowledgeBase.length}
                    </AlertDescription>
                  </Alert>
                  
                  <Button 
                    onClick={startInterview} 
                    className="w-full"
                    disabled={!candidateName.trim() || knowledgeBase.length === 0}
                  >
                    Начать собеседование
                  </Button>
                </div>
              </div>
            ) : (
              // Область чата
              <>
                <ScrollArea className="flex-1 pr-4">
                  <div className="space-y-4">
                    {messages.map((message, index) => (
                      <div
                        key={index}
                        className={`flex gap-3 ${
                          message.role === 'user' ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        {message.role === 'assistant' && (
                          <Avatar className="w-8 h-8">
                            <AvatarFallback>
                              <Bot className="w-4 h-4" />
                            </AvatarFallback>
                          </Avatar>
                        )}
                        
                        <div
                          className={`max-w-[80%] rounded-lg px-4 py-2 ${
                            message.role === 'user'
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-900'
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap">
                            {message.content}
                          </p>
                          <p className="text-xs mt-1 opacity-70">
                            {new Date(message.timestamp || Date.now()).toLocaleTimeString()}
                          </p>
                        </div>
                        
                        {message.role === 'user' && (
                          <Avatar className="w-8 h-8">
                            <AvatarFallback>
                              <User className="w-4 h-4" />
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                    ))}
                    
                    {isLoading && (
                      <div className="flex gap-3 justify-start">
                        <Avatar className="w-8 h-8">
                          <AvatarFallback>
                            <Bot className="w-4 h-4" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="bg-gray-100 rounded-lg px-4 py-2">
                          <div className="flex items-center gap-2">
                            <div className="animate-pulse flex space-x-1">
                              <div className="rounded-full bg-gray-400 h-2 w-2"></div>
                              <div className="rounded-full bg-gray-400 h-2 w-2"></div>
                              <div className="rounded-full bg-gray-400 h-2 w-2"></div>
                            </div>
                            <span className="text-xs text-gray-500">печатает...</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div ref={messagesEndRef} />
                </ScrollArea>
                
                <Separator className="my-4" />
                
                {/* Область ввода */}
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Введите ваш ответ..."
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      disabled={isLoading}
                      className="flex-1"
                    />
                    <Button 
                      onClick={sendMessage} 
                      disabled={isLoading || !inputMessage.trim()}
                      size="icon"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      onClick={finishInterview} 
                      variant="outline"
                      className="flex-1"
                      disabled={isLoading || messages.length < 2}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Завершить интервью
                    </Button>
                    <Button 
                      onClick={resetSession} 
                      variant="outline"
                      disabled={isLoading}
                    >
                      Сбросить
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Панель статистики и профиля */}
      <div className="space-y-6">
        {/* Статистика сессии */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Статистика
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {sessionStarted && currentProfile ? (
              <>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Общий балл</span>
                    <span className="font-medium">{currentProfile.overallScore}/100</span>
                  </div>
                  <Progress value={currentProfile.overallScore} className="w-full" />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Вопросов отвечено</span>
                    <span className="font-medium">{currentProfile.evaluations.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Время сессии</span>
                    <span className="font-medium">
                      {currentProfile.createdAt
                        ? Math.round((Date.now() - currentProfile.createdAt) / 60000) + ' мин'
                        : '0 мин'
                      }
                    </span>
                  </div>
                </div>

                {Object.keys(currentProfile.technicalSkills).length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Технические навыки</h4>
                    <div className="space-y-1">
                      {Object.entries(currentProfile.technicalSkills).map(([skill, score]) => (
                        <div key={skill} className="flex justify-between text-xs">
                          <span className="truncate">{skill}</span>
                          <span className="font-medium">{score}/100</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center text-gray-500 text-sm py-4">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                Начните интервью для просмотра статистики
              </div>
            )}
          </CardContent>
        </Card>

        {/* Краткий профиль */}
        {currentProfile && currentProfile.summary && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Профиль кандидата
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <h4 className="font-medium text-sm mb-1">Резюме</h4>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    {currentProfile.summary}
                  </p>
                </div>
                
                {currentProfile.recommendations.length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm mb-1">Рекомендации</h4>
                    <ul className="text-xs text-gray-600 space-y-1">
                      {currentProfile.recommendations.slice(0, 3).map((rec, index) => (
                        <li key={index} className="flex items-start gap-1">
                          <span className="text-blue-500 mt-1">•</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default RAGInterview;