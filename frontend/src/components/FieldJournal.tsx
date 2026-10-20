'use client';

import React from 'react';
import Image from 'next/image';
import { JournalEntry } from '@/types';
import {
  ClipboardList,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Trash2,
  ExternalLink,
  ScanLine,
  Calendar,
} from 'lucide-react';

interface FieldJournalProps {
  entries: JournalEntry[];
  onOpenEntry: (entry: JournalEntry) => void;
  onDeleteEntry: (id: string) => void;
  onClearAll: () => void;
  onNavigateToScanner: () => void;
}

export const FieldJournal: React.FC<FieldJournalProps> = ({
  entries,
  onOpenEntry,
  onDeleteEntry,
  onClearAll,
  onNavigateToScanner,
}) => {
  const getRiskBadge = (risk: 'healthy' | 'moderate' | 'critical', label: string) => {
    if (risk === 'healthy') {
      return (
        <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
          <CheckCircle2 className="w-2.5 h-2.5 text-emerald-700" />
          <span>{label}</span>
        </span>
      );
    }
    if (risk === 'moderate') {
      return (
        <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
          <AlertTriangle className="w-2.5 h-2.5 text-amber-700" />
          <span>{label}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
        <AlertOctagon className="w-2.5 h-2.5 text-rose-700" />
        <span>{label}</span>
      </span>
    );
  };

  const countCritical = entries.filter((e) => e.risk === 'critical').length;
  const countModerate = entries.filter((e) => e.risk === 'moderate').length;
  const countHealthy = entries.filter((e) => e.risk === 'healthy').length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-900 tracking-tight">
            Полевой журнал
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            История диагностик в локальном хранилище
          </p>
        </div>

        {entries.length > 0 && (
          <button
            type="button"
            onClick={onClearAll}
            className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
            title="Очистить все записи"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Очистить</span>
          </button>
        )}
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-4 gap-2">
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-2 text-center">
          <span className="text-[9px] font-bold text-slate-500 uppercase block">Всего</span>
          <span className="text-base font-black text-slate-900">{entries.length}</span>
        </div>
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-2 text-center">
          <span className="text-[9px] font-bold text-rose-700 uppercase block">Критично</span>
          <span className="text-base font-black text-rose-800">{countCritical}</span>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-2 text-center">
          <span className="text-[9px] font-bold text-amber-700 uppercase block">Умеренно</span>
          <span className="text-base font-black text-amber-800">{countModerate}</span>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2 text-center">
          <span className="text-[9px] font-bold text-emerald-700 uppercase block">Здорово</span>
          <span className="text-base font-black text-emerald-800">{countHealthy}</span>
        </div>
      </div>

      {/* Entries List or Empty State */}
      {entries.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-6 text-center space-y-3">
          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
            <ClipboardList className="w-6 h-6 text-slate-500" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-slate-800">
              Журнал пока пуст
            </h4>
            <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1 leading-relaxed">
              Выполните экспресс-диагностику листа на вкладке «Диагностика», и результаты сохранятся здесь автоматически.
            </p>
          </div>
          <button
            type="button"
            onClick={onNavigateToScanner}
            className="inline-flex items-center space-x-1.5 px-4 py-2 bg-emerald-700 text-white font-bold text-xs rounded-xl hover:bg-emerald-800 transition min-h-[40px]"
          >
            <ScanLine className="w-4 h-4" />
            <span>Начать проверку</span>
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs flex items-center space-x-3 hover:border-emerald-300 transition"
            >
              {/* Leaf Thumbnail */}
              <button
                type="button"
                onClick={() => onOpenEntry(entry)}
                className="relative w-14 h-14 bg-slate-100 rounded-lg overflow-hidden shrink-0 border border-slate-100 cursor-pointer"
              >
                <Image
                  src={entry.imageSrc}
                  alt={entry.conditionNameRu}
                  fill
                  className="object-cover"
                />
              </button>

              {/* Info & Metadata */}
              <div
                className="flex-1 min-w-0 cursor-pointer"
                onClick={() => onOpenEntry(entry)}
              >
                <div className="flex items-center space-x-1.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">
                    {entry.cropNameRu}
                  </span>
                  {getRiskBadge(entry.risk, entry.riskLabelRu)}
                </div>
                <h4 className="font-bold text-xs text-slate-900 truncate mt-0.5 hover:text-emerald-700 transition">
                  {entry.conditionNameRu}
                </h4>
                <div className="flex items-center space-x-2 text-[10px] text-slate-500 mt-1">
                  <span className="flex items-center space-x-1">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    <span>{entry.formattedDateRu}</span>
                  </span>
                  <span>•</span>
                  <span className="font-mono font-semibold text-emerald-700">
                    {Math.round(entry.confidence)}%
                  </span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center space-x-1 shrink-0">
                <button
                  type="button"
                  onClick={() => onOpenEntry(entry)}
                  className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                  title="Открыть заключение"
                >
                  <ExternalLink className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteEntry(entry.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                  title="Удалить запись"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
