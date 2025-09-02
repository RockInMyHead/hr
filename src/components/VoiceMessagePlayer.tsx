import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  Play,
  Pause,
  Download,
  Volume2,
  VolumeX,
  RotateCcw
} from 'lucide-react';

interface VoiceMessagePlayerProps {
  audioUrl?: string;
  audioBlob?: Blob;
  duration?: number; // в секундах
  className?: string;
  showDownload?: boolean;
  onPlaybackStart?: () => void;
  onPlaybackEnd?: () => void;
}

export function VoiceMessagePlayer({
  audioUrl,
  audioBlob,
  duration,
  className = '',
  showDownload = true,
  onPlaybackStart,
  onPlaybackEnd
}: VoiceMessagePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(duration || 0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  // Создание URL для Blob если нет audioUrl
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    if (audioBlob && !audioUrl) {
      const url = URL.createObjectURL(audioBlob);
      setBlobUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [audioBlob, audioUrl]);

  const finalAudioUrl = audioUrl || blobUrl;

  // Загрузка метаданных аудио
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !finalAudioUrl) return;

    const handleLoadedMetadata = () => {
      setAudioDuration(audio.duration);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      onPlaybackEnd?.();
    };

    const handleLoadStart = () => {
      setIsLoading(true);
    };

    const handleCanPlay = () => {
      setIsLoading(false);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('canplay', handleCanPlay);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('canplay', handleCanPlay);
    };
  }, [finalAudioUrl, onPlaybackEnd]);

  // Управление громкостью
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  const togglePlayPause = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    try {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        await audio.play();
        setIsPlaying(true);
        onPlaybackStart?.();
      }
    } catch (error) {
      console.error('Error playing audio:', error);
    }
  };

  const handleProgressClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    const progressBar = progressRef.current;
    if (!audio || !progressBar) return;

    const rect = progressBar.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const progressWidth = rect.width;
    const clickProgress = clickX / progressWidth;
    const newTime = clickProgress * audioDuration;

    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0]);
    setIsMuted(value[0] === 0);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const restart = () => {
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = 0;
      setCurrentTime(0);
      if (!isPlaying) {
        togglePlayPause();
      }
    }
  };

  const handleDownload = () => {
    if (!finalAudioUrl) return;

    const link = document.createElement('a');
    link.href = finalAudioUrl;
    link.download = `voice_message_${Date.now()}.wav`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatTime = (time: number): string => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!finalAudioUrl) {
    return (
      <div className={`flex items-center gap-2 p-3 bg-gray-100 rounded-lg ${className}`}>
        <div className="text-gray-500 text-sm">Аудио недоступно</div>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 p-3 bg-gray-50 rounded-lg border ${className}`}>
      {/* Аудио элемент */}
      <audio ref={audioRef} src={finalAudioUrl} preload="metadata" />

      {/* Кнопка воспроизведения/паузы */}
      <Button
        variant="outline"
        size="sm"
        onClick={togglePlayPause}
        disabled={isLoading}
        className="flex-shrink-0 h-8 w-8 p-0"
      >
        {isLoading ? (
          <div className="animate-spin h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full" />
        ) : isPlaying ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4" />
        )}
      </Button>

      {/* Кнопка перезапуска */}
      <Button
        variant="ghost"
        size="sm"
        onClick={restart}
        className="flex-shrink-0 h-8 w-8 p-0"
        title="Перезапустить"
      >
        <RotateCcw className="h-4 w-4" />
      </Button>

      {/* Полоса прогресса */}
      <div className="flex-1 flex items-center gap-2 min-w-0">
        <div
          ref={progressRef}
          className="flex-1 h-2 bg-gray-200 rounded-full cursor-pointer relative"
          onClick={handleProgressClick}
        >
          <div
            className="h-full bg-blue-500 rounded-full transition-all duration-100"
            style={{ width: `${audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0}%` }}
          />
        </div>

        {/* Время */}
        <div className="text-xs text-gray-500 flex-shrink-0 min-w-[60px]">
          {formatTime(currentTime)} / {formatTime(audioDuration)}
        </div>
      </div>

      {/* Контроль громкости */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleMute}
          className="h-8 w-8 p-0"
          title={isMuted ? "Включить звук" : "Выключить звук"}
        >
          {isMuted || volume === 0 ? (
            <VolumeX className="h-4 w-4" />
          ) : (
            <Volume2 className="h-4 w-4" />
          )}
        </Button>

        <div className="w-16">
          <Slider
            value={[isMuted ? 0 : volume]}
            onValueChange={handleVolumeChange}
            max={1}
            step={0.1}
            className="cursor-pointer"
          />
        </div>
      </div>

      {/* Кнопка скачивания */}
      {showDownload && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDownload}
          className="flex-shrink-0 h-8 w-8 p-0"
          title="Скачать аудио"
        >
          <Download className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

export default VoiceMessagePlayer;
