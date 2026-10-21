import registry from '../../../../config/model_labels.json';
import type { CropId } from '@/types';

export const MODEL_REVISION = '06ebf5e308e100fd000d738c42b059ebb5f58a16';
export const POLICY_VERSION = 'experimental-score85-margin20-ood699-v1';
export const PREPROCESSING_VERSION = 'canvas-rgb-short256-center224-imagenet-v1';
export const ANALYSIS_CROP_IDS: CropId[] = ['tomato', 'potato', 'apple', 'pepper', 'strawberry'];
export interface ModelLabelMapping {
  index: number; rawLabel: string; modelCrop: string; cropId: CropId | null; conditionId: string | null; enabled: boolean;
}
export const MODEL_LABELS = registry.labels as ModelLabelMapping[];
if (MODEL_LABELS.length !== 38 || MODEL_LABELS.some((item, index) => item.index !== index) || registry.modelRevision !== MODEL_REVISION) {
  throw new Error('Invalid model label registry');
}
const supportedConditions = new Set(MODEL_LABELS.filter(item => item.enabled).map(item => item.conditionId));
export const canAnalyzeCondition = (conditionId: string) => supportedConditions.has(conditionId);
export const isAnalysisCrop = (cropId: CropId) => ANALYSIS_CROP_IDS.includes(cropId);
