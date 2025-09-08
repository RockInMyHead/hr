// Расширенные типы для комплексного профиля сотрудника

export interface MBTIProfile {
  type: 'INTJ' | 'INTP' | 'ENTJ' | 'ENTP' | 'INFJ' | 'INFP' | 'ENFJ' | 'ENFP' | 
        'ISTJ' | 'ISFJ' | 'ESTJ' | 'ESFJ' | 'ISTP' | 'ISFP' | 'ESTP' | 'ESFP';
  dimensions: {
    extraversion: number; // 0-100 (0 = интроверсия, 100 = экстраверсия)
    sensing: number; // 0-100 (0 = интуиция, 100 = сенсорика)
    thinking: number; // 0-100 (0 = чувства, 100 = мышление)
    judging: number; // 0-100 (0 = восприятие, 100 = суждение)
  };
  strengths: string[];
  developmentAreas: string[];
  workPreferences: string[];
  communicationStyle: string;
  leadershipStyle?: string;
  teamRole: string;
  stressFactors: string[];
  motivators: string[];
}

export interface NPSData {
  score: number; // 0-10
  category: 'promoter' | 'passive' | 'detractor';
  feedback: string;
  date: Date;
  aspects: {
    workEnvironment: number;
    management: number;
    growth: number;
    compensation: number;
    workLifeBalance: number;
    teamwork: number;
  };
  suggestions: string[];
}

export interface Assessment360 {
  id: string;
  subjectId: string; // ID оцениваемого
  assessorId: string; // ID оценивающего
  assessorRole: 'self' | 'manager' | 'peer' | 'subordinate' | 'client';
  competencyScores: Record<string, number>;
  behavioralObservations: {
    strengths: string[];
    developmentAreas: string[];
    specificExamples: string[];
  };
  date: Date;
  status: 'pending' | 'completed' | 'reviewed';
  aiGeneratedQuestions: string[];
  contextualResponses: Array<{
    question: string;
    answer: string;
    aiAnalysis?: string;
  }>;
}

export interface AIInterviewSession {
  id: string;
  candidateId: string;
  type: 'competency' | 'behavioral' | 'technical' | 'leadership';
  status: 'active' | 'completed' | 'paused';
  startTime: Date;
  endTime?: Date;
  transcript: Array<{
    timestamp: Date;
    speaker: 'ai' | 'candidate';
    message: string;
    audioUrl?: string; // для голосовых сообщений
    analysis?: {
      sentiment: 'positive' | 'neutral' | 'negative';
      confidence: number;
      keyPoints: string[];
      competencyIndicators: Record<string, number>;
    };
  }>;
  generatedProfile: CandidateProfile;
  recommendations: string[];
  nextSteps: string[];
}

export interface CandidateProfile {
  basicInfo: {
    name: string;
    position: string;
    experience: number;
    education: string[];
  };
  competencyAssessment: Record<string, {
    score: number;
    evidence: string[];
    confidence: number;
  }>;
  mbtiProfile?: MBTIProfile;
  behavioralInsights: {
    workStyle: string;
    decisionMaking: string;
    problemSolving: string;
    communication: string;
    leadership: string;
    teamwork: string;
  };
  motivationFactors: string[];
  potentialRisks: string[];
  fitAssessment: {
    roleAlignment: number; // 0-100
    cultureAlignment: number; // 0-100
    teamAlignment: number; // 0-100
    overallFit: number; // 0-100
  };
  developmentPlan: {
    immediateActions: string[];
    shortTermGoals: string[];
    longTermGoals: string[];
    requiredSupport: string[];
  };
}

export interface ExtendedEmployeeProfile {
  // Базовая информация
  employeeId: string;
  personalInfo: {
    name: string;
    email: string;
    position: string;
    department: string;
    hireDate: Date;
    managerId?: string;
  };
  
  // Компетенции и 360 оценка
  competencies: {
    current: Record<string, number>;
    target: Record<string, number>;
    assessments360: Assessment360[];
    lastAssessmentDate: Date;
    averageScore: number;
  };
  
  // Психологический профиль
  mbtiProfile?: MBTIProfile;
  
  // NPS и удовлетворенность
  npsHistory: NPSData[];
  currentNPS?: NPSData;
  
  // История интервью и оценок
  interviewHistory: AIInterviewSession[];
  
  // Аналитика и инсайты
  analytics: {
    performanceTrend: 'improving' | 'stable' | 'declining';
    riskLevel: 'low' | 'medium' | 'high';
    potentialLevel: 'high' | 'medium' | 'low';
    retentionRisk: number; // 0-100
    promotionReadiness: number; // 0-100
  };
  
  // Рекомендации по управлению
  managementRecommendations: {
    communicationStyle: string;
    motivationApproach: string;
    developmentFocus: string[];
    managementTips: string[];
    warningSignals: string[];
  };
  
  // История и метрики
  sessionHistory: Array<{
    date: Date;
    type: 'assessment' | 'interview' | 'feedback' | 'development';
    duration: number;
    outcome: string;
    notes?: string;
  }>;
}

// Предустановленные модели для анализа
export const MBTI_TYPES = {
  'INTJ': {
    name: 'Архитектор',
    description: 'Стратегический мыслитель с планом на все случаи жизни',
    strengths: ['Стратегическое мышление', 'Независимость', 'Решительность', 'Настойчивость'],
    challenges: ['Излишний перфекционизм', 'Нетерпимость к неэффективности', 'Трудности в команде'],
    workStyle: 'Предпочитает работать самостоятельно над долгосрочными проектами',
    managementTips: ['Дайте автономию', 'Сосредоточьтесь на целях', 'Избегайте микроменеджмента']
  },
  'ENFP': {
    name: 'Активист',
    description: 'Энтузиаст, творческий и общительный свободный дух',
    strengths: ['Креативность', 'Энтузиазм', 'Коммуникабельность', 'Гибкость'],
    challenges: ['Трудности с рутиной', 'Проблемы с концентрацией', 'Избегание конфликтов'],
    workStyle: 'Нуждается в разнообразии и творческих задачах',
    managementTips: ['Обеспечьте разнообразие', 'Поощряйте инновации', 'Дайте обратную связь']
  },
  // Добавим остальные типы по мере необходимости
} as const;

// Динамическая генерация описаний MBTI типов
import MBTITypesService, { MBTITypeDescription, MBTITypeCode } from '@/services/mbtiTypesService';

// Кеш для сгенерированных типов
let mbtiTypesCache: Record<MBTITypeCode, MBTITypeDescription> | null = null;
let mbtiTypesService: MBTITypesService | null = null;

// Функция для получения описания типа MBTI
export async function getMBTITypeDescription(typeCode: MBTITypeCode): Promise<MBTITypeDescription> {
  if (!mbtiTypesService) {
    mbtiTypesService = new MBTITypesService();
  }

  return await mbtiTypesService.getMBTITypeDescription(typeCode);
}

// Функция для получения всех типов MBTI
export async function getAllMBTITypes(): Promise<Record<MBTITypeCode, MBTITypeDescription>> {
  if (!mbtiTypesService) {
    mbtiTypesService = new MBTITypesService();
  }

  if (!mbtiTypesCache) {
    mbtiTypesCache = await mbtiTypesService.getAllMBTITypes();
  }

  return mbtiTypesCache;
}

export const NPS_CATEGORIES = {
  promoter: {
    range: [9, 10],
    label: 'Промоутер',
    description: 'Лояльные энтузиасты, которые будут рекомендовать компанию',
    color: 'text-green-600 bg-green-100'
  },
  passive: {
    range: [7, 8],
    label: 'Нейтральный',
    description: 'Удовлетворенные, но не восторженные сотрудники',
    color: 'text-yellow-600 bg-yellow-100'
  },
  detractor: {
    range: [0, 6],
    label: 'Критик',
    description: 'Недовольные сотрудники, которые могут навредить репутации',
    color: 'text-red-600 bg-red-100'
  }
} as const;
