import { useEffect, useMemo, useState, useCallback } from 'react';
import { Employee, EmployeeRole } from '@/types/employee';
import { readEmployees, saveEmployees, upsertEmployee, deleteEmployee, syncUsersToEmployees } from '@/lib/employees';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Plus, Trash2, Edit2, Users, X, Star, Crown, Briefcase, User as UserIcon } from 'lucide-react';
import OrgChart from '@/components/OrgChart';
import type { AppUser } from '@/types/profile';
//

const roleOptions: { value: EmployeeRole; label: string }[] = [
  { value: 'subordinate', label: 'Подчиненный' },
  { value: 'manager', label: 'Руководитель' },
  { value: 'peer', label: 'Коллега' },
  { value: 'mentor', label: 'Наставник' },
  { value: 'other', label: 'Другое' },
];

const emptyEmployee: Employee = { id: '', name: '', role: 'subordinate', email: '', position: '', note: '' };

export default function Employees({ onBack, user }: { onBack: () => void; user: AppUser }) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<EmployeeRole | 'all'>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [form, setForm] = useState<Employee>(emptyEmployee);
  const [tab, setTab] = useState<'list' | 'diagram'>('diagram');
  const [deptSummary, setDeptSummary] = useState<{ communication: number; leadership: number; productivity: number; reliability: number; initiative: number; count: number }>({ communication: 0, leadership: 0, productivity: 0, reliability: 0, initiative: 0, count: 0 });

  useEffect(() => {
    // При входе синхронизируем пользователей компании в список сотрудников
    if (user.companyId) {
      syncUsersToEmployees(user.companyId);
    }
    setEmployees(readEmployees());
  }, [user.companyId]);
  useEffect(() => { saveEmployees(employees); }, [employees]);

  const computeSubtree = useCallback((list: Employee[], rootId: string): Set<string> => {
    const result = new Set<string>();
    const childrenByManager = new Map<string, string[]>();
    for (const e of list) {
      if (!e.managerId) continue;
      const arr = childrenByManager.get(e.managerId) ?? [];
      arr.push(e.id);
      childrenByManager.set(e.managerId, arr);
    }
    const stack = [rootId];
    while (stack.length) {
      const current = stack.pop()!;
      if (result.has(current)) continue;
      result.add(current);
      const kids = childrenByManager.get(current) ?? [];
      for (const k of kids) stack.push(k);
    }
    return result;
  }, []);

  const filtered = useMemo(() => {
    let base = employees;
    if (user.role === 'manager' && user.rootEmployeeId) {
      const ids = computeSubtree(employees, user.rootEmployeeId);
      base = employees.filter(e => ids.has(e.id));
    }
    return base.filter(e => {
      const matchQuery = `${e.name} ${e.email||''} ${e.position||''}`.toLowerCase().includes(query.toLowerCase());
      const matchRole = roleFilter === 'all' ? true : e.role === roleFilter;
      return matchQuery && matchRole;
    });
  }, [employees, query, roleFilter, user, computeSubtree]);

  // Сводная характеристика отдела по средним оценкам
  useEffect(() => {
    const list = filtered;
    if (list.length === 0) { setDeptSummary({ communication: 0, leadership: 0, productivity: 0, reliability: 0, initiative: 0, count: 0 }); return; }
    const sum = { communication: 0, leadership: 0, productivity: 0, reliability: 0, initiative: 0, count: 0 };
    for (const e of list) {
      if (!e.ratings) continue;
      sum.communication += e.ratings.communication;
      sum.leadership += e.ratings.leadership;
      sum.productivity += e.ratings.productivity;
      sum.reliability += e.ratings.reliability;
      sum.initiative += e.ratings.initiative;
      sum.count += 1;
    }
    setDeptSummary(sum);
  }, [filtered]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyEmployee, id: `${Date.now()}` });
    setIsFormOpen(true);
  };

  const openEdit = (emp: Employee) => {
    setEditing(emp);
    setForm(emp);
    setIsFormOpen(true);
  };

  const submitForm = () => {
    if (!form.name.trim()) return;
    upsertEmployee(form);
    setEmployees(readEmployees());
    setIsFormOpen(false);
  };

  const remove = (id: string) => {
    deleteEmployee(id);
    setEmployees(readEmployees());
  };

  const resync = () => {
    if (user.companyId) {
      syncUsersToEmployees(user.companyId);
      setEmployees(readEmployees());
    }
  };

  const RoleIcon = ({ userRole }: { userRole?: AppUser['role'] }) => {
    if (userRole === 'director') return <Crown className="h-4 w-4 text-purple-400" />;
    if (userRole === 'manager') return <Briefcase className="h-4 w-4 text-green-400" />;
    return <UserIcon className="h-4 w-4 text-blue-400" />;
  };

  const Stars = ({ value }: { value: number }) => (
    <span className="inline-flex items-center gap-0.5">
      {[1,2,3,4,5].map(i => (
        <Star key={i} className={i <= value ? 'h-3.5 w-3.5 text-yellow-400' : 'h-3.5 w-3.5 text-gray-500'} fill={i <= value ? 'currentColor' : 'none'} />
      ))}
    </span>
  );

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-white/5 border border-white/10 rounded-2xl p-3 sm:p-4 gap-3">
          <div className="flex items-center gap-3">
            <Users className="h-6 w-6 text-purple-400" />
            <div>
              <h1 className="text-lg sm:text-2xl font-bold">Сотрудники</h1>
              <p className="text-gray-400 text-sm">Создавайте связи: подчиненные, руководители, коллеги</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 sm:gap-3">
            <div className="bg-white/5 rounded-xl p-1">
              <button className={`px-3 py-1 rounded-lg text-sm ${tab==='diagram'?'bg-white/10':''}`} onClick={()=>setTab('diagram')}>Диаграмма</button>
              <button className={`px-3 py-1 rounded-lg text-sm ${tab==='list'?'bg-white/10':''}`} onClick={()=>setTab('list')}>Список</button>
            </div>
            <Button variant="outline" className="bg-white/5 border-white/10 text-white" onClick={resync}>Синхронизировать</Button>
            <Button variant="outline" className="bg-white/5 border-white/10 text-white" onClick={onBack}>Назад</Button>
            {(user.role === 'director' || user.role === 'managing_director' || user.role === 'administrator') && (
              <Button onClick={openCreate} className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
                <Plus className="h-4 w-4 mr-2" /> Добавить
              </Button>
            )}
          </div>
        </div>

        {/* Сводная характеристика отдела */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-3 sm:p-4">
          <div className="text-sm text-gray-300 mb-2">Сводная характеристика отдела (средние по оцененным сотрудникам)</div>
          {deptSummary.count > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs sm:text-sm">
              <div>Коммуникации: <span className="text-white font-medium">{(deptSummary.communication / deptSummary.count).toFixed(1)}/5</span></div>
              <div>Лидерство: <span className="text-white font-medium">{(deptSummary.leadership / deptSummary.count).toFixed(1)}/5</span></div>
              <div>Продуктивность: <span className="text-white font-medium">{(deptSummary.productivity / deptSummary.count).toFixed(1)}/5</span></div>
              <div>Надежность: <span className="text-white font-medium">{(deptSummary.reliability / deptSummary.count).toFixed(1)}/5</span></div>
              <div>Инициативность: <span className="text-white font-medium">{(deptSummary.initiative / deptSummary.count).toFixed(1)}/5</span></div>
            </div>
          ) : (
            <div className="text-gray-500 text-sm">Нет оцененных сотрудников для расчета</div>
          )}
        </div>

        {tab === 'diagram' ? (
          user.role === 'manager' ? (
            <OrgChart employeesOverride={filtered} readOnly />
          ) : (
            <OrgChart />
          )
        ) : (
        <Card className="bg-white/5 border border-white/10 text-white">
          <CardHeader>
            <CardTitle className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="flex-1 flex gap-3">
                <div className="flex-1">
                  <Input placeholder="Поиск по имени, email, должности" value={query} onChange={e=>setQuery(e.target.value)} className="bg-black/30 border-white/10" />
                </div>
                <select value={roleFilter} onChange={e=>setRoleFilter(e.target.value as EmployeeRole | 'all')} className="bg-black/30 border border-white/10 rounded-md px-3">
                  <option value="all">Все роли</option>
                  {roleOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="text-sm text-gray-400">Всего: {filtered.length}</div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filtered.map(e => (
                <div key={e.id} className="border border-white/10 rounded-xl p-4 bg-black/20 hover:bg-black/10 transition-colors duration-200">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="text-lg font-semibold inline-flex items-center gap-2">
                        <RoleIcon userRole={e.userRole} />
                        {e.name}
                      </div>
                      <div className="text-gray-400 text-sm">
                        {roleOptions.find(r=>r.value===e.role)?.label}
                        {` • ${e.userRole === 'director' ? 'Директор' : e.userRole === 'manager' ? 'Менеджер' : 'Сотрудник'}`}
                      </div>
                      {e.email && <div className="text-gray-400 text-sm">{e.email}</div>}
                      {e.ratings && (
                        <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-2 text-xs text-gray-300">
                          <div className="flex items-center justify-between gap-2"><span>Коммуникации</span><Stars value={e.ratings.communication} /></div>
                          <div className="flex items-center justify-between gap-2"><span>Лидерство</span><Stars value={e.ratings.leadership} /></div>
                          <div className="flex items-center justify-between gap-2"><span>Продуктивность</span><Stars value={e.ratings.productivity} /></div>
                          <div className="flex items-center justify-between gap-2"><span>Надежность</span><Stars value={e.ratings.reliability} /></div>
                          <div className="flex items-center justify-between gap-2"><span>Инициативность</span><Stars value={e.ratings.initiative} /></div>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 opacity-80">
                      {(user.role === 'director' || user.role === 'managing_director' || user.role === 'administrator') && (
                        <>
                          <Button variant="outline" size="sm" className="bg-white/5 border-white/10" onClick={()=>openEdit(e)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" className="bg-white/5 border-white/10 hover:bg-red-500/10" onClick={()=>remove(e.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {filtered.length === 0 && (
              <div className="text-center text-gray-400 py-10">Нет сотрудников{(user.role === 'director' || user.role === 'managing_director' || user.role === 'administrator') ? '. Нажмите «Добавить».' : ''}</div>
            )}
          </CardContent>
        </Card>
        )}

        {isFormOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in-0 duration-200">
            <div className="w-full max-w-lg animate-in slide-in-from-bottom-4 fade-in-0 duration-200">
              <Card className="bg-white/5 border border-white/10 text-white">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>{editing ? 'Редактировать' : 'Новый сотрудник'}</CardTitle>
                  <Button variant="outline" className="bg-white/5 border-white/10" onClick={()=>setIsFormOpen(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <Label className="text-sm text-gray-300">Имя</Label>
                      <Input value={form.name} onChange={e=>setForm({ ...form, name: e.target.value })} className="bg-black/30 border-white/10" />
                    </div>
                    <div>
                      <Label className="text-sm text-gray-300">Email</Label>
                      <Input value={form.email||''} onChange={e=>setForm({ ...form, email: e.target.value })} className="bg-black/30 border-white/10" />
                    </div>
                    <div>
                      <Label className="text-sm text-gray-300">Должность</Label>
                      <Input value={form.position||''} onChange={e=>setForm({ ...form, position: e.target.value })} className="bg-black/30 border-white/10" />
                    </div>
                    <div>
                      <Label className="text-sm text-gray-300">Роль</Label>
                      <select value={form.role} onChange={e=>setForm({ ...form, role: e.target.value as EmployeeRole })} className="bg-black/30 border border-white/10 rounded-md px-3 h-10">
                        {roleOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-300">Заметка</Label>
                      <textarea value={form.note||''} onChange={e=>setForm({ ...form, note: e.target.value })} className="w-full h-24 bg-black/30 border border-white/10 rounded-md p-3 outline-none" />
                    </div>
                  </div>
                  <Separator className="my-2" />
                  <div className="flex justify-end gap-3">
                    <Button variant="outline" className="bg-white/5 border-white/10" onClick={()=>setIsFormOpen(false)}>Отмена</Button>
                    <Button onClick={submitForm} className="bg-gradient-to-r from-purple-600 to-blue-600">Сохранить</Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}