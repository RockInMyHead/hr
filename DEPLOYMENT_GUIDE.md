# 🚀 Полное руководство по развертыванию HR Chat Companion

## 📋 Текущая проблема
Приложение пытается подключиться к API на `https://talti.ru/api/openai`, но backend сервер не запущен.

## ✅ Решения

### Решение 1: Развертывание на Vercel (Рекомендовано)

#### 1. Установите Vercel CLI
```bash
npm install -g vercel
vercel login
```

#### 2. Разверните проект
```bash
npm run deploy:vercel
```

#### 3. Настройте переменные окружения в Vercel Dashboard
- Перейдите: https://vercel.com/dashboard
- Найдите ваш проект
- Перейдите в Settings → Environment Variables
- Добавьте:
  - `OPENAI_API_KEY` = ваш OpenAI API ключ
  - `VITE_API_URL` = URL вашего Vercel проекта (автоматически подставится)

#### 4. Обновите локальную конфигурацию
После успешного развертывания Vercel покажет URL вашего проекта (например: `https://your-project.vercel.app`)

Обновите файл `.env`:
```bash
VITE_API_URL=https://your-project.vercel.app
```

### Решение 2: Запуск локального прокси-сервера

#### 1. Создайте файл `.env`
```bash
OPENAI_API_KEY=ваш_openai_api_ключ
PORT=3001
```

#### 2. Запустите прокси-сервер
```bash
npm run proxy
```

#### 3. Настройте frontend на использование прокси
```bash
VITE_API_URL=http://localhost:3001
```

### Решение 3: Ручное развертывание на talti.ru

#### 1. Загрузите файлы на сервер
```bash
# На сервере talti.ru
git clone https://github.com/RockInMyHead/hr.git
cd hr-chat-companion-main
npm install
```

#### 2. Создайте `.env` файл
```bash
OPENAI_API_KEY=ваш_openai_api_ключ
PORT=3000
```

#### 3. Запустите backend сервер
```bash
npm start
```

#### 4. Настройте веб-сервер (nginx/apache) для проксирования
```nginx
# Для nginx добавьте в конфигурацию:
location /api/ {
    proxy_pass http://localhost:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
```

## 🔧 Быстрая проверка работы

### 1. Проверьте API endpoint
```bash
curl -X GET https://talti.ru/api/health
```

### 2. Протестируйте OpenAI API
```bash
curl -X POST https://talti.ru/api/openai \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Hello"}]}'
```

### 3. Проверьте консоль браузера
После исправления в консоли должно быть:
```
[Log] Base URL: – "https://your-vercel-app.vercel.app"
[Log] OpenAI URL: – "https://your-vercel-app.vercel.app/api/openai"
```

## 📁 Структура файлов после развертывания

```
talti.ru/
├── dist/                    # Frontend файлы
├── server.js               # Backend сервер
├── proxy-server.js         # Прокси-сервер (альтернатива)
├── .env                    # Переменные окружения
└── package.json           # Скрипты
```

## 🚀 Быстрый старт с Vercel

```bash
# 1. Установка и вход
npm install -g vercel
vercel login

# 2. Развертывание
npm run deploy:vercel

# 3. Настройка переменных в Vercel Dashboard
# 4. Готово! Ваш URL: https://your-project.vercel.app
```

## 🆘 Если проблемы остаются

### Проверьте логи сервера
```bash
# На сервере
tail -f /var/log/nginx/error.log
# или
node server.js  # для просмотра логов Node.js
```

### Проверьте переменные окружения
```bash
# На сервере
echo $OPENAI_API_KEY
cat .env
```

### Проверьте CORS
Если CORS ошибки остаются, проверьте настройки веб-сервера.

---

🎯 **Рекомендация**: Используйте Vercel для самого простого и надежного развертывания!
