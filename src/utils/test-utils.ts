// Утилиты для тестирования функциональности

export const mockUserResponse = (response: string) => {
  return {
    text: response,
    isUser: true,
    timestamp: new Date(),
    id: Date.now().toString()
  };
};

export const mockHRResponse = (response: string) => {
  return {
    text: response,
    isUser: false,
    timestamp: new Date(),
    id: Date.now().toString()
  };
};

export const testFallbackQuestions = () => {
  const testCases = [
    "Я программист",
    "У меня 5 лет опыта",
    "Я преподавал в университете",
    "Работал в Газпроме",
    "Люблю решать сложные задачи"
  ];

  return testCases.map(testCase => ({
    input: testCase,
    expected: "должен вернуть контекстный вопрос"
  }));
};

export const validateUserProfile = (profile: Record<string, unknown>) => {
  const requiredFields = ['name', 'experience', 'skills', 'strengths'];
  const errors = [];

  for (const field of requiredFields) {
    if (profile[field] === undefined) {
      errors.push(`Поле ${field} отсутствует`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}; 