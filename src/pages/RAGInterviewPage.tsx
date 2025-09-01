import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { 
  Database, 
  MessageSquare, 
  BarChart3, 
  Brain, 
  Users,
  Zap,
  FileText,
  Settings
} from 'lucide-react';
import KnowledgeBase from '../components/KnowledgeBase';
import RAGInterview from '../components/RAGInterview';
import CandidateProfileView from '../components/CandidateProfileView';
import { CandidateProfile, KnowledgeItem } from '../services/ragService';

interface RAGInterviewPageProps {
  // Пропсы не требуются для этой страницы
  children?: React.ReactNode;
}

export const RAGInterviewPage: React.FC<RAGInterviewPageProps> = () => {
  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeItem[]>([]);
  const [currentProfile, setCurrentProfile] = useState<CandidateProfile | null>(null);
  const [savedProfiles, setSavedProfiles] = useState<CandidateProfile[]>([]);

  // Обновление базы знаний
  const handleKnowledgeUpdate = (knowledge: KnowledgeItem[]) => {
    setKnowledgeBase(knowledge);
  };

  // Сохранение профиля кандидата
  const handleProfileGenerated = (profile: CandidateProfile) => {
    setCurrentProfile(profile);
    setSavedProfiles(prev => [profile, ...prev]);
    
    // Сохраняем в localStorage
    const savedProfilesKey = 'hr-candidate-profiles';
    const existingProfiles = JSON.parse(localStorage.getItem(savedProfilesKey) || '[]');
    const updatedProfiles = [profile, ...existingProfiles].slice(0, 10); // Храним только 10 последних
    localStorage.setItem(savedProfilesKey, JSON.stringify(updatedProfiles));
  };

  // Загрузка сохраненных профилей при инициализации
  React.useEffect(() => {
    const savedProfilesKey = 'hr-candidate-profiles';
    const saved = localStorage.getItem(savedProfilesKey);
    if (saved) {
      try {
        setSavedProfiles(JSON.parse(saved));
      } catch (error) {
        console.error('Error loading saved profiles:', error);
      }
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Заголовок */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                AI HR Assistant с RAG
              </h1>
              <p className="text-gray-600">
                Интеллектуальная система проведения собеседований на основе базы знаний
              </p>
            </div>
          </div>

          {/* Статистика */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Database className="w-8 h-8 text-blue-600" />
                  <div>
                    <div className="text-2xl font-bold">{knowledgeBase.length}</div>
                    <div className="text-sm text-gray-600">Вопросов в базе</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Users className="w-8 h-8 text-green-600" />
                  <div>
                    <div className="text-2xl font-bold">{savedProfiles.length}</div>
                    <div className="text-sm text-gray-600">Профилей создано</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Zap className="w-8 h-8 text-yellow-600" />
                  <div>
                    <div className="text-2xl font-bold">
                      {currentProfile ? Math.round(currentProfile.overallScore) : 0}
                    </div>
                    <div className="text-sm text-gray-600">Текущий балл</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <BarChart3 className="w-8 h-8 text-purple-600" />
                  <div>
                    <div className="text-2xl font-bold">2</div>
                    <div className="text-sm text-gray-600">AI модели</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Основной интерфейс */}
        <Tabs defaultValue="knowledge" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="knowledge" className="flex items-center gap-2">
              <Database className="w-4 h-4" />
              База знаний
            </TabsTrigger>
            <TabsTrigger value="interview" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Собеседование
              {knowledgeBase.length === 0 && (
                <Badge variant="destructive" className="ml-1">!</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Профиль
              {currentProfile && (
                <Badge variant="default" className="ml-1">Новый</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              История
              {savedProfiles.length > 0 && (
                <Badge variant="outline" className="ml-1">{savedProfiles.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* База знаний */}
          <TabsContent value="knowledge">
            <div className="space-y-6">
              <div className="text-center py-4">
                <h2 className="text-xl font-semibold mb-2">Управление базой знаний</h2>
                <p className="text-gray-600">
                  Загрузите вопросы и ответы для проведения качественных собеседований
                </p>
              </div>
              <KnowledgeBase onKnowledgeUpdate={handleKnowledgeUpdate} />
            </div>
          </TabsContent>

          {/* Проведение собеседования */}
          <TabsContent value="interview">
            <div className="space-y-6">
              {knowledgeBase.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Database className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">База знаний пуста</h3>
                    <p className="text-gray-600 mb-4">
                      Для проведения собеседования необходимо загрузить вопросы в базу знаний
                    </p>
                    <Badge variant="outline">
                      Перейдите на вкладку "База знаний" для добавления вопросов
                    </Badge>
                  </CardContent>
                </Card>
              ) : (
                <>
                  <div className="text-center py-4">
                    <h2 className="text-xl font-semibold mb-2">AI Собеседование</h2>
                    <p className="text-gray-600">
                      Интеллектуальное собеседование с двумя AI моделями: интервьюер и оценщик
                    </p>
                    <div className="flex justify-center gap-4 mt-4">
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Brain className="w-3 h-3" />
                        GPT-4o Mini - Интервьюер
                      </Badge>
                      <Badge variant="outline" className="flex items-center gap-1">
                        <BarChart3 className="w-3 h-3" />
                        GPT-4o - Оценщик
                      </Badge>
                    </div>
                  </div>
                  
                  <RAGInterview 
                    knowledgeBase={knowledgeBase}
                    onProfileGenerated={handleProfileGenerated}
                  />
                </>
              )}
            </div>
          </TabsContent>

          {/* Текущий профиль */}
          <TabsContent value="profile">
            <div className="space-y-6">
              {currentProfile ? (
                <>
                  <div className="text-center py-4">
                    <h2 className="text-xl font-semibold mb-2">Профиль кандидата</h2>
                    <p className="text-gray-600">
                      Детальный анализ результатов собеседования
                    </p>
                  </div>
                  <CandidateProfileView 
                    profile={currentProfile}
                    onExport={() => console.log('Profile exported')}
                  />
                </>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Профиль не создан</h3>
                    <p className="text-gray-600 mb-4">
                      Завершите собеседование для генерации профиля кандидата
                    </p>
                    <Badge variant="outline">
                      Проведите собеседование на вкладке "Собеседование"
                    </Badge>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* История профилей */}
          <TabsContent value="history">
            <div className="space-y-6">
              <div className="text-center py-4">
                <h2 className="text-xl font-semibold mb-2">История собеседований</h2>
                <p className="text-gray-600">
                  Просмотр ранее созданных профилей кандидатов
                </p>
              </div>

              {savedProfiles.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">История пуста</h3>
                    <p className="text-gray-600 mb-4">
                      Здесь будут отображаться профили кандидатов после проведения собеседований
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {savedProfiles.map((profile, index) => (
                    <Card key={index} className="cursor-pointer hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <span className="truncate">
                            {profile.name || `Кандидат #${index + 1}`}
                          </span>
                          <Badge 
                            variant="outline"
                            className={`${
                              profile.overallScore >= 80 ? 'text-green-600' :
                              profile.overallScore >= 60 ? 'text-yellow-600' :
                              'text-red-600'
                            }`}
                          >
                            {profile.overallScore}/100
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Дата:</span>
                            <span>{new Date(profile.timestamp).toLocaleDateString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Вопросов:</span>
                            <span>{profile.evaluations.length}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Навыков оценено:</span>
                            <span>
                              {Object.keys(profile.technicalSkills).length + 
                               Object.keys(profile.softSkills).length}
                            </span>
                          </div>
                        </div>
                        {profile.summary && (
                          <p className="text-xs text-gray-600 mt-3 line-clamp-2">
                            {profile.summary.substring(0, 100)}...
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default RAGInterviewPage;