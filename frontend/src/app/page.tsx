'use client';

import React, { useState, useEffect } from 'react';
import { MobileFrame } from '@/components/layout/MobileFrame';
import { Header } from '@/components/layout/Header';
import { BottomNav, TabType } from '@/components/layout/BottomNav';
import { Scanner } from '@/components/Scanner';
import { DiagnosisResult } from '@/components/DiagnosisResult';
import { CropCatalog } from '@/components/CropCatalog';
import { FieldJournal } from '@/components/FieldJournal';
import { DISEASES } from '@/data/diseases';
import { DiseaseCondition, JournalEntry } from '@/types';

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>('diagnostics');
  const [selectedCondition, setSelectedCondition] = useState<DiseaseCondition | null>(null);
  const [activeScannedImage, setActiveScannedImage] = useState<string>('');
  const [activeConfidence, setActiveConfidence] = useState<number>(95.0);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [isClient, setIsClient] = useState(false);

  // Synchronize localStorage on mount
  useEffect(() => {
    setIsClient(true);
    try {
      const stored = localStorage.getItem('agronomist_field_journal_v1');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setJournalEntries(parsed);
        }
      }
    } catch (e) {
      console.warn('LocalStorage unavailable:', e);
    }
  }, []);

  const updateJournal = (newEntries: JournalEntry[]) => {
    setJournalEntries(newEntries);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('agronomist_field_journal_v1', JSON.stringify(newEntries));
      } catch (e) {
        console.warn('Failed to save journal to localStorage:', e);
      }
    }
  };

  const handleScanComplete = (
    conditionId: string,
    imageSrc: string,
    confidence: number
  ) => {
    const found = DISEASES.find((d) => d.id === conditionId) || DISEASES[0];
    setSelectedCondition(found);
    setActiveScannedImage(imageSrc);
    setActiveConfidence(confidence);

    // Auto-save to journal for seamless user journey
    const now = new Date();
    const formattedDate = new Intl.DateTimeFormat('ru-RU', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(now);

    const newEntry: JournalEntry = {
      id: `entry_${Date.now()}`,
      timestamp: now.toISOString(),
      formattedDateRu: formattedDate,
      cropId: found.cropId,
      cropNameRu: found.cropNameRu,
      conditionId: found.id,
      conditionNameRu: found.nameRu,
      risk: found.risk,
      riskLabelRu: found.riskLabelRu,
      confidence: confidence,
      imageSrc: imageSrc,
    };

    updateJournal([newEntry, ...journalEntries]);
  };

  const handleSelectCatalogDisease = (disease: DiseaseCondition) => {
    setSelectedCondition(disease);
    setActiveScannedImage(disease.photos[0] || '');
    setActiveConfidence(96.0);
  };

  const handleOpenJournalEntry = (entry: JournalEntry) => {
    const found = DISEASES.find((d) => d.id === entry.conditionId) || DISEASES[0];
    setSelectedCondition(found);
    setActiveScannedImage(entry.imageSrc);
    setActiveConfidence(entry.confidence);
  };

  const handleDeleteJournalEntry = (id: string) => {
    const updated = journalEntries.filter((e) => e.id !== id);
    updateJournal(updated);
  };

  const handleClearJournal = () => {
    updateJournal([]);
  };

  const handleTabChange = (tab: TabType) => {
    setSelectedCondition(null);
    setActiveTab(tab);
  };

  const getHeaderTitle = () => {
    if (selectedCondition) {
      return `Заключение: ${selectedCondition.cropNameRu}`;
    }
    switch (activeTab) {
      case 'diagnostics':
        return 'Экспресс-диагностика растений';
      case 'catalog':
        return 'Справочник культур и патогенов';
      case 'journal':
        return 'История проверок';
    }
  };

  const isCurrentSaved = selectedCondition
    ? journalEntries.some(
        (e) =>
          e.conditionId === selectedCondition.id &&
          e.imageSrc === activeScannedImage
      )
    : false;

  return (
    <MobileFrame>
      <Header activeTabTitle={getHeaderTitle()} />

      <main className="flex-1 overflow-y-auto px-4 py-4 pb-safe-nav">
        {/* If a diagnosis/disease view is open, show the full result */}
        {selectedCondition ? (
          <DiagnosisResult
            condition={selectedCondition}
            scannedImageSrc={activeScannedImage}
            confidence={activeConfidence}
            onBack={() => setSelectedCondition(null)}
            onNewScan={() => {
              setSelectedCondition(null);
              setActiveTab('diagnostics');
            }}
            onSaveToJournal={(entry) => updateJournal([entry, ...journalEntries])}
            isSavedInJournal={isCurrentSaved}
          />
        ) : (
          <>
            {/* TAB 1: DIAGNOSTICS */}
            {activeTab === 'diagnostics' && (
              <Scanner onScanComplete={handleScanComplete} />
            )}

            {/* TAB 2: CATALOG */}
            {activeTab === 'catalog' && (
              <CropCatalog onSelectDisease={handleSelectCatalogDisease} />
            )}

            {/* TAB 3: FIELD JOURNAL */}
            {activeTab === 'journal' && (
              <FieldJournal
                entries={isClient ? journalEntries : []}
                onOpenEntry={handleOpenJournalEntry}
                onDeleteEntry={handleDeleteJournalEntry}
                onClearAll={handleClearJournal}
                onNavigateToScanner={() => setActiveTab('diagnostics')}
              />
            )}
          </>
        )}
      </main>

      <BottomNav
        activeTab={activeTab}
        onTabChange={handleTabChange}
        journalCount={isClient ? journalEntries.length : 0}
      />
    </MobileFrame>
  );
}
