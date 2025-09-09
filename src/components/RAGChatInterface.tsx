import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  ArrowLeft, 
  Brain, 
  Send, 
  Bot, 
  User, 
  MessageSquare,
  Zap,
  Target,
  Clock,
  History,
  Download
} from 'lucide-react';
import RAGService, { ChatMessage, CandidateProfile, KnowledgeItem } from '../services/ragService';
import { chatService, ChatService } from '../services/chatService';
import type { AppUser } from '@/types/profile';
import { API_CONFIG } from '../config/api';

interface RAGChatInterfaceProps {
  user: AppUser;
  onBack: () => void;
}

export function RAGChatInterface({ user, onBack }: RAGChatInterfaceProps) {
  const [ragService] = useState(() => new RAGService());
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [currentProfile, setCurrentProfile] = useState<CandidateProfile | null>(null);
  const [messageCount, setMessageCount] = useState(0);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Автопрокрутка к последнему сообщению
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Автоматический старт сессии
  useEffect(() => {
    initializeSession();
  }, []);

  // Загрузка истории чатов
  useEffect(() => {
    loadChatHistory();
  }, [user]);

  const initializeSession = async () => {
    console.log('RAG: Initializing session for user:', user.email);
    try {
      // Попытка восстановить активную сессию
      const restoredSession = await chatService.restoreSessionFromStorage(user);
      console.log('RAG: Restored session:', restoredSession?.id || 'none');
      
      if (restoredSession) {
        console.log('RAG: Using existing session:', restoredSession.id);
        setCurrentSessionId(restoredSession.id);
        // Загружаем сообщения из базы данных
        const savedMessages = await chatService.getSessionMessages(restoredSession.id);
        console.log('RAG: Loaded messages from DB:', savedMessages.length);
        setMessages(savedMessages);
        setMessageCount(savedMessages.filter(m => m.role === 'user').length);
        setSessionStarted(true);
        
        // Загружаем профиль если есть
        const profile = await chatService.getCandidateProfile(restoredSession.id);
        if (profile) {
          console.log('RAG: Loaded profile with score:', profile.overallScore);
          setCurrentProfile(profile);
        }
      } else {
        console.log('RAG: Creating new session');
        // Создаем новую сессию
        await startNewSession();
      }
    } catch (error) {
      console.error('RAG Session initialization error:', error);
      await startNewSession();
    }
  };

  const startNewSession = async () => {
    console.log('RAG: Starting new session...');
    setSessionStarted(true);
    setIsLoading(true);

    try {
      // Создаем новую сессию в базе данных
      const session = await chatService.createChatSession({
        user,
        sessionType: 'rag-chat',
        metadata: { difficulty: 'middle' }
      });
      console.log('RAG: Created new session:', session.id);

      setCurrentSessionId(session.id);
      chatService.saveSessionToStorage(user, session.id);
      console.log('RAG: Session saved to localStorage');

      // Генерируем приветственное сообщение через AI
      const welcomeMessage = await generateWelcomeMessage(user);

      // Добавляем приветственное сообщение в базу данных
      const dbMessage = await chatService.addMessage(session.id, {
        role: 'assistant',
        content: welcomeMessage,
        messageType: 'text'
      });

      setMessages([dbMessage]);
    } catch (error) {
      console.error('Session start error:', error);
      
      // Генерируем fallback приветственное сообщение
      const fallbackMessage = await generateWelcomeMessage(user);

      if (currentSessionId) {
        const dbMessage = await chatService.addMessage(currentSessionId, {
          role: 'assistant',
          content: fallbackMessage,
          messageType: 'text'
        });
        setMessages([dbMessage]);
      } else {
        setMessages([{
          id: 'temp-1',
          sessionId: 'temp',
          role: 'assistant',
          content: fallbackMessage,
          timestamp: Date.now()
        }]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Генерация приветственного сообщения
  const generateWelcomeMessage = async (user: AppUser): Promise<string> => {
    const prompt = `Сгенерируй простое приветственное сообщение для начала HR-интервью.

ЗАДАЧА:
- Просто поприветствуй кандидата словом "Привет!"

СТИЛЬ:
- Очень короткое и простое
- Только слово "Привет!"

Верни только "Привет!".`;

    try {
      const response = await fetch(API_CONFIG.openaiURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'system', content: prompt }],
          max_tokens: 500,
          temperature: 0.7
        })
      });

      const data = await response.json();
      if (data.choices && data.choices[0]) {
        return data.choices[0].message.content;
      }
    } catch (error) {
      console.error('Error generating welcome message:', error);
    }

    return `Привет!`;
  };

  const loadChatHistory = async () => {
    try {
      const history = await chatService.getUserChatHistory(user.email, 10);
      setChatHistory(history);
    } catch (error) {
      console.error('Failed to load chat history:', error);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) {
      console.log('RAG sendMessage blocked:', { 
        hasMessage: !!inputMessage.trim(), 
        isLoading, 
        hasSessionId: !!currentSessionId 
      });
      return;
    }

    if (!currentSessionId) {
      console.error('RAG: No active session ID, cannot send message');
      alert('Ошибка: Нет активной сессии. Пожалуйста, перезагрузите страницу.');
      return;
    }

    console.log('RAG sendMessage starting:', { 
      sessionId: currentSessionId, 
      messageLength: inputMessage.length 
    });

    setIsLoading(true);
    const messageText = inputMessage;
    setInputMessage('');

    try {
      // Сохраняем сообщение пользователя в базу данных
      console.log('RAG: Saving user message to database...');
      const userMessage = await chatService.addMessage(currentSessionId, {
        role: 'user',
        content: messageText,
        messageType: 'text'
      });
      console.log('RAG: User message saved:', userMessage.id);

      setMessages(prev => [...prev, userMessage]);
      setMessageCount(prev => prev + 1);

      // Получаем ответ от RAG
      console.log('RAG: Getting response from RAG service...');
      const response = await ragService.conductInterview(messageText, 'middle');
      
      // Сохраняем ответ ассистента в базу данных
      console.log('RAG: Saving assistant message to database...');
      const assistantMessage = await chatService.addMessage(currentSessionId, {
        role: 'assistant',
        content: response,
        messageType: 'text'
      });
      console.log('RAG: Assistant message saved:', assistantMessage.id);

      setMessages(prev => [...prev, assistantMessage]);
      
      // Автоматическая оценка ответа
      await ragService.autoEvaluateLastResponse();

      // Небольшая задержка для завершения оценки
      await new Promise(resolve => setTimeout(resolve, 500));

      // Обновляем профиль
      const updatedProfile = ragService.getCurrentProfile();
      if (updatedProfile) {
        // Сохраняем профиль в базу данных
        const savedProfile = await chatService.saveCandidateProfile(currentSessionId, {
          overallScore: updatedProfile.overallScore,
          technicalSkills: JSON.stringify(updatedProfile.technicalSkills),
          softSkills: JSON.stringify(updatedProfile.softSkills),
          summary: updatedProfile.summary,
          recommendations: JSON.stringify(updatedProfile.recommendations),
          strengths: JSON.stringify(updatedProfile.strengths),
          weaknesses: JSON.stringify(updatedProfile.weaknesses),
          aiAnalysis: JSON.stringify(updatedProfile.aiAnalysis || {}),
          individualDevelopmentPlan: JSON.stringify(updatedProfile.individualDevelopmentPlan || {})
        });
        setCurrentProfile(savedProfile);

        // Сохраняем компетенции
        await saveCompetenciesToDatabase(updatedProfile);
      }

    } catch (error) {
      console.error('RAG Send message error:', error);
      
      try {
        // Сохраняем сообщение об ошибке
        const errorMessage = await chatService.addMessage(currentSessionId, {
          role: 'assistant',
          content: 'Извините, произошла ошибка при обработке вашего ответа. Давайте продолжим - расскажите мне больше о вашем опыте работы.',
          messageType: 'text'
        });
        
        setMessages(prev => [...prev, errorMessage]);
      } catch (saveError) {
        console.error('RAG Error saving error message:', saveError);
        // Добавляем сообщение локально если не удалось сохранить в БД
        setMessages(prev => [...prev, {
          id: `temp-error-${Date.now()}`,
          sessionId: currentSessionId,
          role: 'assistant',
          content: 'Извините, произошла ошибка. Попробуйте еще раз.',
          timestamp: Date.now()
        }]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Сохранение компетенций в базу данных
  const saveCompetenciesToDatabase = async (profile: any) => {
    try {
      if (!profile.softSkills && !profile.technicalSkills) return;

      // Извлекаем компетенции из профиля
      const softSkills = typeof profile.softSkills === 'string' 
        ? JSON.parse(profile.softSkills) 
        : profile.softSkills || [];
      
      const technicalSkills = typeof profile.technicalSkills === 'string'
        ? JSON.parse(profile.technicalSkills)
        : profile.technicalSkills || [];

      const assessments = [];

      // Добавляем soft skills
      if (Array.isArray(softSkills)) {
        softSkills.forEach(skill => {
          if (typeof skill === 'string' && skill.length > 2) {
            assessments.push({
              competencyId: skill.toLowerCase().replace(/\s+/g, '_'),
              currentValue: Math.min(5, Math.max(1, Math.round(profile.overallScore / 20) || 3)),
              targetValue: 5,
              category: 'soft',
              lastAssessed: Date.now(),
              source: 'rag_interview'
            });
          }
        });
      }

      // Добавляем technical skills
      if (Array.isArray(technicalSkills)) {
        technicalSkills.forEach(skill => {
          if (typeof skill === 'string' && skill.length > 2) {
            assessments.push({
              competencyId: skill.toLowerCase().replace(/\s+/g, '_'),
              currentValue: Math.min(5, Math.max(1, Math.round(profile.overallScore / 20) || 3)),
              targetValue: 5,
              category: 'technical',
              lastAssessed: Date.now(),
              source: 'rag_interview'
            });
          }
        });
      }

      if (assessments.length === 0) return;

      // Отправляем данные на сервер
      const response = await fetch('/api/competency-assessments/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          email: user.email,
          sessionId: currentSessionId,
          assessments,
          source: 'rag_interview'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save competencies');
      }

      console.log('RAG competencies saved to database successfully');
    } catch (error) {
      console.error('Error saving RAG competencies to database:', error);
    }
  };

  const generateFinalProfile = async () => {
    if (messageCount < 3) {
      alert('Пожалуйста, ответьте еще на несколько вопросов для создания полного профиля.');
      return;
    }

    if (!currentSessionId) return;

    setIsLoading(true);
    try {
      const finalProfile = await ragService.generateFinalProfile();
      
      // Сохраняем финальный профиль в базу данных
      const savedProfile = await chatService.saveCandidateProfile(currentSessionId, {
        overallScore: finalProfile.overallScore,
        technicalSkills: JSON.stringify(finalProfile.technicalSkills),
        softSkills: JSON.stringify(finalProfile.softSkills),
        summary: finalProfile.summary,
        recommendations: JSON.stringify(finalProfile.recommendations),
        strengths: JSON.stringify(finalProfile.strengths),
        weaknesses: JSON.stringify(finalProfile.weaknesses),
        aiAnalysis: JSON.stringify(finalProfile.aiAnalysis || {}),
        individualDevelopmentPlan: JSON.stringify(finalProfile.individualDevelopmentPlan || {})
      });
      
      setCurrentProfile(savedProfile);
      
      const completionMessage = `Спасибо за интересную беседу! 🎉

Ваш профиль кандидата готов. Основные результаты:
• Общий балл: ${finalProfile.overallScore}/100
• Технических навыков оценено: ${Object.keys(finalProfile.technicalSkills).length}
• Soft skills оценено: ${Object.keys(finalProfile.softSkills).length}

${finalProfile.summary}

Рекомендации для развития:
${finalProfile.recommendations.slice(0, 3).map(rec => `• ${rec}`).join('\n')}`;

      // Сохраняем сообщение о завершении
      const dbMessage = await chatService.addMessage(currentSessionId, {
        role: 'assistant',
        content: completionMessage,
        messageType: 'text'
      });
      
      setMessages(prev => [...prev, dbMessage]);
      
      // Завершаем сессию
      await chatService.endSession(currentSessionId);
      chatService.removeSessionFromStorage(user);
      
    } catch (error) {
      console.error('Profile generation error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const exportChatData = async () => {
    if (!currentSessionId) return;
    
    try {
      const chatData = await chatService.exportChatData(currentSessionId);
      const dataStr = JSON.stringify(chatData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `chat-session-${currentSessionId}-${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', error);
      alert('Ошибка при экспорте данных');
    }
  };

  const loadHistorySession = async (sessionId: string) => {
    try {
      const session = await chatService.loadSession(sessionId);
      if (session) {
        setCurrentSessionId(sessionId);
        const messages = await chatService.getSessionMessages(sessionId);
        setMessages(messages);
        setMessageCount(messages.filter(m => m.role === 'user').length);
        
        const profile = await chatService.getCandidateProfile(sessionId);
        setCurrentProfile(profile);
        
        setShowHistory(false);
        chatService.saveSessionToStorage(user, sessionId);
      }
    } catch (error) {
      console.error('Failed to load history session:', error);
    }
  };

  const startNewChat = async () => {
    // Завершаем текущую сессию если есть
    if (currentSessionId) {
      await chatService.endSession(currentSessionId);
      chatService.removeSessionFromStorage(user);
    }
    
    // Сброс состояния
    setMessages([]);
    setCurrentProfile(null);
    setMessageCount(0);
    setCurrentSessionId(null);
    setSessionStarted(false);
    
    // Запуск новой сессии
    await startNewSession();
    await loadChatHistory(); // Обновляем историю
  };

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
              <h1 className="text-3xl font-bold text-white">AI Собеседование с RAG</h1>
              <p className="text-gray-400 text-sm">Интеллектуальное собеседование на основе базы знаний</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Badge className="bg-emerald-600 text-white">
              <Brain className="h-4 w-4 mr-1" />
              RAG Powered
            </Badge>
            <Badge className="bg-blue-600 text-white">
              <MessageSquare className="h-4 w-4 mr-1" />
              {messageCount} ответов
            </Badge>
            <Button 
              onClick={() => setShowHistory(!showHistory)} 
              variant="outline" 
              size="sm" 
              className="bg-white/5 border-white/10 text-white hover:bg-white/10"
            >
              <History className="h-4 w-4 mr-1" />
              История
            </Button>
            {currentSessionId && (
              <Button 
                onClick={exportChatData} 
                variant="outline" 
                size="sm" 
                className="bg-white/5 border-white/10 text-white hover:bg-white/10"
              >
                <Download className="h-4 w-4 mr-1" />
                Экспорт
              </Button>
            )}
          </div>
        </div>

        {/* История чатов */}
        {showHistory && (
          <Card className="bg-white/5 border-white/10 text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                История чатов
              </CardTitle>
            </CardHeader>
            <CardContent>
              {chatHistory.length === 0 ? (
                <p className="text-gray-400">Нет сохраненных чатов</p>
              ) : (
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {chatHistory.map((history) => (
                    <div 
                      key={history.session.id}
                      className="p-3 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10 transition-colors"
                      onClick={() => loadHistorySession(history.session.id)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium">{history.session.sessionType}</div>
                          <div className="text-sm text-gray-400">
                            {new Date(history.session.startTime).toLocaleString('ru')}
                          </div>
                          <div className="text-xs text-gray-500">
                            {history.messages.length} сообщений
                            {history.profile && ` • Балл: ${history.profile.overallScore}/100`}
                          </div>
                        </div>
                        <Badge 
                          className={history.session.status === 'completed' ? 'bg-green-600' : 'bg-yellow-600'}
                        >
                          {history.session.status === 'completed' ? 'Завершен' : 'Активный'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-4 pt-4 border-t border-white/10">
                <Button 
                  onClick={startNewChat}
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                >
                  Начать новый чат
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Основной чат */}
          <div className="lg:col-span-3">
            <Card className="bg-white/5 border-white/10 text-white h-[600px] flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="h-5 w-5 text-emerald-400" />
                  RAG HR Assistant
                </CardTitle>
                <div className="text-sm text-gray-400">
                  Используется технология RAG для интеллектуального подбора вопросов
                </div>
              </CardHeader>

              <CardContent className="flex-1 overflow-y-auto space-y-4 p-4">
                {messages.map((message, index) => (
                  <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] p-4 rounded-xl ${
                      message.role === 'user'
                        ? 'bg-emerald-600 text-white ml-4'
                        : 'bg-white/10 text-white mr-4'
                    }`}>
                      <div className="flex items-center gap-2 mb-2">
                        {message.role === 'assistant' ? (
                          <Bot className="h-4 w-4 text-emerald-400" />
                        ) : (
                          <User className="h-4 w-4 text-blue-400" />
                        )}
                        <span className="text-sm font-medium">
                          {message.role === 'assistant' ? 'RAG Assistant' : user.name}
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="whitespace-pre-wrap leading-relaxed">
                        {message.content}
                      </div>
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white/10 text-white p-4 rounded-xl mr-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Bot className="h-4 w-4 text-emerald-400" />
                        <span className="text-sm font-medium">RAG Assistant</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </CardContent>

              {/* Ввод сообщения */}
              <div className="p-4 border-t border-white/10">
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <Input
                      placeholder="Введите ваш ответ... (Enter для отправки)"
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      className="bg-white/5 border-white/10 text-white placeholder:text-gray-400 flex-1"
                      disabled={isLoading}
                    />
                    <Button
                      onClick={sendMessage}
                      disabled={!inputMessage.trim() || isLoading}
                      className="bg-emerald-600 hover:bg-emerald-700 px-6"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {messageCount >= 3 && (
                    <Button
                      onClick={generateFinalProfile}
                      disabled={isLoading}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      <Target className="h-4 w-4 mr-2" />
                      Завершить собеседование и создать профиль
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          </div>

          {/* Панель статистики */}
          <div className="space-y-6">
            {/* Прогресс собеседования */}
            <Card className="bg-white/5 border-white/10 text-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Zap className="h-5 w-5 text-yellow-500" />
                  Прогресс
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Ответов дано</span>
                    <span className="font-medium">{messageCount}</span>
                  </div>
                  <Progress value={Math.min((messageCount / 8) * 100, 100)} className="h-2" />
                  <div className="text-xs text-gray-400">
                    Рекомендуется 5-8 ответов для полного профиля
                  </div>
                </div>

                {currentProfile && (
                  <>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Общий балл</span>
                        <span className="font-medium">{currentProfile.overallScore}/100</span>
                      </div>
                      <Progress value={currentProfile.overallScore} className="h-2" />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Время сессии</span>
                        <span className="font-medium">
                          {Math.round((Date.now() - (currentProfile.timestamp || Date.now())) / 60000)} мин
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Текущие оценки */}
                            {currentProfile && currentProfile.technicalSkills && (
              <Card className="bg-white/5 border-white/10 text-white">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Brain className="h-5 w-5 text-purple-500" />
                    Оценки навыков
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {(() => {
                      try {
                        const skills = JSON.parse(currentProfile.technicalSkills);
                        return Object.entries(skills).slice(0, 4).map(([skill, score]) => (
                          <div key={skill} className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span className="truncate">{skill}</span>
                              <span className="font-medium">{score}/100</span>
                            </div>
                            <Progress value={score as number} className="h-1" />
                          </div>
                        ));
                      } catch {
                        return <div className="text-gray-400">Навыки пока не оценены</div>;
                      }
                    })()}
                    
                    {(() => {
                      try {
                        const skills = JSON.parse(currentProfile.technicalSkills);
                        const skillCount = Object.keys(skills).length;
                        return skillCount > 4 && (
                          <div className="text-xs text-gray-400 text-center">
                            +{skillCount - 4} навыков
                          </div>
                        );
                      } catch {
                        return null;
                      }
                    })()}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Подсказки */}
            <Card className="bg-white/5 border-white/10 text-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Clock className="h-5 w-5 text-blue-500" />
                  Советы
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-gray-300">
                  <div>• Отвечайте подробно на вопросы</div>
                  <div>• Приводите конкретные примеры</div>
                  <div>• Упоминайте используемые технологии</div>
                  <div>• Рассказывайте о достижениях</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RAGChatInterface;
