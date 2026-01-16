'use client';

import { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'success' | 'warning' | 'error' | 'info' | 'neutral';
  size?: 'sm' | 'md';
  title?: string;
  className?: string;
}

export function Badge({ children, variant = 'neutral', size = 'sm', title, className = '' }: BadgeProps) {
  const variants = {
    success: 'bg-green-100/80 text-green-700 border-green-200/50',
    warning: 'bg-yellow-100/80 text-yellow-700 border-yellow-200/50',
    error: 'bg-red-100/80 text-red-700 border-red-200/50',
    info: 'bg-blue-100/80 text-blue-700 border-blue-200/50',
    neutral: 'bg-gray-100/80 text-gray-700 border-gray-200/50',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
  };

  return (
    <span
      title={title}
      className={`
        inline-flex items-center font-medium rounded-full border
        ${variants[variant]}
        ${sizes[size]}
        ${className}
      `}
    >
      {children}
    </span>
  );
}
