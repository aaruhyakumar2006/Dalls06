'use client';

import React from 'react';
import Card from './Card';
import { LucideIcon } from 'lucide-react';

export interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  color?: 'teal' | 'coral' | 'purple' | 'yellow';
  trend?: string;
  onClick?: () => void;
}

export default function StatCard({
  icon: Icon,
  label,
  value,
  color = 'teal',
  trend,
  onClick,
}: StatCardProps) {
  const colorClasses = {
    teal: 'bg-primary text-white',
    coral: 'bg-secondary text-white',
    purple: 'bg-accent-purple text-white',
    yellow: 'bg-accent-yellow text-gray-800',
  };
  
  return (
    <Card
      variant="elevated"
      padding="md"
      rounded="xl"
      onClick={onClick}
      className="flex items-center gap-4"
    >
      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${colorClasses[color]} shrink-0`}>
        <Icon className="w-6 h-6" />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="text-xs text-text-muted font-semibold uppercase tracking-wide">
          {label}
        </div>
        <div className="text-2xl font-bold font-display text-text-charcoal mt-0.5">
          {value}
        </div>
      </div>
      
      {trend && (
        <div className={`text-sm font-bold ${
          trend.startsWith('+') ? 'text-success' : trend.startsWith('-') ? 'text-error' : 'text-text-muted'
        }`}>
          {trend}
        </div>
      )}
    </Card>
  );
}
