# Хранители Долины / Hearthguard

3D tower defense для браузера (ПК + мобильные). Three.js + TypeScript + Preact + Vite.

## Запуск

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production-сборка в dist/ (~11 МБ, грузится без внешних ресурсов)
npm run preview
```

Полезные параметры URL (для тестов):

| Параметр | Что делает |
|---|---|
| `?q=low\|medium\|high` | принудительное качество графики |
| `?ads=fast` | реклама-заглушка длится 1 секунду |
| `?ads=fail` | реклама всегда возвращает ошибку (проверка веток «нет рекламы») |
| `?dev=battle&level=N` | (только dev) сразу бой на уровне N с башнями на всех площадках |
| `?viewer=chars\|kit` | (только dev) просмотрщик моделей |

## Что внутри

```
src/
  sim/        чистая симуляция боя (без графики): World, пути, волны, урон, юниты, герой, монеты
  data/       башни, враги, герои, заклинания, припасы, бустеры, кузница, уникальные 3/3
  levels/     20 ручных уровней + генератор по сиду (до 100) + бесконечный режим
  render/     Three.js: Engine (пост-эффекты), террейн, трава, гряды, лес, VAT-толпы, частицы, башни
  game/       GameSession (симуляция + графика + ввод), Input, HUD-сигналы
  app/        контроллер экранов, сохранения, локализация RU/EN
  ads/        AdService + StubAdProvider (подключение реальной сети — один файл)
  platform/   жизненный цикл в стиле Яндекс Игр без SDK, защита ввода, пауза при сворачивании
  audio/      Web Audio: шины музыки/эффектов, mute на время рекламы
  ui/         Preact-экраны и окна
tools/
  build-models.mjs   KayKit (CC0) → компактные GLB (meshopt)
  fetch-assets.sh    скачать исходные паки моделей
  audio/             Python-синтезатор: 37 эффектов + 7 музыкальных треков
  sim/balance.ts     бот проходит все 100 уровней (npm run balance)
  dev/               скриншоты/сценарии Playwright
```

### Технические решения
- **Толпы через Vertex Animation Textures**: анимации скелетов запекаются в текстуры при загрузке, каждый тип юнита — один draw call (сотни солдат без просадок).
- **Камера** автоматически поворачивается: портрет на телефоне, «горизонтальная» карта на ПК.
- **Качество**: Low / Medium / High / Auto (автоматически понижается при низком FPS).
- **Реклама**: полноэкранная (старт уровня, конец, рестарт, выход на карту, перерывы в бесконечном режиме; кулдаун 60 с) и за награду (x2, второй шанс, обоз, монеты, сундук, перезарядка заклинания, уникальные предметы 3/3). Во время рекламы игра на паузе, звук выключен, ввод заблокирован.

### Пересборка ассетов
```bash
npm run assets:fetch    # клонирует KayKit-паки в .assets-src/
npm run assets:models   # → public/assets/models/*.glb
pip install numpy scipy && npm run assets:audio   # → public/assets/audio/*.mp3
```

### Подключение рекламной площадки
Реализовать `AdProvider` (`src/ads/AdService.ts`) для SDK площадки и назначить `AdService.provider`. Методы `Platform.ready()`, `gameplayStart/Stop()`, `saveCloud()` в `src/platform/Platform.ts` — места для вызовов SDK.

## Лицензии ассетов
Модели: KayKit Medieval Hexagon Pack, Character Pack Adventures & Skeletons — Kay Lousberg, CC0. Музыка и звуки сгенерированы процедурно (tools/audio). Шрифты Rubik и Russo One — SIL OFL.
