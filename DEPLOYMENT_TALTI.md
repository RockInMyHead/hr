# 🚀 Развертывание HR Chat Companion на talti.ru

## 📋 Проблема
Приложение пытается подключиться к `localhost:3000` вместо вашего сервера `talti.ru`.

## ✅ Решение

### 1. Сборка Production версии
```bash
# Используйте специальный скрипт для production
npm run build:prod

# Или вручную установите переменные окружения
export VITE_API_URL=https://talti.ru
npm run build
```

### 2. Настройка Backend на talti.ru

#### Создайте файл `.env` на сервере:
```bash
# На сервере talti.ru
OPENAI_API_KEY=ваш_реальный_openai_api_ключ
PORT=3000
```

#### Запустите backend сервер:
```bash
# На сервере talti.ru
node server.js
```

### 3. Загрузка файлов на сервер

#### Вариант A: Загрузите папку `dist`
```bash
# После сборки загрузите папку dist на talti.ru
# Убедитесь, что файлы доступны по адресу https://talti.ru/
```

#### Вариант B: Используйте Vercel (рекомендуется)
```bash
# Установите Vercel CLI
npm install -g vercel

# Войдите в аккаунт
vercel login

# Разверните проект
vercel --prod
```

### 4. Проверка работы

После развертывания в консоли браузера должно быть:
```
[Log] Base URL: – "https://talti.ru"
[Log] OpenAI URL: – "https://talti.ru/api/openai"
```

## 🔧 Альтернативные решения

### Если backend не работает на talti.ru:

1. **Используйте Vercel** - он автоматически настроит API
2. **Измените VITE_API_URL** на другой рабочий backend
3. **Используйте Netlify Functions** для API

### Быстрое тестирование:
```bash
# Временно измените API URL для тестирования
export VITE_API_URL=https://your-vercel-app.vercel.app
npm run build
```

## 📱 Структура файлов на сервере

```
talti.ru/
├── dist/                    # Frontend файлы
│   ├── index.html
│   ├── assets/
│   └── ...
├── server.js               # Backend сервер
├── .env                    # Переменные окружения
└── data.sqlite            # База данных
```

## 🚨 Важные моменты

1. **CORS настроен** для домена talti.ru
2. **API URL по умолчанию** установлен на https://talti.ru
3. **Backend должен работать** на том же домене или быть настроен CORS
4. **Переменные окружения** должны быть установлены перед сборкой

## 🆘 Если проблемы остаются

1. Проверьте консоль браузера на ошибки
2. Убедитесь, что backend сервер запущен
3. Проверьте CORS настройки на backend
4. Убедитесь, что домен talti.ru правильно настроен
