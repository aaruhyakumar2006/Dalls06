'use client';

import React from 'react';
import Card from './Card';
import { LucideIcon } from 'lucide-react';

export interface EmptyStateProps {
  icon: LucideIcon;
  heading: string;
  subtext: string;
  ctaText?: string;
  onCtaClick?: () => void;
}

export default function EmptyState({
  icon: Icon,
  heading,
  subtext,
  ctaText,
  onCtaClick,
}: EmptyStateProps) {
  return (
    <Card variant="outlined" padding="lg" rounded="xl" className="text-center">
      <div className="flex flex-col items-center justify-center gap-4 py-8">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
          <Icon className="w-10 h-10 text-primary" />
        </div>
        
        <div className="space-y-2">
          <h3 className="text-xl font-bold font-display text-text-charcoal">
            {heading}
          </h3>
          <p className="text-sm text-text-muted max-w-md mx-auto leading-relaxed">
            {subtext}
          </p>
        </div>
        
        {ctaText && onCtaClick && (
          <button
            onClick={onCtaClick}
            className="mt-2 px-6 py-3 bg-primary hover:bg-primary-dark text-white rounded-xl font-semibold text-sm flex items-center gap-2 transition-all shadow-card-soft hover:shadow-card-hover active:scale-98"
          >
            {ctaText}
          </button>
        )}
      </div>
    </Card>
  );
}
