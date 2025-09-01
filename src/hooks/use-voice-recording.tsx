import { useState, useCallback, useRef, useEffect } from 'react';

export interface UseVoiceRecordingReturn {
  isRecording: boolean;
  isProcessing: boolean;
  transcript: string;
  error: string | null;
  isSupported: boolean;
  startRecording: () => void;
  stopRecording: () => void;
  clearTranscript: () => void;
}

export function useVoiceRecording(): UseVoiceRecordingReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitializedRef = useRef(false);

  useEffect(() => {
    // Проверяем поддержку Web Speech API
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition && !isInitializedRef.current) {
      setIsSupported(true);
      isInitializedRef.current = true;

      const recognition = new SpeechRecognition();
      recognition.continuous = false; // Изменено на false для лучшего контроля
      recognition.interimResults = true;
      recognition.lang = 'ru-RU';

      recognition.onstart = () => {
        setIsRecording(true);
        setIsProcessing(false);
        setError(null);
      };

      recognition.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript;
          } else {
            interimTranscript += result[0].transcript;
          }
        }

        setTranscript(finalTranscript + interimTranscript);

        // Сбрасываем таймер при получении результата
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        // Устанавливаем новый таймер для автоматической остановки только при наличии interim результатов
        if (interimTranscript && !finalTranscript) {
          timeoutRef.current = setTimeout(() => {
            if (recognitionRef.current && isRecording) {
              console.log('Автоматическая остановка записи из-за тишины');
              recognitionRef.current.stop();
            }
          }, 2000); // Уменьшено до 2 секунд
        }
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setError(`Ошибка распознавания: ${event.error}`);
        setIsRecording(false);
        setIsProcessing(false);

        // Очищаем таймер при ошибке
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
      };

      recognition.onend = () => {
        console.log('Speech recognition ended');
        setIsRecording(false);
        setIsProcessing(false);

        // Очищаем таймер
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
      };

      recognitionRef.current = recognition;
    } else if (!SpeechRecognition) {
      setIsSupported(false);
      setError('Ваш браузер не поддерживает запись голоса');
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (recognitionRef.current && isRecording) {
        recognitionRef.current.stop();
      }
    };
  }, []); // Убрана зависимость от isRecording

  const startRecording = useCallback(() => {
    if (!recognitionRef.current || !isSupported) {
      setError('Запись голоса недоступна');
      return;
    }

    // Если уже идет запись, сначала остановим
    if (isRecording) {
      stopRecording();
      return;
    }

    setTranscript('');
    setError(null);
    setIsProcessing(true);

    try {
      recognitionRef.current.start();
    } catch (err) {
      console.error('Error starting recording:', err);
      setError('Не удалось начать запись');
      setIsProcessing(false);
    }
  }, [isSupported, isRecording]);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current && isRecording) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        console.error('Error stopping recording:', err);
        // Принудительно сбрасываем состояние
        setIsRecording(false);
        setIsProcessing(false);
      }
    }

    // Очищаем таймер
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, [isRecording]);

  const clearTranscript = useCallback(() => {
    setTranscript('');
    setError(null);
  }, []);

  return {
    isRecording,
    isProcessing,
    transcript,
    error,
    isSupported,
    startRecording,
    stopRecording,
    clearTranscript,
  };
}