import { useState, useRef, useEffect } from "react";
import ChatMessage from "./ChatMessage";
import ChatInput from "./ChatInput";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RefreshCw, MessageCircle, ArrowLeft } from "lucide-react";
import { UserProfile, Message, MessageType } from "@/types/profile";
import ChatProgressBar from "./ChatProgressBar";
import { API_CONFIG } from "../config/api";

const HRChat = ({ onExit }: { onExit: () => void }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: "Добро пожаловать! Я HR-ассистент. Давайте начнем наше интервью. Расскажите немного о себе и своем опыте работы. Как вас зовут и какую должность вы занимаете?",
      isUser: false,
      timestamp: new Date(),
      type: 'text',
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile>({});
  const [conversationHistory, setConversationHistory] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Загрузка профиля из localStorage при инициализации
  useEffect(() => {
    try {
      const savedProfile = localStorage.getItem('hr-chat-profile');
      if (savedProfile) {
        const parsedProfile = JSON.parse(savedProfile);
        setUserProfile(parsedProfile);
      }
    } catch (error) {
      console.warn('Failed to load profile from localStorage:', error);
    }
  }, []);

  const OPENAI_MODEL = String(
    import.meta.env.VITE_OPENAI_MODEL || 'gpt-4o-mini'
  );

  // Удаляем Markdown-выделения из текста, показываемого пользователю
  const sanitizeText = (text: string): string => {
    try {
      let t = String(text ?? '');
      // Убираем **bold** и *italic*
      t = t.replace(/\*\*(.*?)\*\*/g, '$1');
      t = t.replace(/\*(.*?)\*/g, '$1');
      // Убираем инлайн-код обратными кавычками
      t = t.replace(/`([^`]+)`/g, '$1');
      // Убираем лишние множественные пробелы
      t = t.replace(/\s{2,}/g, ' ').trim();
      return t;
    } catch {
      return String(text ?? '');
    }
  };

  const generateHRPrompt = (userResponse: string, conversationHistory: string): string => {
    return `Ты опытный HR-специалист, проводящий глубокий анализ интервью с кандидатом. Твоя задача - извлекать конкретную, детальную информацию для создания профессионального профиля.

Контекст интервью:
${conversationHistory}

Последний ответ кандидата: "${userResponse}"

Проведи детальный анализ ответа кандидата и:
1. Задай следующий уместный вопрос для продолжения интервью
2. Извлеки конкретную информацию для профиля кандидата

ВОПРОС: Задай следующий вопрос, который поможет получить недостающую информацию о кандидате.

АНАЛИЗ: Проведи структурированный анализ по следующим категориям:

**ПЕРСОНАЛЬНАЯ ИНФОРМАЦИЯ:**
- Имя (если упоминается)
- Возраст/стаж (если указан)
- Образование и квалификация

**ПРОФЕССИОНАЛЬНЫЙ ОПЫТ:**
- Конкретные должности и компании
- Продолжительность работы в каждой роли
- Ключевые проекты и достижения
- Области ответственности

**ТЕХНИЧЕСКИЕ НАВЫКИ:**
- Конкретные технологии, языки программирования, инструменты
- Уровень владения (базовый/средний/продвинутый)
- Опыт работы с определенными платформами или системами

**SOFT SKILLS:**
- Коммуникативные навыки
- Работа в команде
- Лидерские качества
- Управление временем
- Решение проблем

**ДОСТИЖЕНИЯ И РЕЗУЛЬТАТЫ:**
- Конкретные метрики и показатели
- Успешные проекты
- Признания и награды
- Влияние на бизнес-результаты

**МОТИВАЦИЯ И ЦЕЛИ:**
- Карьерные цели
- Что мотивирует в работе
- Планы развития
- Ожидания от новой роли

**ЛИЧНОСТНЫЕ КАЧЕСТВА:**
- Сильные стороны
- Области для развития
- Подход к работе
- Стиль взаимодействия

**КОМАНДНАЯ РАБОТА:**
- Опыт руководства
- Роли в команде
- Стиль взаимодействия с коллегами
- Разрешение конфликтов

**ПОДХОД К РЕШЕНИЮ ПРОБЛЕМ:**
- Методология работы
- Как справляется со сложностями
- Креативность в решениях
- Адаптивность к изменениям

ВАЖНО:
- Извлекай только конкретную информацию, избегай общих фраз
- Не повторяй уже известную информацию
- Фокусируйся на новых деталях из последнего ответа
- Используй конкретные примеры и метрики
- Избегай поверхностных характеристик типа "опыт работы" без деталей`;
  };

  const analyzeUserResponse = async (userResponse: string): Promise<{ question: string; analysis: string }> => {
    try {
      const prompt = generateHRPrompt(userResponse, conversationHistory);

      const response = await fetch(API_CONFIG.openaiURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: OPENAI_MODEL,
          messages: [
            {
              role: 'system',
              content: 'Ты опытный HR-специалист, проводящий интервью. Отвечай на русском языке. Строго соблюдай формат ответа.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 800,
          temperature: 0.7
        })
      });

      const data = await response.json();

      // Проверяем на ошибки API
      if (data.error) {
        console.error('Ошибка OpenAI API:', data.error);
        return {
          question: generateFallbackQuestion(userResponse),
          analysis: "Получена информация о кандидате."
        };
      }

      if (data.choices && data.choices[0]) {
        const content = data.choices[0].message.content;
        console.log('Ответ от OpenAI:', content); // Для отладки

        // Улучшенный парсинг ответа
        const questionMatch = content.match(/ВОПРОС:\s*(.+?)(?=\n|АНАЛИЗ:|$)/i);
        const analysisMatch = content.match(/АНАЛИЗ:\s*(.+?)(?=\n|$)/i);

        const question = questionMatch ? questionMatch[1].trim() : null;
        const analysis = analysisMatch ? analysisMatch[1].trim() : null;

        // Если парсинг не удался, попробуем альтернативные варианты
        if (!question || !analysis) {
          const lines = content.split('\n').filter(line => line.trim());
          const questionLine = lines.find(line => line.toLowerCase().includes('вопрос:'));
          const analysisLine = lines.find(line => line.toLowerCase().includes('анализ:'));

          return {
            question: questionLine ? questionLine.replace(/вопрос:\s*/i, '').trim() : generateFallbackQuestion(userResponse),
            analysis: analysisLine ? analysisLine.replace(/анализ:\s*/i, '').trim() : "Получена информация о кандидате."
          };
        }

        return { question: sanitizeText(question), analysis };
      }

      return {
        question: sanitizeText(generateFallbackQuestion(userResponse)),
        analysis: "Получена информация о кандидате."
      };
    } catch (error) {
      console.error('Ошибка при обращении к OpenAI API:', error);
      return {
        question: sanitizeText(generateFallbackQuestion(userResponse)),
        analysis: "Получена информация о кандидате."
      };
    }
  };

  const generateFallbackQuestion = (userResponse: string): string => {
    // Генерируем вопрос на основе ключевых слов в ответе пользователя
    const response = userResponse.toLowerCase();

    if (response.includes('программист') || response.includes('разработчик')) {
      return "Какие технологии и языки программирования вы используете в работе?";
    }

    if (response.includes('опыт') || response.includes('работал') || response.includes('лет')) {
      return "Расскажите о ваших самых значимых проектах и достижениях.";
    }

    if (response.includes('преподавал') || response.includes('университет')) {
      return "Какой опыт у вас в обучении и передаче знаний?";
    }

    if (response.includes('газпром') || response.includes('обер')) {
      return "Какие задачи вы решали в этих компаниях?";
    }

    return "Расскажите подробнее о ваших профессиональных целях и планах развития.";
  };

  const updateUserProfile = (analysis: string) => {
    const newProfile = { ...userProfile };

    // Разбиваем анализ на секции
    const sections = analysis.split(/\*\*([^*]+)\*\*:/);

    for (let i = 1; i < sections.length; i += 2) {
      const sectionName = sections[i].trim();
      const sectionContent = sections[i + 1]?.trim() || '';

      switch (sectionName) {
        case 'ПЕРСОНАЛЬНАЯ ИНФОРМАЦИЯ':
          extractPersonalInfo(sectionContent, newProfile);
          break;
        case 'ПРОФЕССИОНАЛЬНЫЙ ОПЫТ':
          extractProfessionalExperience(sectionContent, newProfile);
          break;
        case 'ТЕХНИЧЕСКИЕ НАВЫКИ':
          extractTechnicalSkills(sectionContent, newProfile);
          break;
        case 'SOFT SKILLS':
          extractSoftSkills(sectionContent, newProfile);
          break;
        case 'ДОСТИЖЕНИЯ И РЕЗУЛЬТАТЫ':
          extractAchievements(sectionContent, newProfile);
          break;
        case 'МОТИВАЦИЯ И ЦЕЛИ':
          extractMotivationGoals(sectionContent, newProfile);
          break;
        case 'ЛИЧНОСТНЫЕ КАЧЕСТВА':
          extractPersonality(sectionContent, newProfile);
          break;
        case 'КОМАНДНАЯ РАБОТА':
          extractTeamwork(sectionContent, newProfile);
          break;
        case 'ПОДХОД К РЕШЕНИЮ ПРОБЛЕМ':
          extractProblemSolving(sectionContent, newProfile);
          break;
      }
    }

    setUserProfile(newProfile);

    // Сохраняем профиль в localStorage
    try {
      localStorage.setItem('hr-chat-profile', JSON.stringify(newProfile));
    } catch (error) {
      console.warn('Failed to save profile to localStorage:', error);
    }
  };

  // Функция для обновления оценок компетенций на основе анализа
  const updateCompetencyRatings = (analysis: string, userResponse: string) => {
    try {
      // Получаем текущие оценки компетенций
      const currentRatings = JSON.parse(localStorage.getItem(`competency-data-${user.email}`) || '[]');

      // Анализируем ответ пользователя и обновляем оценки
      const updatedRatings = analyzeAndUpdateRatings(analysis, userResponse, currentRatings);

      // Сохраняем обновленные оценки
      localStorage.setItem(`competency-data-${user.email}`, JSON.stringify(updatedRatings));

      console.log('Оценки компетенций обновлены:', updatedRatings);
    } catch (error) {
      console.error('Ошибка при обновлении оценок компетенций:', error);
    }
  };

  // Функция анализа ответа и обновления оценок компетенций
  const analyzeAndUpdateRatings = (analysis: string, userResponse: string, currentRatings: any[]) => {
    const ratings = [...currentRatings];

    // Анализируем ключевые слова и фразы в ответе пользователя
    const response = userResponse.toLowerCase();
    const analysisText = analysis.toLowerCase();

    // Анализ негативного поведения - снижение оценок
    const rudeWords = ['дурак', 'идиот', 'тупой', 'козел', 'сука', 'блядь', 'пизд', 'хуй', 'ебан'];
    const negativePhrases = ['отстань', 'валите', 'пошел', 'убирайся', 'заткнись'];
    const dismissiveWords = ['ничего', 'нет', 'не знаю', 'не помню', 'не хочу', 'не буду'];

    // Проверка на грубость - снижение всех оценок
    const hasRudeWords = rudeWords.some(word => response.includes(word));
    const hasNegativePhrases = negativePhrases.some(phrase => response.includes(phrase));
    const isDismissive = dismissiveWords.some(word => response.includes(word)) && response.split(' ').length <= 3;

    if (hasRudeWords || hasNegativePhrases) {
      // Снижение оценок при грубости
      updateRating(ratings, 'communication', -0.3);
      updateRating(ratings, 'leadership', -0.3);
      updateRating(ratings, 'reliability', -0.3);
      return ratings; // Прекращаем анализ при грубости
    }

    if (isDismissive) {
      // Снижение оценок при немотивированности
      updateRating(ratings, 'communication', -0.1);
      updateRating(ratings, 'initiative', -0.1);
      return ratings; // Прекращаем анализ при односложных ответах
    }

    // Положительные обновления только при нормальном поведении

    // Коммуникация
    if (response.includes('общ') || response.includes('коммуник') || response.includes('презент') ||
        response.includes('переговор') || analysisText.includes('коммуник')) {
      updateRating(ratings, 'communication', 0.1);
    }

    // Лидерство
    if (response.includes('руковод') || response.includes('команд') || response.includes('веду') ||
        response.includes('мотивир') || response.includes('принима') || analysisText.includes('лидер')) {
      updateRating(ratings, 'leadership', 0.1);
    }

    // Продуктивность
    if (response.includes('продуктив') || response.includes('эффектив') || response.includes('результат') ||
        response.includes('достижен') || response.includes('выполн') || analysisText.includes('продуктив')) {
      updateRating(ratings, 'productivity', 0.1);
    }

    // Надежность
    if (response.includes('надеж') || response.includes('ответствен') || response.includes('срок') ||
        response.includes('обязатель') || response.includes('качеств') || analysisText.includes('надеж')) {
      updateRating(ratings, 'reliability', 0.1);
    }

    // Инициативность
    if (response.includes('инициатив') || response.includes('предлага') || response.includes('улучшен') ||
        response.includes('решен') || response.includes('проблем') || analysisText.includes('инициатив')) {
      updateRating(ratings, 'initiative', 0.1);
    }

    return ratings;
  };

  // Вспомогательная функция для обновления оценки компетенции
  const updateRating = (ratings: any[], competencyId: string, increment: number) => {
    const ratingIndex = ratings.findIndex(r => r.competencyId === competencyId);

    if (ratingIndex >= 0) {
      // Обновляем существующую оценку
      const currentValue = ratings[ratingIndex].currentValue;
      const newValue = Math.min(5, Math.max(0, currentValue + increment));
      ratings[ratingIndex].currentValue = newValue;
      ratings[ratingIndex].lastAssessed = new Date().toISOString();

      // Обновляем целевое значение на основе текущего
      ratings[ratingIndex].targetValue = Math.min(5, newValue + 1);
    } else {
      // Создаем новую оценку
      const startValue = Math.max(1, Math.min(5, 3.0 + increment)); // Начинаем с 3.0 + прирост, ограничиваем диапазоном
      ratings.push({
        competencyId,
        currentValue: startValue,
        targetValue: Math.min(5, startValue + 1),
        category: getCompetencyCategory(competencyId),
        lastAssessed: new Date().toISOString(),
        improvementPlan: []
      });
    }
  };

  // Вспомогательная функция для определения категории компетенции
  const getCompetencyCategory = (competencyId: string): string => {
    const categories: Record<string, string> = {
      communication: 'soft',
      leadership: 'leadership',
      productivity: 'business',
      reliability: 'soft',
      initiative: 'soft'
    };
    return categories[competencyId] || 'soft';
  };

  const extractPersonalInfo = (content: string, profile: UserProfile) => {
    // Имя
    const nameMatch = content.match(/(?:имя|зовут|меня зовут)[:\s]*([А-Яа-я\s]+)/i);
    if (nameMatch && nameMatch[1].trim().length > 2) {
      profile.name = nameMatch[1].trim();
    }

    // Возраст/стаж
    const ageMatch = content.match(/(?:возраст|лет|стаж)[:\s]*(\d+)/i);
    if (ageMatch) {
      profile.age = ageMatch[1];
    }

    // Образование
    const educationMatch = content.match(/(?:образование|университет|институт|академия)[:\s]*([^.\n]+)/i);
    if (educationMatch && educationMatch[1].trim().length > 5) {
      profile.education = educationMatch[1].trim();
    }
  };

  const extractProfessionalExperience = (content: string, profile: UserProfile) => {
    if (!profile.experience) profile.experience = [];

    // Должности и компании
    const positions = content.match(/(?:должность|работал|работаю)[:\s]*([^.\n]+)/gi);
    if (positions) {
      positions.forEach(pos => {
        const cleanPos = pos.replace(/(?:должность|работал|работаю)[:\s]*/i, '').trim();
        if (cleanPos.length > 5 && !profile.experience.includes(cleanPos)) {
          profile.experience.push(cleanPos);
        }
      });
    }

    // Продолжительность
    const durationMatch = content.match(/(?:продолжительность|длительность|лет|месяцев)[:\s]*([^.\n]+)/i);
    if (durationMatch && durationMatch[1].trim().length > 3) {
      profile.duration = durationMatch[1].trim();
    }
  };

  const extractTechnicalSkills = (content: string, profile: UserProfile) => {
    if (!profile.technicalSkills) profile.technicalSkills = [];

    // Технологии и инструменты
    const skills = content.match(/(?:технология|язык|инструмент|платформа)[:\s]*([^.\n]+)/gi);
    if (skills) {
      skills.forEach(skill => {
        const cleanSkill = skill.replace(/(?:технология|язык|инструмент|платформа)[:\s]*/i, '').trim();
        if (cleanSkill.length > 2 && !profile.technicalSkills.includes(cleanSkill)) {
          profile.technicalSkills.push(cleanSkill);
        }
      });
    }

    // Уровень владения
    const levelMatch = content.match(/(?:уровень|владею)[:\s]*([^.\n]+)/i);
    if (levelMatch && levelMatch[1].trim().length > 3) {
      profile.skillLevel = levelMatch[1].trim();
    }
  };

  const extractSoftSkills = (content: string, profile: UserProfile) => {
    if (!profile.softSkills) profile.softSkills = [];

    const skills = content.match(/(?:навык|умение|способность)[:\s]*([^.\n]+)/gi);
    if (skills) {
      skills.forEach(skill => {
        const cleanSkill = skill.replace(/(?:навык|умение|способность)[:\s]*/i, '').trim();
        if (cleanSkill.length > 3 && !profile.softSkills.includes(cleanSkill)) {
          profile.softSkills.push(cleanSkill);
        }
      });
    }
  };

  const extractAchievements = (content: string, profile: UserProfile) => {
    if (!profile.achievements) profile.achievements = [];

    const achievements = content.match(/(?:достижение|проект|результат|метрика)[:\s]*([^.\n]+)/gi);
    if (achievements) {
      achievements.forEach(achievement => {
        const cleanAchievement = achievement.replace(/(?:достижение|проект|результат|метрика)[:\s]*/i, '').trim();
        if (cleanAchievement.length > 5 && !profile.achievements.includes(cleanAchievement)) {
          profile.achievements.push(cleanAchievement);
        }
      });
    }
  };

  const extractMotivationGoals = (content: string, profile: UserProfile) => {
    // Цели
    const goalsMatch = content.match(/(?:цель|планирую|хочу)[:\s]*([^.\n]+)/i);
    if (goalsMatch && goalsMatch[1].trim().length > 5) {
      profile.goals = goalsMatch[1].trim();
    }

    // Мотивация
    const motivationMatch = content.match(/(?:мотивирует|нравится|интерес)[:\s]*([^.\n]+)/i);
    if (motivationMatch && motivationMatch[1].trim().length > 5) {
      profile.motivation = motivationMatch[1].trim();
    }
  };

  const extractPersonality = (content: string, profile: UserProfile) => {
    if (!profile.personality) profile.personality = [];

    const qualities = content.match(/(?:качество|черта|особенность)[:\s]*([^.\n]+)/gi);
    if (qualities) {
      qualities.forEach(quality => {
        const cleanQuality = quality.replace(/(?:качество|черта|особенность)[:\s]*/i, '').trim();
        if (cleanQuality.length > 3 && !profile.personality.includes(cleanQuality)) {
          profile.personality.push(cleanQuality);
        }
      });
    }
  };

  const extractTeamwork = (content: string, profile: UserProfile) => {
    const teamworkMatch = content.match(/(?:команда|руководство|взаимодействие)[:\s]*([^.\n]+)/i);
    if (teamworkMatch && teamworkMatch[1].trim().length > 5) {
      profile.teamwork = teamworkMatch[1].trim();
    }
  };

  const extractProblemSolving = (content: string, profile: UserProfile) => {
    const problemMatch = content.match(/(?:подход|метод|решение)[:\s]*([^.\n]+)/i);
    if (problemMatch && problemMatch[1].trim().length > 5) {
      profile.problemSolving = problemMatch[1].trim();
    }
  };

  const handleSendMessage = async (messageText: string, messageType: MessageType = 'text', voiceData?: any) => {
    // Добавляем сообщение пользователя
    const userMessage: Message = {
      id: Date.now().toString(),
      text: messageText,
      isUser: true,
      timestamp: new Date(),
      type: messageType,
      confidence: voiceData?.confidence,
      audioUrl: voiceData?.audioUrl,
      metadata: voiceData ? {
        audioBlob: voiceData.audioBlob,
        duration: voiceData.duration,
        ...voiceData
      } : undefined,
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    // Обновляем историю разговора
    const newHistory = conversationHistory + `\nКандидат: ${messageText}`;
    setConversationHistory(newHistory);

    try {
      console.log('Отправляем запрос к OpenAI...');
      // Получаем ответ от AI
      const { question, analysis } = await analyzeUserResponse(messageText);

      console.log('Получен ответ:', { question, analysis });

      // Обновляем профиль пользователя
      updateUserProfile(analysis);

      // Обновляем оценки компетенций на основе анализа
      updateCompetencyRatings(analysis, messageText);

      // Добавляем ответ HR
      const hrResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: sanitizeText(question),
        isUser: false,
        timestamp: new Date(),
        type: 'text',
      };

      setMessages((prev) => [...prev, hrResponse]);

      // Обновляем историю разговора
      setConversationHistory(newHistory + `\nHR: ${question}`);

    } catch (error) {
      console.error('Ошибка при обработке сообщения:', error);

      // Fallback ответ
      const fallbackResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: "Спасибо за ответ! Расскажите подробнее о ваших достижениях в работе.",
        isUser: false,
        timestamp: new Date(),
        type: 'text',
      };

      setMessages((prev) => [...prev, fallbackResponse]);
    }

    setIsLoading(false);
  };

  const resetChat = () => {
    setMessages([
      {
        id: "1",
        text: "Добро пожаловать! Я HR-ассистент. Давайте начнем наше интервью. Расскажите немного о себе и своем опыте работы. Как вас зовут и какую должность вы занимаете?",
        isUser: false,
        timestamp: new Date(),
        type: 'text',
      },
    ]);
    setUserProfile({});
    setConversationHistory("");

    // Очищаем сохраненный профиль из localStorage
    try {
      localStorage.removeItem('hr-chat-profile');
    } catch (error) {
      console.warn('Failed to remove profile from localStorage:', error);
    }
  };

  return (
    <div className="flex flex-col min-h-[100dvh] bg-black text-white">
      {/* Заголовок */}
      <div className="bg-gray-900 border-b border-gray-800 p-4 md:p-6 shadow-sm">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg">
              <MessageCircle className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-base md:text-xl font-semibold text-white">HR Чат-Ассистент</h1>
              <p className="text-gray-400 text-xs md:text-sm">Профессиональные консультации и интервью</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={resetChat} size="sm" className="hidden sm:inline-flex border-gray-600 text-white bg-transparent hover:bg-gray-800">
              <RefreshCw className="h-4 w-4 mr-2" />
              Новый чат
            </Button>
            <Button variant="outline" onClick={onExit} size="sm" className="border-gray-600 text-white bg-transparent hover:bg-gray-800">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Выход
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full p-4 md:p-6 gap-4 md:gap-6">
        {/* Область сообщений */}
        <Card className="flex-1 flex flex-col shadow-card border border-gray-800 bg-gray-900">
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3 md:space-y-4">
            {/* Прогресс-бар профиля */}
            <ChatProgressBar userProfile={userProfile} />

            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message}
              />
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="max-w-[85%] bg-gray-800 text-white mr-4 rounded-xl px-4 py-3 border border-gray-700 shadow-card">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center text-white text-sm font-medium">
                      HR
                    </div>
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                      <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Ввод сообщения */}
          <div className="sticky bottom-0 border-t border-gray-800 p-3 md:p-6 bg-gray-900/80 backdrop-blur supports-[backdrop-filter]:bg-gray-900/60">
            <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
          </div>
        </Card>
      </div>
    </div>
  );
};

export default HRChat;