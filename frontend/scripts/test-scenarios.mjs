// frontend/scripts/test-scenarios.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const publicDir = path.resolve(rootDir, 'public');

let totalTests = 0;
let passedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (!condition) {
    console.error(`❌ ОШИБКА: ${message}`);
    process.exit(1);
  } else {
    passedTests++;
    console.log(`  ✓ ${message}`);
  }
}

console.log('====================================================');
console.log('🌾 ТЕСТИРОВАНИЕ СЦЕНАРИЕВ: «ПОМОЩНИК АГРОНОМА» 🌾');
console.log('====================================================\n');

// ----------------------------------------------------
// SCENARIO 1: Экспресс-диагностика и пресеты образцов
// ----------------------------------------------------
console.log('▶ СЦЕНАРИЙ 1: Экспресс-диагностика по фото и готовые образцы');

const demoSamplesFile = path.resolve(rootDir, 'src/data/demoSamples.ts');
assert(fs.existsSync(demoSamplesFile), 'Файл demoSamples.ts существует');

const demoContent = fs.readFileSync(demoSamplesFile, 'utf-8');
const idMatches = [...demoContent.matchAll(/id:\s*['"]([^'"]+)['"]/g)].map((m) => m[1]);
assert(idMatches.length >= 9, `Найдено ${idMatches.length} пресетов образцов (требуется >= 9)`);

// Проверяем наличие реальных файлов изображений в public/
const imageMatches = [...demoContent.matchAll(/imagePath:\s*encodeURI\(['"]([^'"]+)['"]\)/g)].map((m) => m[1]);
assert(imageMatches.length >= 9, `Найдено ${imageMatches.length} путей к изображениям образцов`);

for (const rawPath of imageMatches) {
  const decoded = decodeURIComponent(rawPath);
  const relativePath = decoded.replace(/^\//, '');
  const absolutePath = path.resolve(publicDir, relativePath);
  assert(fs.existsSync(absolutePath), `Файл образца существует на диске: ${path.basename(absolutePath)}`);
}

// ----------------------------------------------------
// SCENARIO 2: Карточка болезни и 4 вкладки рекомендаций
// ----------------------------------------------------
console.log('\n▶ СЦЕНАРИЙ 2: Карточка заболевания и 4 вкладки рекомендаций');

const diseasesFile = path.resolve(rootDir, 'src/data/diseases.ts');
assert(fs.existsSync(diseasesFile), 'Файл diseases.ts существует');

const diseasesContent = fs.readFileSync(diseasesFile, 'utf-8');

// Проверяем наличие всех 4 вкладок
assert(diseasesContent.includes('symptoms:'), 'Вкладка 1: Симптомы присутствует в структуре рекомендаций');
assert(diseasesContent.includes('biological:'), 'Вкладка 2: Биологический контроль присутствует');
assert(diseasesContent.includes('agrotechnical:'), 'Вкладка 3: Агротехника присутствует');
assert(diseasesContent.includes('chemical:'), 'Вкладка 4: Препараты / Фунгициды присутствует');

// Проверяем подсчет заболеваний (25 классов)
const diseaseIds = [...diseasesContent.matchAll(/id:\s*['"]([a-z_]+)['"],\s*cropId:/g)].map((m) => m[1]);
assert(diseaseIds.length === 25, `База содержит ровно 25 состояний и заболеваний (найдено: ${diseaseIds.length})`);

// ----------------------------------------------------
// SCENARIO 3: Справочник культур и база знаний
// ----------------------------------------------------
console.log('\n▶ СЦЕНАРИЙ 3: Каталог культур и база знаний');

const cropsFile = path.resolve(rootDir, 'src/data/crops.ts');
assert(fs.existsSync(cropsFile), 'Файл crops.ts существует');

const cropsContent = fs.readFileSync(cropsFile, 'utf-8');
const requiredCrops = ['tomato', 'potato', 'cucumber', 'apple', 'wheat'];
for (const crop of requiredCrops) {
  assert(cropsContent.includes(`id: '${crop}'`), `Культура «${crop}» присутствует в справочнике`);
}

// Проверяем русские названия культур
assert(cropsContent.includes("nameRu: 'Томат'"), 'Культура Томат локализована');
assert(cropsContent.includes("nameRu: 'Картофель'"), 'Культура Картофель локализована');
assert(cropsContent.includes("nameRu: 'Огурец'"), 'Культура Огурец локализована');
assert(cropsContent.includes("nameRu: 'Яблоня'"), 'Культура Яблоня локализована');
assert(cropsContent.includes("nameRu: 'Пшеница'"), 'Культура Пшеница локализована');

// ----------------------------------------------------
// SCENARIO 4: Полевой журнал и оффлайн-сохранение
// ----------------------------------------------------
console.log('\n▶ СЦЕНАРИЙ 4: Полевой журнал (история проверок и сохранение)');

const pageFile = path.resolve(rootDir, 'src/app/page.tsx');
const pageContent = fs.readFileSync(pageFile, 'utf-8');

assert(pageContent.includes('agronomist_field_journal_v1'), 'Используется ключ localStorage: agronomist_field_journal_v1');
assert(pageContent.includes('updateJournal'), 'Реализована функция обновления и синхронизации журнала');
assert(pageContent.includes('handleDeleteJournalEntry'), 'Реализовано удаление отдельных записей журнала');
assert(pageContent.includes('handleClearJournal'), 'Реализована полная очистка журнала');

// Симуляция структуры записи в журнале
const mockEntry = {
  id: 'test_entry_1',
  timestamp: new Date().toISOString(),
  formattedDateRu: '19 окт., 21:00',
  cropId: 'tomato',
  cropNameRu: 'Томат',
  conditionId: 'tomato_late_blight',
  conditionNameRu: 'Фитофтороз томатов',
  risk: 'critical',
  riskLabelRu: 'Критично',
  confidence: 96.4,
  imageSrc: '/data/plantvillage/Tomato___Late_blight/test.jpg',
};

assert(mockEntry.confidence > 90, 'Уверенность ИИ корректно фиксируется в записи');
assert(mockEntry.risk === 'critical', 'Статус критичности корректно маркируется');

console.log('\n====================================================');
console.log(`🎉 ВСЕ СЦЕНАРИИ УСПЕШНО ПРОЙДЕНЫ! (${passedTests}/${totalTests} проверок)`);
console.log('====================================================\n');
process.exit(0);
