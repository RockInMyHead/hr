import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Users, 
  Mail, 
  Phone, 
  Upload, 
  Download, 
  Send, 
  ArrowLeft,
  Plus,
  Trash2,
  FileText,
  CheckCircle,
  Clock,
  AlertTriangle,
  Copy
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import type { AppUser } from '@/types/profile';

interface BulkInvitationSystemProps {
  user: AppUser;
  onBack: () => void;
}

interface InvitationContact {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  position?: string;
  department?: string;
  role: 'employee' | 'manager' | 'director';
  status: 'pending' | 'sent' | 'registered' | 'failed';
}

interface BulkCampaign {
  id: string;
  name: string;
  description: string;
  contacts: InvitationContact[];
  template: {
    subject: string;
    emailBody: string;
    smsBody: string;
  };
  sentAt?: Date;
  stats: {
    total: number;
    sent: number;
    registered: number;
    failed: number;
  };
}

export function BulkInvitationSystem({ user, onBack }: BulkInvitationSystemProps) {
  const [activeTab, setActiveTab] = useState<'create' | 'campaigns' | 'templates'>('create');
  const [campaigns, setCampaigns] = useState<BulkCampaign[]>([]);
  const [currentCampaign, setCurrentCampaign] = useState<BulkCampaign | null>(null);
  const [contacts, setContacts] = useState<InvitationContact[]>([]);
  const [emailTemplate, setEmailTemplate] = useState({
    subject: 'Приглашение присоединиться к {company_name}',
    body: `Здравствуйте, {name}!

Мы приглашаем вас присоединиться к нашей команде в {company_name} на позицию {position}.

Для завершения регистрации перейдите по ссылке:
{invitation_link}

Ссылка действительна в течение 7 дней.

С уважением,
HR-отдел {company_name}`
  });
  const [smsTemplate, setSmsTemplate] = useState(
    'Приглашение в {company_name}! Завершите регистрацию: {invitation_link}'
  );
  const [isCreatingCampaign, setIsCreatingCampaign] = useState(false);
  const [campaignName, setCampaignName] = useState('');
  const [campaignDescription, setCampaignDescription] = useState('');

  // Загрузка сохраненных кампаний
  useEffect(() => {
    try {
      const saved = localStorage.getItem('bulk-invitation-campaigns');
      if (saved) {
        setCampaigns(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error loading campaigns:', error);
    }
  }, []);

  // Сохранение кампаний
  useEffect(() => {
    if (campaigns.length > 0) {
      localStorage.setItem('bulk-invitation-campaigns', JSON.stringify(campaigns));
    }
  }, [campaigns]);

  // Добавление контакта вручную
  const addContact = () => {
    const newContact: InvitationContact = {
      id: Date.now().toString(),
      name: '',
      email: '',
      phone: '',
      position: '',
      department: '',
      role: 'employee',
      status: 'pending'
    };
    setContacts([...contacts, newContact]);
  };

  // Обновление контакта
  const updateContact = (id: string, field: keyof InvitationContact, value: string) => {
    setContacts(contacts.map(contact => 
      contact.id === id ? { ...contact, [field]: value } : contact
    ));
  };

  // Удаление контакта
  const removeContact = (id: string) => {
    setContacts(contacts.filter(contact => contact.id !== id));
  };

  // Импорт из CSV
  const handleCSVImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const csv = e.target?.result as string;
        const lines = csv.split('\n');
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        
        const importedContacts: InvitationContact[] = [];
        
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim());
          if (values.length < 2) continue;
          
          const contact: InvitationContact = {
            id: Date.now().toString() + i,
            name: values[headers.indexOf('name') || headers.indexOf('имя')] || '',
            email: values[headers.indexOf('email') || headers.indexOf('почта')] || '',
            phone: values[headers.indexOf('phone') || headers.indexOf('телефон')] || '',
            position: values[headers.indexOf('position') || headers.indexOf('должность')] || '',
            department: values[headers.indexOf('department') || headers.indexOf('отдел')] || '',
            role: (values[headers.indexOf('role') || headers.indexOf('роль')] as any) || 'employee',
            status: 'pending'
          };
          
          if (contact.name) {
            importedContacts.push(contact);
          }
        }
        
        setContacts([...contacts, ...importedContacts]);
      } catch (error) {
        console.error('Error importing CSV:', error);
        alert('Ошибка при импорте CSV файла');
      }
    };
    reader.readAsText(file);
  };

  // Создание кампании
  const createCampaign = () => {
    if (!campaignName || contacts.length === 0) return;

    const campaign: BulkCampaign = {
      id: Date.now().toString(),
      name: campaignName,
      description: campaignDescription,
      contacts: [...contacts],
      template: {
        subject: emailTemplate.subject,
        emailBody: emailTemplate.body,
        smsBody: smsTemplate
      },
      stats: {
        total: contacts.length,
        sent: 0,
        registered: 0,
        failed: 0
      }
    };

    setCampaigns([...campaigns, campaign]);
    setCurrentCampaign(campaign);
    setContacts([]);
    setCampaignName('');
    setCampaignDescription('');
    setIsCreatingCampaign(false);
  };

  // Отправка приглашений
  const sendInvitations = async (campaign: BulkCampaign) => {
    const baseUrl = window.location.origin;
    const companyId = user.companyId || 'default';
    
    for (const contact of campaign.contacts) {
      try {
        // Генерация уникальной ссылки
        const invitationId = Date.now().toString() + Math.random().toString(36).slice(2);
        const inviteLink = `${baseUrl}?inviteId=${invitationId}&companyId=${companyId}&role=${contact.role}`;
        
        // Персонализация шаблонов
        const personalizedEmail = campaign.template.emailBody
          .replace(/{name}/g, contact.name)
          .replace(/{position}/g, contact.position || 'Сотрудник')
          .replace(/{company_name}/g, user.companyId || 'Наша компания')
          .replace(/{invitation_link}/g, inviteLink);

        const personalizedSMS = campaign.template.smsBody
          .replace(/{name}/g, contact.name)
          .replace(/{company_name}/g, user.companyId || 'Наша компания')
          .replace(/{invitation_link}/g, inviteLink);

        // Имитация отправки (в реальной системе здесь был бы API)
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Обновление статуса
        contact.status = 'sent';
        campaign.stats.sent++;
        
      } catch (error) {
        contact.status = 'failed';
        campaign.stats.failed++;
      }
    }

    campaign.sentAt = new Date();
    setCampaigns([...campaigns]);
  };

  // Экспорт шаблона CSV
  const exportCSVTemplate = () => {
    const template = 'name,email,phone,position,department,role\nИван Иванов,ivan@example.com,+7900123456,Разработчик,IT,employee\nПетр Петров,petr@example.com,+7900654321,Менеджер,Продажи,manager';
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'invitation_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Копирование ссылки
  const copyInviteLink = () => {
    const baseUrl = window.location.origin;
    const companyId = user.companyId || 'default';
    const inviteLink = `${baseUrl}?inviteCompanyId=${companyId}`;
    
    navigator.clipboard.writeText(inviteLink).then(() => {
      alert('Ссылка скопирована в буфер обмена!');
    });
  };

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Заголовок */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-4 md:p-8 shadow-2xl">
          <div className="flex items-center gap-3">
            <Button onClick={onBack} variant="outline" size="sm" className="bg-white/5 border-white/10 text-white hover:bg-white/10">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Назад
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-white">Массовые приглашения</h1>
              <p className="text-gray-400 text-sm">Система пакетной регистрации сотрудников</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-blue-600 text-white">
              <Users className="h-4 w-4 mr-1" />
              {campaigns.length} кампаний
            </Badge>
          </div>
        </div>

        {/* Навигация */}
        <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6 bg-white/5 border border-white/10 rounded-2xl p-1">
            <TabsTrigger value="create" className="data-[state=active]:bg-white/10 data-[state=active]:text-white rounded-xl">
              <Plus className="h-4 w-4 mr-2" />
              Создать кампанию
            </TabsTrigger>
            <TabsTrigger value="campaigns" className="data-[state=active]:bg-white/10 data-[state=active]:text-white rounded-xl">
              <Send className="h-4 w-4 mr-2" />
              Кампании
            </TabsTrigger>
            <TabsTrigger value="templates" className="data-[state=active]:bg-white/10 data-[state=active]:text-white rounded-xl">
              <FileText className="h-4 w-4 mr-2" />
              Шаблоны
            </TabsTrigger>
          </TabsList>

          {/* Создание кампании */}
          <TabsContent value="create" className="space-y-6">
            <Card className="bg-white/5 border-white/10 text-white">
              <CardHeader>
                <CardTitle>Новая кампания приглашений</CardTitle>
                <CardDescription className="text-gray-400">
                  Создайте список контактов и отправьте массовые приглашения
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Информация о кампании */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-300 mb-2 block">
                      Название кампании
                    </label>
                    <Input
                      value={campaignName}
                      onChange={(e) => setCampaignName(e.target.value)}
                      placeholder="Набор разработчиков Q1 2024"
                      className="bg-white/5 border-white/10 text-white placeholder:text-gray-400"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-300 mb-2 block">
                      Описание
                    </label>
                    <Input
                      value={campaignDescription}
                      onChange={(e) => setCampaignDescription(e.target.value)}
                      placeholder="Массовое приглашение новых сотрудников"
                      className="bg-white/5 border-white/10 text-white placeholder:text-gray-400"
                    />
                  </div>
                </div>

                {/* Импорт и экспорт */}
                <div className="flex flex-wrap gap-4">
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleCSVImport}
                      className="hidden"
                    />
                    <Button variant="outline" className="bg-white/5 border-white/10 text-white hover:bg-white/10">
                      <Upload className="h-4 w-4 mr-2" />
                      Импорт CSV
                    </Button>
                  </label>
                  
                  <Button 
                    onClick={exportCSVTemplate}
                    variant="outline" 
                    className="bg-white/5 border-white/10 text-white hover:bg-white/10"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Шаблон CSV
                  </Button>

                  <Button 
                    onClick={addContact}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Добавить контакт
                  </Button>

                  <Button 
                    onClick={copyInviteLink}
                    variant="outline" 
                    className="bg-white/5 border-white/10 text-white hover:bg-white/10"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Копировать базовую ссылку
                  </Button>
                </div>

                {/* Список контактов */}
                {contacts.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Контакты для приглашения ({contacts.length})</h3>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {contacts.map((contact) => (
                        <div key={contact.id} className="p-4 bg-black/20 rounded-xl">
                          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                            <Input
                              placeholder="Имя"
                              value={contact.name}
                              onChange={(e) => updateContact(contact.id, 'name', e.target.value)}
                              className="bg-white/5 border-white/10 text-white placeholder:text-gray-400"
                            />
                            <Input
                              placeholder="Email"
                              type="email"
                              value={contact.email}
                              onChange={(e) => updateContact(contact.id, 'email', e.target.value)}
                              className="bg-white/5 border-white/10 text-white placeholder:text-gray-400"
                            />
                            <Input
                              placeholder="Телефон"
                              value={contact.phone}
                              onChange={(e) => updateContact(contact.id, 'phone', e.target.value)}
                              className="bg-white/5 border-white/10 text-white placeholder:text-gray-400"
                            />
                            <Input
                              placeholder="Должность"
                              value={contact.position}
                              onChange={(e) => updateContact(contact.id, 'position', e.target.value)}
                              className="bg-white/5 border-white/10 text-white placeholder:text-gray-400"
                            />
                            <Select value={contact.role} onValueChange={(value: any) => updateContact(contact.id, 'role', value)}>
                              <SelectTrigger className="bg-white/5 border-white/10 text-white">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="employee">Сотрудник</SelectItem>
                                <SelectItem value="manager">Менеджер</SelectItem>
                                <SelectItem value="director">Директор</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button 
                              onClick={() => removeContact(contact.id)}
                              variant="outline"
                              size="sm"
                              className="bg-red-500/20 border-red-500/30 text-red-400 hover:bg-red-500/30"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Создание кампании */}
                <Button 
                  onClick={createCampaign}
                  disabled={!campaignName || contacts.length === 0}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Создать кампанию ({contacts.length} контактов)
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Кампании */}
          <TabsContent value="campaigns" className="space-y-6">
            <div className="grid gap-6">
              {campaigns.map((campaign) => (
                <Card key={campaign.id} className="bg-white/5 border-white/10 text-white">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>{campaign.name}</CardTitle>
                        <CardDescription className="text-gray-400">
                          {campaign.description} • {campaign.sentAt ? `Отправлено ${campaign.sentAt.toLocaleDateString()}` : 'Не отправлено'}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        {campaign.sentAt ? (
                          <Badge className="bg-green-600 text-white">
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Отправлено
                          </Badge>
                        ) : (
                          <Badge className="bg-yellow-600 text-white">
                            <Clock className="h-4 w-4 mr-1" />
                            Готово к отправке
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Статистика */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center p-3 bg-black/20 rounded-xl">
                          <div className="text-xl font-bold">{campaign.stats.total}</div>
                          <div className="text-xs text-gray-400">Всего</div>
                        </div>
                        <div className="text-center p-3 bg-black/20 rounded-xl">
                          <div className="text-xl font-bold text-blue-400">{campaign.stats.sent}</div>
                          <div className="text-xs text-gray-400">Отправлено</div>
                        </div>
                        <div className="text-center p-3 bg-black/20 rounded-xl">
                          <div className="text-xl font-bold text-green-400">{campaign.stats.registered}</div>
                          <div className="text-xs text-gray-400">Зарегистрировано</div>
                        </div>
                        <div className="text-center p-3 bg-black/20 rounded-xl">
                          <div className="text-xl font-bold text-red-400">{campaign.stats.failed}</div>
                          <div className="text-xs text-gray-400">Ошибки</div>
                        </div>
                      </div>

                      {/* Прогресс */}
                      {campaign.sentAt && (
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Прогресс регистрации</span>
                            <span>{Math.round((campaign.stats.registered / campaign.stats.total) * 100)}%</span>
                          </div>
                          <Progress value={(campaign.stats.registered / campaign.stats.total) * 100} className="h-2" />
                        </div>
                      )}

                      {/* Действия */}
                      <div className="flex gap-2">
                        {!campaign.sentAt ? (
                          <Button 
                            onClick={() => sendInvitations(campaign)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Send className="h-4 w-4 mr-2" />
                            Отправить приглашения
                          </Button>
                        ) : (
                          <Button 
                            onClick={() => sendInvitations(campaign)}
                            variant="outline"
                            className="bg-white/5 border-white/10 text-white hover:bg-white/10"
                          >
                            <Send className="h-4 w-4 mr-2" />
                            Повторить отправку
                          </Button>
                        )}
                        
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" className="bg-white/5 border-white/10 text-white hover:bg-white/10">
                              <Users className="h-4 w-4 mr-2" />
                              Просмотр контактов
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="bg-black border-white/10 text-white max-w-4xl">
                            <DialogHeader>
                              <DialogTitle>Контакты кампании: {campaign.name}</DialogTitle>
                            </DialogHeader>
                            <div className="max-h-96 overflow-y-auto space-y-2">
                              {campaign.contacts.map((contact) => (
                                <div key={contact.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                                  <div>
                                    <div className="font-medium">{contact.name}</div>
                                    <div className="text-sm text-gray-400">{contact.email} • {contact.position}</div>
                                  </div>
                                  <Badge className={
                                    contact.status === 'sent' ? 'bg-green-600' :
                                    contact.status === 'registered' ? 'bg-blue-600' :
                                    contact.status === 'failed' ? 'bg-red-600' :
                                    'bg-gray-600'
                                  }>
                                    {contact.status === 'sent' ? 'Отправлено' :
                                     contact.status === 'registered' ? 'Зарегистрирован' :
                                     contact.status === 'failed' ? 'Ошибка' :
                                     'Ожидание'}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {campaigns.length === 0 && (
                <div className="text-center py-12">
                  <Send className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">Нет созданных кампаний</h3>
                  <p className="text-gray-400">Создайте первую кампанию для массовых приглашений</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Шаблоны */}
          <TabsContent value="templates" className="space-y-6">
            <div className="grid gap-6">
              <Card className="bg-white/5 border-white/10 text-white">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Шаблон Email
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Настройте шаблон для email приглашений
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-300 mb-2 block">
                      Тема письма
                    </label>
                    <Input
                      value={emailTemplate.subject}
                      onChange={(e) => setEmailTemplate({...emailTemplate, subject: e.target.value})}
                      className="bg-white/5 border-white/10 text-white placeholder:text-gray-400"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-300 mb-2 block">
                      Текст письма
                    </label>
                    <Textarea
                      value={emailTemplate.body}
                      onChange={(e) => setEmailTemplate({...emailTemplate, body: e.target.value})}
                      rows={10}
                      className="bg-white/5 border-white/10 text-white placeholder:text-gray-400"
                    />
                  </div>
                  <div className="text-xs text-gray-500">
                    Доступные переменные: {'{name}'}, {'{position}'}, {'{company_name}'}, {'{invitation_link}'}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/5 border-white/10 text-white">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Phone className="h-5 w-5" />
                    Шаблон SMS
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Настройте шаблон для SMS приглашений
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-300 mb-2 block">
                      Текст SMS (максимум 160 символов)
                    </label>
                    <Textarea
                      value={smsTemplate}
                      onChange={(e) => setSmsTemplate(e.target.value)}
                      rows={3}
                      maxLength={160}
                      className="bg-white/5 border-white/10 text-white placeholder:text-gray-400"
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      {smsTemplate.length}/160 символов
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    Доступные переменные: {'{name}'}, {'{company_name}'}, {'{invitation_link}'}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
