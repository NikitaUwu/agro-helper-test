import { describe, it, expect } from 'vitest';
import { MODEL_LABELS, ANALYSIS_CROP_IDS } from '@/lib/diagnosis/registry';
import { evaluatePrediction, softmax } from '@/lib/diagnosis/policy';

const context = { requestId: 'test', source: 'upload' as const, inferenceMs: 42, initializationMs: 0 };
const features = new Float32Array(768); features[0] = 1;
const centroids = new Float32Array(38 * 768);
for (let i = 0; i < 38; i++) centroids[i * 768] = 1;
const logits = (top: number, score = 10) => { const values = new Float32Array(38); values[top] = score; return values; };
const predict = (top: number) => evaluatePrediction(logits(top), features, centroids, context);

describe('model labels and numerical policy', () => {
  it('preserves all 38 outputs but enables exactly 21 states across five crops', () => {
    expect(MODEL_LABELS).toHaveLength(38);
    expect(MODEL_LABELS.filter(item => item.enabled)).toHaveLength(21);
    expect(ANALYSIS_CROP_IDS).toEqual(['tomato', 'potato', 'apple', 'pepper', 'strawberry']);
    expect(MODEL_LABELS[35].conditionId).toBe('tomato_yellow_leaf_curl');
    expect(MODEL_LABELS[37].conditionId).toBe('tomato_healthy');
  });
  it('accepts a supported class and keeps the unfiltered global top three', () => {
    const result = predict(30);
    expect(result.status).toBe('accepted');
    if (result.status !== 'accepted') throw new Error('Expected accepted');
    expect(result.conditionId).toBe('tomato_late_blight');
    expect(result.score).toBeGreaterThan(0.99);
    expect(result.top3[0].index).toBe(30);
  });
  it('does not replace a disabled global winner with an allowed runner-up', () => {
    expect(predict(4)).toMatchObject({ status: 'uncertain', reason: 'unsupported_class' });
    expect(predict(25)).toMatchObject({ status: 'uncertain', reason: 'unsupported_class' });
  });
  it('identifies the crop and condition directly from each of the 21 supported winners', () => {
    for (const label of MODEL_LABELS.filter(item => item.enabled)) {
      expect(predict(label.index)).toMatchObject({ status: 'accepted', cropId: label.cropId, conditionId: label.conditionId });
    }
  });
  it('OOD overrides confident logits; zero or non-finite features are errors', () => {
    const other = new Float32Array(768); other[1] = 1;
    expect(evaluatePrediction(logits(30), other, centroids, context)).toMatchObject({ status: 'uncertain', reason: 'ood' });
    expect(evaluatePrediction(logits(30), new Float32Array(768), centroids, context).status).toBe('error');
    const invalid = features.slice(); invalid[1] = NaN;
    expect(evaluatePrediction(logits(30), invalid, centroids, context).status).toBe('error');
  });
  it('rejects ambiguous/weak results, validates shapes and keeps softmax finite', () => {
    const tied = logits(30); tied[29] = 10;
    expect(evaluatePrediction(tied, features, centroids, context).status).toBe('uncertain');
    expect(evaluatePrediction(new Float32Array(38), features, centroids, context).status).toBe('uncertain');
    expect(evaluatePrediction(new Float32Array(37), features, centroids, context).status).toBe('error');
    expect(softmax(new Float32Array([10000, 9999])).every(Number.isFinite)).toBe(true);
    expect(softmax(new Float32Array([10000, 9999])).reduce((a, b) => a+b, 0)).toBeCloseTo(1);
  });
});
