import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Shield, Eye, EyeOff, Mail, Search, MessageSquare } from 'lucide-react';
import type { PrivacySettings as PrivacySettingsType } from '@/types/profile';

interface PrivacySettingsProps {
  settings: PrivacySettingsType;
  onSettingsChange: (settings: PrivacySettingsType) => void;
  disabled?: boolean;
}

const defaultPrivacySettings: PrivacySettingsType = {
  showEmail: false,
  showPosition: true,
  showContactInfo: false,
  showInSearch: true,
  allowDirectMessages: true,
};

export function PrivacySettings({ settings, onSettingsChange, disabled = false }: PrivacySettingsProps) {
  const currentSettings = { ...defaultPrivacySettings, ...settings };

  const handleToggle = (key: keyof PrivacySettingsType) => {
    const newSettings = {
      ...currentSettings,
      [key]: !currentSettings[key],
    };
    onSettingsChange(newSettings);
  };

  const privacyOptions = [
    {
      key: 'showEmail' as keyof PrivacySettingsType,
      title: 'Показывать email',
      description: 'Другие пользователи смогут видеть ваш email адрес',
      icon: <Mail className="h-4 w-4" />,
      recommended: false,
    },
    {
      key: 'showPosition' as keyof PrivacySettingsType,
      title: 'Показывать должность',
      description: 'Ваша должность будет видна в профиле и оргструктуре',
      icon: <Eye className="h-4 w-4" />,
      recommended: true,
    },
    {
      key: 'showContactInfo' as keyof PrivacySettingsType,
      title: 'Показывать контактную информацию',
      description: 'Номер телефона и другие контакты (если добавлены)',
      icon: <Eye className="h-4 w-4" />,
      recommended: false,
    },
    {
      key: 'showInSearch' as keyof PrivacySettingsType,
      title: 'Показывать в поиске',
      description: 'Ваш профиль будет отображаться в результатах поиска по организации',
      icon: <Search className="h-4 w-4" />,
      recommended: true,
    },
    {
      key: 'allowDirectMessages' as keyof PrivacySettingsType,
      title: 'Разрешить прямые сообщения',
      description: 'Другие пользователи смогут отправлять вам сообщения напрямую',
      icon: <MessageSquare className="h-4 w-4" />,
      recommended: true,
    },
  ];

  return (
    <Card className="bg-white/5 backdrop-blur-xl border border-white/10 text-white">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-blue-400" />
          <div>
            <CardTitle className="text-xl text-white">Настройки приватности</CardTitle>
            <CardDescription className="text-gray-400">
              Управляйте видимостью вашей информации для других пользователей
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {privacyOptions.map((option, index) => (
          <div key={option.key}>
            <div className="flex items-center justify-between py-3">
              <div className="flex items-start gap-3 flex-1">
                <div className="text-gray-400 mt-1">
                  {option.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Label htmlFor={option.key} className="text-sm font-medium text-white cursor-pointer">
                      {option.title}
                    </Label>
                    {option.recommended && (
                      <span className="text-xs bg-green-500/20 text-green-300 px-2 py-0.5 rounded-full">
                        Рекомендуется
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {option.description}
                  </p>
                </div>
              </div>
              
              <Switch
                id={option.key}
                checked={currentSettings[option.key]}
                onCheckedChange={() => handleToggle(option.key)}
                disabled={disabled}
                className="data-[state=checked]:bg-blue-500"
              />
            </div>
            
            {index < privacyOptions.length - 1 && (
              <Separator className="bg-white/10" />
            )}
          </div>
        ))}

        <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-blue-400 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-blue-300 mb-1">
                Информация о приватности
              </h4>
              <p className="text-xs text-blue-200/80">
                Эти настройки влияют только на видимость информации для других пользователей. 
                Администраторы и ваши непосредственные руководители могут иметь доступ к 
                дополнительной информации в рамках своих служебных обязанностей.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
