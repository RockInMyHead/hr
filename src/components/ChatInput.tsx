import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Mic, MicOff, Send, Square } from "lucide-react";
import { useVoiceRecording } from "@/hooks/use-voice-recording";
import { MessageType } from "@/types/profile";

interface ChatInputProps {
  onSendMessage: (message: string, type?: MessageType) => void;
  isLoading: boolean;
}

const ChatInput = ({ onSendMessage, isLoading }: ChatInputProps) => {
  const [textMessage, setTextMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const {
    isRecording,
    isProcessing,
    transcript,
    error,
    isSupported,
    startRecording,
    stopRecording,
    clearTranscript,
  } = useVoiceRecording();

  // Синхронизируем транскрипт с текстовым полем
  useEffect(() => {
    if (transcript) {
      setTextMessage(transcript);
    }
  }, [transcript]);

  // Отправка текстового сообщения
  const handleSendTextMessage = () => {
    if (textMessage.trim() && !isLoading) {
      onSendMessage(textMessage.trim(), 'text');
      setTextMessage("");
      clearTranscript();
      // Сбрасываем высоту textarea
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  // Обработка клавиш
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendTextMessage();
    }
  };

  // Автоматическое изменение высоты textarea
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = e.target;
    setTextMessage(textarea.value);

    // Сбрасываем высоту для правильного расчета
    textarea.style.height = 'auto';

    // Устанавливаем новую высоту
    const scrollHeight = textarea.scrollHeight;
    const maxHeight = 120; // Максимальная высота в пикселях
    textarea.style.height = Math.min(scrollHeight, maxHeight) + 'px';
  };

  // Обработка голосового ввода
  const handleVoiceToggle = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  // Отправка голосового сообщения
  const handleSendVoiceMessage = () => {
    if (transcript.trim() && !isLoading) {
      onSendMessage(transcript.trim(), 'voice');
      setTextMessage("");
      clearTranscript();
    }
  };

  return (
    <div className="space-y-3">
      {/* Поле ввода текста */}
      <div className="relative">
        <Textarea
          ref={textareaRef}
          value={textMessage}
          onChange={handleTextareaChange}
          onKeyPress={handleKeyPress}
          placeholder="Введите сообщение или нажмите на микрофон для голосового ввода..."
          className="min-h-[50px] max-h-[120px] resize-none pr-24 bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          disabled={isLoading}
        />

        {/* Кнопки управления */}
        <div className="absolute right-2 bottom-2 flex gap-2">
          {/* Кнопка голосового ввода */}
          {isSupported && (
            <Button
              onClick={handleVoiceToggle}
              size="sm"
              variant={isRecording ? "destructive" : "ghost"}
              className={`h-8 w-8 p-0 ${
                isRecording
                  ? "bg-red-600 hover:bg-red-700 animate-pulse"
                  : "bg-gray-700 hover:bg-gray-600"
              }`}
              disabled={isLoading || isProcessing}
              title={isRecording ? "Остановить запись" : "Начать голосовой ввод"}
            >
              {isRecording ? (
                <Square className="h-4 w-4" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </Button>
          )}

          {/* Кнопка отправки */}
          <Button
            onClick={handleSendTextMessage}
            size="sm"
            className="h-8 w-8 p-0 bg-blue-600 hover:bg-blue-700"
            disabled={!textMessage.trim() || isLoading}
            title="Отправить сообщение"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Статус голосовой записи */}
      {isRecording && (
        <div className="flex items-center gap-2 text-red-400 text-sm">
          <div className="flex gap-1">
            <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
            <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
            <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
          </div>
          <span>Идет запись... Говорите</span>
        </div>
      )}

      {/* Статус обработки */}
      {isProcessing && (
        <div className="flex items-center gap-2 text-blue-400 text-sm">
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-spin"></div>
          <span>Обработка речи...</span>
        </div>
      )}

      {/* Ошибки */}
      {error && (
        <div className="text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Предупреждение о неподдержке */}
      {!isSupported && (
        <div className="flex items-center gap-2 text-yellow-400 text-sm">
          <MicOff className="h-4 w-4" />
          <span>Голосовой ввод не поддерживается в этом браузере</span>
        </div>
      )}

      {/* Кнопка отправки голосового сообщения */}
      {transcript && !isRecording && (
        <div className="flex items-center gap-2">
          <div className="flex-1 text-green-400 text-sm">
            Распознано: "{transcript}"
          </div>
          <Button
            onClick={handleSendVoiceMessage}
            size="sm"
            className="bg-green-600 hover:bg-green-700"
            disabled={isLoading}
          >
            Отправить голосовое сообщение
          </Button>
        </div>
      )}
    </div>
  );
};

export default ChatInput;