import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Mic, 
  MicOff, 
  Play, 
  Pause, 
  Square, 
  Volume2,
  VolumeX,
  Info,
  Settings,
  CheckCircle,
  AlertTriangle,
  Trash2
} from 'lucide-react';

interface VoiceInputProps {
  onTranscription: (text: string) => void;
  onAudioData?: (audioBlob: Blob) => void;
  isListening?: boolean;
  disabled?: boolean;
  placeholder?: string;
  onClear?: () => void;
}

interface SpeechRecognitionEvent {
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string;
        confidence: number;
      };
      isFinal: boolean;
    };
  };
}

// Расширяем window для SpeechRecognition
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export function VoiceInput({ onTranscription, onAudioData, disabled = false, placeholder = "Нажмите для записи голоса", onClear }: VoiceInputProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [confidence, setConfidence] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [showInstructions, setShowInstructions] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isSupported, setIsSupported] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'prompt'>('prompt');

  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const animationRef = useRef<number | null>(null);

  // Проверка поддержки речевого ввода
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognition && !!navigator.mediaDevices);

    // Проверка разрешений
    if (navigator.permissions) {
      navigator.permissions.query({ name: 'microphone' as PermissionName }).then(
        (permissionStatus) => {
          setPermissionStatus(permissionStatus.state as any);
          permissionStatus.onchange = () => {
            setPermissionStatus(permissionStatus.state as any);
          };
        }
      );
    }
  }, []);

  // Инициализация речевого распознавания
  const initSpeechRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return null;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'ru-RU';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsRecording(true);
      setTranscript('');
      startTimer();
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      let interimTranscript = '';
      let allTranscripts = '';

      // Собираем все финальные результаты
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          allTranscripts += result[0].transcript + ' ';
          setConfidence(result[0].confidence * 100);
        } else {
          interimTranscript = result[0].transcript;
        }
      }

      // Показываем промежуточный или накопленный финальный текст
      const currentTranscript = allTranscripts.trim() || interimTranscript;
      setTranscript(currentTranscript);

      // Если есть новые финальные результаты, отправляем их
      if (allTranscripts.trim()) {
        finalTranscript = allTranscripts.trim();
        setIsProcessing(true);
        setTimeout(() => {
          onTranscription(finalTranscript);
          setIsProcessing(false);
          // Очищаем транскрипт после отправки, но продолжаем запись
          setTranscript('');
        }, 500);
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      // Не останавливаем запись при ошибках сети - пытаемся перезапустить
      if (event.error === 'network' || event.error === 'no-speech') {
        console.log('Attempting to restart recognition...');
        setTimeout(() => {
          if (isRecording && recognitionRef.current) {
            try {
              recognitionRef.current.start();
            } catch (e) {
              console.log('Recognition restart failed:', e);
            }
          }
        }, 1000);
      } else {
        stopRecording();
      }
    };

    recognition.onend = () => {
      // Если запись все еще активна, пытаемся перезапустить распознавание
      if (isRecording) {
        console.log('Recognition ended, attempting restart...');
        setTimeout(() => {
          if (isRecording && recognitionRef.current) {
            try {
              recognitionRef.current.start();
            } catch (e) {
              console.log('Recognition restart failed:', e);
              stopRecording();
            }
          }
        }, 100);
      }
    };

    return recognition;
  };

  // Инициализация записи аудио
  const initAudioRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      streamRef.current = stream;

      // Настройка MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm'
      });
      
      const audioChunks: Blob[] = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        if (onAudioData) {
          onAudioData(audioBlob);
        }
      };

      mediaRecorderRef.current = mediaRecorder;

      // Настройка анализа аудио уровня
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      
      analyser.fftSize = 256;
      source.connect(analyser);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      // Запуск мониторинга уровня звука
      startAudioLevelMonitoring();

      return true;
    } catch (error) {
      console.error('Error accessing microphone:', error);
      setPermissionStatus('denied');
      return false;
    }
  };

  // Мониторинг уровня звука
  const startAudioLevelMonitoring = () => {
    if (!analyserRef.current) return;

    const analyser = analyserRef.current;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const updateLevel = () => {
      if (!isRecording) return;

      analyser.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
      setAudioLevel(Math.min(100, (average / 128) * 100));

      animationRef.current = requestAnimationFrame(updateLevel);
    };

    updateLevel();
  };

  // Запуск таймера
  const startTimer = () => {
    setRecordingTime(0);
    timerRef.current = setInterval(() => {
      setRecordingTime(prev => prev + 1);
    }, 1000);
  };

  // Остановка таймера
  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setRecordingTime(0);
  };

  // Форматирование времени
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Начало записи
  const startRecording = async () => {
    if (disabled || isRecording) return;

    const audioInitialized = await initAudioRecording();
    if (!audioInitialized) return;

    const recognition = initSpeechRecognition();
    if (recognition) {
      recognitionRef.current = recognition;
      try {
        recognition.start();
      } catch (error) {
        console.error('Failed to start recognition:', error);
        stopRecording();
        return;
      }
    }

    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.start();
    }
  };

  // Остановка записи
  const stopRecording = () => {
    if (!isRecording) return;

    setIsRecording(false);
    stopTimer();

    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    setAudioLevel(0);
  };

  // Очистка при размонтировании
  useEffect(() => {
    return () => {
      stopRecording();
    };
  }, []);

  const getPermissionStatusColor = () => {
    switch (permissionStatus) {
      case 'granted': return 'text-green-600 bg-green-100';
      case 'denied': return 'text-red-600 bg-red-100';
      default: return 'text-yellow-600 bg-yellow-100';
    }
  };

  const getPermissionStatusText = () => {
    switch (permissionStatus) {
      case 'granted': return 'Разрешено';
      case 'denied': return 'Запрещено';
      default: return 'Требуется разрешение';
    }
  };

  if (!isSupported) {
    return (
      <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
        <div className="flex items-center gap-2 text-red-400">
          <AlertTriangle className="h-4 w-4" />
          <span className="text-sm">Голосовой ввод не поддерживается в этом браузере</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Статус разрешений */}
      <div className="flex items-center justify-between">
        <Badge className={getPermissionStatusColor()}>
          <Mic className="h-3 w-3 mr-1" />
          {getPermissionStatusText()}
        </Badge>
        
        <Button
          onClick={() => setShowInstructions(true)}
          variant="outline"
          size="sm"
          className="bg-white/5 border-white/10 text-white hover:bg-white/10"
        >
          <Info className="h-4 w-4 mr-2" />
          Инструкции
        </Button>
      </div>

      {/* Основной интерфейс записи */}
      <div className="p-6 bg-white/5 border border-white/10 rounded-xl">
        <div className="text-center space-y-4">
          {/* Кнопка записи */}
          <div className="relative">
            <Button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={disabled || permissionStatus === 'denied' || isProcessing}
              className={`w-20 h-20 rounded-full transition-all duration-200 ${
                isRecording 
                  ? 'bg-red-600 hover:bg-red-700 animate-pulse' 
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isRecording ? (
                <Square className="h-8 w-8" />
              ) : (
                <Mic className="h-8 w-8" />
              )}
            </Button>
            
            {/* Индикатор уровня звука */}
            {isRecording && (
              <div className="absolute inset-0 rounded-full border-4 border-blue-400 animate-ping" 
                   style={{ opacity: audioLevel / 100 }} />
            )}
          </div>

          {/* Статус */}
          <div className="space-y-2">
            {isRecording && (
              <>
                <div className="text-lg font-semibold text-white">
                  Запись... {formatTime(recordingTime)}
                </div>
                <Progress value={audioLevel} className="h-2" />
                <div className="text-sm text-gray-400">
                  Уровень звука: {Math.round(audioLevel)}%
                </div>
              </>
            )}
            
            {isProcessing && (
              <div className="text-lg font-semibold text-yellow-400">
                Обработка речи...
              </div>
            )}
            
            {!isRecording && !isProcessing && (
              <div className="text-gray-400">
                {placeholder}
              </div>
            )}
          </div>

          {/* Транскрипция */}
          {transcript && (
            <div className="p-4 bg-black/20 rounded-xl">
              <div className="text-sm text-gray-400 mb-2">
                Распознанный текст {confidence > 0 && `(уверенность: ${Math.round(confidence)}%)`}:
              </div>
              <div className="text-white font-medium mb-3">
                {transcript}
              </div>
              {/* Кнопки управления транскрипцией */}
              <div className="flex gap-2 justify-center">
                {onClear && (
                  <Button
                    onClick={() => {
                      setTranscript('');
                      if (onClear) onClear();
                    }}
                    variant="outline"
                    size="sm"
                    className="bg-red-600/20 border-red-500/30 text-red-400 hover:bg-red-600/30"
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Очистить
                  </Button>
                )}
                <Button
                  onClick={() => {
                    if (transcript.trim()) {
                      onTranscription(transcript);
                      setTranscript('');
                    }
                  }}
                  variant="outline"
                  size="sm"
                  className="bg-blue-600/20 border-blue-500/30 text-blue-400 hover:bg-blue-600/30"
                  disabled={!transcript.trim()}
                >
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Отправить
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Диалог с инструкциями */}
      <Dialog open={showInstructions} onOpenChange={setShowInstructions}>
        <DialogContent className="bg-black border-white/10 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mic className="h-5 w-5" />
              Инструкции по голосовому вводу
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Как включить и использовать голосовой ввод в различных системах
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 max-h-96 overflow-y-auto">
            {/* Windows */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-blue-400">Windows</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Нажмите <kbd className="bg-white/10 px-2 py-1 rounded">Win + H</kbd> для активации диктовки</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Или перейдите в Настройки → Специальные возможности → Речь</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Включите "Голосовой ввод" в настройках</span>
                </div>
              </div>
            </div>

            {/* macOS */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-blue-400">macOS</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Дважды нажмите клавишу <kbd className="bg-white/10 px-2 py-1 rounded">Fn</kbd></span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Или нажмите <kbd className="bg-white/10 px-2 py-1 rounded">Cmd + Space</kbd> и найдите "Диктовка"</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Настройте в Системные настройки → Клавиатура → Диктовка</span>
                </div>
              </div>
            </div>

            {/* Chrome */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-blue-400">Google Chrome</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Убедитесь, что микрофон разрешен для сайта</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Нажмите на иконку микрофона в адресной строке</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Выберите "Всегда разрешать" для этого сайта</span>
                </div>
              </div>
            </div>

            {/* Советы */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-yellow-400">Советы для лучшего распознавания</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <Mic className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                  <span>Говорите четко и не спеша</span>
                </div>
                <div className="flex items-start gap-2">
                  <Volume2 className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                  <span>Используйте внешний микрофон для лучшего качества</span>
                </div>
                <div className="flex items-start gap-2">
                  <VolumeX className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                  <span>Избегайте фонового шума</span>
                </div>
                <div className="flex items-start gap-2">
                  <Settings className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                  <span>Проверьте настройки микрофона в системе</span>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
