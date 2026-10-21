import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = path.resolve(import.meta.dirname, '../..');
const number = value => value.toLocaleString('ru-RU', { maximumFractionDigits: 2 });
const percent = value => `${number(value * 100)}%`;
const wilson = (successes, total) => {
  const z = 1.96, p = successes / total, denominator = 1 + z*z/total;
  const center = (p + z*z/(2*total))/denominator;
  const width = z*Math.sqrt(p*(1-p)/total + z*z/(4*total*total))/denominator;
  return `${percent(center-width)}–${percent(Math.min(1,center+width))}`;
};

export async function writeBenchmarkReport(metrics) {
  const overall = metrics.overall;
  const runs = metrics.runs.map(run => `| ${run.run} | ${run.count} | ${run.correctTop1} | ${percent(run.top1Accuracy)} | ${number(run.meanTotalMs)} | ${number(run.p95TotalMs)} | ${run.acceptedCount} |`).join('\n');
  const crops = metrics.crops.map(crop => `| ${{tomato:'Томат',potato:'Картофель',apple:'Яблоня',pepper:'Сладкий перец',strawberry:'Земляника'}[crop.cropId]} | ${crop.count} | ${crop.correctTop1} | ${percent(crop.top1Accuracy)} | ${crop.acceptedCount} | ${number(crop.meanTotalMs)} |`).join('\n');
  const body = `# DINOv2-small: измерения внедрения

Дата: ${metrics.finishedAt}. Режим приложения: экспериментальный. Это проверка на **PlantVillage**, а не независимая оценка полевой точности.

## Итог

- 315 разных файлов, 21 состояние, 5 культур; три непересекающихся прогона по 105 файлов.
- Правильный глобальный top1: **${overall.correctTop1}/${overall.count}, ${percent(overall.top1Accuracy)}**. Top3: ${percent(overall.top3Accuracy)}.
- Среднее время готового pipeline после загрузки модели: **${number(overall.meanTotalMs)} мс**; собственно ONNX: ${number(overall.meanInferenceMs)} мс; медиана ${number(overall.p50TotalMs)} мс, p95 ${number(overall.p95TotalMs)} мс.
- Принято приложением ${overall.acceptedCount}/${overall.count} (${percent(overall.coverage)}); верно среди принятых ${overall.acceptedCorrect}/${overall.acceptedCount} (${percent(overall.acceptedPrecision)}). Остальные ${overall.count-overall.acceptedCount} — отказ, а не подтверждённая болезнь.
- Холодный запуск с загрузкой по localhost: ${number(metrics.coldStart.totalMs)} мс, из них инициализация ${number(metrics.coldStart.initializationMs)} мс. Это не оценка времени загрузки по мобильному интернету.
- Ошибок выполнения: ${overall.errorCount}; ошибок страницы: ${metrics.pageErrors.length}. Пять синтетических однотонных изображений: ${metrics.syntheticNegatives.filter(item=>item.status==='uncertain').length}/5 отказов.

## Три прогона

| Прогон | Снимков | Верный top1 | Доля верных | Среднее, мс | p95, мс | Принято |
|---|---:|---:|---:|---:|---:|---:|
${runs}

Средняя доля верных по трём равным прогонам совпадает с общей: ${percent(overall.top1Accuracy)}. Score/softmax не используется как замена измеренной точности.

## По культурам

| Культура | Снимков | Верный top1 | Доля верных | Принято | Среднее, мс |
|---|---:|---:|---:|---:|---:|
${crops}

Accepted healthy: ${metrics.healthy.acceptedHealthy}, ошибочных переводов больного листа в accepted healthy: ${metrics.healthy.falseHealthy} в этой выборке. Нулевое число обнаруженных ошибок не означает отсутствия таких ошибок в эксплуатации.

Для понимания размера выборки: приблизительный 95% интервал Wilson для top1 ${wilson(overall.correctTop1, overall.count)}, для accepted precision ${wilson(overall.acceptedCorrect, overall.acceptedCount)}. Биномиальная формула условна: связанные фотографии одного листа и пересечение с обучением могут нарушать независимость наблюдений. Эти интервалы не оценивают качество на новых полевых данных.

## Условия и метод

- ${metrics.environment.cpu}; Windows ${metrics.environment.release}; Chromium ${metrics.environment.browser}; ${metrics.environment.backend}.
- Модель ${metrics.version.model}; policy ${metrics.version.policy}; preprocess ${metrics.version.preprocessing}.
- На каждый класс 15 файлов, выбранных по SHA-256 имени с seed dinov2-pilot-v1; по 5 файлов на класс в каждом прогоне. Дополнительные 2 фото на класс идут в галерею, а не benchmark.
- Исходный [PlantVillage](https://github.com/spMohanty/PlantVillage-Dataset), авторы Hughes и Salathé; сохранены исходные ссылки, blob SHA и SHA-256. Ревизия manifest: ${metrics.environment.datasetManifestSha256}.
- Все предсказания вычислены настоящим ONNX INT8 в браузерном Worker, той же функцией analyzeLeaf и тем же preprocess/policy, что использует приложение. Известная культура передаётся так же, как выбор пользователя; softmax глобальный по 38 классам, без обрезания до культуры.
- Время pipeline начинается после получения Blob и включает decode, предобработку, worker-inference и принятие решения. Выбор файла, отображение React и запись журнала в это число не входят.
- Перед основными прогонами выполнен один cold/warmup-запуск, не включённый в среднее.
- Исходные пороги не подбирались по результатам этих прогонов. Отдельной полевой calibration-выборки не было.

## Ограничения выводов

Модель обучена на PlantVillage. Принадлежность выбранных файлов авторским train/test-группам неизвестна; часть снимков могла использоваться при обучении. Поэтому ${percent(overall.top1Accuracy)} — измеренная доля правильных ответов на этой выборке, **не доказательство точности на новых листьях или в поле**. Группировка по отдельным физическим листьям не подтверждена.

Синтетические цвета проверяют лишь простейший отказ. Они не заменяют неизвестные болезни, дефициты питания, смешанные поражения, огурец и пшеницу. Реальные Android/iPhone/Safari и скорость мобильной сети аппаратно не измерялись. Для публичных заявлений о полевой точности нужны отдельные разрешённые и экспертно проверенные calibration/test-данные.

## Проверки приложения

Отдельно при внедрении 21.10.2026 production-сборка прошла. Проверены: 12 E2E (включая настоящий upload и сохранение после reload), 12 unit, 357 структурных/ресурсных assertions, проверка SHA-256 модельного пакета, 12 Python-тестов. Viewports: 360, 390, 430 и 1280 px. Через браузер дополнительно проверены реальное распознавание образца и отсутствие ошибок console. Сам benchmark эти наборы тестов не запускает.

## Воспроизведение и подробные данные

В frontend: npm ci; node scripts/prepare-evaluation.mjs; npm run evaluate:model. Нужен доступ к исходным открытым файлам для первой подготовки.

В Git сохранены [сводка](2026-10-21-dinov2-benchmark.json), [точный список 315 файлов](2026-10-21-plantvillage-manifest.json) и [индивидуальные предсказания](2026-10-21-dinov2-predictions.json). Подготовка использует неизменяемую ревизию PlantVillage и сверяет SHA-256 и Git blob SHA каждого скачанного или кэшированного снимка. Файлы изображений и рабочие копии результатов в data/evaluations/plantvillage-dinov2 не входят в Git. Повторный запуск меняет времена и записывает новый отчёт.
`;
  await fs.mkdir(path.join(root, 'docs/evaluations'), { recursive: true });
  await fs.writeFile(path.join(root, 'docs/evaluations/2026-10-21-dinov2-benchmark.md'), body);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await writeBenchmarkReport(JSON.parse(await fs.readFile(path.join(root, 'docs/evaluations/2026-10-21-dinov2-benchmark.json'), 'utf8')));
}
