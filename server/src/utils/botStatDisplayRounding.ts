import type { EffectiveBotStats } from '../services/BotStatsService';

/**
 * Rounds effective bot stats the same way as `GET /api/bots/stats-breakdown` `total` rows
 * so Profile, Digital Barracks (`GET /stats`), and any consumer of this shape stay aligned.
 * Combat code paths use unrounded `getUserBotStats` internally; only API payloads use this.
 */
export function roundEffectiveStatsToStatRow(s: EffectiveBotStats): EffectiveBotStats {
  return {
    health: Math.round(s.health * 100) / 100,
    offense: Math.round(s.offense * 100) / 100,
    defense: Math.round(s.defense * 1000) / 1000,
    speed: Math.round(s.speed),
    range: Math.round(s.range * 100) / 100,
  };
}
