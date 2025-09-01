import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Upload, FileText, Trash2, Plus, Download } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

interface KnowledgeItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  tags: string[];
  difficulty: 'junior' | 'middle' | 'senior';
}

interface KnowledgeBaseProps {
  onKnowledgeUpdate?: (knowledge: KnowledgeItem[]) => void;
}

export const KnowledgeBase: React.FC<KnowledgeBaseProps> = ({ onKnowledgeUpdate }) => {
  const [knowledge, setKnowledge] = useState<KnowledgeItem[]>([]);
  const [newItem, setNewItem] = useState<Partial<KnowledgeItem>>({
    question: '',
    answer: '',
    category: '',
    tags: [],
    difficulty: 'middle'
  });
  const [uploadStatus, setUploadStatus] = useState<string>('');

  // Добавление нового элемента базы знаний
  const addKnowledgeItem = useCallback(() => {
    if (!newItem.question || !newItem.answer) {
      setUploadStatus('Заполните вопрос и ответ');
      return;
    }

    const item: KnowledgeItem = {
      id: Date.now().toString(),
      question: newItem.question,
      answer: newItem.answer,
      category: newItem.category || 'Общие вопросы',
      tags: typeof newItem.tags === 'string' ? newItem.tags.split(',').map(t => t.trim()) : newItem.tags || [],
      difficulty: newItem.difficulty || 'middle'
    };

    const updatedKnowledge = [...knowledge, item];
    setKnowledge(updatedKnowledge);
    setNewItem({ question: '', answer: '', category: '', tags: [], difficulty: 'middle' });
    setUploadStatus('Вопрос успешно добавлен');
    onKnowledgeUpdate?.(updatedKnowledge);

    // Сохраняем в localStorage
    localStorage.setItem('hr-knowledge-base', JSON.stringify(updatedKnowledge));
  }, [newItem, knowledge, onKnowledgeUpdate]);

  // Удаление элемента
  const removeKnowledgeItem = useCallback((id: string) => {
    const updatedKnowledge = knowledge.filter(item => item.id !== id);
    setKnowledge(updatedKnowledge);
    onKnowledgeUpdate?.(updatedKnowledge);
    localStorage.setItem('hr-knowledge-base', JSON.stringify(updatedKnowledge));
  }, [knowledge, onKnowledgeUpdate]);

  // Загрузка из файла
  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        let parsedData: KnowledgeItem[] = [];

        if (file.name.endsWith('.json')) {
          parsedData = JSON.parse(text);
        } else if (file.name.endsWith('.csv')) {
          // Простой CSV парсер
          const lines = text.split('\n');
          const headers = lines[0].split(',').map(h => h.trim());
          
          for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim());
            if (values.length >= 2) {
              parsedData.push({
                id: Date.now().toString() + i,
                question: values[0] || '',
                answer: values[1] || '',
                category: values[2] || 'Общие вопросы',
                tags: values[3] ? values[3].split(';').map(t => t.trim()) : [],
                difficulty: (values[4] as KnowledgeItem['difficulty']) || 'middle'
              });
            }
          }
        }

        if (parsedData.length > 0) {
          const updatedKnowledge = [...knowledge, ...parsedData];
          setKnowledge(updatedKnowledge);
          setUploadStatus(`Загружено ${parsedData.length} вопросов`);
          onKnowledgeUpdate?.(updatedKnowledge);
          localStorage.setItem('hr-knowledge-base', JSON.stringify(updatedKnowledge));
        }
      } catch (error) {
        setUploadStatus('Ошибка при загрузке файла');
        console.error('File upload error:', error);
      }
    };
    reader.readAsText(file);
  }, [knowledge, onKnowledgeUpdate]);

  // Экспорт в JSON
  const exportKnowledge = useCallback(() => {
    const dataStr = JSON.stringify(knowledge, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'hr-knowledge-base.json';
    link.click();
    URL.revokeObjectURL(url);
  }, [knowledge]);

  // Загрузка из localStorage при инициализации
  React.useEffect(() => {
    const saved = localStorage.getItem('hr-knowledge-base');
    if (saved) {
      try {
        const parsedKnowledge = JSON.parse(saved);
        setKnowledge(parsedKnowledge);
        onKnowledgeUpdate?.(parsedKnowledge);
      } catch (error) {
        console.error('Error loading knowledge base:', error);
      }
    }
  }, [onKnowledgeUpdate]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            База знаний для собеседований
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="add" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="add">Добавить вопрос</TabsTrigger>
              <TabsTrigger value="upload">Загрузить файл</TabsTrigger>
              <TabsTrigger value="manage">Управление ({knowledge.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="add" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Вопрос</label>
                  <Textarea
                    placeholder="Введите вопрос для собеседования..."
                    value={newItem.question || ''}
                    onChange={(e) => setNewItem(prev => ({ ...prev, question: e.target.value }))}
                    rows={3}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Ожидаемый ответ</label>
                  <Textarea
                    placeholder="Введите примерный правильный ответ..."
                    value={newItem.answer || ''}
                    onChange={(e) => setNewItem(prev => ({ ...prev, answer: e.target.value }))}
                    rows={4}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium">Категория</label>
                    <Input
                      placeholder="Например: JavaScript, React"
                      value={newItem.category || ''}
                      onChange={(e) => setNewItem(prev => ({ ...prev, category: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Теги (через запятую)</label>
                    <Input
                      placeholder="frontend, алгоритмы, опыт"
                      value={Array.isArray(newItem.tags) ? newItem.tags.join(', ') : newItem.tags || ''}
                      onChange={(e) => setNewItem(prev => ({ ...prev, tags: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Уровень сложности</label>
                    <select 
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      value={newItem.difficulty || 'middle'}
                      onChange={(e) => setNewItem(prev => ({ ...prev, difficulty: e.target.value as KnowledgeItem['difficulty'] }))}
                    >
                      <option value="junior">Junior</option>
                      <option value="middle">Middle</option>
                      <option value="senior">Senior</option>
                    </select>
                  </div>
                </div>
                <Button onClick={addKnowledgeItem} className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Добавить вопрос
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="upload" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Загрузить файл с вопросами (JSON или CSV)
                  </label>
                  <div className="flex items-center space-x-2">
                    <Input
                      type="file"
                      accept=".json,.csv"
                      onChange={handleFileUpload}
                      className="flex-1"
                    />
                    <Button variant="outline" onClick={exportKnowledge}>
                      <Download className="w-4 h-4 mr-2" />
                      Экспорт
                    </Button>
                  </div>
                </div>
                <Alert>
                  <AlertDescription>
                    <strong>Формат CSV:</strong> вопрос, ответ, категория, теги (через ;), сложность<br />
                    <strong>Формат JSON:</strong> массив объектов с полями question, answer, category, tags, difficulty
                  </AlertDescription>
                </Alert>
              </div>
            </TabsContent>

            <TabsContent value="manage" className="space-y-4">
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {knowledge.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    База знаний пуста. Добавьте вопросы для начала работы.
                  </p>
                ) : (
                  knowledge.map((item) => (
                    <Card key={item.id} className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                              {item.category}
                            </span>
                            <span className={`text-xs px-2 py-1 rounded ${
                              item.difficulty === 'junior' ? 'bg-green-100 text-green-800' :
                              item.difficulty === 'middle' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {item.difficulty}
                            </span>
                          </div>
                          <p className="font-medium mb-1">{item.question}</p>
                          <p className="text-sm text-gray-600 mb-2">{item.answer}</p>
                          {item.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {item.tags.map((tag, index) => (
                                <span key={index} className="text-xs px-1 py-0.5 bg-gray-100 text-gray-700 rounded">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeKnowledgeItem(item.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>

          {uploadStatus && (
            <Alert className="mt-4">
              <AlertDescription>{uploadStatus}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default KnowledgeBase;