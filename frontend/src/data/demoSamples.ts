// frontend/src/data/demoSamples.ts
import { DemoSample } from '@/types';

export const DEMO_SAMPLES: DemoSample[] = [
  // ТОМАТ
  {
    id: 'sample_tomato_late_blight',
    cropId: 'tomato',
    cropNameRu: 'Томат',
    titleRu: 'Томат: Фитофтороз',
    expectedConditionId: 'tomato_late_blight',
    imagePath: encodeURI('/data/plantvillage/Tomato___Late_blight/0003faa8-4b27-4c65-bf42-6d9e352ca1a5___RS_Late.B 4946.JPG'),
    confidence: 96.4,
    risk: 'critical',
    riskLabelRu: 'Критично',
    tagRu: 'Опасный патоген'
  },
  {
    id: 'sample_tomato_early_blight',
    cropId: 'tomato',
    cropNameRu: 'Томат',
    titleRu: 'Томат: Альтернариоз',
    expectedConditionId: 'tomato_early_blight',
    imagePath: encodeURI('/data/plantvillage/Tomato___Early_blight/0012b9d2-2130-4a06-a834-b1f3af34f57e___RS_Erly.B 8389.JPG'),
    confidence: 93.8,
    risk: 'moderate',
    riskLabelRu: 'Умеренно',
    tagRu: 'Пятнистость'
  },
  {
    id: 'sample_tomato_healthy',
    cropId: 'tomato',
    cropNameRu: 'Томат',
    titleRu: 'Томат: Здоровый лист',
    expectedConditionId: 'tomato_healthy',
    imagePath: encodeURI('/data/plantvillage/Tomato___healthy/000146ff-92a4-4db6-90ad-8fce2ae4fddd___GH_HL Leaf 259.1.JPG'),
    confidence: 98.7,
    risk: 'healthy',
    riskLabelRu: 'Здорово',
    tagRu: 'Норма'
  },

  // КАРТОФЕЛЬ
  {
    id: 'sample_potato_late_blight',
    cropId: 'potato',
    cropNameRu: 'Картофель',
    titleRu: 'Картофель: Фитофтороз',
    expectedConditionId: 'potato_late_blight',
    imagePath: encodeURI('/data/plantvillage/Potato___Late_blight/0051e5e8-d1c4-4a84-bf3a-a426cdad6285___RS_LB 4640.JPG'),
    confidence: 95.1,
    risk: 'critical',
    riskLabelRu: 'Критично',
    tagRu: 'Опасный патоген'
  },
  {
    id: 'sample_potato_early_blight',
    cropId: 'potato',
    cropNameRu: 'Картофель',
    titleRu: 'Картофель: Альтернариоз',
    expectedConditionId: 'potato_early_blight',
    imagePath: encodeURI('/data/plantvillage/Potato___Early_blight/001187a0-57ab-4329-baff-e7246a9edeb0___RS_Early.B 8178.JPG'),
    confidence: 92.5,
    risk: 'moderate',
    riskLabelRu: 'Умеренно',
    tagRu: 'Пятнистость'
  },
  {
    id: 'sample_potato_healthy',
    cropId: 'potato',
    cropNameRu: 'Картофель',
    titleRu: 'Картофель: Здоровый куст',
    expectedConditionId: 'potato_healthy',
    imagePath: encodeURI('/data/plantvillage/Potato___healthy/00fc2ee5-729f-4757-8aeb-65c3355874f2___RS_HL 1864.JPG'),
    confidence: 99.1,
    risk: 'healthy',
    riskLabelRu: 'Здорово',
    tagRu: 'Норма'
  },

  // ЯБЛОНЯ
  {
    id: 'sample_apple_scab',
    cropId: 'apple',
    cropNameRu: 'Яблоня',
    titleRu: 'Яблоня: Парша',
    expectedConditionId: 'apple_scab',
    imagePath: encodeURI('/data/plantvillage/Apple___Apple_scab/00075aa8-d81a-4184-8541-b692b78d398a___FREC_Scab 3335.JPG'),
    confidence: 94.7,
    risk: 'moderate',
    riskLabelRu: 'Умеренно',
    tagRu: 'Парша'
  },
  {
    id: 'sample_apple_black_rot',
    cropId: 'apple',
    cropNameRu: 'Яблоня',
    titleRu: 'Яблоня: Чёрная гниль',
    expectedConditionId: 'apple_black_rot',
    imagePath: encodeURI('/data/plantvillage/Apple___Black_rot/0090d05d-d797-4c99-abd4-3b9cb323a5fd___JR_FrgE.S 8727.JPG'),
    confidence: 91.8,
    risk: 'critical',
    riskLabelRu: 'Критично',
    tagRu: 'Опасный патоген'
  },
  {
    id: 'sample_apple_cedar_rust',
    cropId: 'apple',
    cropNameRu: 'Яблоня',
    titleRu: 'Яблоня: Ржавчина',
    expectedConditionId: 'apple_cedar_rust',
    imagePath: encodeURI('/data/plantvillage/Apple___Cedar_apple_rust/025b2b9a-0ec4-4132-96ac-7f2832d0db4a___FREC_C.Rust 3655.JPG'),
    confidence: 97.2,
    risk: 'moderate',
    riskLabelRu: 'Умеренно',
    tagRu: 'Ржавчина'
  }
];

export const DEMO_SAMPLE_MAP: Record<string, DemoSample> = DEMO_SAMPLES.reduce((acc, sample) => {
  acc[sample.id] = sample;
  return acc;
}, {} as Record<string, DemoSample>);
