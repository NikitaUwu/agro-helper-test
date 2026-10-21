export type RiskSeverity = 'healthy' | 'moderate' | 'critical';

export type CropId = 'tomato' | 'potato' | 'apple' | 'cucumber' | 'wheat' | 'pepper' | 'strawberry';

export interface TreatmentRecommendations {
  symptoms: string[];
  biological: string[];
  agrotechnical: string[];
  chemical: string[];
}

export interface DiseaseCondition {
  id: string; // e.g. "tomato_late_blight"
  cropId: CropId;
  cropNameRu: string; // "Томат"
  nameRu: string; // "Фитофтороз томатов"
  nameEn: string; // "Late Blight"
  pathogenRu: string; // "Гриб Phytophthora infestans"
  eppoCode?: string;
  isHealthy?: boolean;
  risk: RiskSeverity;
  riskLabelRu: 'Здорово' | 'Умеренно' | 'Критично' | string;
  summaryRu: string;
  targetOrganRu?: string;
  recommendations: TreatmentRecommendations;
  photos: string[]; // paths in /data/plantvillage/...
  hasRealPhotos?: boolean;
  conditionType?: 'disease' | 'pest' | 'healthy';
  contentSources?: { title: string; url: string }[];
}

export interface CropInfo {
  id: CropId;
  nameRu: string;
  scientificName: string;
  eppoCode: string;
  descriptionRu: string;
  diseaseCount: number;
  icon: string;
  healthyConditionId: string;
  riskOverviewRu: string;
  preventionTipsRu: string[];
}

export interface DemoSample {
  id: string;
  cropId: CropId;
  cropNameRu: string;
  titleRu: string;
  expectedConditionId: string;
  imagePath: string;
  confidence?: number;
  risk: RiskSeverity;
  riskLabelRu: string;
  tagRu?: string;
}

export interface JournalEntry {
  id: string;
  timestamp: string;
  formattedDateRu: string;
  cropId: CropId;
  cropNameRu: string;
  conditionId: string;
  conditionNameRu: string;
  risk: RiskSeverity;
  riskLabelRu: string;
  confidence?: number;
  imageSrc: string;
  notes?: string;
  schemaVersion?: 2;
  origin?: 'model_upload' | 'model_sample' | 'catalog' | 'legacy_demo';
  score?: number | null;
  modelRevision?: string;
  policyVersion?: string;
  preprocessingVersion?: string;
}

export type ActiveTab = 'diagnostics' | 'catalog' | 'journal';
