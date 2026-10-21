'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { DiseaseCondition, JournalEntry } from '@/types';
import { DISEASE_MAP } from '@/data/diseases';
import { Candidate } from '@/lib/diagnosis/types';
import { originLabel } from '@/lib/journal';
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  BookmarkCheck,
  Bookmark,
  RotateCcw,
  ShieldCheck,
  Bug,
  Sprout,
  Pill,
  Info,
  Calendar,
  Share2,
} from 'lucide-react';

interface DiagnosisResultProps {
  condition: DiseaseCondition;
  scannedImageSrc: string;
  score: number | null;
  origin: JournalEntry['origin'];
  top3?: Candidate[];
  onBack: () => void;
  onNewScan: () => void;
  onSaveToJournal?: () => void;
  isSavedInJournal?: boolean;
}

type TreatmentTab = 'symptoms' | 'biological' | 'agrotechnical' | 'chemical';

export const DiagnosisResult: React.FC<DiagnosisResultProps> = ({
  condition,
  scannedImageSrc,
  score, origin, top3,
  onBack,
  onNewScan,
  onSaveToJournal,
  isSavedInJournal = false,
}) => {
  const [activeTab, setActiveTab] = useState<TreatmentTab>('symptoms');
  const saved = isSavedInJournal;
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);

  const handleSave = () => { if (!saved) onSaveToJournal?.(); };

  const getRiskColor = (risk: 'healthy' | 'moderate' | 'critical') => {
    switch (risk) {
      case 'healthy':
        return {
          bg: 'bg-emerald-500',
          badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-300',
          border: 'border-emerald-500',
          ring: 'text-emerald-600',
        };
      case 'moderate':
        return {
          bg: 'bg-amber-500',
          badgeBg: 'bg-amber-100 text-amber-800 border-amber-300',
          border: 'border-amber-500',
          ring: 'text-amber-500',
        };
      case 'critical':
        return {
          bg: 'bg-rose-500',
          badgeBg: 'bg-rose-100 text-rose-800 border-rose-300',
          border: 'border-rose-500',
          ring: 'text-rose-600',
        };
    }
  };

  const riskColors = getRiskColor(condition.risk);

  const photosList = [...new Set([scannedImageSrc, ...condition.photos].filter(Boolean))];
  const selectedPhoto = photosList[selectedPhotoIndex] || '';
  const isPlantVillagePhoto = selectedPhoto.startsWith('/data/plantvillage/') || selectedPhoto.startsWith('/data/dinov2/');

  return (
    <div className="space-y-4 pb-6">
      {/* Top action bar: Back button & Save button */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center space-x-1.5 py-1.5 px-3 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-bold transition min-h-[40px]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Назад</span>
        </button>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={saved || !onSaveToJournal}
            className={`inline-flex items-center space-x-1.5 py-1.5 px-3 rounded-xl text-xs font-bold transition min-h-[40px] ${
              saved
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 cursor-default'
                : 'bg-emerald-700 text-white hover:bg-emerald-800 shadow-sm'
            }`}
          >
            {saved ? (
              <>
                <BookmarkCheck className="w-4 h-4 text-emerald-700" />
                <span>В журнале</span>
              </>
            ) : (
              <>
                <Bookmark className="w-4 h-4" />
                <span>В журнал</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onNewScan}
            className="inline-flex items-center space-x-1 py-1.5 px-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold transition min-h-[40px]"
            title="Новая диагностика"
          >
            <RotateCcw className="w-4 h-4" />
            <span className="hidden xs:inline">Заново</span>
          </button>
        </div>
      </div>

      <p className="text-[11px] text-slate-500">{originLabel({ origin } as JournalEntry)}{score !== null ? ' · Оценка модели не равна вероятности правильного диагноза.' : ''}</p>
      {/* Main Diagnosis Card */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        {/* Photo Gallery Banner */}
        <div className="relative w-full aspect-[16/10] bg-slate-900">
          {photosList.length > 0 && <Image
            src={photosList[selectedPhotoIndex] || scannedImageSrc}
            alt={condition.nameRu}
            fill
            className="object-cover"
            priority
          />}
          {/* Top overlay badges */}
          <div className="absolute top-3 left-3 flex items-center space-x-1.5">
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-black/70 backdrop-blur-md text-white border border-white/20">
              {condition.cropNameRu}
            </span>
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-extrabold border ${riskColors.badgeBg}`}
            >
              {condition.riskLabelRu}
            </span>
          </div>

          {/* Confidence Badge */}
          {score !== null && <div className="absolute bottom-3 right-3 px-3 py-1.5 rounded-xl bg-black/75 backdrop-blur-md border border-white/20 text-white flex items-center space-x-2">
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-slate-300 block leading-none">
                Оценка модели
              </span>
              <span className="text-sm font-black text-emerald-400 font-mono">
                {(score * 100).toFixed(1)}%
              </span>
            </div>
          </div>

          }
          {/* Photo Dots indicator if multiple */}
          {photosList.length > 1 && (
            <div className="absolute bottom-3 left-3 flex items-center space-x-1.5 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-full">
              {photosList.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedPhotoIndex(idx)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    selectedPhotoIndex === idx
                      ? 'bg-emerald-400 w-4'
                      : 'bg-white/60 hover:bg-white'
                  }`}
                  aria-label={`Фото ${idx + 1}`}
                />
              ))}
            </div>
          )}
        </div>

        <p className="px-4 py-1.5 text-[10px] text-slate-500">{selectedPhotoIndex === 0 && score !== null ? 'Анализируемый снимок' : 'Справочный пример'}. {isPlantVillagePhoto && <>PlantVillage: Hughes &amp; Salathé, CC BY-SA 3.0. <a className="underline" href="/data/dinov2-attribution.json" target="_blank" rel="noreferrer">Источники новых фото</a></>}</p>
        {/* Title and Pathogen Details */}
        <div className="p-4 border-b border-slate-100">
          <h2 className="text-lg font-black text-slate-900 leading-snug">
            {condition.nameRu}
          </h2>
          <p className="text-xs font-semibold text-emerald-800 mt-0.5">
            {condition.pathogenRu}
          </p>
          <p className="text-xs text-slate-600 mt-2 leading-relaxed">
            {condition.summaryRu}
          </p>
        </div>

        {score !== null && <div className="px-4 py-2 bg-amber-50 text-[11px] text-amber-950">
          {condition.isHealthy ? 'Характерных признаков известных модели поражений не найдено. Скрытые инфекции и другие причины симптомов не исключены.' : 'Предварительное предположение по одному листу. Подтвердите причину поражения перед обработкой.'}
          <p className="mt-1">Цветовой статус относится к справочному риску состояния, а не к измеренной степени поражения.</p>
        </div>}
        {top3 && <details className="px-4 py-2 text-xs text-slate-600"><summary className="cursor-pointer font-semibold">Возможные варианты</summary><ul className="mt-2 space-y-1">{top3.map(item => <li key={item.index}>{item.conditionId ? DISEASE_MAP[item.conditionId]?.nameRu : 'Неподдерживаемое состояние'} — {(item.score * 100).toFixed(1)}%</li>)}</ul></details>}
        {condition.contentSources && <div className="px-4 py-2 text-[10px] text-slate-500">Материалы: {condition.contentSources.map(source => <a key={source.url} href={source.url} target="_blank" rel="noreferrer" className="underline mr-2">{source.title}</a>)}</div>}
        {/* 4 Treatment Category Tabs */}
        <div className="grid grid-cols-4 border-b border-slate-200 bg-slate-50/80 p-1 gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('symptoms')}
            className={`py-2 px-1 text-center rounded-lg text-xs font-bold transition flex flex-col items-center justify-center space-y-1 min-h-[44px] ${
              activeTab === 'symptoms'
                ? 'bg-white text-emerald-800 shadow-xs border border-slate-200/80'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Info className="w-3.5 h-3.5" />
            <span className="text-[10px] leading-none">Симптомы</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('biological')}
            className={`py-2 px-1 text-center rounded-lg text-xs font-bold transition flex flex-col items-center justify-center space-y-1 min-h-[44px] ${
              activeTab === 'biological'
                ? 'bg-white text-emerald-800 shadow-xs border border-slate-200/80'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sprout className="w-3.5 h-3.5" />
            <span className="text-[10px] leading-none">Биозащита</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('agrotechnical')}
            className={`py-2 px-1 text-center rounded-lg text-xs font-bold transition flex flex-col items-center justify-center space-y-1 min-h-[44px] ${
              activeTab === 'agrotechnical'
                ? 'bg-white text-emerald-800 shadow-xs border border-slate-200/80'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span className="text-[10px] leading-none">Агротехника</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('chemical')}
            className={`py-2 px-1 text-center rounded-lg text-xs font-bold transition flex flex-col items-center justify-center space-y-1 min-h-[44px] ${
              activeTab === 'chemical'
                ? 'bg-white text-emerald-800 shadow-xs border border-slate-200/80'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Pill className="w-3.5 h-3.5" />
            <span className="text-[10px] leading-none">Препараты</span>
          </button>
        </div>

        {/* Tab Content Display */}
        <div className="p-4 bg-white">
          {activeTab === 'symptoms' && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
                <Info className="w-4 h-4 text-emerald-600" />
                <span>Характерные признаки поражения</span>
              </h4>
              <ul className="space-y-2">
                {condition.recommendations.symptoms.map((symptom, idx) => (
                  <li key={idx} className="flex items-start space-x-2.5 text-xs text-slate-700 leading-relaxed">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0 mt-1.5" />
                    <span>{symptom}</span>
                  </li>
                ))}
              </ul>

              {/* Real Photo Thumbnail Strip */}
              {condition.photos && condition.photos.length > 1 && (
                <div className="pt-2">
                  <span className="text-[11px] font-bold text-slate-500 block mb-1.5">
                    Примеры из справочника ({condition.photos.length} шт):
                  </span>
                  <div className="flex space-x-2 overflow-x-auto pb-1 scrollbar-none">
                    {condition.photos.map((photo, pIdx) => (
                      <button
                        key={pIdx}
                        type="button"
                        onClick={() => setSelectedPhotoIndex(photosList.indexOf(photo))}
                        className={`relative w-14 h-14 rounded-lg overflow-hidden border-2 shrink-0 transition ${
                          selectedPhotoIndex === pIdx
                            ? 'border-emerald-600 ring-2 ring-emerald-200'
                            : 'border-slate-200 opacity-70 hover:opacity-100'
                        }`}
                      >
                        <Image
                          src={photo}
                          alt={`${condition.nameRu} ${pIdx + 1}`}
                          fill
                          className="object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'biological' && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
                <Sprout className="w-4 h-4 text-emerald-600" />
                <span>Биологический контроль и иммунитет</span>
              </h4>
              <ul className="space-y-2">
                {condition.recommendations.biological.map((bio, idx) => (
                  <li key={idx} className="flex items-start space-x-2.5 text-xs text-slate-700 leading-relaxed bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-100">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{bio}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {activeTab === 'agrotechnical' && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Агротехнические меры и профилактика</span>
              </h4>
              <ul className="space-y-2">
                {condition.recommendations.agrotechnical.map((agro, idx) => (
                  <li key={idx} className="flex items-start space-x-2.5 text-xs text-slate-700 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span>{agro}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {activeTab === 'chemical' && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
                <Pill className="w-4 h-4 text-rose-600" />
                <span>Препараты и химическая защита</span>
              </h4>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 text-[11px] text-amber-900 leading-relaxed flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <span>
                  Соблюдайте регламент применения, класс опасности и сроки ожидания до сбора урожая согласно каталогу пестицидов.
                </span>
              </div>
              <ul className="space-y-2">
                {condition.recommendations.chemical.map((chem, idx) => (
                  <li key={idx} className="flex items-start space-x-2.5 text-xs text-slate-700 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-600 shrink-0 mt-1.5" />
                    <span>{chem}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
