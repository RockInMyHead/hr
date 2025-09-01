export type Role = 'self' | 'subordinate' | 'manager';

export interface IndicatorExamples {
  positive: string[];
  negative: string[];
}

export interface Question {
  id: string;
  text: string;
  indicators: IndicatorExamples;
  /** Оценочная шкала: five (1-5), ten (1-10), boolean (Да/Нет) */
  scale?: 'five' | 'ten' | 'boolean';
}

export interface Competency {
  id: string;
  name: string;
  description?: string;
  questions: Question[];
}

export interface ChecklistVersion {
  id: string;
  name: string;
  version: string;
  competencies: Competency[];
}

export interface AssessmentAnswer {
  questionId: string;
  rating: 1 | 2 | 3 | 4 | 5;
  comment?: string;
}

export interface AssessmentSession {
  id: string;
  subjectUserName: string;
  role: Role;
  checklistId: string;
  startedAt: string; // ISO
  endedAt?: string; // ISO
  answers: AssessmentAnswer[];
}

