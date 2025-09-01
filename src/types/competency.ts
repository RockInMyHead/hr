export interface Company {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
}

export interface Role {
  id: string;
  name: string;
  level: number; // 1 - сотрудник, 2 - руководитель отдела, 3 - руководитель компании
  permissions: string[];
  companyId: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  roleId: string;
  companyId: string;
  departmentId?: string;
  managerId?: string;
  createdAt: Date;
}

export interface Department {
  id: string;
  name: string;
  companyId: string;
  managerId?: string;
}

export interface CompetencyCategory {
  id: string;
  name: string;
  description: string;
  weight: number; // Вес категории в общей оценке
}

export interface CompetencyQuestion {
  id: string;
  categoryId: string;
  text: string;
  positiveIndicators: string[];
  negativeIndicators: string[];
  weight: number; // Вес вопроса в категории
}

export interface Assessment {
  id: string;
  userId: string; // Оцениваемый сотрудник
  assessorId: string; // Кто оценивает
  assessorRole: 'self' | 'subordinate' | 'manager';
  companyId: string;
  status: 'draft' | 'completed';
  createdAt: Date;
  completedAt?: Date;
}

export interface AssessmentAnswer {
  id: string;
  assessmentId: string;
  questionId: string;
  rating: number; // 1-5 баллов
  comment?: string;
  evidence?: string; // Примеры поведения
}

export interface CompetencyScore {
  categoryId: string;
  categoryName: string;
  score: number; // Средний балл по категории
  maxScore: number;
  percentage: number;
}

export interface UserCompetencyProfile {
  userId: string;
  userName: string;
  companyId: string;
  overallScore: number;
  categoryScores: CompetencyScore[];
  strengths: string[];
  weaknesses: string[];
  developmentAreas: string[];
  recommendations: string[];
  lastAssessmentDate: Date;
}

export interface AssessmentTemplate {
  id: string;
  name: string;
  companyId: string;
  categories: CompetencyCategory[];
  questions: CompetencyQuestion[];
  isActive: boolean;
} 