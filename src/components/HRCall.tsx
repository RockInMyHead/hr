import { Button } from "@/components/ui/button";
import { PhoneOff, ArrowLeft, MessageCircle, Database, Users } from "lucide-react";

const HRCall = () => {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-gray-900/50 border border-gray-700/50 rounded-2xl p-8 text-center">
        <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
          <PhoneOff className="w-8 h-8 text-gray-400" />
        </div>

        <h2 className="text-2xl font-semibold text-white mb-3">Голосовые звонки отключены</h2>

        <p className="text-gray-400 mb-6 leading-relaxed">
          Функция голосовых звонков с использованием ElevenLabs была отключена.
          Эта функция больше не доступна в системе.
        </p>

        <div className="space-y-3 mb-6">
          <div className="text-sm text-gray-500">
            Доступные альтернативы:
          </div>
          <div className="grid grid-cols-1 gap-2 text-left">
            <div className="flex items-center gap-3 bg-gray-800/30 rounded-lg p-3">
              <MessageCircle className="w-5 h-5 text-blue-400" />
              <div>
                <div className="text-sm font-medium text-gray-300">Текстовый чат</div>
                <div className="text-xs text-gray-500">AI HR ассистент</div>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-gray-800/30 rounded-lg p-3">
              <Database className="w-5 h-5 text-green-400" />
              <div>
                <div className="text-sm font-medium text-gray-300">RAG-интервью</div>
                <div className="text-xs text-gray-500">С базой знаний</div>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-gray-800/30 rounded-lg p-3">
              <Users className="w-5 h-5 text-purple-400" />
              <div>
                <div className="text-sm font-medium text-gray-300">Управление командой</div>
                <div className="text-xs text-gray-500">Организационная структура</div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <Button
            variant="outline"
            className="bg-gray-800/50 border-gray-600 text-gray-300 hover:bg-gray-700/50"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Вернуться назад
          </Button>
        </div>
      </div>
    </div>
  );
};

export default HRCall;