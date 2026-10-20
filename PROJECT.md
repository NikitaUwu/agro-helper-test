# Project: «Помощник агронома» (Agronomist Assistant)

## Architecture
- **Framework**: Next.js 14+ (App Router), React 18/19, TypeScript
- **Styling**: Tailwind CSS (mobile-first, Plantix agro color palette, dynamic viewport units `100dvh`)
- **Icons**: Lucide React
- **Client Storage**: `localStorage` (`agronomist_field_journal_v1`) with zero external DB dependencies
- **Asset Serving**: `frontend/public/data/plantvillage/` for 60 real CC BY-SA 3.0 leaf photos
- **Testing**: Playwright / Vitest automated test suite covering all 4 user scenarios

### Data Flow
1. **User Input / Demo Sample** → **Scanner Engine** (multi-phase animation: grid, radar sweep, analysis 1.8-2.3s).
2. **Diagnosis Result** → Matched with `frontend/src/data/diseases.ts` (confidence %, pathogen, risk badge).
3. **Auto-Save** → Synced to `localStorage` journal record (`JournalEntry`).
4. **Disease Card** → 4-tab breakdown (Симптомы, Био-защита, Агротехника, Препараты).
5. **Catalog** → 5 crops (томат, картофель, огурец, яблоня, пшеница) with pill filter & search.
6. **Field Journal** → Chronological history with reopen, view, and delete capabilities.

---

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Mobile-First Responsive Layout | 360-430px smartphone layout up to desktop (1280px+), safe-area insets, dvh units | M1 | R1 |
| 2 | 100% Russian UI Localization | Complete Russian UI text, agricultural terminology, no English placeholders | M1 | R1 |
| 3 | Plantix Visual Design System | Agro natural palette (emerald/green/slate), status badges (Здорово / Умеренно / Критично) | M1 | R1 |
| 4 | Bottom Navigation Bar | 3 primary tabs: Диагностика, Справочник, Полевой журнал with active indicators | M1 | R1 |
| 5 | PlantVillage Photos Integration | 60 open photos (Apple, Potato, Tomato) integrated into public web assets | M1 | R3 |
| 6 | 5-Crop Taxonomy & Knowledge Base | Data for Tomato, Potato, Apple, Cucumber, Wheat with symptoms & treatments | M1 | R3 |
| 7 | Curated Leaf Sample Presets | 9 ready-to-test leaf samples (3 tomato, 3 potato, 3 apple) for 1-click testing | M1 | R2.1 |
| 8 | Photo Upload & Camera Capture | Custom photo upload with client-side preview and file validation | M2 | R2.1 |
| 9 | Interactive Radar Scanner | Multi-phase radar/grid scanning animation with realistic ~2s analysis delay | M2 | R2.1 |
| 10 | Diagnosis Screen | Disease title, pathogen, confidence %, risk badge, and actionable alerts | M2 | R2.1 |
| 11 | Disease Card & Symptoms Gallery | Full leaf photo gallery with real damage samples | M2 | R2.2 |
| 12 | 4 Treatment Tabs | Симптомы, Биологический контроль, Агротехника, Препараты | M2 | R2.2 |
| 13 | Crop Catalog & Filter | 5 crops filterable with disease cards and healthy states | M3 | R2.3 |
| 14 | Agronomist Prevention Tips | Seasonal prevention and agronomist pro-tips for each crop | M3 | R2.3 |
| 15 | Field Journal Auto-Save | Automatic persistent saving of every diagnosis to localStorage | M3 | R2.4 |
| 16 | Field Journal History List | Date, crop, diagnosis status, risk badge, thumbnail, and entry deletion | M3 | R2.4 |
| 17 | Reopen Past Diagnosis | Ability to tap past entry and reopen full disease & recommendation card | M3 | R2.4 |
| 18 | E2E Testing Suite | Playwright/Vitest automated tests verifying all 4 scenarios across Tiers 1-4 | M4 | R4 |
| 19 | Build & Type Checking | Clean `npm.cmd run build` with zero TypeScript errors or warnings | M5 | R4 |
| 20 | Vercel Deployment & Git | `vercel.json` configuration, build scripts, and git commit | M5 | R5 |

---

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Frontend Foundation, Design System & Data Assets | Next.js App Router, Tailwind, mobile frame, bottom nav, PlantVillage images, taxonomy data | none | IN_PROGRESS |
| M2 | Express Diagnostics & Disease Details (Scenarios 1 & 2) | Photo upload/samples, radar scanner, diagnosis screen, 4-tab disease recommendations | M1 | PLANNED |
| M3 | Knowledge Catalog & Field Journal (Scenarios 3 & 4) | 5 crops catalog, filter, tips, localStorage field journal (auto-save, reopen, delete) | M1, M2 | PLANNED |
| M4 | E2E Testing Suite (Tiers 1-4) | Comprehensive automated tests for all 4 scenarios, test runner, TEST_READY.md | M1-M3 | PLANNED |
| M5 | Final Milestone & Delivery | Pass 100% tests, adversarial hardening, clean build, git commit, vercel.json | M1-M4 | PLANNED |

---

## Interface Contracts

### 1. Data Model (`frontend/src/types/index.ts`)
```typescript
export type RiskSeverity = 'healthy' | 'moderate' | 'critical'; // Здорово | Умеренно | Критично

export interface TreatmentRecommendations {
  symptoms: string[];
  biological: string[];
  agrotechnical: string[];
  chemical: string[];
}

export interface DiseaseCondition {
  id: string; // e.g. "tomato_late_blight"
  cropId: 'tomato' | 'potato' | 'apple' | 'cucumber' | 'wheat';
  cropNameRu: string; // "Томат", etc.
  nameRu: string; // "Фитофтороз томатов"
  pathogenRu: string; // "Гриб Phytophthora infestans"
  risk: RiskSeverity;
  riskLabelRu: 'Здорово' | 'Умеренно' | 'Критично';
  summaryRu: string;
  recommendations: TreatmentRecommendations;
  photos: string[]; // paths in /data/plantvillage/ or /samples/
}

export interface DemoSample {
  id: string;
  cropId: 'tomato' | 'potato' | 'apple';
  cropNameRu: string;
  titleRu: string;
  expectedConditionId: string;
  imagePath: string;
  confidence: number; // e.g. 96
}

export interface JournalEntry {
  id: string; // UUID or timestamp
  timestamp: string; // ISO string
  formattedDateRu: string; // "19 октября 2026, 12:30"
  cropId: string;
  cropNameRu: string;
  conditionId: string;
  conditionNameRu: string;
  risk: RiskSeverity;
  confidence: number;
  imagePreview: string; // base64 or static url
  notes?: string;
}
```

### 2. State & Storage API (`frontend/src/lib/journal.ts`)
```typescript
export function getJournalEntries(): JournalEntry[];
export function saveJournalEntry(entry: Omit<JournalEntry, 'id' | 'timestamp' | 'formattedDateRu'>): JournalEntry;
export function deleteJournalEntry(id: string): void;
export function clearJournal(): void;
```

---

## Code Layout
```
c:\Users\nikit\Desktop\Помощник агронома\
├── PROJECT.md
├── vercel.json
├── config/
│   └── taxonomy_seed.json
├── data/
│   └── downloads/plantvillage/
└── frontend/
    ├── package.json
    ├── tsconfig.json
    ├── tailwind.config.ts
    ├── next.config.mjs
    ├── vercel.json
    ├── public/
    │   ├── data/plantvillage/
    │   └── samples/
    ├── src/
    │   ├── types/
    │   │   └── index.ts
    │   ├── data/
    │   │   ├── crops.ts
    │   │   ├── diseases.ts
    │   │   └── demoSamples.ts
    │   ├── lib/
    │   │   └── journal.ts
    │   ├── components/
    │   │   ├── layout/
    │   │   │   ├── Header.tsx
    │   │   │   ├── BottomNav.tsx
    │   │   │   └── MobileFrame.tsx
    │   │   ├── diagnosis/
    │   │   │   ├── ImageUploader.tsx
    │   │   │   ├── DemoGallery.tsx
    │   │   │   ├── RadarScanner.tsx
    │   │   │   └── DiagnosisResult.tsx
    │   │   ├── disease/
    │   │   │   ├── DiseaseCard.tsx
    │   │   │   └── RecommendationTabs.tsx
    │   │   ├── catalog/
    │   │   │   ├── CropFilter.tsx
    │   │   │   └── KnowledgeCatalog.tsx
    │   │   └── journal/
    │   │       ├── JournalList.tsx
    │   │       └── JournalItem.tsx
    │   └── app/
    │       ├── layout.tsx
    │       ├── page.tsx
    │       └── globals.css
    └── tests/
        └── e2e/
            ├── diagnosis.spec.ts
            ├── disease-card.spec.ts
            ├── catalog.spec.ts
            └── journal.spec.ts
```
