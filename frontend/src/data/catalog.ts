import { CROPS } from './crops';
import { DISEASES } from './diseases';
import { MODEL_LABELS } from '@/lib/diagnosis/registry';

const recognizedCropIds = new Set(MODEL_LABELS.filter(label => label.enabled).map(label => label.cropId));

// Keep legacy records available to history without exposing unsupported plants in the catalogue.
export const CATALOG_CROPS = CROPS.filter(crop => recognizedCropIds.has(crop.id));
export const CATALOG_CONDITIONS = DISEASES.filter(condition => recognizedCropIds.has(condition.cropId));
