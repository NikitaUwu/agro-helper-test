'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { DEMO_SAMPLES } from '@/data/demoSamples';
import { DemoSample, CropId } from '@/types';
import { CROPS } from '@/data/crops';
import { ANALYSIS_CROP_IDS } from '@/lib/diagnosis/registry';
import { analyzeLeaf } from '@/lib/diagnosis/client';
import { createJournalThumbnail } from '@/lib/journal';
import { AnalysisProgress, DiagnosisOutcome } from '@/lib/diagnosis/types';
import { ScanFeedback } from './ScanFeedback';
import { RecognitionCoverage } from './RecognitionCoverage';
import {
  Camera,
  Upload,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  RefreshCw,
  Scan,
  X,
} from 'lucide-react';

interface ScannerProps {
  onScanComplete: (outcome: Extract<DiagnosisOutcome, {status:'accepted'}>, imageSrc: string, thumbnail: string | null) => void;
}

export const Scanner: React.FC<ScannerProps> = ({ onScanComplete }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [scanningImage, setScanningImage] = useState<string | null>(null);
  const [selectedCrop, setSelectedCrop] = useState<CropId | ''>('');
  const [progress, setProgress] = useState<AnalysisProgress>({ phase: 'preparing' });
  const [feedback, setFeedback] = useState<Exclude<DiagnosisOutcome, {status:'accepted'}|{status:'cancelled'}> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const previewRef = useRef<string | null>(null);
  const scanProgress = progress.total ? Math.min(100, Math.round((progress.loaded ?? 0) / progress.total * 100)) : null;
  const phaseLabel = { loading: 'Загрузка и запуск модели...', preparing: 'Подготовка снимка...', analyzing: 'Анализ листа...' }[progress.phase];

  useEffect(() => () => {
    controllerRef.current?.abort();
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
  }, []);

  const handleCancelScan = () => {
    controllerRef.current?.abort(); controllerRef.current = null;
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = null; setScanningImage(null); setIsScanning(false);
  };

  const runAnalysis = async (input: Blob | string, cropId: CropId, source: 'upload' | 'sample') => {
    if (controllerRef.current) return;
    const controller = new AbortController(); controllerRef.current = controller;
    setSelectedCrop(cropId); setFeedback(null); setIsScanning(true); setProgress({ phase: 'preparing' });
    if (typeof input === 'string') setScanningImage(input);
    const requestId = crypto.randomUUID();
    try {
      let image: Blob;
      if (typeof input === 'string') {
        const response = await fetch(input, { signal: controller.signal });
        if (!response.ok) throw new Error('Не удалось открыть тестовый образец.');
        image = await response.blob();
      } else image = input;
      if (controller.signal.aborted) return;
      const preview = URL.createObjectURL(image); previewRef.current = preview; setScanningImage(preview);
      const outcome = await analyzeLeaf({ requestId, image, selectedCropId: cropId, source }, setProgress, controller.signal);
      if (controller.signal.aborted || controllerRef.current !== controller) return;
      if (outcome.status === 'accepted') {
        const thumbnail = await createJournalThumbnail(image).catch(() => null);
        if (controller.signal.aborted || controllerRef.current !== controller) return;
        // The result page owns the full preview until it closes.
        previewRef.current = null;
        onScanComplete(outcome, preview, thumbnail);
      } else {
        if (outcome.status !== 'cancelled') setFeedback(outcome);
        URL.revokeObjectURL(preview); previewRef.current = null;
      }
    } catch (error) {
      if (!controller.signal.aborted) setFeedback({ status: 'error', requestId, reason: 'decode_failed', message: error instanceof Error ? error.message : 'Не удалось открыть снимок.' });
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
      previewRef.current = null;
    } finally {
      if (controllerRef.current === controller) { controllerRef.current = null; setIsScanning(false); setScanningImage(null); }
    }
  };

  const handleSelectPreset = (sample: DemoSample) => { void runAnalysis(sample.imagePath, sample.cropId, 'sample'); };
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; event.target.value = '';
    if (!file) return;
    if (!selectedCrop) { setFeedback({ status: 'error', requestId: '', reason: 'invalid_file', message: 'Сначала выберите культуру.' }); return; }
    void runAnalysis(file, selectedCrop, 'upload');
  };

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

  return (
    <div className="space-y-4">
      <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/jpeg,image/png,image/webp" className="hidden" aria-label="Загрузка фотографии растения" />
      <input type="file" ref={cameraInputRef} onChange={handleFileUpload} accept="image/jpeg,image/png,image/webp" capture="environment" className="hidden" aria-label="Съёмка растения" />
      {feedback && <ScanFeedback outcome={feedback} onRetry={() => setFeedback(null)} />}

      {/* SCANNING OVERLAY VIEW */}
      {isScanning && scanningImage && (
        <div className="bg-slate-900 rounded-2xl p-4 text-white shadow-2xl relative overflow-hidden">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <Scan className="w-4 h-4 text-emerald-400 animate-spin" />
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                ИИ-анализ растения в процессе
              </span>
            </div>
            <button
              type="button"
              onClick={handleCancelScan}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Отменить сканирование" aria-label="Отменить сканирование"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Scanner Viewport with Laser & Brackets */}
          <div className="relative w-full aspect-square max-h-[320px] rounded-xl overflow-hidden mt-3 bg-black">
            {/* Scanned Image */}
            <Image
              src={scanningImage}
              alt="Сканируемое растение"
              fill
              className="object-cover opacity-85"
            />

            {/* Radar Grid Overlay */}
            <div className="absolute inset-0 radar-grid-bg pointer-events-none opacity-40" />

            {/* Scanning Laser Beam */}
            <div className="absolute left-0 right-0 h-16 pointer-events-none animate-radar-sweep border-b-2 border-emerald-400 bg-gradient-to-b from-transparent via-emerald-400/20 to-emerald-400/40 shadow-[0_0_15px_rgba(52,211,153,0.8)]" />

            {/* High-tech Viewfinder Brackets */}
            <div className="absolute top-3 left-3 w-6 h-6 border-t-2 border-l-2 border-emerald-400 rounded-tl-sm pointer-events-none" />
            <div className="absolute top-3 right-3 w-6 h-6 border-t-2 border-r-2 border-emerald-400 rounded-tr-sm pointer-events-none" />
            <div className="absolute bottom-3 left-3 w-6 h-6 border-b-2 border-l-2 border-emerald-400 rounded-bl-sm pointer-events-none" />
            <div className="absolute bottom-3 right-3 w-6 h-6 border-b-2 border-r-2 border-emerald-400 rounded-br-sm pointer-events-none" />

            {/* Center target reticle */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-20 h-20 border border-emerald-400/50 rounded-full flex items-center justify-center">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-ping" />
              </div>
            </div>

            {/* Progress Badge */}
            <div className="absolute bottom-2 left-2 right-2 bg-slate-950/80 backdrop-blur-md rounded-lg p-2 border border-slate-700/60">
              <div className="flex justify-between text-[11px] font-semibold text-slate-200 mb-1">
                <span className="truncate pr-2">{phaseLabel}</span>
                <span className="text-emerald-400 font-mono">{scanProgress === null ? '' : `${scanProgress}%`}</span>
              </div>
              <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-emerald-500 to-emerald-300 h-full rounded-full transition-all duration-100 ease-out"
                  style={{ width: scanProgress === null ? '35%' : `${scanProgress}%` }}
                />
              </div>
            </div>
          </div>

          <div className="mt-3 text-center">
            <span className="text-[11px] text-slate-400">
              Первый запуск требует загрузки модели; фотография остаётся на устройстве
            </span>
          </div>
        </div>
      )}

      {/* Hero Action Card (when not scanning) */}
      {!isScanning && (
        <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 text-white rounded-2xl p-5 shadow-lg shadow-emerald-900/10 relative overflow-hidden">
          <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-emerald-500/20 rounded-full blur-xl pointer-events-none" />
          <div className="relative z-10">
            <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-500/30 text-emerald-100 text-xs font-semibold mb-2 backdrop-blur-xs">
              <Sparkles className="w-3.5 h-3.5" />
              <span>ИИ-анализ растений</span>
            </span>
            <h2 className="text-xl font-extrabold leading-tight tracking-tight text-white">
              Проверьте лист растения по фото
            </h2>
            <p className="text-xs text-emerald-100 mt-1 leading-relaxed">
              Снимите один лист крупно на однотонном фоне или выберите готовый образец.
            </p>

            <label className="block mt-3 text-xs font-semibold" htmlFor="analysis-crop">Культура</label>
            <select id="analysis-crop" aria-label="Культура для анализа" value={selectedCrop} onChange={event => setSelectedCrop(event.target.value as CropId | '')} className="mt-1 w-full rounded-lg bg-white text-slate-900 text-xs p-2.5 min-h-[40px]">
              <option value="">Выберите культуру</option>
              {ANALYSIS_CROP_IDS.map(id => <option key={id} value={id}>{CROPS.find(crop => crop.id === id)?.nameRu}</option>)}
            </select>
            <p className="mt-2 text-[10px] text-emerald-100">Экспериментальный анализ · 5 культур. Другие болезни и скрытые инфекции могут не определяться.</p>
            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2.5 mt-4">
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()} disabled={!selectedCrop}
                className="flex items-center justify-center space-x-2 py-3 px-3 bg-white text-emerald-800 rounded-xl font-bold text-xs shadow-sm hover:bg-emerald-50 active:scale-95 transition min-h-[48px] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Camera className="w-4 h-4 text-emerald-700" />
                <span>Камера</span>
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()} disabled={!selectedCrop}
                className="flex items-center justify-center space-x-2 py-3 px-3 bg-emerald-700/80 border border-emerald-400/40 text-white rounded-xl font-bold text-xs hover:bg-emerald-700 active:scale-95 transition min-h-[48px] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Upload className="w-4 h-4 text-emerald-200" />
                <span>Загрузить</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <RecognitionCoverage />

      {/* Preset Samples Section */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-slate-800">
            Готовые образцы для теста
          </h3>
          <span className="text-[11px] font-semibold text-emerald-700">
            Нажмите для экспресс-анализа
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          {DEMO_SAMPLES.map((sample) => (
            <button
              key={sample.id}
              type="button"
              onClick={() => handleSelectPreset(sample)} disabled={isScanning}
              className="bg-white border border-slate-200 rounded-xl p-2 shadow-xs hover:border-emerald-500 hover:shadow-md transition text-left flex flex-col justify-between min-h-[148px] group active:scale-95"
            >
              <div className="relative w-full aspect-square bg-slate-100 rounded-lg overflow-hidden mb-1.5 border border-slate-100">
                <Image
                  src={sample.imagePath}
                  alt={sample.titleRu}
                  fill
                  sizes="(max-width: 640px) 30vw, 120px"
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="w-full">
                <span className="text-[10px] font-bold text-slate-500 block leading-none">
                  {sample.cropNameRu}
                </span>
                <span className="text-[11px] font-bold text-slate-900 block truncate leading-tight mt-0.5">
                  {sample.titleRu.split(': ')[1] || sample.titleRu}
                </span>
                <div className="mt-1">
                  {getRiskBadge(sample.risk, sample.riskLabelRu)}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
