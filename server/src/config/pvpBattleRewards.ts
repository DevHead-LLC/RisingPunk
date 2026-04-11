/**
 * PvP (Hack Map user defender) battle rewards — plumbing only until product is ready to test.
 *
 * When enabled, XP amount will likely be derived from defender bots destroyed (not a flat constant).
 * NPC XP is unchanged: it always comes from each NPC's `battleExperienceReward` via {@link BattleRewardService}.
 */
export const ENABLE_PVP_BATTLE_EXPERIENCE_REWARD = false;

/** Placeholder for the future formula; not applied while {@link ENABLE_PVP_BATTLE_EXPERIENCE_REWARD} is false. */
export const PVP_BATTLE_EXPERIENCE_REWARD = 250;
