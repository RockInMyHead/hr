import React, { useCallback, useEffect, useMemo, useState } from 'react';
import ReactFlow, { Background, Controls, MiniMap, addEdge, Connection, Edge, Node, useEdgesState, useNodesState, type NodeProps } from 'reactflow';
import { Crown, Briefcase, User as UserIcon, Star } from 'lucide-react';
import 'reactflow/dist/style.css';
import { Employee } from '@/types/employee';
import { readEmployees, saveEmployees, upsertEmployee } from '@/lib/employees';
import { Button } from '@/components/ui/button';

function toNodesAndEdges(list: Employee[]): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = list.map(emp => ({
    id: emp.id,
    position: { x: emp.x ?? Math.random() * 600, y: emp.y ?? Math.random() * 400 },
    data: { label: nodeLabel(emp) },
    style: { ...styleForUserRole(emp.userRole), zIndex: 2 },
  }));
  const edges: Edge[] = list
    .filter(e => e.managerId)
    .map(e => ({ id: `${e.managerId}->${e.id}`, source: e.managerId!, target: e.id, animated: false }));
  return { nodes, edges };
}

function styleForUserRole(role?: 'director' | 'manager' | 'employee'): React.CSSProperties {
  const base: React.CSSProperties = {
    padding: 12,
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.15)',
    color: 'white',
    whiteSpace: 'normal',
    wordBreak: 'break-word',
    fontSize: 12,
    lineHeight: 1.2,
    // Адаптивная ширина узла: максимум 280px, но не больше 85vw
    width: 'min(280px, 85vw)',
    boxSizing: 'border-box',
  };
  if (role === 'director') {
    return { ...base, background: 'linear-gradient(135deg, rgba(147,51,234,0.5), rgba(59,130,246,0.35))', boxShadow: '0 0 0 2px rgba(147,51,234,0.5) inset' };
  }
  if (role === 'manager') {
    return { ...base, background: 'rgba(34,197,94,0.25)', boxShadow: '0 0 0 2px rgba(34,197,94,0.45) inset' };
  }
  if (role === 'employee') {
    return { ...base, background: 'rgba(255,255,255,0.06)' };
  }
  return { ...base, background: 'rgba(255,255,255,0.06)' };
}

function nodeLabel(emp: Employee): React.ReactNode {
  const roleReadable = emp.userRole === 'director' ? 'Директор' : emp.userRole === 'manager' ? 'Менеджер' : 'Сотрудник';
  const RoleIcon = emp.userRole === 'director' ? Crown : emp.userRole === 'manager' ? Briefcase : UserIcon;
  return (
    <div style={{ display: 'grid', gap: 6, overflow: 'hidden' }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
        <RoleIcon size={14} /> {emp.name}
      </div>
      <div style={{ opacity: 0.8, fontSize: 12, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{`Подчиненный • ${roleReadable}`}</div>
      {emp.email && <div style={{ opacity: 0.8, fontSize: 12, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{emp.email}</div>}
      {emp.ratings && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 11, overflow: 'hidden' }}>
          <RatingRow label="Коммуникации" value={emp.ratings.communication} />
          <RatingRow label="Лидерство" value={emp.ratings.leadership} />
          <RatingRow label="Продуктивность" value={emp.ratings.productivity} />
          <RatingRow label="Надежность" value={emp.ratings.reliability} />
          <RatingRow label="Инициативность" value={emp.ratings.initiative} />
        </div>
      )}
    </div>
  );
}

function RatingRow({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
      <span>{label}</span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
        {[1,2,3,4,5].map((i) => (
          <Star key={i} size={12} color={i <= value ? '#facc15' : '#6b7280'} fill={i <= value ? '#facc15' : 'none'} />
        ))}
      </span>
    </div>
  );
}

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max - 1) + '…' : text;
}

// Простая нода-рамка для отдела
function DepartmentGroupNode({ data }: NodeProps<{ label: string }>) {
  return (
    <div style={{
      width: '100%',
      height: '100%',
      border: '2px dashed rgba(147,51,234,0.5)',
      borderRadius: 16,
      background: 'rgba(147,51,234,0.08)',
      pointerEvents: 'none',
      position: 'relative',
    }}>
      <div
        style={{
          position: 'absolute',
          top: 8,
          left: 12,
          right: 12,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          maxWidth: 'calc(100% - 24px)',
          background: 'rgba(147,51,234,0.9)',
          color: 'white',
          padding: '4px 10px',
          borderRadius: 10,
          fontSize: 12,
          lineHeight: 1.2,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          boxShadow: '0 2px 8px rgba(0,0,0,0.25)'
        }}
      >
        {data.label}
      </div>
      {/* внутренняя область для того, чтобы узлы визуально не пересекались с рамкой */}
      <div style={{ position: 'absolute', inset: 0, padding: 12, pointerEvents: 'none' }} />
    </div>
  );
}

const nodeTypes = { departmentGroup: DepartmentGroupNode } as const;

type Bounding = { minX: number; minY: number; maxX: number; maxY: number };

function computeSubtreeIds(employees: Employee[], rootId: string): Set<string> {
  const childrenByManager = new Map<string, string[]>();
  for (const e of employees) {
    if (!e.managerId) continue;
    const arr = childrenByManager.get(e.managerId) ?? [];
    arr.push(e.id);
    childrenByManager.set(e.managerId, arr);
  }
  const result = new Set<string>();
  const stack = [rootId];
  while (stack.length) {
    const current = stack.pop()!;
    if (result.has(current)) continue;
    result.add(current);
    const kids = childrenByManager.get(current) ?? [];
    for (const k of kids) stack.push(k);
  }
  return result;
}

function createDepartmentNodes(employees: Employee[], employeeNodes: Node[]): Node[] {
  const nodesById = new Map(employeeNodes.map(n => [n.id, n] as const));
  const PADDING = 48; // расстояние между рамкой отдела и узлами внутри
  const ASSUMED_W = 300; // предполагаемая ширина узла (с запасом)
  const ASSUMED_H = 220; // предполагаемая высота узла (с запасом)
  const departments: Node[] = [];
  for (const m of employees) {
    if (m.userRole !== 'manager') continue;
    const subtree = computeSubtreeIds(employees, m.id);
    if (subtree.size <= 1) continue; // только менеджер — пропускаем
    let bbox: Bounding | null = null;
    for (const id of subtree) {
      const n = nodesById.get(id);
      if (!n) continue;
      const x = n.position.x;
      const y = n.position.y;
      // В продакшене width/height в стиле могут быть строками (например, 'min(280px, 85vw)'),
      // что ломает числовые расчёты. Здесь используем только числовые значения, иначе — допущения.
      const styleWidth = (n.style as { width?: number })?.width;
      const styleHeight = (n.style as { height?: number })?.height;
      const widthNum = typeof styleWidth === 'number' ? styleWidth : ASSUMED_W;
      const heightNum = typeof styleHeight === 'number' ? styleHeight : ASSUMED_H;
      const minX = x;
      const minY = y;
      const maxX = x + widthNum;
      const maxY = y + heightNum;
      if (!bbox) bbox = { minX, minY, maxX, maxY };
      else {
        bbox.minX = Math.min(bbox.minX, minX);
        bbox.minY = Math.min(bbox.minY, minY);
        bbox.maxX = Math.max(bbox.maxX, maxX);
        bbox.maxY = Math.max(bbox.maxY, maxY);
      }
    }
    if (!bbox) continue;
    const width = (bbox.maxX - bbox.minX) + PADDING * 2;
    const height = (bbox.maxY - bbox.minY) + PADDING * 2;
    departments.push({
      id: `dept:${m.id}`,
      type: 'departmentGroup',
      data: { label: `Отдел: ${m.name}` },
      position: { x: bbox.minX - PADDING, y: bbox.minY - PADDING },
      draggable: false,
      selectable: false,
      style: { width, height, zIndex: 1, padding: 0, overflow: 'hidden' },
    });
  }
  return departments;
}

export default function OrgChart({ employeesOverride, readOnly = false }: { employeesOverride?: Employee[]; readOnly?: boolean }) {
  const [employees, setEmployees] = useState<Employee[]>(employeesOverride ?? []);
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => toNodesAndEdges(employeesOverride ?? readEmployees()), [employeesOverride]);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => { setEmployees(employeesOverride ?? readEmployees()); }, [employeesOverride]);
  useEffect(() => {
    const { nodes: n, edges: e } = toNodesAndEdges(employees);
    const dept = createDepartmentNodes(employees, n);
    setNodes([...dept, ...n]);
    setEdges(e);
  }, [employees, setNodes, setEdges]);

  const onConnect = useCallback((connection: Connection) => {
    if (!connection.source || !connection.target) return;
    // трактуем соединение как назначение managerId: source -> target (source = менеджер)
    const target = employees.find(e => e.id === connection.target);
    if (!target) return;
    const updated: Employee = { ...target, managerId: connection.source };
    if (!readOnly) {
      upsertEmployee(updated);
      setEmployees(readEmployees());
    }
    setEdges((eds) => addEdge({ ...connection, animated: false }, eds));
  }, [employees, setEdges, readOnly]);

  const onNodeDragStop = useCallback((_event: React.MouseEvent, node: Node) => {
    const emp = employees.find(e => e.id === node.id);
    if (!emp) return;
    const updated: Employee = { ...emp, x: node.position.x, y: node.position.y };
    if (!readOnly) {
      upsertEmployee(updated);
      setEmployees(readEmployees());
    }
  }, [employees, readOnly]);

  const addRandom = () => {
    const id = Date.now().toString();
    const newEmp: Employee = { id, name: `Сотр. ${employees.length + 1}`, role: 'subordinate', x: Math.random() * 600, y: Math.random() * 400 };
    if (!readOnly) {
      upsertEmployee(newEmp);
      setEmployees(readEmployees());
    }
  };

  return (
    <div className="h-[70vh] rounded-xl border border-white/10 overflow-hidden">
      <div className="flex justify-between items-center p-2 bg-white/5 border-b border-white/10">
        <div className="text-sm text-gray-300">Перетащите узлы. Соединение линией: менеджер → подчинённый.</div>
        {!readOnly && (
          <Button size="sm" variant="outline" className="bg-white/5 border-white/10 text-white" onClick={addRandom}>Добавить сотрудника</Button>
        )}
      </div>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDragStop={onNodeDragStop}
        nodeTypes={nodeTypes}
        fitView
        style={{ background: '#0b0b0b' }}
      >
        <Background variant="dots" gap={14} size={1} />
        <MiniMap style={{ background: '#0f0f0f' }} />
        <Controls />
      </ReactFlow>
    </div>
  );
}