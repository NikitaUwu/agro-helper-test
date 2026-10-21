import type { CropId, JournalEntry } from '@/types';
export const JOURNAL_KEY = 'agronomist_field_journal_v1';
interface StoragePort { getItem(key: string): string | null; setItem(key: string, value: string): void }
export type SaveResult = { ok: true } | { ok: false; reason: 'quota' | 'unavailable' };
const cropIds = new Set(['tomato', 'potato', 'apple', 'cucumber', 'wheat', 'pepper', 'strawberry']);
const origins = new Set(['model_upload', 'model_sample', 'catalog', 'legacy_demo']);
export function readJournal(storage?: StoragePort): JournalEntry[] {
  try {
    const parsed: unknown = JSON.parse((storage ?? window.localStorage).getItem(JOURNAL_KEY) ?? '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap(value => {
      if (!value || typeof value !== 'object') return [];
      const row = value as Record<string, unknown>;
      if (!['id', 'timestamp', 'formattedDateRu', 'cropNameRu', 'conditionId', 'conditionNameRu', 'riskLabelRu', 'imageSrc'].every(key => typeof row[key] === 'string') ||
          !cropIds.has(String(row.cropId)) || !['healthy', 'moderate', 'critical'].includes(String(row.risk)) || !Number.isFinite(Date.parse(String(row.timestamp)))) return [];
      const knownOrigin = row.schemaVersion === 2 && origins.has(String(row.origin)) ? row.origin : 'legacy_demo';
      const modelScore = typeof row.score === 'number' && Number.isFinite(row.score) && row.score >= 0 && row.score <= 1 ? row.score : null;
      const isModel = (knownOrigin === 'model_upload' || knownOrigin === 'model_sample') && modelScore !== null && typeof row.modelRevision === 'string';
      return [{ ...row, cropId: row.cropId as CropId, schemaVersion: 2,
        origin: isModel ? knownOrigin : knownOrigin === 'catalog' ? 'catalog' : 'legacy_demo',
        score: isModel ? modelScore : null,
      } as unknown as JournalEntry];
    });
  } catch { return []; }
}

export function writeJournal(entries: JournalEntry[], storage?: StoragePort): SaveResult {
  try { (storage ?? window.localStorage).setItem(JOURNAL_KEY, JSON.stringify(entries)); return { ok: true }; }
  catch (error) {
    const name = error && typeof error === 'object' && 'name' in error ? error.name : '';
    return { ok: false, reason: name === 'QuotaExceededError' || name === 'NS_ERROR_DOM_QUOTA_REACHED' ? 'quota' : 'unavailable' };
  }
}

export async function createJournalThumbnail(file: Blob): Promise<string> {
  const image = await createImageBitmap(file, { imageOrientation: 'from-image' });
  try {
    const canvas = document.createElement('canvas');
    let maxSide = 640;
    for (let attempt = 0; attempt < 8; attempt++) {
      const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
      canvas.width = Math.max(1, Math.round(image.width * scale)); canvas.height = Math.max(1, Math.round(image.height * scale));
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Canvas unavailable');
      context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const result = canvas.toDataURL('image/jpeg', 0.72);
      if ((result.length - result.indexOf(',') - 1) * 0.75 <= 80 * 1024) return result;
      maxSide = Math.round(maxSide * 0.75);
    }
    throw new Error('Thumbnail exceeds limit');
  } finally { image.close(); }
}

export function makeJournalEntry(condition: import('@/types').DiseaseCondition, imageSrc: string, outcome?: Extract<import('./diagnosis/types').DiagnosisOutcome, {status:'accepted'}>): JournalEntry {
  const now = new Date();
  return {
    id: outcome ? `entry_${outcome.requestId}` : `entry_${crypto.randomUUID()}`, timestamp: now.toISOString(),
    formattedDateRu: new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(now),
    cropId: condition.cropId, cropNameRu: condition.cropNameRu, conditionId: condition.id, conditionNameRu: condition.nameRu,
    risk: condition.risk, riskLabelRu: condition.riskLabelRu, imageSrc, schemaVersion: 2,
    origin: outcome ? outcome.source === 'sample' ? 'model_sample' : 'model_upload' : 'catalog',
    score: outcome?.score ?? null, modelRevision: outcome?.modelRevision,
    policyVersion: outcome?.policyVersion, preprocessingVersion: outcome?.preprocessingVersion,
  };
}

export const originLabel = (entry: JournalEntry) => ({
  model_upload: 'Экспериментальный анализ', model_sample: 'Тестовый образец', catalog: 'Из справочника', legacy_demo: 'Старая демонстрационная запись',
}[entry.origin ?? 'legacy_demo']);
