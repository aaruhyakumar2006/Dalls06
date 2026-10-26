'use client';

import React from 'react';

export interface ProgressRingProps {
  progress: number; // 0-100
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  strokeWidth?: number;
  label?: string;
}

export default function ProgressRing({
  progress,
  size = 'md',
  color = '#4ECDC4',
  strokeWidth,
  label,
}: ProgressRingProps) {
  const sizeMap = {
    sm: { dimension: 48, stroke: strokeWidth || 4, fontSize: 'text-xs' },
    md: { dimension: 64, stroke: strokeWidth || 5, fontSize: 'text-sm' },
    lg: { dimension: 80, stroke: strokeWidth || 6, fontSize: 'text-base' },
  };
  
  const { dimension, stroke, fontSize } = sizeMap[size];
  const radius = (dimension - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;
  
  return (
    <div className="relative inline-flex items-center justify-center">
      <svg
        width={dimension}
        height={dimension}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={dimension / 2}
          cy={dimension / 2}
          r={radius}
          stroke="#E5E7EB"
          strokeWidth={stroke}
          fill="none"
        />
        
        {/* Progress circle */}
        <circle
          cx={dimension / 2}
          cy={dimension / 2}
          r={radius}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500 ease-out"
        />
      </svg>
      
      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`font-bold font-display ${fontSize}`}>
          {Math.round(progress)}%
        </span>
        {label && (
          <span className="text-[10px] text-text-muted font-medium">
            {label}
          </span>
        )}
      </div>
    </div>
  );
}
