'use client';

import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}

export function Card({ children, className = '', hover = false }: CardProps) {
  return (
    <div
      className={`
        bg-white/60 backdrop-blur-xl backdrop-saturate-150
        border border-white/40 rounded-2xl shadow-lg shadow-black/5
        ${hover ? 'transition-all duration-200 hover:bg-white/70 hover:shadow-xl hover:shadow-black/10' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export function CardHeader({ title, description, action }: CardHeaderProps) {
  return (
    <div className="px-6 py-4 border-b border-gray-200/50 flex items-center justify-between">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {description && (
          <p className="mt-0.5 text-sm text-gray-500">{description}</p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

interface CardContentProps {
  children: ReactNode;
  className?: string;
  noPadding?: boolean;
}

export function CardContent({ children, className = '', noPadding = false }: CardContentProps) {
  return (
    <div className={noPadding ? className : `p-6 ${className}`}>
      {children}
    </div>
  );
}
