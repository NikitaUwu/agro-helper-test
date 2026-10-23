# PlantDB: Python CLI и фотобаза

Отдельный инструмент для создания каталога и регистрации фотографий. Он не является HTTP API, не обслуживает браузерную диагностику и не синхронизирует журнал сайта.

## Установка

Нужен Python 3.12 или новее. Команды выполняются из корня репозитория; иначе относительные пути БД и файлов могут указывать в другую папку.

Windows PowerShell, новое окружение:

```powershell
py -3.12 -m venv .venv
.venv/Scripts/python.exe -m pip install -e '.[dev]'
.venv/Scripts/python.exe -m plantdb.cli --help
```

Linux/macOS:

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -e '.[dev]'
.venv/bin/python -m plantdb.cli --help
```

Далее примеры для PowerShell. На другой ОС заменить путь к Python. Активация venv необязательна: используется явный путь к интерпретатору.

В некоторых старых локальных копиях `.venv` ссылается на удалённый Python 3.13. Такой каталог не переносим: создать исправное окружение заново либо использовать другое venv. Клонирование репозитория не переносит виртуальное окружение.

## Конфигурация

| Параметр | Реальное поведение |
|---|---|
| `DATABASE_URL` | Читается из окружения; по умолчанию SQLite `./data/plantdb.sqlite3` |
| `.env.example` | Образец настроек; `.env` автоматически **не загружается** CLI |
| `STORAGE_ROOT`, `ORIGINALS_DIR`, `QUARANTINE_DIR`, `VARIANTS_DIR`, `RELEASES_DIR`, `LOG_LEVEL` | Есть в примере `.env`, но текущие Python-модули их не используют |
| JSON-реестры | Из `config/` в checkout либо `share/plantdb` в установленном пакете |

Задать отдельную БД:

```powershell
$env:DATABASE_URL = 'sqlite:///./data/my-plantdb.sqlite3'
.venv/Scripts/python.exe -m plantdb.cli init
```

Сбросить переменную в текущем сеансе:

```powershell
Remove-Item Env:DATABASE_URL
```

SQLAlchemy допускает иной URL, в том числе PostgreSQL, но `psycopg` не входит в зависимости проекта и интеграционные проверки PostgreSQL здесь не выполнялись. Готового облачного PostgreSQL-подключения у сайта нет.

## Команды

### Создать таблицы и справочники

```powershell
.venv/Scripts/python.exe -m plantdb.cli init
.venv/Scripts/python.exe -m plantdb.cli stats
```

В свежей базе seed создаёт **34 класса семи культур и три источника**. Числа шире веб-распознавания: legacy-каталог сохранён отдельно от 21 включённого модельного состояния. Повторный seed не добавляет дубликаты по ID, но и не обновляет автоматически изменённые поля уже существующих записей.

Все четыре CLI-команды используют `init_db()`, поэтому `stats` и `import-dir` также могут создать таблицы и выполнить seed. Это не строго read-only команды для ещё не созданной базы.

### Загрузить фотографии PlantVillage

```powershell
.venv/Scripts/python.exe -m plantdb.cli download --limit 10 --workers 4 --dir ./data/downloads/plantvillage
```

Целевые папки берутся из включённых меток модели: 21 состояние, до 10 снимков на состояние в этом примере. CLI по умолчанию использует `--limit 10`, `--workers 8`; Python-функция `download_plantvillage()` отдельно имеет default limit 20.

Для скачивания с импортом:

```powershell
.venv/Scripts/python.exe -m plantdb.cli download --limit 10 --workers 4 --auto-import --min-dim 224
```

Этот загрузчик использует актуальную ветку исходного PlantVillage и GitHub API без токена. Возможны rate limit, частичная загрузка и изменения набора. Он не предназначен для точного воспроизведения benchmark; для него использовать [prepare-evaluation.mjs](../../frontend/scripts/prepare-evaluation.mjs).

Загрузчик повторяет отдельное скачивание до трёх раз и пропускает уже непустой файл, не сверяя его хэш. Ошибки листинга дают пустой список и предупреждение. Проверять итоговые числа, а не только код завершения CLI.

### Импортировать существующие снимки

```powershell
.venv/Scripts/python.exe -m plantdb.cli import-dir --path ./data/downloads/plantvillage --source plantvillage --min-dim 224
```

Рекурсивно рассматриваются `.jpg`, `.jpeg`, `.png`, `.webp`. ID определяется по имени родительской папки PlantVillage либо нормализованному ID состояния, например `tomato_early_blight`.

Для папки с одним известным состоянием:

```powershell
.venv/Scripts/python.exe -m plantdb.cli import-dir --path ./data/my-tomato-photos --source plantvillage --class-id tomato_early_blight
```

`--class-id` применяется ко **всем** фото в указанном дереве, поэтому не использовать его для смешанной выборки. `--source` должен соответствовать реальному источнику и существующей записи `sources`; не маркировать собственные или чужие снимки как PlantVillage ради удобства импорта.

Пайплайн проверяет существование класса, декодирование Pillow, формат, размеры и точный дубликат SHA-256. pHash рассчитывается и сохраняется, но похожие снимки автоматически не группируются и не исключаются.

**Импорт хранит абсолютный путь к исходному файлу, не копируя фото.** Перемещение папки после импорта нарушит пути. Для переносимой резервной копии нужны и SQLite, и сами файлы с планом восстановления путей.

## Схема базы

Модели: [models.py](models.py). Фотографии не записываются в BLOB-колонки.

| Таблица | Основные поля | Назначение |
|---|---|---|
| `classes` | `id`, `crop`, `crop_en`, `disease_name`, `disease_name_en`, `is_healthy`, description/recommendations | Каталог состояний |
| `sources` | `id`, `name`, `url`, `license_type`, `attribution`, `can_display`, `can_use_for_eval` | Описание источника |
| `images` | `id`, `file_path`, `sha256`, `phash`, `class_id`, `source_id`, `original_filename`, размеры, MIME, `is_verified`, `created_at` | Метаданные файлов |
| `model_evaluations` | `id`, `model_name`, `image_id`, `predicted_class_id`, `confidence`, `is_correct`, `inference_time_ms`, `evaluated_at` | Место для результатов оценивания |

Ограничения:

- `images.file_path` и `images.sha256` уникальны.
- `images.class_id` → `classes.id`, `images.source_id` → `sources.id`: удаление использованных классов/источников ограничено.
- `model_evaluations.image_id` → `images.id`: удаление изображения каскадно удаляет его оценки.
- `predicted_class_id` хранится строкой без внешнего ключа.
- В SQLite включается проверка внешних ключей.

Таблица оценок присутствует в схеме, но CLI-команды для записи benchmark в неё нет. Браузерный `evaluate-model.mjs` пишет JSON/Markdown, а не SQL.

`is_verified=True` выставляется успешным техническим импортом. Это не свидетельство экспертного подтверждения возбудителя. `can_display` / `can_use_for_eval` — сохранённые признаки источника; импорт сам не выполняет полноценную проверку прав по активам и не вызывает эти проверки как обязательный gate.

## Alembic и создание схемы

Обычный `init` использует `Base.metadata.create_all()` и seed, без регистрации версии Alembic. `create_all()` не заменяет миграции существующей схемы.

Альтернативный путь для **новой пустой БД** с отслеживанием миграций:

```powershell
New-Item -ItemType Directory -Force data
.venv/Scripts/python.exe -m alembic upgrade head
.venv/Scripts/python.exe -m plantdb.cli init
.venv/Scripts/python.exe -m alembic current
```

Миграция `aa5aa08300fe` создаёт четыре таблицы; seed выполняется последующим `init`. Не выполнять первоначальный `upgrade` поверх базы, где `init` уже создал таблицы: возможна ошибка «table already exists». Для существующей базы сначала сопоставить схему, резервную копию и историю миграций; автоматически штамповать версию без проверки не следует.

## Проверки

```powershell
.venv/Scripts/python.exe -m pytest
```

Набор проверяет схему и внешние ключи, функции прав, техническое качество, дедупликацию импорта и согласованность модельного реестра. Тесты используют временные/памятные SQLite-базы, а не рабочий `data/plantdb.sqlite3`.

## Что не реализовано

- API, пользовательские аккаунты и связь с веб-журналом.
- Экспертная разметка и повторное подтверждение диагноза.
- Автоматическое применение всех YAML-политик, релизы датасетов, train/validation/test split по независимым группам.
- Поиск близких дубликатов по pHash, несмотря на сохранение хэша.
- Обучение/дообучение модели и перенос результатов SQL-оценок в UI.

[Общий README](../../README.md) · [Данные и лицензии](../../docs/data-and-licenses.md) · [Тестирование](../../docs/testing.md)
