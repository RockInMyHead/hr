import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Separator } from './ui/separator';
import { 
  User, 
  BarChart3, 
  Target, 
  TrendingUp, 
  Award, 
  AlertTriangle,
  CheckCircle,
  Download,
  Calendar
} from 'lucide-react';
import { Button } from './ui/button';
import { CandidateProfile, EvaluationResult } from '../services/ragService';

interface CandidateProfileViewProps {
  profile: CandidateProfile;
  onExport?: () => void;
}

export const CandidateProfileView: React.FC<CandidateProfileViewProps> = ({ 
  profile, 
  onExport 
}) => {
  // Получение цвета для оценки
  const getScoreColor = (score: number): string => {
    if (score >= 80) return 'text-green-600 bg-green-50';
    if (score >= 60) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  // Получение уровня по баллу
  const getScoreLevel = (score: number): string => {
    if (score >= 90) return 'Отлично';
    if (score >= 80) return 'Хорошо';
    if (score >= 60) return 'Удовлетворительно';
    if (score >= 40) return 'Ниже среднего';
    return 'Неудовлетворительно';
  };

  // Экспорт профиля в PDF/JSON
  const handleExport = () => {
    const exportData = {
      candidateProfile: profile,
      generatedAt: new Date().toISOString(),
      summary: profile.summary
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `candidate-profile-${profile.timestamp}.json`;
    link.click();
    URL.revokeObjectURL(url);
    
    onExport?.();
  };

  return (
    <div className="space-y-6">
      {/* Заголовок профиля */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-xl">
                  {profile.name || 'Кандидат'}
                </CardTitle>
                <p className="text-sm text-gray-500">
                  Профиль создан {new Date(profile.timestamp).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge 
                className={`px-3 py-1 ${getScoreColor(profile.overallScore)}`}
                variant="outline"
              >
                {profile.overallScore}/100 - {getScoreLevel(profile.overallScore)}
              </Badge>
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="w-4 h-4 mr-2" />
                Экспорт
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Общая статистика */}
        <div className="lg:col-span-2 space-y-6">
          {/* Общий балл */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Общая оценка
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-4xl font-bold text-blue-600 mb-2">
                    {profile.overallScore}
                  </div>
                  <div className="text-sm text-gray-500">из 100 баллов</div>
                  <Progress value={profile.overallScore} className="w-full mt-4" />
                </div>
                
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-lg font-semibold">{profile.evaluations.length}</div>
                    <div className="text-xs text-gray-500">Вопросов</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold">
                      {Object.keys(profile.technicalSkills).length}
                    </div>
                    <div className="text-xs text-gray-500">Тех. навыков</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold">
                      {Object.keys(profile.softSkills).length}
                    </div>
                    <div className="text-xs text-gray-500">Софт скиллов</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Технические навыки */}
          {Object.keys(profile.technicalSkills).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Технические навыки
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(profile.technicalSkills).map(([skill, score]) => (
                    <div key={skill}>
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium capitalize">{skill}</span>
                        <Badge 
                          className={getScoreColor(score)}
                          variant="outline"
                        >
                          {score}/100
                        </Badge>
                      </div>
                      <Progress value={score} className="w-full" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Софт скиллы */}
          {Object.keys(profile.softSkills).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5" />
                  Софт скиллы
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(profile.softSkills).map(([skill, score]) => (
                    <div key={skill}>
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium capitalize">{skill}</span>
                        <Badge 
                          className={getScoreColor(score)}
                          variant="outline"
                        >
                          {score}/100
                        </Badge>
                      </div>
                      <Progress value={score} className="w-full" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Детальные оценки */}
          {profile.evaluations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  Детальные оценки
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {profile.evaluations.map((evaluation, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <Badge variant="outline" className="mb-2">
                            {evaluation.category}
                          </Badge>
                          <Badge 
                            variant="outline" 
                            className={`ml-2 ${getScoreColor(evaluation.score)}`}
                          >
                            {evaluation.score}/100
                          </Badge>
                        </div>
                        <span className="text-xs text-gray-500">#{index + 1}</span>
                      </div>

                      {evaluation.strengths.length > 0 && (
                        <div className="mb-3">
                          <h4 className="text-sm font-medium text-green-700 mb-1 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            Сильные стороны
                          </h4>
                          <ul className="text-xs text-gray-600 space-y-1">
                            {evaluation.strengths.map((strength, i) => (
                              <li key={i} className="flex items-start gap-1">
                                <span className="text-green-500 mt-0.5">•</span>
                                <span>{strength}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {evaluation.weaknesses.length > 0 && (
                        <div className="mb-3">
                          <h4 className="text-sm font-medium text-red-700 mb-1 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            Слабые стороны
                          </h4>
                          <ul className="text-xs text-gray-600 space-y-1">
                            {evaluation.weaknesses.map((weakness, i) => (
                              <li key={i} className="flex items-start gap-1">
                                <span className="text-red-500 mt-0.5">•</span>
                                <span>{weakness}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {evaluation.recommendations.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-blue-700 mb-1 flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" />
                            Рекомендации
                          </h4>
                          <ul className="text-xs text-gray-600 space-y-1">
                            {evaluation.recommendations.map((recommendation, i) => (
                              <li key={i} className="flex items-start gap-1">
                                <span className="text-blue-500 mt-0.5">•</span>
                                <span>{recommendation}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Боковая панель */}
        <div className="space-y-6">
          {/* Резюме */}
          {profile.summary && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <User className="w-5 h-5" />
                  Резюме
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {profile.summary}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Общие рекомендации */}
          {profile.recommendations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <TrendingUp className="w-5 h-5" />
                  Рекомендации
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {profile.recommendations.map((recommendation, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <span className="text-blue-500 mt-1 flex-shrink-0">•</span>
                      <span className="text-gray-700">{recommendation}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Статистика по времени */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calendar className="w-5 h-5" />
                Информация
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Создан:</span>
                <span className="font-medium">
                  {new Date(profile.timestamp).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Время:</span>
                <span className="font-medium">
                  {new Date(profile.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Общий балл:</span>
                <span className={`font-medium ${
                  profile.overallScore >= 80 ? 'text-green-600' : 
                  profile.overallScore >= 60 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {getScoreLevel(profile.overallScore)}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CandidateProfileView;