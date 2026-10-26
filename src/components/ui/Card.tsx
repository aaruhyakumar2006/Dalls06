'use client';

import React from 'react';

export interface CardProps {
  variant?: 'default' | 'elevated' | 'outlined';
  padding?: 'sm' | 'md' | 'lg';
  rounded?: 'lg' | 'xl' | '2xl';
  onClick?: () => void;
  className?: string;
  children: React.ReactNode;
}

export default function Card({
  variant = 'default',
  padding = 'md',
  rounded = 'xl',
  onClick,
  className = '',
  children,
}: CardProps) {
  const baseClasses = 'bg-white transition-all duration-200';
  
  const variantClasses = {
    default: 'shadow-card-soft hover:shadow-card-hover',
    elevated: 'shadow-card-hover',
    outlined: 'border-2 border-gray-200 hover:border-primary',
  };
  
  const paddingClasses = {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  };
  
  const roundedClasses = {
    lg: 'rounded-lg',
    xl: 'rounded-card-new',
    '2xl': 'rounded-card-xl',
  };
  
  const interactiveClasses = onClick
    ? 'cursor-pointer hover:-translate-y-0.5 active:translate-y-0'
    : '';
  
  const combinedClasses = `${baseClasses} ${variantClasses[variant]} ${paddingClasses[padding]} ${roundedClasses[rounded]} ${interactiveClasses} ${className}`;
  
  if (onClick) {
    return (
      <button
        onClick={onClick}
        className={combinedClasses}
        type="button"
      >
        {children}
      </button>
    );
  }
  
  return (
    <div className={combinedClasses}>
      {children}
    </div>
  );
}
