import { ChevronDown, Leaf } from 'lucide-react';
import { CROP_MAP } from '@/data/crops';
import { DISEASES } from '@/data/diseases';
import { ANALYSIS_CROP_IDS, canAnalyzeCondition } from '@/lib/diagnosis/registry';

const coverage = ANALYSIS_CROP_IDS.map(cropId => ({
  crop: CROP_MAP[cropId],
  conditions: DISEASES
    .filter(condition => condition.cropId === cropId && canAnalyzeCondition(condition.id))
    .sort((a, b) => Number(Boolean(a.isHealthy)) - Number(Boolean(b.isHealthy)) || a.nameRu.localeCompare(b.nameRu, 'ru')),
}));
const totalStates = coverage.reduce((sum, item) => sum + item.conditions.length, 0);
const pluralRules = new Intl.PluralRules('ru');
const stateCount = (count: number) => {
  const form = pluralRules.select(count);
  return `${count} ${form === 'one' ? 'состояние' : form === 'few' ? 'состояния' : 'состояний'}`;
};

export function RecognitionCoverage() {
  return (
    <details className="group/coverage rounded-2xl border border-slate-200 bg-white">
      <summary className="flex min-h-[64px] cursor-pointer list-none items-center gap-3 rounded-2xl p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 [&::-webkit-details-marker]:hidden">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
          <Leaf className="h-4 w-4" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-bold text-slate-800">Что распознаёт анализ</span>
          <span className="mt-0.5 block text-[11px] leading-relaxed text-slate-500">
            {coverage.length} культур · {stateCount(totalStates)}
          </span>
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 group-open/coverage:rotate-180 motion-safe:transition-transform motion-safe:duration-150" aria-hidden="true" />
      </summary>

      <div className="px-4 pb-4">
        <p className="pb-3 text-xs leading-relaxed text-slate-600">
          Растение определяется автоматически по одному листу. Раскройте список, чтобы посмотреть поддерживаемые состояния.
        </p>
        <div className="divide-y divide-slate-100 border-y border-slate-100">
          {coverage.map(({ crop, conditions }) => (
            <details key={crop.id} className="group/crop">
              <summary className="flex min-h-[48px] cursor-pointer list-none items-center gap-2 rounded-lg py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-600 [&::-webkit-details-marker]:hidden">
                <span className="flex-1 text-xs font-semibold text-slate-800">{crop.nameRu}</span>
                <span className="text-[11px] text-slate-500">{stateCount(conditions.length)}</span>
                <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400 group-open/crop:rotate-180 motion-safe:transition-transform motion-safe:duration-150" aria-hidden="true" />
              </summary>
              <ul aria-label={`Распознаваемые состояния: ${crop.nameRu}`} className="space-y-2 pb-3">
                {conditions.map(condition => (
                  <li key={condition.id} className="flex items-start gap-2 text-xs leading-relaxed text-slate-600">
                    <span className={`mt-[7px] h-1 w-1 shrink-0 rounded-full ${condition.isHealthy ? 'bg-emerald-600' : 'bg-slate-300'}`} aria-hidden="true" />
                    <span>
                      <span>{condition.isHealthy ? 'Лист без характерных поражений' : condition.nameRu}</span>
                      {condition.conditionType === 'pest' && <span className="ml-1.5 text-[10px] font-medium text-slate-500">· вредитель</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
          Для каждой культуры распознаётся и лист без характерных поражений. Скрытые инфекции и здоровье всего растения по одному листу не оцениваются.
        </p>
        <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
          Огурец и пшеница доступны только в справочнике. Анализ экспериментальный и охватывает только перечисленные состояния.
        </p>
      </div>
    </details>
  );
}
