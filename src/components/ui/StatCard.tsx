'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: ReactNode;
  iconBg?: string;
  link?: string;
  linkText?: string;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  iconBg = 'bg-blue-500/80',
  link,
  linkText = '查看详情',
}: StatCardProps) {
  return (
    <div className="bg-white/60 backdrop-blur-xl backdrop-saturate-150 border border-white/40 rounded-2xl shadow-lg shadow-black/5 overflow-hidden">
      <div className="p-5">
        <div className="flex items-center">
          <div
            className={`w-12 h-12 ${iconBg} rounded-xl flex items-center justify-center text-white shadow-lg`}
          >
            {icon}
          </div>
          <div className="ml-4 flex-1">
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <p className="text-2xl font-bold text-gray-900 mt-0.5">{value}</p>
            {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
          </div>
        </div>
      </div>
      {link && (
        <div className="px-5 py-3 bg-gray-50/50 border-t border-gray-200/50">
          <Link
            href={link}
            className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
          >
            {linkText}
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}
    </div>
  );
}
