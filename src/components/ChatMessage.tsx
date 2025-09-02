import { Message } from "@/types/profile";
import { Mic, FileText } from "lucide-react";
import VoiceMessagePlayer from "./VoiceMessagePlayer";

interface ChatMessageProps {
  message: Message;
}

const ChatMessage = ({ message }: ChatMessageProps) => {
  const isUser = message.isUser;
  const isVoiceMessage = message.type === 'voice';
  const isFileMessage = message.type === 'file';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-[85%] ${isUser ? 'ml-4' : 'mr-4'}`}>
        <div className={`flex items-end gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
          {/* Аватар */}
          <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
            isUser
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-900 border-2 border-gray-200'
          }`}>
            {isUser ? 'Вы' : 'HR'}
          </div>

          {/* Сообщение */}
          <div className={`rounded-2xl shadow-sm relative ${
            isUser
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-900 border border-gray-200'
          }`}>
            {/* Голосовое сообщение */}
            {isVoiceMessage && (
              <div className="p-3">
                {/* Индикатор голосового сообщения */}
                <div className={`flex items-center gap-2 mb-3 ${
                  isUser ? 'text-blue-100' : 'text-gray-500'
                }`}>
                  <Mic className="h-4 w-4" />
                  <span className="text-xs font-medium">
                    Голосовое сообщение
                    {message.confidence && (
                      <span className="ml-2 opacity-75">
                        ({Math.round(message.confidence * 100)}% уверенности)
                      </span>
                    )}
                  </span>
                </div>

                {/* Плеер для голосового сообщения */}
                <VoiceMessagePlayer
                  audioUrl={message.audioUrl}
                  className="mb-2"
                  onPlaybackStart={() => console.log('Voice playback started')}
                  onPlaybackEnd={() => console.log('Voice playback ended')}
                />

                {/* Транскрипт текста, если он есть */}
                {message.text && message.text.trim() && (
                  <div className={`mt-3 pt-3 border-t ${
                    isUser ? 'border-blue-500/30' : 'border-gray-200'
                  }`}>
                    <div className={`text-xs mb-1 ${
                      isUser ? 'text-blue-200' : 'text-gray-500'
                    }`}>
                      Распознанный текст:
                    </div>
                    <p className={`text-sm leading-relaxed whitespace-pre-wrap ${
                      isUser ? 'text-blue-50' : 'text-gray-700'
                    }`}>
                      {message.text}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Файловое сообщение */}
            {isFileMessage && (
              <div className="p-4">
                <div className={`flex items-center gap-2 mb-2 ${
                  isUser ? 'text-blue-100' : 'text-gray-500'
                }`}>
                  <FileText className="h-4 w-4" />
                  <span className="text-xs font-medium">Файл</span>
                </div>
                {message.fileUrl && (
                  <a
                    href={message.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`text-sm underline ${
                      isUser ? 'text-blue-200 hover:text-blue-100' : 'text-blue-600 hover:text-blue-800'
                    }`}
                  >
                    Скачать файл
                  </a>
                )}
                {message.text && (
                  <p className={`text-sm leading-relaxed whitespace-pre-wrap mt-2 ${
                    isUser ? 'text-white' : 'text-gray-900'
                  }`}>
                    {message.text}
                  </p>
                )}
              </div>
            )}

            {/* Текстовое сообщение */}
            {!isVoiceMessage && !isFileMessage && (
              <div className="px-4 py-3">
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.text}</p>
              </div>
            )}
          </div>
        </div>

        {/* Время сообщения */}
        <div className={`text-xs text-gray-500 mt-1 ${isUser ? 'text-right' : 'text-left'}`}>
          {message.timestamp.toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit'
          })}
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;