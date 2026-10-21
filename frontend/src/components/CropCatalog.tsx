'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import { CROPS, CROP_MAP } from '@/data/crops';
import { DISEASES } from '@/data/diseases';
import { DiseaseCondition, CropId } from '@/types';
import { canAnalyzeCondition, ANALYSIS_CROP_IDS } from '@/lib/diagnosis/registry';
import {
  Search,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  ArrowRight,
  Sprout,
  Layers,
  Leaf,
  Apple,
  Wheat,
  ShieldCheck,
  Info,
  X,
} from 'lucide-react';

interface CropCatalogProps {
  onSelectDisease: (disease: DiseaseCondition) => void;
}

export const CropCatalog: React.FC<CropCatalogProps> = ({ onSelectDisease }) => {
  const [selectedCropFilter, setSelectedCropFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const getCropIcon = (cropId: CropId) => {
    switch (cropId) {
      case 'tomato':
        return <Sprout className="w-4 h-4 text-emerald-600" />;
      case 'potato':
        return <Layers className="w-4 h-4 text-amber-600" />;
      case 'cucumber':
        return <Leaf className="w-4 h-4 text-emerald-500" />;
      case 'apple':
        return <Apple className="w-4 h-4 text-rose-500" />;
      case 'pepper': return <Sprout className="w-4 h-4 text-emerald-600" />;
      case 'strawberry': return <Leaf className="w-4 h-4 text-rose-500" />;
      case 'wheat':
        return <Wheat className="w-4 h-4 text-amber-500" />;
    }
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

  const filteredDiseases = useMemo(() => {
    return DISEASES.filter((d) => {
      const matchesCrop = selectedCropFilter === 'all' || d.cropId === selectedCropFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        d.nameRu.toLowerCase().includes(q) ||
        d.pathogenRu.toLowerCase().includes(q) ||
        d.cropNameRu.toLowerCase().includes(q);
      return matchesCrop && matchesSearch;
    });
  }, [selectedCropFilter, searchQuery]);

  const activeCropInfo = selectedCropFilter !== 'all' ? CROP_MAP[selectedCropFilter as CropId] : null;

  return (
    <div className="space-y-3.5">
      {/* Title Header */}
      <div>
        <h2 className="text-lg font-black text-slate-900 tracking-tight">
          Справочник культур и патогенов
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          База знаний: {CROPS.length} культур и {DISEASES.length} состояния · анализ для {ANALYSIS_CROP_IDS.length} культур
        </p>
      </div>

      <details className="text-[11px] text-slate-500"><summary className="cursor-pointer">Модель и источники</summary><p className="mt-2">Экспериментальная модель <a href="https://huggingface.co/rodynaemad/plant-disease-dinov2-small" className="underline" target="_blank" rel="noreferrer">DINOv2-small — Rodayna Emad Mohamed</a>, <a className="underline" href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer">CC BY-SA 4.0</a>. Примеры PlantVillage — Hughes &amp; Salathé, CC BY-SA. <a href="/data/dinov2-attribution.json" className="underline" target="_blank" rel="noreferrer">Атрибуция новых фото</a>. Фото для анализа остаются на устройстве. Другие болезни и скрытые инфекции могут не определяться.</p></details>
      {/* Search Input Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Поиск по болезни, культуре или возбудителю..."
          className="w-full pl-9 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Crop Filter Horizontal Carousel */}
      <div className="flex space-x-2 overflow-x-auto scrollbar-none pb-1">
        <button
          type="button"
          onClick={() => setSelectedCropFilter('all')}
          className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition min-h-[36px] ${
            selectedCropFilter === 'all'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-700 hover:border-slate-300'
          }`}
        >
          Все ({DISEASES.length})
        </button>
        {CROPS.map((crop) => (
          <button
            key={crop.id}
            type="button"
            onClick={() => setSelectedCropFilter(crop.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition min-h-[36px] flex items-center space-x-1.5 ${
              selectedCropFilter === crop.id
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-700 hover:border-slate-300'
            }`}
          >
            {getCropIcon(crop.id)}
            <span>{crop.nameRu}</span>
          </button>
        ))}
      </div>

      {/* Crop Overview Card (shown when a specific crop is active) */}
      {activeCropInfo && (
        <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3 text-xs text-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-extrabold text-emerald-900 flex items-center space-x-1.5">
              {getCropIcon(activeCropInfo.id)}
              <span>{activeCropInfo.nameRu} ({activeCropInfo.scientificName})</span>
            </span>
            <span className="text-[10px] font-mono font-bold bg-emerald-200 text-emerald-900 px-1.5 py-0.5 rounded">
              EPPO: {activeCropInfo.eppoCode}
            </span>
          </div>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            {activeCropInfo.descriptionRu}
          </p>
          <div className="pt-1 border-t border-emerald-200/60">
            <span className="text-[10px] font-bold text-emerald-900 uppercase block mb-1">
              Профилактический протокол:
            </span>
            <ul className="space-y-1">
              {activeCropInfo.preventionTipsRu.slice(0, 3).map((tip, idx) => (
                <li key={idx} className="flex items-start space-x-1.5 text-[11px] text-emerald-950">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Disease Cards List */}
      <div className="space-y-2.5">
        {filteredDiseases.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-300 rounded-xl p-6 text-center text-slate-500 text-xs">
            Ничего не найдено по запросу «{searchQuery}».
          </div>
        ) : (
          filteredDiseases.map((disease) => (
            <button
              key={disease.id}
              type="button"
              onClick={() => onSelectDisease(disease)}
              className="w-full text-left bg-white border border-slate-200 rounded-xl p-3 shadow-xs flex items-center space-x-3 hover:border-emerald-500 hover:shadow-md transition group active:scale-[0.99]"
            >
              <div className="relative w-14 h-14 bg-slate-100 rounded-lg overflow-hidden shrink-0 border border-slate-100 flex items-center justify-center">
                {disease.photos && disease.photos.length > 0 ? (
                  <Image
                    src={disease.photos[0]}
                    alt={disease.nameRu}
                    fill
                    sizes="56px"
                    className="object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                ) : (
                  getCropIcon(disease.cropId)
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-1.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">
                    {disease.cropNameRu}
                  </span>
                  {getRiskBadge(disease.risk, disease.riskLabelRu)}
                </div>
                {!canAnalyzeCondition(disease.id) && <span className="block text-[9px] text-amber-700 mt-1">Анализ по фото недоступен</span>}
                <h4 className="font-bold text-xs text-slate-900 truncate mt-0.5 group-hover:text-emerald-700 transition-colors">
                  {disease.nameRu}
                </h4>
                <p className="text-[11px] text-slate-500 truncate mt-0.5">
                  {disease.pathogenRu}
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition shrink-0" />
            </button>
          ))
        )}
      </div>
    </div>
  );
};
