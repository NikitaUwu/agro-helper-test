'use client';

import React from 'react';
import { ANALYSIS_CROP_IDS } from '@/lib/diagnosis/registry';
import { Sprout } from 'lucide-react';

interface HeaderProps {
  activeTabTitle?: string;
}

/**
 * Header:
 * - Plantix-styled Russian branding («Помощник агронома»).
 * - High outdoor contrast (text-slate-900, emerald-700 accents).
 * - Safe-area top padding support.
 * - Live status badge indicating database readiness (5 культур, {ANALYSIS_CROP_IDS.length} культур).
 */
export const Header: React.FC<HeaderProps> = ({ activeTabTitle }) => {
  return (
    <header className="sticky top-0 z-30 w-full bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 pt-safe pb-3 transition-colors shadow-sm">
      <div className="flex items-center justify-between">
        {/* Brand identity: Logo + Title */}
        <div className="flex items-center space-x-2.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white flex items-center justify-center shadow-md shadow-emerald-600/20 ring-1 ring-emerald-600/30">
            <Sprout className="w-6 h-6 stroke-[2.2]" aria-hidden="true" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-extrabold text-base tracking-tight text-slate-900 leading-none">
                Помощник агронома
              </span>
              <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 rounded">
                Агро ИИ
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5 leading-none">
              {activeTabTitle || 'Экспресс-диагностика и база знаний'}
            </p>
          </div>
        </div>

        {/* Live offline/ready status chip */}
        <div className="flex items-center space-x-1 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs font-semibold shadow-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" aria-hidden="true" />
          <span className="hidden xs:inline text-[11px]">Анализ листа</span>
          <span className="xs:hidden text-[11px]">{ANALYSIS_CROP_IDS.length} культур</span>
        </div>
      </div>
    </header>
  );
};
