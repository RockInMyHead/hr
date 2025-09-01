import React, { useState, useEffect, useCallback } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  NodeChange,
  EdgeChange,
  ReactFlowProvider,
  Position,
  MarkerType
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Users, 
  Plus, 
  Edit, 
  Trash2, 
  ArrowLeft,
  Crown,
  User,
  UserCheck,
  Building,
  Mail,
  Phone,
  MapPin,
  Award
} from 'lucide-react';
import type { AppUser } from '@/types/profile';
import type { Employee } from '@/types/employee';

interface InteractiveOrgChartProps {
  user: AppUser;
  onBack: () => void;
}

interface ExtendedEmployee extends Employee {
  subordinates?: string[];
  managerId?: string;
  level: number;
  nodeType?: 'ceo' | 'director' | 'manager' | 'employee';
}

// Кастомный компонент узла
const CustomNode = ({ data, isConnectable }: any) => {
  const getNodeColor = (nodeType: string) => {
    switch (nodeType) {
      case 'ceo': return 'from-purple-600 to-purple-800';
      case 'director': return 'from-blue-600 to-blue-800';
      case 'manager': return 'from-green-600 to-green-800';
      default: return 'from-gray-600 to-gray-800';
    }
  };

  const getIcon = (nodeType: string) => {
    switch (nodeType) {
      case 'ceo': return <Crown className="h-4 w-4" />;
      case 'director': return <Building className="h-4 w-4" />;
      case 'manager': return <UserCheck className="h-4 w-4" />;
      default: return <User className="h-4 w-4" />;
    }
  };

  const getRoleLabel = (nodeType: string) => {
    switch (nodeType) {
      case 'ceo': return 'Генеральный директор';
      case 'director': return 'Директор';
      case 'manager': return 'Менеджер';
      default: return 'Сотрудник';
    }
  };

  return (
    <div className={`px-4 py-3 shadow-md rounded-xl bg-gradient-to-r ${getNodeColor(data.nodeType)} border border-white/20 text-white min-w-[200px]`}>
      <div className="flex items-center gap-2 mb-2">
        {getIcon(data.nodeType)}
        <div className="font-bold text-sm">{data.name}</div>
      </div>
      <div className="text-xs opacity-90 mb-1">{getRoleLabel(data.nodeType)}</div>
      {data.department && (
        <div className="text-xs opacity-75">{data.department}</div>
      )}
      {data.email && (
        <div className="flex items-center gap-1 text-xs opacity-75 mt-2">
          <Mail className="h-3 w-3" />
          <span className="truncate">{data.email}</span>
        </div>
      )}
      {data.subordinateCount && (
        <div className="flex items-center gap-1 text-xs opacity-75 mt-1">
          <Users className="h-3 w-3" />
          <span>{data.subordinateCount} подчиненных</span>
        </div>
      )}
    </div>
  );
};

// Типы узлов
const nodeTypes = {
  custom: CustomNode,
};

export function InteractiveOrgChart({ user, onBack }: InteractiveOrgChartProps) {
  const [employees, setEmployees] = useState<ExtendedEmployee[]>([]);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLevel, setFilterLevel] = useState<string>('all');

  // Загрузка данных сотрудников
  useEffect(() => {
    try {
      const raw = localStorage.getItem('hr-employees');
      const employeeData: Employee[] = raw ? JSON.parse(raw) : [];
      
      // Расширяем данные сотрудников
      const extendedEmployees: ExtendedEmployee[] = employeeData.map(emp => ({
        ...emp,
        level: calculateLevel(emp, employeeData),
        nodeType: determineNodeType(emp),
        subordinates: findSubordinates(emp.id, employeeData)
      }));

      setEmployees(extendedEmployees);
      generateOrgChart(extendedEmployees);
    } catch (error) {
      console.error('Error loading org chart data:', error);
    }
  }, []);

  // Вычисление уровня в иерархии
  const calculateLevel = (employee: Employee, allEmployees: Employee[]): number => {
    let level = 0;
    let currentEmp = employee;
    
    while (currentEmp.managerId) {
      const manager = allEmployees.find(emp => emp.id === currentEmp.managerId);
      if (!manager) break;
      level++;
      currentEmp = manager;
      if (level > 10) break; // Защита от циклов
    }
    
    return level;
  };

  // Определение типа узла
  const determineNodeType = (employee: Employee): 'ceo' | 'director' | 'manager' | 'employee' => {
    if (employee.position?.toLowerCase().includes('генеральный директор') || employee.position?.toLowerCase().includes('ceo')) {
      return 'ceo';
    }
    if (employee.position?.toLowerCase().includes('директор')) {
      return 'director';
    }
    if (employee.position?.toLowerCase().includes('менеджер') || employee.position?.toLowerCase().includes('руководитель')) {
      return 'manager';
    }
    return 'employee';
  };

  // Поиск подчиненных
  const findSubordinates = (employeeId: string, allEmployees: Employee[]): string[] => {
    return allEmployees
      .filter(emp => emp.managerId === employeeId)
      .map(emp => emp.id);
  };

  // Генерация диаграммы организации
  const generateOrgChart = (employeeData: ExtendedEmployee[]) => {
    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];

    // Группировка по уровням
    const levels: Record<number, ExtendedEmployee[]> = {};
    employeeData.forEach(emp => {
      if (!levels[emp.level]) levels[emp.level] = [];
      levels[emp.level].push(emp);
    });

    // Создание узлов
    Object.entries(levels).forEach(([levelStr, levelEmployees]) => {
      const level = parseInt(levelStr);
      levelEmployees.forEach((emp, index) => {
        const subordinateCount = emp.subordinates?.length || 0;
        
        newNodes.push({
          id: emp.id,
          type: 'custom',
          position: {
            x: (index - levelEmployees.length / 2) * 300 + 150 * levelEmployees.length / 2,
            y: level * 200
          },
          data: {
            name: emp.name,
            nodeType: emp.nodeType,
            department: emp.position,
            email: emp.email,
            subordinateCount: subordinateCount > 0 ? subordinateCount : undefined,
            level: emp.level
          },
          sourcePosition: Position.Bottom,
          targetPosition: Position.Top,
        });
      });
    });

    // Создание связей
    employeeData.forEach(emp => {
      if (emp.managerId) {
        newEdges.push({
          id: `e${emp.managerId}-${emp.id}`,
          source: emp.managerId,
          target: emp.id,
          type: 'smoothstep',
          animated: false,
          style: { stroke: '#ffffff40', strokeWidth: 2 },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: '#ffffff40',
          },
        });
      }
    });

    setNodes(newNodes);
    setEdges(newEdges);
  };

  // Обработка соединений
  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  // Обработка клика по узлу
  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  // Фильтрация узлов
  const filteredNodes = nodes.filter(node => {
    const matchesSearch = node.data.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (node.data.department || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLevel = filterLevel === 'all' || node.data.level.toString() === filterLevel;
    return matchesSearch && matchesLevel;
  });

  // Фильтрация рёбер (показываем только для отфильтрованных узлов)
  const filteredNodeIds = new Set(filteredNodes.map(n => n.id));
  const filteredEdges = edges.filter(edge => 
    filteredNodeIds.has(edge.source) && filteredNodeIds.has(edge.target)
  );

  // Получение статистики
  const getStats = () => {
    const totalEmployees = employees.length;
    const levels = Math.max(...employees.map(emp => emp.level)) + 1;
    const managersCount = employees.filter(emp => (emp.subordinates?.length || 0) > 0).length;
    const avgSubordinates = managersCount > 0 ? 
      employees.reduce((sum, emp) => sum + (emp.subordinates?.length || 0), 0) / managersCount : 0;

    return { totalEmployees, levels, managersCount, avgSubordinates };
  };

  const stats = getStats();

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Заголовок */}
      <div className="p-6 bg-white/5 border-b border-white/10">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button onClick={onBack} variant="outline" size="sm" className="bg-white/5 border-white/10 text-white hover:bg-white/10">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Назад
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-white">Интерактивная оргструктура</h1>
              <p className="text-gray-400 text-sm">Визуализация и управление организационной структурой</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setIsAddDialogOpen(true)}
              className="bg-green-600 hover:bg-green-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Добавить
            </Button>
          </div>
        </div>
      </div>

      {/* Статистика и фильтры */}
      <div className="p-6 bg-white/5 border-b border-white/10">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="bg-white/5 border-white/10 text-white">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold">{stats.totalEmployees}</div>
                <div className="text-sm text-gray-400">Всего сотрудников</div>
              </CardContent>
            </Card>
            <Card className="bg-white/5 border-white/10 text-white">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold">{stats.levels}</div>
                <div className="text-sm text-gray-400">Уровней иерархии</div>
              </CardContent>
            </Card>
            <Card className="bg-white/5 border-white/10 text-white">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold">{stats.managersCount}</div>
                <div className="text-sm text-gray-400">Руководителей</div>
              </CardContent>
            </Card>
            <Card className="bg-white/5 border-white/10 text-white">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold">{stats.avgSubordinates.toFixed(1)}</div>
                <div className="text-sm text-gray-400">Среднее подчиненных</div>
              </CardContent>
            </Card>
          </div>

          <div className="flex gap-4">
            <Input
              placeholder="Поиск сотрудников..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-white/5 border-white/10 text-white placeholder:text-gray-400"
            />
            <Select value={filterLevel} onValueChange={setFilterLevel}>
              <SelectTrigger className="w-48 bg-white/5 border-white/10 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все уровни</SelectItem>
                {Array.from({ length: stats.levels }, (_, i) => (
                  <SelectItem key={i} value={i.toString()}>
                    Уровень {i}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Диаграмма */}
      <div style={{ height: 'calc(100vh - 240px)' }}>
        <ReactFlowProvider>
          <ReactFlow
            nodes={filteredNodes}
            edges={filteredEdges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            fitView
            style={{ background: 'transparent' }}
            nodesDraggable={true}
            nodesConnectable={false}
            elementsSelectable={true}
          >
            <Controls className="bg-white/10 border-white/20" />
            <MiniMap 
              className="bg-white/10 border-white/20"
              nodeColor={(node) => {
                switch (node.data.nodeType) {
                  case 'ceo': return '#9333ea';
                  case 'director': return '#2563eb';
                  case 'manager': return '#16a34a';
                  default: return '#6b7280';
                }
              }}
            />
            <Background gap={20} size={1} color="#ffffff10" />
          </ReactFlow>
        </ReactFlowProvider>
      </div>

      {/* Информационная панель */}
      {selectedNode && (
        <div className="fixed right-6 top-1/2 transform -translate-y-1/2 w-80 bg-black/90 backdrop-blur-xl border border-white/10 rounded-xl p-6 shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white">Информация о сотруднике</h3>
            <Button
              onClick={() => setSelectedNode(null)}
              variant="outline"
              size="sm"
              className="bg-white/5 border-white/10 text-white hover:bg-white/10"
            >
              ×
            </Button>
          </div>
          
          <div className="space-y-3">
            <div>
              <h4 className="font-medium text-white">{selectedNode.data.name}</h4>
              <p className="text-sm text-gray-400">{selectedNode.data.department}</p>
            </div>
            
            {selectedNode.data.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-gray-400" />
                <span className="text-gray-300">{selectedNode.data.email}</span>
              </div>
            )}
            
            <div className="flex items-center gap-2 text-sm">
              <Building className="h-4 w-4 text-gray-400" />
              <span className="text-gray-300">Уровень {selectedNode.data.level}</span>
            </div>
            
            {selectedNode.data.subordinateCount && (
              <div className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-gray-400" />
                <span className="text-gray-300">{selectedNode.data.subordinateCount} подчиненных</span>
              </div>
            )}
          </div>

          <div className="flex gap-2 mt-6">
            <Button
              onClick={() => setIsEditDialogOpen(true)}
              variant="outline"
              size="sm"
              className="flex-1 bg-white/5 border-white/10 text-white hover:bg-white/10"
            >
              <Edit className="h-4 w-4 mr-2" />
              Редактировать
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="bg-red-500/20 border-red-500/30 text-red-400 hover:bg-red-500/30"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Диалоги добавления/редактирования будут добавлены позже */}
    </div>
  );
}
