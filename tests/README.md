# Тесты и инструменты

Запускать из корня воркспейса.

## Зависимости (один раз)

```bash
npm ci --prefix tests
# Для автоматических тестов нужен только jsdom; Canvas API стабится внутри harness.
# Нативный пакет canvas не является prerequisite для тестов; он optional и нужен только утилитам, которые реально рендерят PNG.
```

(если папки `tests/node_modules` нет, скрипты также пробуют `/tmp/node_modules` — для песочницы)

## Команды

```bash
# собрать игру из исходников (src/ + правки ядра) в корневой necro-v2.html
python3 tools/build.py

# смоук Arena regression/control
node tests/smoke-test.js

# Exploration #2: adapter, isolation, legacy-meta isolation, time-independent difficulty
node tests/exploration-adapter-test.js
node tests/exploration-isolation-test.js
node tests/exploration-meta-isolation-test.js
node tests/exploration-difficulty-test.js

# «враждебное окружение»: без AudioContext, мёртвые обработчики, вырезанный основной скрипт
node tests/boot-test.js

# скриншоты игрового кадра + зумы героя/зомби в shots/
node tools/screenshot.js

# интеграция progression-слоя: доктрины, испытания, печати, ачивки, кап уровня (12 проверок)
node tools/progression-test.js

# вилки эволюций 2-из-2: все 4 варианта B e2e (13 проверок)
node tools/evo-fork-test.js

# аудит-прогон: 2 мин live-геймплея, сбор runtime-ошибок
node tools/audit-run.js

# легион-ось: доктрины, фокусы (вкл. ПЕПЕЛ), Жертва, аккорды, эхо, ульт-эволюции (16 проверок)
node tools/legion-test.js

# баланс-сим аккордов: достижимость порогов в живом драфте (ускорение __nxTS)
node tools/chord-sim.js
```

## Структура

- `necro-v2.html` — готовая игра (единственный файл вне папок)
- `src/` — слои расширения: `nx_ext.js` (фичи/UX), `nx_gfx.js` (графика), `nx_style.css` (стили)
- `tools/` — `build.py` (сборка), `screenshot.js` (рендер кадров)
- `tests/` — автотесты
- `shots/` — PNG-результаты рендера
- `uploads/` — исходник игры, с которого всё началось

# кинематограф и настройки
node tools/boss-shots.js   # зумы всех пяти боссов

Настройки в игре: кнопка ⚙ справа вверху (громкость, тряска, цифры урона, качество эффектов).
