import type { SaveData } from '../app/save';

export interface AchievementDef { id: string; goal: number; reward: number; value: (p: SaveData) => number }

const stars = (p: SaveData) => Object.values(p.stars).reduce((a, b) => a + b, 0);

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first_win', goal: 1, reward: 60, value: (p) => p.stats.won },
  { id: 'kills_500', goal: 500, reward: 150, value: (p) => p.stats.kills },
  { id: 'kills_5000', goal: 5000, reward: 600, value: (p) => p.stats.kills },
  { id: 'stars_30', goal: 30, reward: 200, value: stars },
  { id: 'stars_150', goal: 150, reward: 800, value: stars },
  { id: 'level_20', goal: 20, reward: 300, value: (p) => Math.min(100, p.unlocked - 1) },
  { id: 'level_60', goal: 60, reward: 800, value: (p) => Math.min(100, p.unlocked - 1) },
  { id: 'level_100', goal: 100, reward: 2000, value: (p) => (p.stars[100] ? 100 : Math.min(99, p.unlocked - 1)) },
  { id: 'endless_20', goal: 20, reward: 500, value: (p) => p.endlessBest },
  { id: 'forge_10', goal: 10, reward: 300, value: (p) => Object.values(p.upgrades).reduce((a, b) => a + b, 0) },
];

export function claimable(p: SaveData) {
  return ACHIEVEMENTS.filter((a) => !(p.achievements ?? []).includes(a.id) && a.value(p) >= a.goal).length;
}
