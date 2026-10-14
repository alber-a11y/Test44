import { signal } from '@preact/signals';

type Dict = Record<string, string>;

const ru: Dict = {
  title: 'Хранители Долины', subtitle: 'Защити королевство',
  play: 'Играть', continue: 'Продолжить', map: 'Карта', shop: 'Магазин', forge: 'Кузница', settings: 'Настройки', back: 'Назад', close: 'Закрыть',
  level: 'Уровень', level_n: 'Уровень {n}', endless: 'Бесконечная осада', endless_desc: 'Держись как можно дольше. Рекорд: {n} волн', endless_locked: 'Откроется после уровня 20',
  start: 'В бой!', loading: 'Загрузка…', loading_tip: 'Совет: ',
  coins: 'Монеты', stars: 'Звёзды', free: 'Бесплатно', buy: 'Купить', owned: 'Есть', equip: 'Выбрать', equipped: 'Выбран', locked: 'Закрыто', max: 'МАКС',
  watch_ad: 'Смотреть', ad_x2: 'x2 за рекламу', ad_x3: 'x3 за рекламу', ad_label: 'РЕКЛАМА', ad_fullscreen: 'Полноэкранная реклама', ad_rewarded: 'Реклама за награду', ad_stub_note: 'Заглушка: здесь будет реклама площадки', ad_reward_ok: 'Награда получена!', ad_skip: 'Закрыть без награды',
  ad_unavailable: 'Реклама сейчас недоступна. Попробуйте позже.',
  // battle
  wave: 'Волна', waves_count: 'Волн: {n}', wave_n: 'Волна {n}', wave_of: 'Волна {n}/{m}', call_wave: 'Вызвать волну', call_bonus: '+{n}', first_wave: 'Начать!', lives: 'Жизни', gold: 'Золото',
  pause: 'Пауза', resume: 'Продолжить', restart: 'Заново', exit: 'Выйти', speed: 'Скорость',
  victory: 'Победа!', defeat: 'Поражение', reward: 'Награда', kills: 'Побеждено врагов', revive: 'Второй шанс', revive_desc: '+10 жизней и продолжить бой', next_level: 'Дальше', to_map: 'На карту', retry: 'Ещё раз',
  boss_incoming: 'БОСС!', sell: 'Продать', upgrade: 'Улучшить', rally: 'Сбор', not_enough: 'Не хватает золота', choose_spec: 'Специализация',
  convoy: 'Королевский обоз!', convoy_desc: 'Получи {n} золота за просмотр рекламы', take: 'Забрать', target_hint: 'Выберите место на карте', cancel: 'Отмена',
  hero_dead: 'Возрождение {n}',
  // towers
  t_archer: 'Башня лучников', t_ballista: 'Баллиста', t_barracks: 'Казармы', t_catapult: 'Катапульта', t_mage: 'Башня мага', t_brazier: 'Жаровня', t_bell: 'Колокольня', t_dragon: 'Логово дракона',
  td_archer: 'Быстрые выстрелы по одной цели.', td_ballista: 'Тяжёлый болт пробивает строй насквозь.', td_barracks: 'Солдаты перекрывают дорогу.', td_catapult: 'Урон по площади, ломает щиты.', td_mage: 'Магия игнорирует броню.', td_brazier: 'Сжигает всех вокруг.', td_bell: 'Ускоряет соседние башни.', td_dragon: 'Дракон жжёт врагов огнём.',
  b_marksman: 'Снайперы', b_volley: 'Залп', b_siege: 'Осадная', b_repeater: 'Скорострельная', b_knights: 'Рыцари', b_pikemen: 'Копейщики', b_firepots: 'Огненные горшки', b_quake: 'Валуны', b_storm: 'Гроза', b_frost: 'Лёд', b_inferno: 'Инферно', b_oil: 'Масляный ров', b_drums: 'Боевые барабаны', b_treasury: 'Казна',
  bd_marksman: 'Огромная дальность и критические выстрелы', bd_volley: 'Стреляет по трём целям', bd_siege: 'Пробивает 9 врагов и оглушает', bd_repeater: 'Очень высокая скорость стрельбы', bd_knights: 'Крепкие рыцари в латах', bd_pikemen: '4 бойца, тройной урон по гигантам', bd_firepots: 'Поджигает всё в большом радиусе', bd_quake: 'Сокрушительный урон и оглушение', bd_storm: 'Молния бьёт по цепочке врагов', bd_frost: 'Замедляет врагов по площади', bd_inferno: 'Огромный урон огнём', bd_oil: 'Поджигает и замедляет', bd_drums: '+30% урона башням рядом', bd_treasury: '+50% золота с врагов рядом и доход',
  stat_dmg: 'Урон', stat_rate: 'Скорость', stat_range: 'Дальность', stat_hp: 'Здоровье',
  // enemies
  e_footman: 'Пехотинец', e_runner: 'Налётчик', e_shield: 'Щитоносец', e_crossbow: 'Арбалетчик', e_brute: 'Громила', e_shaman: 'Шаман', e_elephant: 'Боевой слон', e_rhino: 'Носорог-таран', e_berserker: 'Берсерк',
  e_sk_minion: 'Скелет', e_sk_warrior: 'Костяной страж', e_sk_rogue: 'Призрачный клинок', e_sk_mage: 'Некромант',
  e_warlord: 'Вождь Кровавый Топор', e_mammoth: 'Мамонт-исполин', e_ironclad: 'Железный Колосс', e_lich: 'Король-лич', e_ashking: 'Пепельный Король',
  // heroes
  h_ranger: 'Следопыт Эйрин', h_paladin: 'Паладин Борис', h_sorceress: 'Чародейка Мира', h_jarl: 'Ярл Золотой Топор',
  hd_ranger: 'Меткий стрелок. Q — дождь стрел, E — шипы (замедление).', hd_paladin: 'Танк в латах. Q — удар молотом (оглушение), E — благословение (лечение).', hd_sorceress: 'Маг огня и льда. Q — огненный шар, E — ледяная волна.', hd_jarl: 'Легендарный воин. Q — вихрь, E — боевой рог (лечение отряда).',
  // spells & items
  s_reinforce: 'Подкрепление', s_meteor: 'Метеор', s_starfall: 'Звездопад', c_freeze: 'Ледяная бомба', c_dynamite: 'Динамит', c_goldrush: 'Золотая лихорадка', c_repair: 'Починка ворот',
  sd_reinforce: 'Два ополченца на 20 секунд', sd_meteor: 'Огненный удар по площади', sd_starfall: '12 звёзд бьют по врагам', cd_freeze: 'Замораживает врагов на 4 с', cd_dynamite: 'Мощный взрыв', cd_goldrush: 'x2 золото 30 секунд', cd_repair: '+5 жизней',
  bo_purse: 'Кошель', bo_walls: 'Крепкие стены', bo_sharp: 'Острые стрелы', bod_purse: '+150 золота на старте', bod_walls: '+5 жизней', bod_sharp: '+15% урона башен',
  boosters: 'Бустеры', boosters_hint: 'Действуют один бой',
  // shop
  tab_towers: 'Башни', tab_heroes: 'Герои', tab_items: 'Припасы', tab_unique: 'Уникальное', tab_coins: 'Монеты',
  unique_hint: 'Только за просмотр рекламы! Посмотри 3 ролика и получи навсегда.', unique_owned: 'Получено!',
  u_dragon: 'Логово дракона', u_jarl: 'Ярл Золотой Топор', u_starfall: 'Звездопад', u_phoenix: 'Знамя феникса', u_hound: 'Золотой пёс', u_goldskin: 'Золотое королевство',
  ud_dragon: 'Уникальная башня: дракон жжёт врагов.', ud_jarl: 'Легендарный герой с огромным уроном.', ud_starfall: 'Заклинание: звёздный дождь по врагам.', ud_phoenix: 'Раз за бой воскрешает ворота (+10 жизней).', ud_hound: 'Питомец сам собирает все монеты.', ud_goldskin: 'Золотые башни и дракон.',
  free_coins: 'Бесплатные монеты', free_coins_left: 'Осталось сегодня: {n}', daily_chest: 'Ежедневный сундук', daily_chest_desc: 'Монеты и припасы', open_chest: 'Открыть', come_back: 'Возвращайтесь завтра',
  unlock_at: 'Откроется на уровне {n}', unlocked_new: 'Новое!', in_battle: 'Доступна в бою',
  // forge
  forge_title: 'Кузница', forge_hint: 'Постоянные улучшения королевства',
  g_tower: 'Башни', g_army: 'Армия', g_kingdom: 'Королевство',
  up_archer: 'Луки лучников', up_ballista: 'Тяжёлые болты', up_catapult: 'Камни катапульт', up_mage: 'Магические кристаллы', up_brazier: 'Горючее масло', up_barracks: 'Закалка солдат', up_hero: 'Мощь героя', up_spells: 'Мудрость магов', up_gold: 'Казна', up_lives: 'Стены', up_bounty: 'Трофеи', up_magnet: 'Магнит героя', up_discount: 'Гильдия строителей',
  upd_archer: '+8% урона за уровень', upd_ballista: '+8% урона за уровень', upd_catapult: '+8% урона за уровень', upd_mage: '+8% урона за уровень', upd_brazier: '+8% урона за уровень', upd_barracks: '+12% здоровья солдат', upd_hero: '+10% здоровья и урона героя', upd_spells: '+7% силы, −7% перезарядки', upd_gold: '+25 золота на старте', upd_lives: '+2 жизни', upd_bounty: '+5% золота с врагов', upd_magnet: '+25% радиус сбора монет', upd_discount: '−3% цена башен',
  // settings
  music: 'Музыка', sfx: 'Звуки', quality: 'Графика', q_auto: 'Авто', q_low: 'Низкая', q_medium: 'Средняя', q_high: 'Высокая', language: 'Язык', lang_auto: 'Авто', vibration: 'Вибрация', on: 'Вкл', off: 'Выкл',
  controls: 'Управление', controls_pc: 'ПК: ЛКМ — строить и вести героя, WASD/стрелки — герой, колесо — зум, перетаскивание — камера, Q/E — умения героя, 1-3 — заклинания, 4-7 — припасы, Пробел — пауза, F — скорость, N — волна, Esc — отмена.', controls_mobile: 'Телефон: тап — строить и вести героя, свайп — камера, щипок — зум.',
  reset: 'Сбросить прогресс', reset_confirm: 'Точно сбросить весь прогресс?', yes: 'Да', no: 'Нет', credits: 'Модели: KayKit (Kay Lousberg, CC0). Музыка и звуки сгенерированы.',
  // daily
  daily_title: 'Ежедневная награда', daily_day: 'День {n}', claim: 'Забрать', claim_x2: 'x2 за рекламу',
  // tips
  tip_build: 'Нажмите на каменную площадку, чтобы построить башню.', tip_wave: 'Нажмите на флаг у дороги, чтобы начать волну раньше и получить бонус.', tip_hero: 'Нажмите на землю — герой пойдёт туда. Он собирает монеты (+25%)!', tip_upgrade: 'Нажмите на башню, чтобы улучшить её.',
  tip_runner: 'Налётчики очень быстрые. Ставьте башни у начала дороги.', tip_ballista: 'Новая башня: Баллиста! Болт пробивает всю колонну врагов.', tip_turtle: 'Щитоносцы строятся «черепахой»: стрелы отскакивают от щитов спереди. Бейте с флангов или катапультой!', tip_plot: 'Площадки с ценой можно купить, чтобы открыть новые места для башен.', tip_meteor: 'Новое заклинание: Метеор!',
  tip_barracks: 'Казармы: солдаты останавливают врагов на дороге.', tip_crossbow: 'Арбалетчики стреляют по солдатам и герою.', tip_catapult: 'Катапульта бьёт по площади и ломает «черепаху».', tip_brute: 'Громилы в броне: магия и катапульты против них лучше стрел.', tip_shaman: 'Шаманы лечат союзников — убивайте их первыми!',
  tip_mage: 'Башня мага: магия игнорирует броню.', tip_boss: 'Босс! Он ускоряет войска боевым кличем.', tip_elephant: 'Боевые слоны топчут солдат и отнимают 5 жизней.', tip_brazier: 'Жаровня сжигает всех врагов рядом.', tip_rhino: 'Носороги совершают рывки. Замедляйте их!', tip_bell: 'Колокольня ускоряет стрельбу соседних башен.',
  got_it: 'Понятно',
  // misc
  new_record: 'Новый рекорд!', tower_unlocked: 'Новая башня: {n}', hero_unlocked: 'Новый герой', biome_meadow: 'Зелёные луга', biome_canyon: 'Каменный каньон', biome_coast: 'Туманное побережье', biome_snow: 'Снежный перевал', biome_ashlands: 'Пепельные земли',
  stars_needed: 'Нужно звёзд: {n}',
};

const en: Dict = {
  title: 'Hearthguard', subtitle: 'Defend the Vale',
  play: 'Play', continue: 'Continue', map: 'Map', shop: 'Shop', forge: 'Forge', settings: 'Settings', back: 'Back', close: 'Close',
  level: 'Level', level_n: 'Level {n}', endless: 'Endless Siege', endless_desc: 'Hold out as long as you can. Best: {n} waves', endless_locked: 'Unlocks after level 20',
  start: 'To battle!', loading: 'Loading…', loading_tip: 'Tip: ',
  coins: 'Coins', stars: 'Stars', free: 'Free', buy: 'Buy', owned: 'Owned', equip: 'Select', equipped: 'Selected', locked: 'Locked', max: 'MAX',
  watch_ad: 'Watch', ad_x2: 'x2 for an ad', ad_x3: 'x3 for an ad', ad_label: 'AD', ad_fullscreen: 'Fullscreen ad', ad_rewarded: 'Rewarded ad', ad_stub_note: 'Placeholder: the ad network will show here', ad_reward_ok: 'Reward granted!', ad_skip: 'Close without reward',
  ad_unavailable: 'Ad is not available right now. Try again later.',
  wave: 'Wave', waves_count: 'Waves: {n}', wave_n: 'Wave {n}', wave_of: 'Wave {n}/{m}', call_wave: 'Call wave', call_bonus: '+{n}', first_wave: 'Start!', lives: 'Lives', gold: 'Gold',
  pause: 'Paused', resume: 'Resume', restart: 'Restart', exit: 'Exit', speed: 'Speed',
  victory: 'Victory!', defeat: 'Defeat', reward: 'Reward', kills: 'Enemies defeated', revive: 'Second chance', revive_desc: '+10 lives and keep fighting', next_level: 'Next', to_map: 'Map', retry: 'Retry',
  boss_incoming: 'BOSS!', sell: 'Sell', upgrade: 'Upgrade', rally: 'Rally', not_enough: 'Not enough gold', choose_spec: 'Specialization',
  convoy: 'Royal convoy!', convoy_desc: 'Get {n} gold for watching an ad', take: 'Take', target_hint: 'Choose a spot on the map', cancel: 'Cancel',
  hero_dead: 'Respawn {n}',
  t_archer: 'Archer Tower', t_ballista: 'Ballista', t_barracks: 'Barracks', t_catapult: 'Catapult', t_mage: 'Mage Tower', t_brazier: 'Brazier', t_bell: 'Bell Tower', t_dragon: 'Dragon Roost',
  td_archer: 'Fast single-target shots.', td_ballista: 'Heavy bolts pierce whole columns.', td_barracks: 'Soldiers block the road.', td_catapult: 'Area damage, breaks shields.', td_mage: 'Magic ignores armor.', td_brazier: 'Burns everything nearby.', td_bell: 'Speeds up nearby towers.', td_dragon: 'A dragon scorches enemies.',
  b_marksman: 'Marksmen', b_volley: 'Volley', b_siege: 'Siege', b_repeater: 'Repeater', b_knights: 'Knights', b_pikemen: 'Pikemen', b_firepots: 'Firepots', b_quake: 'Boulders', b_storm: 'Storm', b_frost: 'Frost', b_inferno: 'Inferno', b_oil: 'Oil Moat', b_drums: 'War Drums', b_treasury: 'Treasury',
  bd_marksman: 'Huge range and critical shots', bd_volley: 'Hits three targets', bd_siege: 'Pierces 9 enemies and stuns', bd_repeater: 'Very high fire rate', bd_knights: 'Tough armored knights', bd_pikemen: '4 fighters, triple damage vs giants', bd_firepots: 'Sets a wide area ablaze', bd_quake: 'Crushing damage and stun', bd_storm: 'Chain lightning', bd_frost: 'Area slow', bd_inferno: 'Massive fire damage', bd_oil: 'Burns and slows', bd_drums: '+30% damage to nearby towers', bd_treasury: '+50% gold from nearby kills + income',
  stat_dmg: 'Damage', stat_rate: 'Rate', stat_range: 'Range', stat_hp: 'Health',
  e_footman: 'Footman', e_runner: 'Raider', e_shield: 'Shieldbearer', e_crossbow: 'Crossbowman', e_brute: 'Brute', e_shaman: 'Shaman', e_elephant: 'War Elephant', e_rhino: 'Battering Rhino', e_berserker: 'Berserker',
  e_sk_minion: 'Skeleton', e_sk_warrior: 'Bone Guard', e_sk_rogue: 'Phantom Blade', e_sk_mage: 'Necromancer',
  e_warlord: 'Warlord Bloodaxe', e_mammoth: 'Colossal Mammoth', e_ironclad: 'Iron Colossus', e_lich: 'Lich King', e_ashking: 'The Ash King',
  h_ranger: 'Eirin the Ranger', h_paladin: 'Paladin Boris', h_sorceress: 'Mira the Sorceress', h_jarl: 'Jarl Goldaxe',
  hd_ranger: 'Sharpshooter. Q — arrow rain, E — caltrops (slow).', hd_paladin: 'Armored tank. Q — hammer slam (stun), E — blessing (heal).', hd_sorceress: 'Fire & ice. Q — fireball, E — frost nova.', hd_jarl: 'Legendary warrior. Q — whirlwind, E — war horn (heal squad).',
  s_reinforce: 'Reinforcements', s_meteor: 'Meteor', s_starfall: 'Starfall', c_freeze: 'Ice Bomb', c_dynamite: 'Dynamite', c_goldrush: 'Gold Rush', c_repair: 'Repair Gate',
  sd_reinforce: 'Two militia for 20 seconds', sd_meteor: 'Fiery area strike', sd_starfall: '12 stars hit enemies', cd_freeze: 'Freezes enemies for 4 s', cd_dynamite: 'Huge blast', cd_goldrush: 'x2 gold for 30 seconds', cd_repair: '+5 lives',
  bo_purse: 'Purse', bo_walls: 'Strong Walls', bo_sharp: 'Sharp Arrows', bod_purse: '+150 starting gold', bod_walls: '+5 lives', bod_sharp: '+15% tower damage',
  boosters: 'Boosters', boosters_hint: 'Last one battle',
  tab_towers: 'Towers', tab_heroes: 'Heroes', tab_items: 'Supplies', tab_unique: 'Unique', tab_coins: 'Coins',
  unique_hint: 'Ads only! Watch 3 videos and keep it forever.', unique_owned: 'Unlocked!',
  u_dragon: 'Dragon Roost', u_jarl: 'Jarl Goldaxe', u_starfall: 'Starfall', u_phoenix: 'Phoenix Banner', u_hound: 'Golden Hound', u_goldskin: 'Golden Kingdom',
  ud_dragon: 'Unique tower: a dragon breathes fire.', ud_jarl: 'Legendary hero with huge damage.', ud_starfall: 'Spell: a rain of stars on enemies.', ud_phoenix: 'Once per battle revives the gate (+10 lives).', ud_hound: 'Pet that collects every coin.', ud_goldskin: 'Golden towers and dragon.',
  free_coins: 'Free coins', free_coins_left: 'Left today: {n}', daily_chest: 'Daily chest', daily_chest_desc: 'Coins and supplies', open_chest: 'Open', come_back: 'Come back tomorrow',
  unlock_at: 'Unlocks at level {n}', unlocked_new: 'New!', in_battle: 'Available in battle',
  forge_title: 'Forge', forge_hint: 'Permanent kingdom upgrades',
  g_tower: 'Towers', g_army: 'Army', g_kingdom: 'Kingdom',
  up_archer: 'Archer Bows', up_ballista: 'Heavy Bolts', up_catapult: 'Catapult Stones', up_mage: 'Mage Crystals', up_brazier: 'Flammable Oil', up_barracks: 'Soldier Training', up_hero: 'Hero Might', up_spells: 'Arcane Wisdom', up_gold: 'Treasury', up_lives: 'Walls', up_bounty: 'Spoils', up_magnet: 'Hero Magnet', up_discount: 'Builders Guild',
  upd_archer: '+8% damage per level', upd_ballista: '+8% damage per level', upd_catapult: '+8% damage per level', upd_mage: '+8% damage per level', upd_brazier: '+8% damage per level', upd_barracks: '+12% soldier health', upd_hero: '+10% hero health & damage', upd_spells: '+7% power, −7% cooldown', upd_gold: '+25 starting gold', upd_lives: '+2 lives', upd_bounty: '+5% gold from enemies', upd_magnet: '+25% coin pickup radius', upd_discount: '−3% tower cost',
  music: 'Music', sfx: 'Sound', quality: 'Graphics', q_auto: 'Auto', q_low: 'Low', q_medium: 'Medium', q_high: 'High', language: 'Language', lang_auto: 'Auto', vibration: 'Vibration', on: 'On', off: 'Off',
  controls: 'Controls', controls_pc: 'PC: LMB — build & move hero, WASD/arrows — hero, wheel — zoom, drag — camera, Q/E — hero skills, 1-3 — spells, 4-7 — supplies, Space — pause, F — speed, N — wave, Esc — cancel.', controls_mobile: 'Phone: tap — build & move hero, swipe — camera, pinch — zoom.',
  reset: 'Reset progress', reset_confirm: 'Really reset all progress?', yes: 'Yes', no: 'No', credits: 'Models: KayKit (Kay Lousberg, CC0). Music & sound generated.',
  daily_title: 'Daily reward', daily_day: 'Day {n}', claim: 'Claim', claim_x2: 'x2 for an ad',
  tip_build: 'Tap a stone pad to build a tower.', tip_wave: 'Tap the flag by the road to start the wave early for bonus gold.', tip_hero: 'Tap the ground to move your hero. Heroes collect coins (+25%)!', tip_upgrade: 'Tap a tower to upgrade it.',
  tip_runner: 'Raiders are fast. Place towers near the road entrance.', tip_ballista: 'New tower: Ballista! Its bolt pierces the whole column.', tip_turtle: 'Shieldbearers form a "turtle": arrows bounce off front shields. Hit them from the flanks or with catapults!', tip_plot: 'Plots with a price can be bought to open new tower spots.', tip_meteor: 'New spell: Meteor!',
  tip_barracks: 'Barracks: soldiers stop enemies on the road.', tip_crossbow: 'Crossbowmen shoot soldiers and your hero.', tip_catapult: 'Catapults deal area damage and break the turtle.', tip_brute: 'Armored brutes: magic and catapults beat arrows.', tip_shaman: 'Shamans heal allies — kill them first!',
  tip_mage: 'Mage Tower: magic ignores armor.', tip_boss: 'Boss! His war cry speeds up troops.', tip_elephant: 'War elephants trample soldiers and cost 5 lives.', tip_brazier: 'The Brazier burns all nearby enemies.', tip_rhino: 'Rhinos charge forward. Slow them down!', tip_bell: 'The Bell Tower speeds up nearby towers.',
  got_it: 'Got it',
  new_record: 'New record!', tower_unlocked: 'New tower: {n}', hero_unlocked: 'New hero', biome_meadow: 'Green Meadows', biome_canyon: 'Stone Canyon', biome_coast: 'Misty Coast', biome_snow: 'Snowy Pass', biome_ashlands: 'Ashlands',
  stars_needed: 'Stars needed: {n}',
};

const DICTS = { ru, en };
export const lang = signal<'ru' | 'en'>('ru');

export function t(key: string, params?: Record<string, string | number>): string {
  let s = DICTS[lang.value][key] ?? DICTS.en[key] ?? key;
  if (params) for (const k in params) s = s.replace('{' + k + '}', String(params[k]));
  return s;
}
