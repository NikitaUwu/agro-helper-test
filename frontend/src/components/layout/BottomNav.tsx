'use client';

import React from 'react';
import { ScanLine, BookOpen, ClipboardList } from 'lucide-react';

export type TabType = 'diagnostics' | 'catalog' | 'journal';

interface BottomNavProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  journalCount?: number;
}

interface NavItem {
  id: TabType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

/**
 * BottomNav:
 * - 3 required tabs: «Диагностика», «Справочник», «Полевой журнал».
 * - Fixed sticky bottom navigation pinned within MobileFrame.
 * - Safe-area bottom inset adaptation (`pb-safe`).
 * - Touch targets >= 48px, ARIA role="tablist" / role="tab", active emerald indicator.
 */
export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  journalCount = 0,
}) => {
  const navItems: NavItem[] = [
    {
      id: 'diagnostics',
      label: 'Диагностика',
      icon: ScanLine,
    },
    {
      id: 'catalog',
      label: 'Справочник',
      icon: BookOpen,
    },
    {
      id: 'journal',
      label: 'Полевой журнал',
      icon: ClipboardList,
      badge: journalCount > 0 ? journalCount : undefined,
    },
  ];

  return (
    <nav
      role="tablist"
      aria-label="Основная навигация приложения"
      className="fixed bottom-0 left-0 right-0 sm:left-auto sm:right-auto sm:w-full sm:max-w-md z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-lg px-2 pt-1 pb-safe"
    >
      <div className="flex items-center justify-around h-14">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          const IconComponent = item.icon;

          return (
            <button
              key={item.id}
              role="tab"
              id={`tab-${item.id}`}
              aria-selected={isActive}
              aria-controls={`panel-${item.id}`}
              onClick={() => onTabChange(item.id)}
              className={`relative flex flex-col items-center justify-center flex-1 min-h-[48px] py-1 px-2 rounded-xl transition-all duration-200 select-none outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                isActive
                  ? 'text-emerald-700 font-bold bg-emerald-50/70'
                  : 'text-slate-500 hover:text-slate-800 font-medium hover:bg-slate-50'
              }`}
            >
              {/* Active top indicator pill */}
              {isActive && (
                <span
                  className="absolute -top-1 w-8 h-1 bg-emerald-600 rounded-full transition-all"
                  aria-hidden="true"
                />
              )}

              {/* Icon with badge */}
              <div className="relative">
                <IconComponent
                  className={`w-5 h-5 transition-transform duration-150 ${
                    isActive ? 'scale-110 stroke-[2.4]' : 'stroke-[1.8]'
                  }`}
                />
                {typeof item.badge === 'number' && item.badge > 0 && (
                  <span
                    className="absolute -top-1.5 -right-2.5 min-w-[18px] h-[18px] px-1 bg-emerald-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white"
                    aria-label={`Записей в журнале: ${item.badge}`}
                  >
                    {item.badge}
                  </span>
                )}
              </div>

              {/* Label */}
              <span
                className={`text-[11px] mt-1 leading-tight tracking-tight transition-colors ${
                  isActive ? 'text-emerald-800 font-bold' : 'text-slate-600 font-medium'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
