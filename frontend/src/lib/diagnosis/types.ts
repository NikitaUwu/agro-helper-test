import type { CropId } from '@/types';

export type ImageSource = 'upload' | 'sample';
export type UncertainReason = 'ood' | 'low_score' | 'ambiguous' | 'unsupported_class';
export interface Candidate {
  index: number; label: string; conditionId: string | null; cropId: CropId | null; score: number;
}
export interface ResultMetadata {
  requestId: string; source: ImageSource; modelRevision: string; policyVersion: string;
  preprocessingVersion: string; inferenceMs: number; initializationMs: number;
}
export type DiagnosisOutcome =
  | (ResultMetadata & { status: 'accepted'; conditionId: string; cropId: CropId; score: number; oodSimilarity: number; top3: Candidate[] })
  | (ResultMetadata & { status: 'uncertain'; reason: UncertainReason; oodSimilarity: number; top3: Candidate[] })
  | { status: 'error'; requestId: string; reason: 'invalid_file' | 'decode_failed' | 'model_load_failed' | 'inference_failed' | 'timeout'; message: string }
  | { status: 'cancelled'; requestId: string };
export interface DiagnosisRequest {
  requestId: string; image: Blob; source: ImageSource;
}
export interface AnalysisProgress { phase: 'loading' | 'preparing' | 'analyzing'; loaded?: number; total?: number }
export interface InferenceContext { requestId: string; source: ImageSource; inferenceMs: number; initializationMs: number }
