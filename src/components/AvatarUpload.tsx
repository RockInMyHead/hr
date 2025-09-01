import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Upload, X, Camera } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface AvatarUploadProps {
  currentAvatar?: string;
  userName: string;
  onAvatarChange: (avatar: string | null) => void;
  disabled?: boolean;
}

export function AvatarUpload({ currentAvatar, userName, onAvatarChange, disabled = false }: AvatarUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Проверяем тип файла
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Ошибка',
        description: 'Пожалуйста, выберите изображение',
        variant: 'destructive'
      });
      return;
    }

    // Проверяем размер файла (максимум 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Ошибка',
        description: 'Размер файла не должен превышать 5MB',
        variant: 'destructive'
      });
      return;
    }

    setIsUploading(true);

    try {
      // Конвертируем файл в base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const base64 = e.target?.result as string;
          
          // Опционально: сжимаем изображение
          const compressedBase64 = await compressImage(base64, 150, 150);
          
          onAvatarChange(compressedBase64);
          toast({
            title: 'Успешно',
            description: 'Аватар обновлен'
          });
        } catch (error) {
          console.error('Error processing image:', error);
          toast({
            title: 'Ошибка',
            description: 'Не удалось обработать изображение',
            variant: 'destructive'
          });
        } finally {
          setIsUploading(false);
        }
      };

      reader.onerror = () => {
        toast({
          title: 'Ошибка',
          description: 'Не удалось прочитать файл',
          variant: 'destructive'
        });
        setIsUploading(false);
      };

      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить аватар',
        variant: 'destructive'
      });
      setIsUploading(false);
    }

    // Очищаем input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const compressImage = (base64: string, maxWidth: number, maxHeight: number): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Вычисляем новые размеры с сохранением пропорций
        let { width, height } = img;
        
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        // Рисуем изображение на canvas
        ctx?.drawImage(img, 0, 0, width, height);

        // Конвертируем обратно в base64
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);
        resolve(compressedBase64);
      };

      img.src = base64;
    });
  };

  const handleRemoveAvatar = () => {
    onAvatarChange(null);
    toast({
      title: 'Успешно',
      description: 'Аватар удален'
    });
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="relative">
        <Avatar className="h-24 w-24 border-4 border-white/10">
          <AvatarImage src={currentAvatar} alt={userName} />
          <AvatarFallback className="bg-gradient-to-br from-purple-600 to-blue-600 text-white text-xl font-bold">
            {getInitials(userName)}
          </AvatarFallback>
        </Avatar>
        
        {/* Кнопка для изменения аватара */}
        <Button
          size="sm"
          variant="outline"
          className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full bg-white/10 border-white/20 text-white hover:bg-white/20"
          onClick={handleUploadClick}
          disabled={disabled || isUploading}
        >
          <Camera className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleUploadClick}
          disabled={disabled || isUploading}
          className="bg-white/5 border-white/10 text-white hover:bg-white/10"
        >
          <Upload className="h-4 w-4 mr-2" />
          {isUploading ? 'Загрузка...' : 'Загрузить'}
        </Button>

        {currentAvatar && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleRemoveAvatar}
            disabled={disabled || isUploading}
            className="bg-white/5 border-white/10 text-white hover:bg-red-500/20 hover:border-red-500/50"
          >
            <X className="h-4 w-4 mr-2" />
            Удалить
          </Button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      <p className="text-xs text-gray-400 text-center max-w-xs">
        Рекомендуется квадратное изображение. Максимальный размер: 5MB.
        Поддерживаемые форматы: JPG, PNG, GIF, WebP.
      </p>
    </div>
  );
}
