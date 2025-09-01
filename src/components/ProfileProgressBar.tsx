import React, { useState, useEffect } from 'react';
import { Progress } from './ui/progress';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { UserProfile, AppUser } from '@/types/profile';
import { TrendingUp, Target, CheckCircle, AlertCircle } from 'lucide-react';

interface ProfileProgressBarProps {
  user: AppUser;
}

interface ProfileCompletion {
  percentage: number;
  filledFields: string[];
  missingFields: string[];
  recommendations: string[];
}

const ProfileProgressBar: React.FC<ProfileProgressBarProps> = ({ user }) => {
  const [completion, setCompletion] = useState<ProfileCompletion>({
    percentage: 0,
    filledFields: [],
    missingFields: [],
    recommendations: []
  });

  useEffect(() => {
    calculateProfileCompletion();
  }, [user]);

  const calculateProfileCompletion = () => {
    const filledFields: string[] = [];
    const missingFields: string[] = [];
    const recommendations: string[] = [];

    // Проверяем базовые поля пользователя
    const basicFields = [
      { key: 'name', label: 'Имя', value: user.name },
      { key: 'email', label: 'Email', value: user.email },
      { key: 'position', label: 'Должность', value: user.position },
      { key: 'companyId', label: 'Компания', value: user.companyId }
    ];

    basicFields.forEach(field => {
      if (field.value && field.value.trim() !== '') {
        filledFields.push(field.label);
      } else {
        missingFields.push(field.label);
        recommendations.push(`Укажите ${field.label.toLowerCase()}`);
      }
    });

    // Проверяем специфичные поля для ролей
    if (user.role === 'manager') {
      if (user.rootEmployeeId) {
        filledFields.push('Employee ID');
      } else {
        missingFields.push('Employee ID');
        recommendations.push('Укажите ваш Employee ID для управления отделом');
      }
    }

    // Проверяем AI профиль из чата
    const aiProfile = getAIProfileData();
    if (aiProfile) {
      const aiFields = [
        { key: 'age', label: 'Возраст', value: aiProfile.age },
        { key: 'education', label: 'Образование', value: aiProfile.education },
        { key: 'experience', label: 'Опыт работы', value: aiProfile.experience },
        { key: 'technicalSkills', label: 'Технические навыки', value: aiProfile.technicalSkills },
        { key: 'softSkills', label: 'Soft skills', value: aiProfile.softSkills },
        { key: 'goals', label: 'Цели', value: aiProfile.goals },
        { key: 'achievements', label: 'Достижения', value: aiProfile.achievements }
      ];

      aiFields.forEach(field => {
        if (field.value && (Array.isArray(field.value) ? field.value.length > 0 : field.value.trim() !== '')) {
          filledFields.push(field.label);
        } else {
          missingFields.push(field.label);
        }
      });

      if (missingFields.length > 0 && filledFields.length < 7) {
        recommendations.push('Пройдите HR интервью для сбора дополнительной информации');
      }
    } else {
      recommendations.push('Пройдите HR интервью для создания персонального профиля');
    }

    // Рассчитываем процент
    const totalFields = basicFields.length + (user.role === 'manager' ? 1 : 0) + 7; // 7 полей AI профиля
    const percentage = Math.round((filledFields.length / totalFields) * 100);

    setCompletion({
      percentage,
      filledFields,
      missingFields,
      recommendations
    });
  };

  const getAIProfileData = (): UserProfile | null => {
    try {
      const raw = localStorage.getItem('hr-chat-profile');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };

  const getProgressColor = () => {
    if (completion.percentage >= 80) return 'bg-green-500';
    if (completion.percentage >= 60) return 'bg-yellow-500';
    if (completion.percentage >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getProgressText = () => {
    if (completion.percentage >= 80) return 'Отлично! Профиль почти заполнен';
    if (completion.percentage >= 60) return 'Хорошо! Осталось немного';
    if (completion.percentage >= 40) return 'Неплохо! Продолжайте заполнять';
    return 'Начните заполнять профиль';
  };

  const getProgressIcon = () => {
    if (completion.percentage >= 80) return <CheckCircle className="w-5 h-5 text-green-500" />;
    if (completion.percentage >= 60) return <TrendingUp className="w-5 h-5 text-yellow-500" />;
    return <AlertCircle className="w-5 h-5 text-orange-500" />;
  };

  return (
    <Card className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 border-purple-500/20 mb-6">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Target className="w-6 h-6 text-purple-400" />
            <h3 className="text-lg font-semibold text-white">Заполнение профиля</h3>
          </div>
          <Badge variant="outline" className="text-white border-purple-400">
            {completion.percentage}%
          </Badge>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <Progress
                value={completion.percentage}
                className="h-3 bg-gray-700"
              />
            </div>
            {getProgressIcon()}
          </div>

          <p className="text-sm text-gray-300">
            {getProgressText()}
          </p>

          {completion.recommendations.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-purple-300">Рекомендации для улучшения:</p>
              <ul className="text-xs text-gray-400 space-y-1">
                {completion.recommendations.slice(0, 3).map((rec, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-purple-400 mt-1">•</span>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="bg-green-900/20 rounded-lg p-3">
              <div className="text-green-400 font-medium">Заполнено</div>
              <div className="text-white">{completion.filledFields.length} полей</div>
            </div>
            <div className="bg-red-900/20 rounded-lg p-3">
              <div className="text-red-400 font-medium">Отсутствует</div>
              <div className="text-white">{completion.missingFields.length} полей</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProfileProgressBar;