# DINOv2-small Integration Implementation Plan

> Обновление объёма после согласования: реализуются **5 культур / 21 состояние** (томат, картофель, яблоня, сладкий перец, земляника); справочник — **7 культур / 34 состояния**. Остальные культуры расширенного этапа отложены. Реализация и измерения описаны в `PROJECT.md` и `docs/evaluations/2026-10-21-dinov2-benchmark.md`. Ниже сохранён исходный расширенный план исследования.
> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Выполнение в текущем чате одним исполнителем; делегирование только по отдельному запросу пользователя.

**Goal:** Заменить имитацию диагностики настоящим DINOv2-small, сохранив интерфейс и честно ограничив набор культур.

**Architecture:** ONNX INT8 в браузере через WASM/Web Worker; единый реестр меток для frontend/Python; отдельная политика принятия результата и безопасного отказа. Сначала этап A — 3 культуры / 17 состояний, после проверки этап B — 9 культур / 33 состояния. Справочник шире возможностей анализа.

**Tech Stack:** Существующие Next.js 14, React 18, TypeScript, Tailwind; `onnxruntime-web` (стартовая фиксированная версия 1.30.0); Web Worker, Canvas, Cache Storage, localStorage; существующий Python/SQLAlchemy для каталога и оценки.

**Spec:** [Исследование и проект внедрения](../specs/2026-10-21-dinov2-small-integration-design.md). Прочитать перед реализацией; таблица 38 меток и правила UI находятся там.

## Global Constraints

- Сохраняются цвета, шрифты, ширина мобильного контейнера, нижняя навигация, две основные кнопки, сетка 3 колонки, радарная анимация, галерея и четыре вкладки рекомендаций.
- Этап A: 3 культуры / 17 состояний для анализа; 5 культур / 30 состояний в справочнике. Этап B: 9 / 33 и 11 / 46 соответственно.
- Существующие class/crop ID и 25 карточек сохраняются. 13 старых состояний становятся catalog-only, а не удаляются.
- Softmax и top-k всегда по всем 38 классам. Запрещено фильтровать классы перед softmax, перенормировать оставшиеся или заменять неподдерживаемый top1 следующим классом.
- Модельный пакет и Runtime фиксируются ревизией/версией и SHA-256; никакого runtime-запроса к HF `main`.
- Фото пользователя обрабатывается локально; обучение, облачная загрузка и автоматическое пополнение датасета отсутствуют.
- Журнал v1 читается; новая запись имеет schemaVersion 2 и происхождение. Mock-результат не становится модельным после миграции.
- Включение классов зависит от контента и результатов проверки; неподходящее качество не исправляется возвратом к заранее заданному ответу.
- Рабочие изменения пользователя, существующие `.agents/`, `docs/data/` и данные БД сохраняются.

## Review Focus

1. Огурец/неизвестная болезнь могут давать высокий softmax: тестировать global-top1, OOD и ложные принятия на независимых отрицательных примерах (задачи 3, 7).
2. Медленный iPhone или незагруженный WASM: UI остаётся интерактивным, есть отмена и повтор, каталог доступен (задачи 1, 4, 7).
3. Старый журнал с mock confidence: не показывать фиктивную точность и не терять историю (задача 5).
4. Отмена и сразу новая фотография: запоздавший первый результат не меняет второй экран и не попадает в журнал (задача 4).
5. Заполненное localStorage: результат виден, сохранение явно неуспешно, приложение не сообщает «В журнале» (задача 5).

## Состояние перед началом

Исследован HEAD `80543f3`. На 21.10.2026: статический сценарный скрипт 121/121; TypeScript без ошибок; локальный главный экран и справочник открываются. Это не полная регрессия. Python-тесты заблокированы сломанным `.venv`/отсутствующим pytest в комплектном Python. Веса и model inference пока не запускались.

Новые тестовые зависимости нужны во время реализации, а не для чтения плана: Vitest для численного/контрактного кода и Playwright для асинхронного UI. Зафиксировать версии в lockfile; не менять Next/React в рамках подключения модели. Существующий `npm test` сохраняет роль быстрой проверки ресурсов; добавить `test:unit`, `test:e2e`, `test:model`.

## Карта изменений

| Файлы | Назначение |
|---|---|
| `config/model_labels.json` | Все 38 индексов, исходные метки, crop/condition ID, этап доступности |
| `frontend/src/lib/diagnosis/{types,registry,preprocess,policy,client}.ts` | Контракты, проверка реестра, обработка, политика, интерфейс Worker |
| `frontend/src/lib/diagnosis/inference.worker.ts` | Загрузка пакета и реальный ONNX inference вне UI |
| `frontend/public/models/dinov2-small/<revision>/` | ONNX, meta, centroids, configs, manifest, лицензия; появляется при реализации |
| `frontend/public/ort/1.30.0/`, `frontend/scripts/prepare-model.mjs` | Версионированная доставка model/WASM; проверка хешей и лицензий |
| `frontend/src/components/Scanner.tsx`, новый `ScanFeedback.tsx` | Существующий экран, реальное состояние загрузки и анализа |
| `frontend/src/components/DiagnosisResult.tsx`, `frontend/src/app/page.tsx` | Outcome union; разделение анализа/справочника; удаление fallback на первую болезнь |
| `frontend/src/lib/journal.ts`, `frontend/src/components/FieldJournal.tsx` | Чтение legacy, происхождение, запись thumbnail и обработка quota |
| `frontend/src/types/index.ts`, `frontend/src/data/{crops,diseases,demoSamples}.ts` | Возможности анализа, новые карточки, score вместо фиктивной confidence |
| `frontend/src/components/{CropCatalog.tsx,layout/Header.tsx}` | Динамические счётчики и небольшие бейджи доступности |
| `src/plantdb/{seed,ingest,downloader}.py`, `config/taxonomy_seed.json` | Согласование существующего Python-каталога без удаления данных |
| `frontend/tests/unit/`, `frontend/tests/e2e/`, `tests/test_model_registry.py` | Проверки численной логики, UI и общего реестра |
| `docs/evaluations/`, `data/evaluations/` | Отчёты и машиночитаемые результаты отдельно от пользовательского журнала |

## Task 1: Технический spike и воспроизводимый пакет

**Files:** Create `frontend/scripts/prepare-model.mjs`, `frontend/scripts/model-smoke.mjs`, `frontend/public/models/dinov2-small/<revision>/manifest.json`, `frontend/public/ort/1.30.0/`, `docs/evaluations/dinov2-browser-spike.md`, `frontend/vitest.config.ts`. Modify `frontend/package.json`, `frontend/package-lock.json`, `frontend/next.config.mjs`. Test `frontend/tests/e2e/model-smoke.spec.ts`, `frontend/playwright.config.ts`.

**Interfaces:**
- Produces `ModelManifest`: `modelId`, `modelRevision`, `spaceRevision`, `runtimeVersion`, `preprocessingVersion`, `files[{path,sha256,bytes,sourceUrl,license}]`, `labelsCount:38`, `featuresDim:768`, `inputShape:[1,3,224,224]`.
- Produces `npm run prepare:model`, `npm run test:model`: проверка пакета и настоящий browser-inference; не mock.

- [ ] Зафиксировать текущий git diff, скриншоты трёх экранов и выбранные устройства. Сохранить фотографии/журнал пользователя. Использовать чистое тестовое browser storage.
- [ ] Настроить зафиксированные Vitest/Playwright и скрипты `test:unit`, `test:e2e`, `test:model`; существующий `test` оставить проверкой ресурсов. Добавить smoke-тест: пакет должен открываться, вход/выходы и число меток соответствуют manifest; отсутствие ONNX/WASM даёт понятную ошибку. Сначала убедиться, что проверка падает на отсутствующем пакете.
- [ ] Скачать во время реализации ONNX INT8 и конфиги по ревизии `06ebf5e308e100fd000d738c42b059ebb5f58a16`; meta/centroids по `b26e704bd72c2fe05632ea6f7be680a2eca0d8f5`. Сохранить лицензии и хеши. Не скачивать все форматы весов и весь датасет.
- [ ] Ввести фиксированную зависимость ORT 1.30.0; копировать необходимые JS/MJS/WASM из установленного пакета той же версии при prepare/build. Проверить фактические имена файлов пакета вместо копирования только одного предполагаемого WASM.
- [ ] Проверить загрузку в Next.js, dynamic import, Web Worker, WASM с `numThreads=1`; не включать обязательные COOP/COEP/WebGPU. Проверить размеры static assets на целевом Vercel deployment; если конкретный файл превышает лимит выбранного хостинга, вынести только assets в управляемое хранилище с тем же manifest.
- [ ] Запустить реальное вычисление на нескольких лицензированных листьях и постороннем изображении. Измерить cold/warm latency, отдельно download/init, отзывчивость и память на Android/iPhone. Повторный анализ: 30 запусков на устройство.
- [ ] Run `npm run prepare:model`, `npm run test:model`, `npm run build`. Expected: настоящие выходы `[1,38]` и `[1,768]`, корректные хеши, production bundle собирается. Записать результаты в отчёт; совместимость ещё не означает полевую точность.

**Gate:** При неработающем браузерном запуске или неприемлемой скорости остановить расширение UI и оформить конкретное решение по отдельному inference-сервису. Не включать неработающий анализ и не возвращать mock. Все остальные задачи зависят от успешного spike.

## Task 2: Реестр меток, контент и каталог этапа A

**Files:** Create `config/model_labels.json`, `frontend/src/lib/diagnosis/registry.ts`, `frontend/tests/unit/registry.test.ts`, `tests/test_model_registry.py`. Modify `frontend/src/types/index.ts`, `frontend/src/data/crops.ts`, `frontend/src/data/diseases.ts`, `frontend/next.config.mjs`, `frontend/tsconfig.json`, `src/plantdb/seed.py`, `src/plantdb/ingest.py`, `src/plantdb/downloader.py`, `config/taxonomy_seed.json`, `tests/test_schema.py`, `frontend/scripts/test-scenarios.mjs`.

**Interfaces:**
- `ModelLabelMapping`: `index`, `rawLabel`, `modelCropKey`, `cropId: CropId|null`, `conditionId:string|null`, `activation:'A'|'B'|'disabled'`.
- `resolveModelLabel(index:number): ModelLabelMapping` — unknown index вызывает контролируемую ошибку, не возвращает первую карточку.
- `getAnalysisAvailability(conditionId:string, stage:'A'|'B'): 'enabled'|'catalog_only'`.
- У `DiseaseCondition` добавить `conditionType:'disease'|'pest'|'healthy'`, `analysisAvailability`; source metadata для новых фотографий. `CropInfo` сохраняет healthy ID для включаемых культур.

- [ ] Написать проверки всех 38 точных меток/индексов из таблицы spec, уникальности ID, этапов и сохранения существующих 25 ID. Критичные assertions: индекс 0→apple_scab, 35→tomato_yellow_leaf_curl, 37→tomato_healthy; индекс 4→disabled; unknown index не даёт tomato_healthy.
- [ ] Создать общий JSON по таблице spec. Активные классы A — 17, B — 33, disabled — 5. B-классы до добавления карточек не доступны пользовательскому анализу.
- [ ] Настроить import JSON из root `config` в frontend (`experimental.externalDir`, TS include) и проверить Next production build. Python читает тот же файл по пути от корня проекта.
- [ ] Добавить 5 карточек томата, включая pest для клеща, с 4 вкладками и разрешёнными фотографиями. Сверить агрономические названия и источники. Healthy не формулируется как отсутствие патогенов.
- [ ] Отметить 13 прежних состояний catalog-only. Сохранить карточки огурца/пшеницы и все ID. Счётчики вычислять: stage A = 5 культур/30 карточек каталога и 3 культуры/17 состояний анализа.
- [ ] Согласовать Python seed/ingest/downloader/таксономию: только добавление, стабильные UUID и slug, идемпотентный seed. Восстановить отдельное Python dev-окружение с зависимостями из pyproject; не менять реальные данные для теста.
- [ ] Run `npm run test:unit -- registry`, `npm test`, `npm run build`, `python -m pytest tests/test_model_registry.py tests/test_schema.py tests/test_ingest.py`. Expected: новая численность и прежние ID, второй seed не дублирует строки. Обновить старые assertions «ровно 25» до ожидаемого каталога этапа, сохранив проверку старого подмножества.

## Task 3: Обработка изображения и политика результата

**Files:** Create `frontend/src/lib/diagnosis/types.ts`, `preprocess.ts`, `policy.ts`, `frontend/tests/e2e/preprocess.spec.ts`, `frontend/tests/unit/policy.test.ts`, `frontend/tests/fixtures/model/` с разрешёнными изображениями и описанием происхождения. Использовать test runner из задачи 1.

**Interfaces:**
- `preprocessImage(image: ImageBitmap): Float32Array` — NCHW 1×3×224×224 по spec.
- `validateImage(file:Blob): Promise<ImageBitmap>` — разрешены JPEG/PNG/WebP до 10 МиБ и 20 мегапикселей; ошибка формата/декодирования обрабатывается. HEIC, SVG, анимированные форматы в первом внедрении не поддерживать, сообщать об этом по-русски.
- `evaluatePrediction(logits:Float32Array, features:Float32Array, cropId:CropId, context:InferenceContext): DiagnosisOutcome` — union и поля из spec; source/requestId берутся из context.
- `InferenceContext` содержит `requestId`, `source`, `modelRevision`, `preprocessingVersion`, `policyVersion`, `inferenceMs`, `stage`, `centroids`, `thresholds`.

- [ ] Написать браузерные численные тесты в Playwright: RGB, EXIF-поворот в декодере, пропорции landscape/portrait, центрирование, CHW, mean/std; неправильные форматы и размеры дают error. Использовать настоящий Canvas/ImageBitmap, не имитацию Canvas в Node. Canvas и эталон автора на одних PNG дают одинаковые tensor в допустимой погрешности float32 (max absolute error ≤1e-5); PIL/Canvas сравнивается отдельно без обещания идентичности интерполяции.
- [ ] Написать policy-тесты: стабильный softmax больших logits; NaN/Infinity; неправильная форма; нулевой norm; OOD ниже порога; top1 другой культуры; top1 disabled при очень большом score; низкий score; малая разница первых двух; healthy-only класс не даёт accepted.
- [ ] Реализовать подготовку изображения как у автора, с RGB/ориентацией до resize. Прозрачность PNG сводить на белый фон, фиксировать preprocessingVersion. Полный снимок не заменять кадрированным thumbnail для вычисления.
- [ ] Реализовать cosine по всем нормированным центроидам и softmax всех 38 logits. При отсутствии/ошибке centroids — error, а не отключение OOD. Проверить byteLength centroids = 116736 и размер meta.labels=38.
- [ ] Вынести экспериментальные пороги в versioned policy: score 0.85, margin 0.20, OOD 0.699429452419281. Применять порядок из spec. Экспериментальный статус сохранять до независимой проверки.
- [ ] Run `npm run test:unit -- policy`, `npm run test:e2e -- preprocess`. Expected: подготовка проверена в браузере; высокий score не обходит OOD/disabled/mismatch; неподдерживаемый top1 не заменяется следующим; отсутствует fallback на произвольную болезнь.

## Task 4: Worker и настоящий Scanner в существующем экране

**Files:** Create `frontend/src/lib/diagnosis/client.ts`, `inference.worker.ts`, `frontend/src/components/ScanFeedback.tsx`, `frontend/tests/e2e/scanner.spec.ts`. Modify `frontend/src/components/Scanner.tsx`, `frontend/src/data/demoSamples.ts`, `frontend/src/app/page.tsx`.

**Interfaces:**
- `analyzeLeaf(request:DiagnosisRequest, onProgress:(event:AnalysisProgress)=>void, signal:AbortSignal): Promise<DiagnosisOutcome>`.
- `AnalysisProgress`: `phase:'loading'|'preparing'|'analyzing'`, необязательные loaded/total; процента inference нет.
- `ScannerProps.onScanComplete(outcome:DiagnosisOutcome, previewUrl:string): void`.

- [ ] Добавить UI-проверки: образец и файл вызывают один engine; engine не получает expectedConditionId; при обрыве сети/нет WASM есть повтор; отменённый запрос не появляется позднее; быстрый новый снимок не получает старый результат.
- [ ] Реализовать ленивую сессию в Worker; повторно использовать её. Передавать Blob/пиксели без полной base64-копии; закрывать ImageBitmap, отзывать preview URL при освобождении. Ограничить одним активным запросом.
- [ ] Cache Storage по ревизии с проверкой manifest/hash; ошибка cache не блокирует сеть. Частичная загрузка не становится валидным пакетом. Retry после ошибки загрузки создаёт новую попытку.
- [ ] В Scanner добавить компактный выбор культуры и отдельные inputs камеры/загрузки. Для образца crop берётся из метаданных образца, disease/score — только от модели. Неподдерживаемые огурец/пшеница имеют пояснение и ссылку в справочник.
- [ ] Сохранить радар и карточки; удалить двухсекундный таймер, targetConditionId/targetConfidence и фиктивные стадии сегментации. Достоверные фазы и cancel показываются в прежнем блоке. Изменить обещание «за 2 секунды».
- [ ] Run `npm run test:e2e -- scanner`, `npm run test:model`. В E2E детерминированно подменяется транспорт Worker для всех состояний; отдельный test:model обязательно использует настоящие веса. Expected: загрузка, success, отказ, ошибка, отмена проверены; UI не зависает.

## Task 5: Результат, справочник и совместимый журнал

**Files:** Create `frontend/src/lib/journal.ts`, `frontend/tests/unit/journal.test.ts`, `frontend/tests/e2e/result-journal.spec.ts`. Modify `frontend/src/types/index.ts`, `frontend/src/app/page.tsx`, `frontend/src/components/DiagnosisResult.tsx`, `FieldJournal.tsx`, `CropCatalog.tsx`, `layout/Header.tsx`.

**Interfaces:**
- `readJournal(): JournalEntryV2[]` — принимает старый JSON-array, валидирует записи, неизвестные не превращает в случайную карточку; не перезаписывает storage при чтении.
- `writeJournal(entries:JournalEntryV2[]): {ok:true}|{ok:false,reason:'quota'|'unavailable'}`.
- `createJournalThumbnail(image:Blob): Promise<string>` — JPEG ≤80 КиБ, длинная сторона ≤640 px.
- `JournalEntryV2`: прежние идентификаторы/даты/preview + `schemaVersion:2`, `origin:'model_upload'|'model_sample'|'catalog'|'legacy_demo'`, `score:number|null`, optional modelRevision/policyVersion/preprocessingVersion; старую confidence можно сохранить как legacy-метаданные без отображения как score.
- `DiagnosisResult` получает discriminated context `analysis | catalog | journal`; fake default confidence отсутствует.

- [ ] Проверить loader на старых 25 ID, битом JSON, неизвестном condition ID; legacy confidence не показывается. Проверить quota и unavailable storage: никакого ложного saved=true.
- [ ] В page.tsx убрать оба `|| DISEASES[0]` и фиксированные 95/96%. Неизвестная карточка → понятный недоступный результат. Справочник открывается без model score и без auto-save как анализа.
- [ ] Для accepted показывать снимок пользователя первым, остальные галерейные фото с подписью «Пример из справочника». Сохранить 4 вкладки и дизайн. Для uncertain/error использовать ScanFeedback без установленного риска и лечебного назначения.
- [ ] Разделить болезнь/пест/healthy. Счётчики показывают корректные единицы. Healthy-text и «Оценка модели» — точно по spec; краткая подсказка поясняет, что процент не равен клинически подтверждённой точности.
- [ ] Ввести новый журнал с прежним storage key и происхождением. Автоматически сохранять только accepted, один раз на requestId; manual bookmark из справочника — origin=catalog, score=null. Не пересчитывать старые записи новым движком при открытии.
- [ ] Показать catalog-only бейджи, динамические счётчики и источник лицензии. Каталог/журнал доступны, даже когда пакет модели не загрузился. Сохранить прежние поиск, фильтры, возврат и удаление записей.
- [ ] Run `npm run test:unit -- journal`, `npm run test:e2e -- result-journal`, `npm test`, `npm run build`. Expected: журнал сохраняет историю и честно сообщает об ошибке; карточка каталога не выдаётся за результат модели.

## Task 6: Контент и включение культур этапа B

**Files:** Modify `frontend/src/types/index.ts`, `frontend/src/data/crops.ts`, `frontend/src/data/diseases.ts`, `frontend/src/components/CropCatalog.tsx`, `src/plantdb/seed.py`, `src/plantdb/downloader.py`, `config/taxonomy_seed.json`; Create `frontend/public/data/attribution.json`, изображения 16 новых карточек; Modify unit registry tests и Python seed tests.

**Interfaces:** Новые CropId: `pepper`, `grape`, `corn`, `strawberry`, `cherry`, `peach`; новые condition ID — строго таблица 38 меток spec. Реестр и политика используют stage B без перенумерации выходов.

- [ ] Добавлять пакетами: перец+земляника, виноград, кукуруза, вишня/черешня+персик. Для каждого проверить русские названия, healthy, 4 вкладки, права фото; не переносить препараты между возбудителями автоматически.
- [ ] Сохранить прежний горизонтальный ряд фильтров; добавить иконки в существующий механизм без новой навигации. Не добавлять disabled 5 культур модели в список доступного анализа.
- [ ] Привязать каждый публичный снимок к автору/URL/лицензии/изменениям в attribution manifest. Отсутствующий снимок не маскировать чужой культурой. Проверить существующие catalog assets при их публичном использовании.
- [ ] Применить идемпотентное добавление Python seed и таксономии, без удаления 25 прежних ID. Проверить использование общего реестра ingest/downloader.
- [ ] Run registry/unit/seed checks; ожидаемо 11 культур/46 карточек, в них 33 анализа и 13 catalog-only; 9 анализируемых культур. Сверить отсутствие fake healthy для Orange/Squash и отсутствующих больных классов голубики/малины/сои.

**Gate:** Наличие записей в каталоге не включает распознавание автоматически. Для каждой новой культуры пройти задачу 7; начать оценку этапа A можно до подготовки B.

## Task 7: Независимая оценка и решение о пилоте

**Files:** Create `frontend/scripts/evaluate-model.mjs`, `docs/evaluations/dinov2-small-pilot.md`, `data/evaluations/<run-id>/{manifest,calibration,test,predictions,metrics}.json`; Modify `frontend/package.json` для скрипта `evaluate:model`; при необходимости `frontend/src/lib/diagnosis/policy.ts` и versioned policy JSON. Изменений SQL-схемы не требуется.

**Interfaces:** Eval row: `imageId`, `source`, `license`, `groupId`, `split`, `trueConditionId|null`, `trueCropId|null`, `isSupported`, `rawTop3`, `score`, `oodSimilarity`, `status`, `reason`, `modelRevision`, `policyVersion`, `preprocessingVersion`, `inferenceMs`.

- [ ] Отделить 60 существующих PlantVillage-картинок и образцы автора как integration set с возможным пересечением обучения. Не включать их в независимый полевой test.
- [ ] Собрать отдельные разрешённые calibration/test по группам листьев и источников. Нижняя цель test этапа A: 20 на каждый из 17 классов + ≥100 out-of-scope; calibration отдельно. Для B добавить соответствующее покрытие новых культур. Нехватка открытых независимых данных фиксируется, а не заполняется неизвестными по правам картинками.
- [ ] Запускать evaluate-model через управляемый Playwright-браузер с тем же preprocess/Worker/ONNX и runtime-пакетом, что использует приложение. Node-скрипт управляет прогоном и сохраняет JSON; не подменять обработку Sharp/PIL с незаметным изменением входного тензора.
- [ ] На calibration выбрать score/margin/OOD; зафиксировать policyVersion и затем один раз оценить frozen test. При изменении порогов по test сформировать новый независимый test либо явно признать прежний calibration.
- [ ] Отчёт: accepted precision по каждой культуре, coverage, precision healthy, ошибки «больной→healthy», ложные принятия по типам отрицательных примеров, confusion matrix, top1/top3, числа и 95% интервалы. Доля отклонений показывается отдельно от ошибок классификации.
- [ ] Сопоставить с воротами spec: ≥90% precision accepted по культуре, ≥50% coverage, ≥95% precision accepted healthy, ≤5% ложного принятия out-of-scope. При малой выборке не делать уверенный вывод; неподходящий класс/культура остаётся experimental или catalog-only.
- [ ] Повторить latency по утверждённым телефонам и браузерам; p95 warm ≤5с — цель, cold отдельно. Проверить память, живость UI, отсутствие отправки пользовательского фото по сети.
- [ ] Run `npm run evaluate:model -- --split test --policy <frozen-policy-path>`; expected: воспроизводимый отчёт с hashes и revision, без подбора порогов на test. Результат может быть «не готов к публичному пилоту»; это допустимый технический вывод.

## Task 8: Регрессия интерфейса, документация и выпуск

**Files:** Modify `PROJECT.md`, `frontend/scripts/test-scenarios.mjs`, `frontend/package.json`, фактически используемый `vercel.json`; Create/Update `docs/evaluations/dinov2-small-release-check.md` и уведомления лицензий в model package.

**Interfaces:** Release идентифицируется `appCommit + modelRevision + spaceRevision + runtimeVersion + policyVersion + labelRegistryVersion`. Feature flag `NEXT_PUBLIC_LEAF_ANALYSIS_STAGE=off|A|B`; `off` показывает недоступность анализа при работающем справочнике/журнале, не включает mock.

- [ ] Проверить 360/390/430px и desktop: прежняя рамка, 3 вкладки, 3 колонки образцов, 4 вкладки рекомендаций, без горизонтального переполнения новых подписей. Снять сравнительные скриншоты с исходными.
- [ ] Пройти настоящий upload, образец, повторный снимок, отмену, error/uncertain, перезагрузку и открытие журнала, catalog-only болезнь, поиск и фильтры. Для критичных error/race/quota воспроизвести тестовыми средствами.
- [ ] Проверить чистый install/build из lockfile, доставку ONNX/WASM и MIME, cache/version mismatch, исходные лицензии и видимые attribution links. Развёртывание на Vercel не требует Python для browser inference.
- [ ] Run `npm test`, `npm run test:unit`, `npm run test:e2e`, `npm run test:model`, `npm run build`, `python -m pytest`. Expected: checks проходят; неработающий Python environment сначала восстановлен, его ошибка не выдаётся за успех тестов.
- [ ] Обновить PROJECT по фактическим файлам, описать разрешённые культуры/состояния, реальные ограничения, результаты benchmark и порядок воспроизведения. Удалить утверждения о несуществующих тестах и фиктивной скорости.
- [ ] Выпускать stage A/B только в объёме пройденных quality gates. До подтверждения качества маркировать анализ экспериментальным. Откат: выключить analysis flag/вернуть предыдущую версию пакета и policy; журнал и справочник остаются читаемыми. Не возвращать фиктивные диагнозы.

## Контроль полноты плана

- Реальное текущее состояние → таблица исследования и baseline.
- Культуры/состояния и полные 38 labels → spec §3–4, задачи 2/6.
- Сохранение UI → spec §7, задачи 4/5/8.
- Честные результаты и отказ → задачи 3/4/5.
- Совместимость Python/БД/журнала → задачи 2/5/6.
- Производительность/права/независимое качество → задачи 1/6/7/8.

### Фактическое выполнение 21.10.2026

Подключены настоящие ONNX/WASM и Worker, общий реестр 38 выходов/21 доступного состояния, пять культур, отказ при недостаточной уверенности/неподдерживаемом классе, upload и образцы, совместимый журнал с миниатюрами, девять дополнительных карточек. Существующие интерфейс, записи и огурец/пшеница в справочнике сохранены. Сборка, численные/браузерные/Python проверки выполнены; результаты и методика — в `docs/evaluations/2026-10-21-dinov2-benchmark.md`.

Чекбоксы выше сохранены как исходный проект плана: они включают также невыполненные требования публичного выпуска. По факту используется статический classic Worker вместо bundler dynamic import, `vitest.config.mts`, один экспериментальный режим пяти культур вместо стадий A/B и внешнего feature flag. Переключение режима при откате требует возврата проверенной версии приложения; старые mock-диагнозы не используются. SQL-схема не менялась, справочник БД дополнен с резервной копией.

Независимая полевая выборка/calibration, реальные телефоны/Safari, публичный Vercel deployment и подтверждение прав на старые сторонние фотографии не выполнены. Локальные три прогона PlantVillage проверяют интеграцию и скорость desktop; они не закрывают ворота полевой точности. Проверка файлов из чистого Git-снимка прошла, но дополнительный `npm ci` в этой копии прерван из-за нехватки места; работающая локальная production-сборка проверена. Независимый review: важное замечание о воспроизводимости исправлено; несущественное смещение рамки выбранной миниатюры справочника при наличии загруженного фото отложено (основное фото переключается правильно).
