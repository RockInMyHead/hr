import { Message } from "@/types/profile";
import { Mic } from "lucide-react";

interface ChatMessageProps {
  message: Message;
}

const ChatMessage = ({ message }: ChatMessageProps) => {
  const isUser = message.isUser;
  const isVoiceMessage = message.type === 'voice';

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
          <div className={`rounded-2xl px-4 py-3 shadow-sm relative ${
            isUser
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-900 border border-gray-200'
          }`}>
            {/* Индикатор голосового сообщения */}
            {isVoiceMessage && (
              <div className={`flex items-center gap-2 mb-2 ${
                isUser ? 'text-blue-100' : 'text-gray-500'
              }`}>
                <Mic className="h-4 w-4" />
                <span className="text-xs">Голосовое сообщение</span>
              </div>
            )}
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.text}</p>
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