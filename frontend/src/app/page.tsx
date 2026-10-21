'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MobileFrame } from '@/components/layout/MobileFrame';
import { Header } from '@/components/layout/Header';
import { BottomNav, TabType } from '@/components/layout/BottomNav';
import { Scanner } from '@/components/Scanner';
import { DiagnosisResult } from '@/components/DiagnosisResult';
import { CropCatalog } from '@/components/CropCatalog';
import { FieldJournal } from '@/components/FieldJournal';
import { DISEASE_MAP } from '@/data/diseases';
import { DiseaseCondition, JournalEntry } from '@/types';
import type { DiagnosisOutcome } from '@/lib/diagnosis/types';
import { readJournal, writeJournal, makeJournalEntry } from '@/lib/journal';

type Accepted = Extract<DiagnosisOutcome, { status: 'accepted' }>;
export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>('diagnostics');
  const [selectedCondition, setSelectedCondition] = useState<DiseaseCondition | null>(null);
  const [activeScannedImage, setActiveScannedImage] = useState('');
  const [activeDraft, setActiveDraft] = useState<JournalEntry | null>(null);
  const [activeOutcome, setActiveOutcome] = useState<Accepted | null>(null);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const entriesRef = useRef<JournalEntry[]>([]);
  const [notice, setNotice] = useState('');
  const [viewMode, setViewMode] = useState<'analysis' | 'catalog' | 'journal'>('catalog');

  useEffect(() => {
    const entries = readJournal(); entriesRef.current = entries; setJournalEntries(entries);
  }, []);
  useEffect(() => () => {
    if (activeScannedImage.startsWith('blob:')) URL.revokeObjectURL(activeScannedImage);
  }, [activeScannedImage]);

  const updateJournal = useCallback((entries: JournalEntry[]): boolean => {
    const result = writeJournal(entries);
    if (!result.ok) {
      setNotice(result.reason === 'quota' ? 'Не удалось сохранить в журнал: локальное хранилище заполнено. Результат остаётся на экране.' : 'Локальное хранилище недоступно. Изменения журнала не сохранены.');
      return false;
    }
    entriesRef.current = entries; setJournalEntries(entries); setNotice(''); return true;
  }, []);
  const saveEntry = useCallback((entry: JournalEntry) => {
    if (entriesRef.current.some(item => item.id === entry.id)) return true;
    return updateJournal([entry, ...entriesRef.current]);
  }, [updateJournal]);

  const handleScanComplete = useCallback((outcome: Accepted, imageSrc: string, thumbnail: string | null) => {
    const condition = DISEASE_MAP[outcome.conditionId];
    if (!condition) {
      URL.revokeObjectURL(imageSrc); setNotice('Для результата модели не найдена карточка. Анализ не сохранён.'); return;
    }
    setSelectedCondition(condition); setActiveScannedImage(imageSrc); setActiveOutcome(outcome); setViewMode('analysis');
    if (thumbnail) {
      const entry = makeJournalEntry(condition, thumbnail, outcome); setActiveDraft(entry); saveEntry(entry);
    } else {
      setActiveDraft(null); setNotice('Результат получен, но не удалось подготовить фотографию для журнала.');
    }
  }, [saveEntry]);

  const closeResult = () => {
    setSelectedCondition(null); setActiveScannedImage(''); setActiveDraft(null); setActiveOutcome(null); setNotice('');
  };
  const handleSelectCatalogDisease = (condition: DiseaseCondition) => {
    const image = condition.photos[0] || '';
    setSelectedCondition(condition); setActiveScannedImage(image); setActiveDraft(makeJournalEntry(condition, image));
    setActiveOutcome(null); setViewMode('catalog'); setNotice('');
  };
  const handleOpenJournalEntry = (entry: JournalEntry) => {
    const condition = DISEASE_MAP[entry.conditionId];
    if (!condition) { setNotice(`Запись «${entry.conditionNameRu}» сохранена, но её справочная карточка сейчас недоступна.`); return; }
    setSelectedCondition(condition); setActiveScannedImage(entry.imageSrc); setActiveDraft(entry);
    setActiveOutcome(null); setViewMode('journal'); setNotice('');
  };
  const handleDeleteJournalEntry = (id: string) => updateJournal(entriesRef.current.filter(entry => entry.id !== id));
  const handleClearJournal = () => updateJournal([]);
  const handleTabChange = (tab: TabType) => { closeResult(); setActiveTab(tab); };
  const title = selectedCondition
    ? `${viewMode === 'catalog' ? 'Справочник' : 'Результат'}: ${selectedCondition.cropNameRu}`
    : { diagnostics: 'Экспресс-диагностика растений', catalog: 'Справочник культур и патогенов', journal: 'История проверок' }[activeTab];
  const isSaved = Boolean(activeDraft && journalEntries.some(entry => entry.id === activeDraft.id));
  const realOrigin = activeDraft?.origin === 'model_upload' || activeDraft?.origin === 'model_sample';
  const score = activeOutcome?.score ?? (realOrigin ? activeDraft?.score ?? null : null);

  return <MobileFrame>
    <Header activeTabTitle={title} />
    <main className="flex-1 overflow-y-auto px-4 py-4 pb-safe-nav">
      {notice && <div role="alert" className="mb-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950">{notice}</div>}
      {selectedCondition ? <DiagnosisResult
        key={`${selectedCondition.id}-${activeDraft?.id ?? 'unsaved'}`}
        condition={selectedCondition} scannedImageSrc={activeScannedImage} score={score}
        origin={activeDraft?.origin ?? 'model_upload'} top3={activeOutcome?.top3}
        onBack={closeResult} onNewScan={() => { closeResult(); setActiveTab('diagnostics'); }}
        onSaveToJournal={activeDraft ? () => { saveEntry(activeDraft); } : undefined}
        isSavedInJournal={isSaved}
      /> : <>
        {activeTab === 'diagnostics' && <Scanner onScanComplete={handleScanComplete} />}
        {activeTab === 'catalog' && <CropCatalog onSelectDisease={handleSelectCatalogDisease} />}
        {activeTab === 'journal' && <FieldJournal entries={journalEntries} onOpenEntry={handleOpenJournalEntry}
          onDeleteEntry={handleDeleteJournalEntry} onClearAll={handleClearJournal} onNavigateToScanner={() => setActiveTab('diagnostics')} />}
      </>}
    </main>
    <BottomNav activeTab={activeTab} onTabChange={handleTabChange} journalCount={journalEntries.length} />
  </MobileFrame>;
}
