import { useEffect, useMemo, useState } from "react";
import { ChecklistVersion } from "@/types/assessment";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { STORAGE_KEYS } from "@/constants/storage";

interface DraftAnswer { questionId: string; rating?: number | boolean; comment?: string }

const AIAssessment = ({ onBack, checklist }: { onBack: () => void; checklist: ChecklistVersion }) => {
  const questions = useMemo(() => checklist.competencies.flatMap(c => c.questions.map(q => ({...q, competency: c.name }))), [checklist]);

  const DRAFT_KEY = `${STORAGE_KEYS.sessions}-draft-${checklist.id}`;

  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, DraftAnswer>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) setAnswers(JSON.parse(raw));
    } catch (error) {
      console.warn('Failed to load draft answers from localStorage:', error);
    }
  }, [DRAFT_KEY]);

  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(answers));
    } catch (error) {
      console.warn('Failed to save draft answers to localStorage:', error);
    }
  }, [answers, DRAFT_KEY]);

  const q = questions[index];
  const progress = Math.round(((index) / questions.length) * 100);

  const setRating = (r: number | boolean) => setAnswers(prev => ({ ...prev, [q.id]: { ...(prev[q.id]||{questionId:q.id}), rating: r } }));
  const setComment = (c: string) => setAnswers(prev => ({ ...prev, [q.id]: { ...(prev[q.id]||{questionId:q.id}), comment: c } }));

  const next = () => { if (index < questions.length - 1) setIndex(index + 1); };
  const prev = () => { if (index > 0) setIndex(index - 1); };

  const finish = () => {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch (error) {
      console.warn('Failed to remove draft from localStorage:', error);
    }
    onBack();
  };

  const renderScale = () => {
    const scale = q.scale || 'five';
    if (scale === 'boolean') {
      return (
        <div className="flex gap-2">
          <Button variant={answers[q.id]?.rating===true?"default":"outline"} onClick={()=>setRating(true)}>Да</Button>
          <Button variant={answers[q.id]?.rating===false?"default":"outline"} onClick={()=>setRating(false)}>Нет</Button>
        </div>
      );
    }
    const max = scale === 'ten' ? 10 : 5;
    return (
      <div className="flex gap-2 flex-wrap">
        {Array.from({ length: max }, (_, i) => i + 1).map(r => (
          <Button key={r} variant={answers[q.id]?.rating===r?"default":"outline"} onClick={()=>setRating(r)}>
            {r}
          </Button>
        ))}
      </div>
    );
  };

  const isRated = () => {
    const v = answers[q.id]?.rating;
    return typeof v === 'boolean' ? true : typeof v === 'number' && v > 0;
  };

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-2xl p-4">
          <div>
            <h1 className="text-2xl font-bold">Опрос по чек-листу</h1>
            <p className="text-gray-400">{checklist.name} • v{checklist.version}</p>
          </div>
          <Button variant="outline" className="bg-white/5 border-white/10 text-white" onClick={onBack}>Назад</Button>
        </div>

        <Card className="bg-white/5 border border-white/10 text-white">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Вопрос {index+1} / {questions.length}</span>
              <div className="w-1/2"><Progress value={progress} /></div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-gray-400">Компетенция: {q.competency}</div>
            <div className="text-lg font-medium">{q.text}</div>
            <Separator className="my-2" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-400 mb-1">Позитивные индикаторы</div>
                <ul className="list-disc list-inside text-sm text-gray-300 space-y-1">
                  {q.indicators.positive.map((p,i)=>(<li key={i}>{p}</li>))}
                </ul>
              </div>
              <div>
                <div className="text-sm text-gray-400 mb-1">Негативные индикаторы</div>
                <ul className="list-disc list-inside text-sm text-gray-300 space-y-1">
                  {q.indicators.negative.map((p,i)=>(<li key={i}>{p}</li>))}
                </ul>
              </div>
            </div>
            <Separator className="my-2" />
            <div className="space-y-2">
              <div className="text-sm">Оценка</div>
              {renderScale()}
            </div>
            <div className="space-y-2">
              <div className="text-sm">Комментарий (опционально)</div>
              <textarea
                value={answers[q.id]?.comment||''}
                onChange={e=>setComment(e.target.value)}
                className="w-full h-24 bg-black/30 border border-white/10 rounded-md p-3 outline-none"
                placeholder="Кратко поясните оценку (пример поведения)"
              />
            </div>
            <div className="flex justify-between">
              <Button variant="outline" className="bg-white/5 border-white/10 text-white" onClick={prev} disabled={index===0}>Назад</Button>
              {index < questions.length-1 ? (
                <Button onClick={next} disabled={!isRated()}>Далее</Button>
              ) : (
                <Button onClick={finish} disabled={!isRated()}>Завершить</Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AIAssessment;