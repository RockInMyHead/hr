import React from 'react';
import { Badge } from '@/components/ui/badge';
import { ROLE_INFO } from '@/types/roles';
import type { UserRole } from '@/types/roles';

interface RoleBadgeProps {
  role: UserRole;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

export function RoleBadge({ role, size = 'md', showIcon = true, className = '' }: RoleBadgeProps) {
  const roleInfo = ROLE_INFO[role];

  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-2'
  };

  return (
    <Badge
      className={`${roleInfo.color} ${sizeClasses[size]} font-medium ${className}`}
    >
      {showIcon && <span className="mr-1">{roleInfo.icon}</span>}
      {roleInfo.name}
    </Badge>
  );
}

export function RoleDescription({ role }: { role: UserRole }) {
  const roleInfo = ROLE_INFO[role];

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-lg">{roleInfo.icon}</span>
        <span className="font-semibold text-lg">{roleInfo.name}</span>
      </div>
      <p className="text-gray-600 text-sm">{roleInfo.description}</p>
    </div>
  );
}