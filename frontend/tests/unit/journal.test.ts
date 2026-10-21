import { describe, it, expect } from 'vitest';
import { readJournal, writeJournal, JOURNAL_KEY } from '@/lib/journal';

const old = { id: 'old', timestamp: '2026-10-19T10:00:00Z', formattedDateRu: '19 окт.', cropId: 'cucumber', cropNameRu: 'Огурец', conditionId: 'cucumber_powdery_mildew', conditionNameRu: 'Мучнистая роса', risk: 'moderate', riskLabelRu: 'Умеренно', confidence: 99, imageSrc: '/data/catalog/cucumber_powdery_mildew_1.jpg' };
describe('journal compatibility and persistence', () => {
  it('reads the old journal without rewriting or treating mock confidence as a real score', () => {
    let writes = 0;
    const storage = { getItem: (key: string) => key === JOURNAL_KEY ? JSON.stringify([old]) : null, setItem: () => { writes++; } };
    const entries = readJournal(storage);
    expect(entries[0]).toMatchObject({ id: 'old', cropId: 'cucumber', origin: 'legacy_demo', score: null });
    expect(writes).toBe(0);
  });
  it('preserves unknown condition snapshots without substituting another disease', () => {
    expect(readJournal({ getItem: () => JSON.stringify([{ ...old, conditionId: 'retired_condition' }]), setItem() {} })[0].conditionId).toBe('retired_condition');
  });
  it('handles damaged storage and rejects a bad row while retaining valid history', () => {
    expect(readJournal({ getItem: () => '{', setItem() {} })).toEqual([]);
    expect(readJournal({ getItem: () => JSON.stringify([null, {}, old]), setItem() {} })).toHaveLength(1);
    expect(readJournal({ getItem: () => { throw new Error('disabled'); }, setItem() {} })).toEqual([]);
  });
  it('reports quota/unavailable instead of claiming that saving succeeded', () => {
    const quota = new Error('full'); quota.name = 'QuotaExceededError';
    expect(writeJournal([], { getItem: () => null, setItem: () => { throw quota; } })).toEqual({ ok: false, reason: 'quota' });
    expect(writeJournal([], { getItem: () => null, setItem: () => { throw new Error('disabled'); } })).toEqual({ ok: false, reason: 'unavailable' });
  });
  it('round trips a real model result with revision and score', () => {
    let value = '';
    const storage = { getItem: () => value, setItem: (_key: string, data: string) => { value = data; } };
    const entry = { ...old, schemaVersion: 2 as const, origin: 'model_upload' as const, score: 0.91, modelRevision: 'revision', policyVersion: 'policy', preprocessingVersion: 'preprocess' };
    expect(writeJournal([entry], storage)).toEqual({ ok: true });
    expect(readJournal(storage)[0]).toMatchObject({ origin: 'model_upload', score: 0.91, modelRevision: 'revision' });
  });
});
