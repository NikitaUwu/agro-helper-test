'use client';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import type { DiagnosisOutcome, UncertainReason } from '@/lib/diagnosis/types';
import { DISEASE_MAP } from '@/data/diseases';

const reasons: Record<UncertainReason, string> = {
  ood: 'Снимок не похож на листовые фотографии, с которыми работает модель.',
  low_score: 'Модель не смогла выбрать достаточно уверенный вариант.',
  ambiguous: 'У нескольких состояний получились близкие оценки.',
  unsupported_class: 'Этот вариант не входит в поддерживаемые состояния.',
};
export function ScanFeedback({ outcome, onRetry }: { outcome: Exclude<DiagnosisOutcome, {status:'accepted'}|{status:'cancelled'}>; onRetry: () => void }) {
  return <div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-4 space-y-2 text-xs text-amber-950">
    <h3 className="font-bold flex items-center gap-2"><AlertTriangle className="w-4 h-4" />{outcome.status === 'error' ? 'Анализ не выполнен' : 'Не удалось уверенно определить'}</h3>
    <p>{outcome.status === 'error' ? outcome.message : reasons[outcome.reason]}</p>
    {outcome.status === 'uncertain' && <>
      <p>Снимите один лист крупно на однотонном фоне. Неизвестные болезни и дефициты питания могут выглядеть похоже.</p>
      <details className="pt-1"><summary className="cursor-pointer font-semibold">Возможные варианты</summary><ul className="space-y-1 mt-2">{outcome.top3.map(candidate => <li key={candidate.index}>{candidate.conditionId ? DISEASE_MAP[candidate.conditionId]?.nameRu : 'Неподдерживаемое состояние'} — {(candidate.score * 100).toFixed(1)}%</li>)}</ul><p className="mt-2 text-[11px]">Это оценки модели, а не подтверждённые диагнозы.</p></details>
    </>}
    <button type="button" onClick={onRetry} className="inline-flex gap-1.5 items-center font-bold py-2"><RefreshCw className="w-3.5 h-3.5" />Попробовать другой снимок</button>
  </div>;
}
