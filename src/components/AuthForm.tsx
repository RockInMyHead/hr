import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Mail, Lock, Eye, EyeOff } from "lucide-react";

import type { AppUser, AppUserRole } from "@/types/profile";
import { STORAGE_KEYS } from "@/constants/storage";
import { findUserByEmail, saveUser } from "@/lib/session";

interface AuthFormProps {
  onAuthSuccess: (user: AppUser) => void;
}

export function AuthForm({ onAuthSuccess }: AuthFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    // Считываем данные формы до асинхронных операций, чтобы не зависеть от события
    const form = e.currentTarget as HTMLFormElement;
    const fd = new FormData(form);
    const email = String(fd.get('email') || '').trim().toLowerCase();

    // Симуляция входа
    setTimeout(() => {
      try {
        const existing = findUserByEmail(email);
        if (existing) {
          onAuthSuccess(existing as AppUser);
        } else {
          // Создаем временного пользователя-сотрудника, если email не найден
          const id = (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`);
          const user: AppUser = {
            id,
            name: email.split('@')[0] || 'Пользователь',
            email,
            role: "employee",
          };
          try {
            saveUser(user);
          } catch (error) {
            console.warn('Failed to save user:', error);
          }
          // Сохраняем companyId текущей сессии, чтобы структура подтянулась корректно
          if (user.companyId) {
            try {
              localStorage.setItem(STORAGE_KEYS.companyId, user.companyId);
            } catch (error) {
              console.warn('Failed to save companyId:', error);
            }
          }
          onAuthSuccess(user);
        }
      } catch {
        // fallback: ничего
      }
      setIsLoading(false);
    }, 800);
  };

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    
    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const role = (formData.get("role") as AppUserRole) || "employee";
    const url = new URL(window.location.href);
    const inviteCompanyId = url.searchParams.get('inviteCompanyId') ?? undefined;
    
    // Симуляция регистрации
    setTimeout(() => {
      const user: AppUser = {
        id: (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`),
        name,
        email,
        role,
        companyId: inviteCompanyId,
      };
      if (inviteCompanyId) {
        try {
          localStorage.setItem(STORAGE_KEYS.companyId, inviteCompanyId);
        } catch (error) {
          console.warn('Failed to save companyId for invite:', error);
        }
        // Автосинхронизация нового пользователя в структуру компании
        try {
          const raw = localStorage.getItem('hr-employees');
          const employees = raw ? JSON.parse(raw) : [];
          const exists = employees.some((e: { email?: string }) => String(e.email || '').toLowerCase() === email.toLowerCase());
          if (!exists) {
            const noteByRole = role === 'managing_director' ? 'Высшее руководство, стратегическое управление.' : role === 'director' ? 'Стратегическое мышление, лидерство.' : role === 'manager' ? 'Организует процессы, развивает команду.' : 'Ответственный исполнитель.';
            const ratings = role === 'managing_director' ? { communication: 5, leadership: 5, productivity: 5, reliability: 5, initiative: 5 } : role === 'director' ? { communication: 5, leadership: 5, productivity: 5, reliability: 5, initiative: 5 } : role === 'manager' ? { communication: 4, leadership: 4, productivity: 4, reliability: 4, initiative: 4 } : { communication: 4, leadership: 3, productivity: 4, reliability: 4, initiative: 4 };
            const emp = {
              id: (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`),
              name,
              email,
              role: 'subordinate',
              userRole: role,
              companyId: inviteCompanyId,
              position: role === 'managing_director' ? 'Управляющий директор' : role === 'director' ? 'Директор' : role === 'manager' ? 'Менеджер' : 'Сотрудник',
              note: noteByRole,
              ratings,
            };
            employees.push(emp);
            localStorage.setItem('hr-employees', JSON.stringify(employees));
          }
        } catch (error) {
          console.warn('Failed to sync employee data:', error);
        }
      }
      // сохраняем в локальную базу пользователей
      try {
        saveUser(user);
      } catch (error) {
        console.warn('Failed to save user during registration:', error);
      }
      onAuthSuccess(user);
      setIsLoading(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      {/* Фоновые элементы */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(120,119,198,0.3),transparent_50%)]"></div>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Логотип и заголовок */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-600 to-blue-600 rounded-3xl mb-6 shadow-2xl">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-white mb-3">HR Ассистент</h1>
          <p className="text-gray-400 text-lg">Умный помощник для HR процессов</p>
        </div>

        {/* Форма авторизации */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8 bg-white/5 border border-white/10 rounded-2xl p-1">
              <TabsTrigger value="login" className="data-[state=active]:bg-white/10 data-[state=active]:text-white rounded-xl">Вход</TabsTrigger>
              <TabsTrigger value="register" className="data-[state=active]:bg-white/10 data-[state=active]:text-white rounded-xl">Регистрация</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login" className="space-y-6">
              <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-3">
                  <Label htmlFor="login-email" className="text-sm font-medium text-gray-300">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-4 h-5 w-5 text-gray-400" />
                    <Input
                      id="login-email"
                      name="email"
                      type="email"
                      placeholder="your@email.com"
                      className="pl-12 h-14 bg-white/5 border-white/10 text-white placeholder:text-gray-400 focus:border-purple-500 focus:ring-purple-500 rounded-xl"
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-3">
                  <Label htmlFor="login-password" className="text-sm font-medium text-gray-300">Пароль</Label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-4 h-5 w-5 text-gray-400" />
                    <Input
                      id="login-password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      className="pl-12 pr-12 h-14 bg-white/5 border-white/10 text-white placeholder:text-gray-400 focus:border-purple-500 focus:ring-purple-500 rounded-xl"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-4 text-gray-400 hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full h-14 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold text-lg rounded-xl transition-all duration-200 shadow-xl hover:shadow-2xl" 
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Вход...
                    </div>
                  ) : "Войти"}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="register" className="space-y-6">
              <form onSubmit={handleRegister} className="space-y-6">
                <div className="space-y-3">
                  <Label htmlFor="register-name" className="text-sm font-medium text-gray-300">Имя</Label>
                  <div className="relative">
                    <User className="absolute left-4 top-4 h-5 w-5 text-gray-400" />
                    <Input
                      id="register-name"
                      name="name"
                      type="text"
                      placeholder="Ваше имя"
                      className="pl-12 h-14 bg-white/5 border-white/10 text-white placeholder:text-gray-400 focus:border-purple-500 focus:ring-purple-500 rounded-xl"
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-3">
                  <Label htmlFor="register-email" className="text-sm font-medium text-gray-300">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-4 h-5 w-5 text-gray-400" />
                    <Input
                      id="register-email"
                      name="email"
                      type="email"
                      placeholder="your@email.com"
                      className="pl-12 h-14 bg-white/5 border-white/10 text-white placeholder:text-gray-400 focus:border-purple-500 focus:ring-purple-500 rounded-xl"
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-3">
                  <Label htmlFor="register-role" className="text-sm font-medium text-gray-300">Роль</Label>
                  <div>
                    <select
                      id="register-role"
                      name="role"
                      className="w-full h-14 bg-white/5 border border-white/10 text-white rounded-xl px-4"
                      defaultValue="employee"
                      required
                    >
                      <option value="employee">Сотрудник</option>
                      <option value="manager">Менеджер</option>
                      <option value="director">Директор</option>
                      <option value="managing_director">Управляющий директор</option>
                      <option value="administrator">Администратор</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="register-password" className="text-sm font-medium text-gray-300">Пароль</Label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-4 h-5 w-5 text-gray-400" />
                    <Input
                      id="register-password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      className="pl-12 pr-12 h-14 bg-white/5 border-white/10 text-white placeholder:text-gray-400 focus:border-purple-500 focus:ring-purple-500 rounded-xl"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-4 text-gray-400 hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full h-14 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold text-lg rounded-xl transition-all duration-200 shadow-xl hover:shadow-2xl" 
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Регистрация...
                    </div>
                  ) : "Создать аккаунт"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>

        {/* Дополнительная информация */}
        <div className="text-center mt-8">
          <p className="text-sm text-gray-400">
            Безопасная и удобная работа с HR процессами
          </p>
        </div>
      </div>
    </div>
  );
}