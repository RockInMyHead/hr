import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { 
  Brain, 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle, 
  Users, 
  Lightbulb,
  Heart,
  Target,
  Eye,
  MessageSquare
} from 'lucide-react';
import type { AppUser } from '@/types/profile';
import type { MBTIProfile } from '@/types/extended-profile';
import { getMBTITypeDescription } from '@/types/extended-profile';
import MBTIService from '@/services/mbtiService';

interface MBTITestProps {
  user: AppUser;
  onBack: () => void;
  onComplete?: (profile: MBTIProfile) => void;
}

interface MBTIQuestion {
  id: number;
  question: string;
  optionA: string;
  optionB: string;
  dimension: 'EI' | 'SN' | 'TF' | 'JP';
  aPoints: number; // Очки для варианта A
  bPoints: number; // Очки для варианта B
}

// База вопросов MBTI
const MBTI_QUESTIONS: MBTIQuestion[] = [
  // Экстраверсия/Интроверсия (E/I)
  {
    id: 1,
    question: "Когда вы работаете над проектом, вы предпочитаете:",
    optionA: "Обсуждать идеи с коллегами в процессе работы",
    optionB: "Сначала обдумать все самостоятельно, а потом поделиться",
    dimension: 'EI',
    aPoints: 1, // E
    bPoints: 0  // I
  },
  {
    id: 2,
    question: "На корпоративных мероприятиях вы обычно:",
    optionA: "Легко знакомитесь с новыми людьми и активно общаетесь",
    optionB: "Предпочитаете общаться с уже знакомыми коллегами",
    dimension: 'EI',
    aPoints: 1, // E
    bPoints: 0  // I
  },
  {
    id: 3,
    question: "После напряженного рабочего дня вы предпочитаете:",
    optionA: "Встретиться с друзьями или коллегами",
    optionB: "Побыть в одиночестве и отдохнуть",
    dimension: 'EI',
    aPoints: 1, // E
    bPoints: 0  // I
  },
  {
    id: 4,
    question: "Когда вам нужно принять важное решение:",
    optionA: "Обсуждаете варианты с другими людьми",
    optionB: "Размышляете самостоятельно и анализируете",
    dimension: 'EI',
    aPoints: 1, // E
    bPoints: 0  // I
  },

  // Сенсорика/Интуиция (S/N)
  {
    id: 5,
    question: "При изучении новой информации вы предпочитаете:",
    optionA: "Конкретные факты, примеры и пошаговые инструкции",
    optionB: "Общие концепции и возможности для применения",
    dimension: 'SN',
    aPoints: 1, // S
    bPoints: 0  // N
  },
  {
    id: 6,
    question: "Когда вы планируете отпуск:",
    optionA: "Детально продумываете маршрут и бронируете заранее",
    optionB: "Планируете общее направление, оставляя место для спонтанности",
    dimension: 'SN',
    aPoints: 1, // S
    bPoints: 0  // N
  },
  {
    id: 7,
    question: "В работе вы больше цените:",
    optionA: "Проверенные методы и стабильные процессы",
    optionB: "Инновационные подходы и новые возможности",
    dimension: 'SN',
    aPoints: 1, // S
    bPoints: 0  // N
  },
  {
    id: 8,
    question: "При решении проблем вы склонны:",
    optionA: "Опираться на прошлый опыт и установленные практики",
    optionB: "Искать новые творческие решения",
    dimension: 'SN',
    aPoints: 1, // S
    bPoints: 0  // N
  },

  // Мышление/Чувства (T/F)
  {
    id: 9,
    question: "При принятии решений вы в первую очередь учитываете:",
    optionA: "Логику, факты и объективные критерии",
    optionB: "Влияние на людей и человеческий фактор",
    dimension: 'TF',
    aPoints: 1, // T
    bPoints: 0  // F
  },
  {
    id: 10,
    question: "В конфликтных ситуациях вы предпочитаете:",
    optionA: "Анализировать факты и находить справедливое решение",
    optionB: "Учитывать чувства всех сторон и искать компромисс",
    dimension: 'TF',
    aPoints: 1, // T
    bPoints: 0  // F
  },
  {
    id: 11,
    question: "Когда вы даете обратную связь коллегам:",
    optionA: "Фокусируетесь на конкретных результатах и улучшениях",
    optionB: "Учитываете их чувства и стараетесь мотивировать",
    dimension: 'TF',
    aPoints: 1, // T
    bPoints: 0  // F
  },
  {
    id: 12,
    question: "При оценке идей вы больше внимания уделяете:",
    optionA: "Логической обоснованности и эффективности",
    optionB: "Тому, как это повлияет на людей и отношения",
    dimension: 'TF',
    aPoints: 1, // T
    bPoints: 0  // F
  },

  // Суждение/Восприятие (J/P)
  {
    id: 13,
    question: "В работе вы предпочитаете:",
    optionA: "Четкие планы, дедлайны и структурированные процессы",
    optionB: "Гибкость, возможность адаптироваться и менять планы",
    dimension: 'JP',
    aPoints: 1, // J
    bPoints: 0  // P
  },
  {
    id: 14,
    question: "Ваш рабочий стол обычно:",
    optionA: "Организован и все лежит на своих местах",
    optionB: "Может быть беспорядок, но вы знаете, где что лежит",
    dimension: 'JP',
    aPoints: 1, // J
    bPoints: 0  // P
  },
  {
    id: 15,
    question: "Когда у вас есть свободное время на работе:",
    optionA: "Планируете, как его эффективно использовать",
    optionB: "Смотрите по ситуации, что больше интересно в данный момент",
    dimension: 'JP',
    aPoints: 1, // J
    bPoints: 0  // P
  },
  {
    id: 16,
    question: "При работе над долгосрочными проектами:",
    optionA: "Разбиваете на этапы и следуете плану",
    optionB: "Работаете по мере поступления вдохновения",
    dimension: 'JP',
    aPoints: 1, // J
    bPoints: 0  // P
  }
];

export function MBTITest({ user, onBack, onComplete }: MBTITestProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, 'A' | 'B'>>({});
  const [isCompleted, setIsCompleted] = useState(false);
  const [result, setResult] = useState<MBTIProfile | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [isGeneratingResults, setIsGeneratingResults] = useState(false);
  const [mbtiService] = useState(() => new MBTIService());

  // Проверка на завершенность теста
  useEffect(() => {
    if (Object.keys(answers).length === MBTI_QUESTIONS.length) {
      calculateResults();
    }
  }, [answers]);

  // Расчет результатов MBTI
  const calculateResults = async () => {
    setIsGeneratingResults(true);

    try {
      const scores = {
        E: 0, I: 0,
        S: 0, N: 0,
        T: 0, F: 0,
        J: 0, P: 0
      };

      // Подсчет очков по каждому измерению
      MBTI_QUESTIONS.forEach(question => {
        const answer = answers[question.id];
        if (answer) {
          if (question.dimension === 'EI') {
            if (answer === 'A') scores.E += question.aPoints;
            else scores.I += 1;
          } else if (question.dimension === 'SN') {
            if (answer === 'A') scores.S += question.aPoints;
            else scores.N += 1;
          } else if (question.dimension === 'TF') {
            if (answer === 'A') scores.T += question.aPoints;
            else scores.F += 1;
          } else if (question.dimension === 'JP') {
            if (answer === 'A') scores.J += question.aPoints;
            else scores.P += 1;
          }
        }
      });

      // Определение типа
      const type = `${scores.E > scores.I ? 'E' : 'I'}${scores.S > scores.N ? 'S' : 'N'}${scores.T > scores.F ? 'T' : 'F'}${scores.J > scores.P ? 'J' : 'P'}`;

      // Генерация динамических результатов через AI
      const [workPreferences, teamRole, stressFactors, motivators] = await Promise.all([
        mbtiService.generateWorkPreferences(type),
        mbtiService.generateTeamRole(type),
        mbtiService.generateStressFactors(type),
        mbtiService.generateMotivators(type)
      ]);

    // Получаем описание типа MBTI
    const typeDescription = await getMBTITypeDescription(type as any);

    // Создание профиля
    const profile: MBTIProfile = {
      type,
      dimensions: {
        extraversion: Math.round((scores.E / (scores.E + scores.I)) * 100),
        sensing: Math.round((scores.S / (scores.S + scores.N)) * 100),
        thinking: Math.round((scores.T / (scores.T + scores.F)) * 100),
        judging: Math.round((scores.J / (scores.J + scores.P)) * 100)
      },
      strengths: typeDescription.strengths,
      developmentAreas: typeDescription.challenges,
      workPreferences,
      communicationStyle: typeDescription.workStyle,
      teamRole,
      stressFactors,
      motivators
    };

      setResult(profile);
      setIsCompleted(true);

      // Сохранение результата
      const savedProfiles = localStorage.getItem('mbti-profiles') || '{}';
      const profiles = JSON.parse(savedProfiles);
      profiles[user.email || user.name] = profile;
      localStorage.setItem('mbti-profiles', JSON.stringify(profiles));

      if (onComplete) {
        onComplete(profile);
      }
    } catch (error) {
      console.error('Error calculating MBTI results:', error);

      // Fallback к базовым результатам
      const scores = {
        E: 0, I: 0,
        S: 0, N: 0,
        T: 0, F: 0,
        J: 0, P: 0
      };

      MBTI_QUESTIONS.forEach(question => {
        const answer = answers[question.id];
        if (answer) {
          if (question.dimension === 'EI') {
            if (answer === 'A') scores.E += question.aPoints;
            else scores.I += 1;
          } else if (question.dimension === 'SN') {
            if (answer === 'A') scores.S += question.aPoints;
            else scores.N += 1;
          } else if (question.dimension === 'TF') {
            if (answer === 'A') scores.T += question.aPoints;
            else scores.F += 1;
          } else if (question.dimension === 'JP') {
            if (answer === 'A') scores.J += question.aPoints;
            else scores.P += 1;
          }
        }
      });

      const type = `${scores.E > scores.I ? 'E' : 'I'}${scores.S > scores.N ? 'S' : 'N'}${scores.T > scores.F ? 'T' : 'F'}${scores.J > scores.P ? 'J' : 'P'}`;

      const fallbackProfile: MBTIProfile = {
        type,
        dimensions: {
          extraversion: Math.round((scores.E / (scores.E + scores.I)) * 100),
          sensing: Math.round((scores.S / (scores.S + scores.N)) * 100),
          thinking: Math.round((scores.T / (scores.T + scores.F)) * 100),
          judging: Math.round((scores.J / (scores.J + scores.P)) * 100)
        },
        strengths: ['Уникальность', 'Индивидуальность', 'Самобытность'],
        developmentAreas: ['Адаптация', 'Понимание другими'],
        workPreferences: ['Сбалансированная рабочая среда', 'Четкие цели', 'Обратная связь'],
        communicationStyle: 'Работает над индивидуальными задачами',
        teamRole: 'Универсальный участник команды',
        stressFactors: ['Неопределенность', 'Конфликты', 'Перегрузка'],
        motivators: ['Достижение целей', 'Обратная связь', 'Развитие']
      };

      setResult(fallbackProfile);
      setIsCompleted(true);

      if (onComplete) {
        onComplete(fallbackProfile);
      }
    } finally {
      setIsGeneratingResults(false);
    }
  };


  // Обработка ответа
  const handleAnswer = (questionId: number, answer: 'A' | 'B') => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  // Навигация между вопросами
  const goToNext = () => {
    if (currentQuestion < MBTI_QUESTIONS.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const goToPrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  // Показать результаты
  const showResultsScreen = () => {
    setShowResults(true);
  };

  const progress = (Object.keys(answers).length / MBTI_QUESTIONS.length) * 100;
  const currentQ = MBTI_QUESTIONS[currentQuestion];

  if (showResults && result) {
    return (
      <div className="min-h-screen bg-black text-white p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Заголовок результатов */}
          <div className="text-center bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
            <div className="w-20 h-20 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Brain className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-white mb-2">Ваш тип личности</h1>
            <div className="text-6xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent mb-2">
              {result.type}
            </div>
            <p className="text-xl text-gray-300">
              {MBTI_TYPES[result.type]?.name || 'Уникальная личность'}
            </p>
            <p className="text-gray-400 mt-2">
              {MBTI_TYPES[result.type]?.description || 'Индивидуальная комбинация качеств'}
            </p>
          </div>

          {/* Измерения */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-white/5 border-white/10 text-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Источник энергии
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Интроверсия</span>
                    <span>Экстраверсия</span>
                  </div>
                  <Progress value={result.dimensions.extraversion} className="h-3" />
                  <p className="text-center text-sm text-gray-400">
                    {result.dimensions.extraversion}% экстраверсия
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/10 text-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Восприятие информации
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Интуиция</span>
                    <span>Сенсорика</span>
                  </div>
                  <Progress value={result.dimensions.sensing} className="h-3" />
                  <p className="text-center text-sm text-gray-400">
                    {result.dimensions.sensing}% сенсорика
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/10 text-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  Принятие решений
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Чувства</span>
                    <span>Мышление</span>
                  </div>
                  <Progress value={result.dimensions.thinking} className="h-3" />
                  <p className="text-center text-sm text-gray-400">
                    {result.dimensions.thinking}% мышление
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/10 text-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Образ жизни
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Восприятие</span>
                    <span>Суждение</span>
                  </div>
                  <Progress value={result.dimensions.judging} className="h-3" />
                  <p className="text-center text-sm text-gray-400">
                    {result.dimensions.judging}% суждение
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Детальные результаты */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-white/5 border-white/10 text-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  Сильные стороны
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {result.strengths.map((strength, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="h-2 w-2 bg-green-500 rounded-full" />
                      <span className="text-sm">{strength}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/10 text-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-orange-500" />
                  Области развития
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {result.developmentAreas.map((area, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="h-2 w-2 bg-orange-500 rounded-full" />
                      <span className="text-sm">{area}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/10 text-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="h-5 w-5 text-pink-500" />
                  Мотиваторы
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {result.motivators.map((motivator, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="h-2 w-2 bg-pink-500 rounded-full" />
                      <span className="text-sm">{motivator}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/10 text-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-blue-500" />
                  Рабочие предпочтения
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {result.workPreferences.map((preference, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="h-2 w-2 bg-blue-500 rounded-full" />
                      <span className="text-sm">{preference}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Кнопки действий */}
          <div className="flex justify-center gap-4">
            <Button onClick={onBack} variant="outline" className="bg-white/5 border-white/10 text-white hover:bg-white/10">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Назад в профиль
            </Button>
            <Button 
              onClick={() => window.print()} 
              className="bg-purple-600 hover:bg-purple-700"
            >
              Сохранить результат
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Заголовок */}
        <div className="flex items-center justify-between bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-4 md:p-8 shadow-2xl">
          <div className="flex items-center gap-3">
            <Button onClick={onBack} variant="outline" size="sm" className="bg-white/5 border-white/10 text-white hover:bg-white/10">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Назад
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-white">MBTI Тест личности</h1>
              <p className="text-gray-400 text-sm">Определение типа личности для лучшего понимания рабочего стиля</p>
            </div>
          </div>
          <Badge className="bg-purple-600 text-white">
            <Brain className="h-4 w-4 mr-1" />
            {Math.round(progress)}%
          </Badge>
        </div>

        {/* Прогресс */}
        <Card className="bg-white/5 border-white/10 text-white">
          <CardContent className="p-6">
            <div className="flex justify-between text-sm text-gray-400 mb-2">
              <span>Вопрос {currentQuestion + 1} из {MBTI_QUESTIONS.length}</span>
              <span>{Object.keys(answers).length} ответов</span>
            </div>
            <Progress value={progress} className="h-2" />
          </CardContent>
        </Card>

        {/* Вопрос */}
        {!isCompleted && (
          <Card className="bg-white/5 border-white/10 text-white">
            <CardHeader>
              <CardTitle className="text-xl">{currentQ.question}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <RadioGroup
                value={answers[currentQ.id] || ''}
                onValueChange={(value) => handleAnswer(currentQ.id, value as 'A' | 'B')}
              >
                <div className="flex items-center space-x-3 p-4 rounded-xl border border-white/10 hover:bg-white/5 cursor-pointer">
                  <RadioGroupItem value="A" id={`${currentQ.id}-a`} />
                  <Label htmlFor={`${currentQ.id}-a`} className="cursor-pointer flex-1">
                    {currentQ.optionA}
                  </Label>
                </div>
                <div className="flex items-center space-x-3 p-4 rounded-xl border border-white/10 hover:bg-white/5 cursor-pointer">
                  <RadioGroupItem value="B" id={`${currentQ.id}-b`} />
                  <Label htmlFor={`${currentQ.id}-b`} className="cursor-pointer flex-1">
                    {currentQ.optionB}
                  </Label>
                </div>
              </RadioGroup>

              {/* Навигация */}
              <div className="flex justify-between pt-4">
                <Button 
                  onClick={goToPrevious}
                  disabled={currentQuestion === 0}
                  variant="outline"
                  className="bg-white/5 border-white/10 text-white hover:bg-white/10"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Назад
                </Button>
                
                <Button 
                  onClick={goToNext}
                  disabled={currentQuestion === MBTI_QUESTIONS.length - 1 || !answers[currentQ.id]}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  Далее
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Результат готов */}
        {isCompleted && !showResults && (
          <Card className="bg-white/5 border-white/10 text-white text-center">
            <CardContent className="p-8">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Тест завершен!</h2>
              <p className="text-gray-400 mb-6">
                {isGeneratingResults
                  ? 'Генерируем персонализированные рекомендации через ИИ...'
                  : 'Все вопросы отвечены. Готов анализ вашего типа личности.'
                }
              </p>
              <Button
                onClick={showResultsScreen}
                disabled={isGeneratingResults}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {isGeneratingResults ? 'Генерация результатов...' : 'Показать результаты'}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
