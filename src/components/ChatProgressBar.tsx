import React, { useState, useEffect } from 'react';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { UserProfile } from '@/types/profile';
import { TrendingUp, Target, CheckCircle, AlertCircle, BarChart3 } from 'lucide-react';

interface ChatProgressBarProps {
  userProfile: UserProfile;
  className?: string;
}

interface ProfileCompletion {
  percentage: number;
  filledFields: string[];
  missingFields: string[];
  level: 'basic' | 'intermediate' | 'advanced';
}

const ChatProgressBar: React.FC<ChatProgressBarProps> = ({ userProfile, className = '' }) => {
  const [completion, setCompletion] = useState<ProfileCompletion>({
    percentage: 0,
    filledFields: [],
    missingFields: [],
    level: 'basic'
  });

  useEffect(() => {
    calculateProfileCompletion();
  }, [userProfile]);

  const calculateProfileCompletion = () => {
    const filledFields: string[] = [];
    const missingFields: string[] = [];

    // Проверяем AI профиль из чата
    const profileFields = [
      { key: 'name', label: 'Имя', value: userProfile.name },
      { key: 'age', label: 'Возраст', value: userProfile.age },
      { key: 'education', label: 'Образование', value: userProfile.education },
      { key: 'experience', label: 'Опыт работы', value: userProfile.experience },
      { key: 'technicalSkills', label: 'Технические навыки', value: userProfile.technicalSkills },
      { key: 'softSkills', label: 'Soft skills', value: userProfile.softSkills },
      { key: 'goals', label: 'Цели', value: userProfile.goals },
      { key: 'achievements', label: 'Достижения', value: userProfile.achievements },
      { key: 'personality', label: 'Личностные качества', value: userProfile.personality },
      { key: 'motivation', label: 'Мотивация', value: userProfile.motivation },
      { key: 'teamwork', label: 'Работа в команде', value: userProfile.teamwork },
      { key: 'leadership', label: 'Лидерство', value: userProfile.leadership },
      { key: 'problemSolving', label: 'Решение проблем', value: userProfile.problemSolving }
    ];

    profileFields.forEach(field => {
      if (field.value && (Array.isArray(field.value) ? field.value.length > 0 : field.value.trim() !== '')) {
        filledFields.push(field.label);
      } else {
        missingFields.push(field.label);
      }
    });

    // Рассчитываем процент
    const percentage = Math.round((filledFields.length / profileFields.length) * 100);

    // Определяем уровень
    let level: 'basic' | 'intermediate' | 'advanced' = 'basic';
    if (percentage >= 70) level = 'advanced';
    else if (percentage >= 40) level = 'intermediate';

    setCompletion({
      percentage,
      filledFields,
      missingFields,
      level
    });
  };

  const getLevelInfo = () => {
    switch (completion.level) {
      case 'basic':
        return {
          color: 'bg-red-500',
          text: 'Базовый профиль',
          icon: <AlertCircle className="w-4 h-4 text-red-400" />
        };
      case 'intermediate':
        return {
          color: 'bg-yellow-500',
          text: 'Средний профиль',
          icon: <TrendingUp className="w-4 h-4 text-yellow-400" />
        };
      case 'advanced':
        return {
          color: 'bg-green-500',
          text: 'Подробный профиль',
          icon: <CheckCircle className="w-4 h-4 text-green-400" />
        };
    }
  };

  const levelInfo = getLevelInfo();

  if (completion.percentage === 0) {
    return null; // Не показывать если профиль пустой
  }

  return (
    <div className={`bg-gray-900/50 border border-gray-700/50 rounded-lg p-3 mb-4 ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-purple-400" />
          <span className="text-sm font-medium text-white">Профиль кандидата</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs text-white border-purple-400">
            {completion.percentage}%
          </Badge>
          {levelInfo.icon}
        </div>
      </div>

      <div className="space-y-2">
        <Progress
          value={completion.percentage}
          className="h-2 bg-gray-700"
        />

        <div className="flex items-center justify-between text-xs">
          <span className={`font-medium ${completion.level === 'basic' ? 'text-red-400' : completion.level === 'intermediate' ? 'text-yellow-400' : 'text-green-400'}`}>
            {levelInfo.text}
          </span>
          <span className="text-gray-400">
            {completion.filledFields.length} из {completion.filledFields.length + completion.missingFields.length} полей
          </span>
        </div>

        {completion.filledFields.length > 0 && completion.filledFields.length < 5 && (
          <div className="text-xs text-gray-400">
            Заполнено: {completion.filledFields.slice(0, 3).join(', ')}
            {completion.filledFields.length > 3 && '...'}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatProgressBar;