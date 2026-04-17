/**
 * Per-crew-level bonuses for **all** roster members (president, executives, members).
 *
 * **Semantics:** Each row is the **total** bonus for that crew level (the authoritative values at
 * that level), **not** an increment layered on top of previous levels. Callers apply one row for
 * `Crew.level` only.
 *
 * Applied at read/sync time (not stored on User) so join/leave automatically add/remove.
 * Source: design tables through level **400**; levels **401–999** use closed-form extrapolation (see
 * `crewLevelMemberBonusesExtrapolated`) matched to sheet patterns; crew level **&gt;999** uses row **999**.
 */

export interface CrewLevelMemberBonuses {
  strength: number;
  defense: number;
  health: number;
  /** Added to total passive $/sec (same pipeline as RentalHousingSyncService base rate). */
  incomePerSecond: number;
}

/** Highest crew level with a defined bonus row (1–400 authored; 401–999 extrapolated). */
export const CREW_LEVEL_BONUS_TABLE_MAX = 999;

function rowForLevels1To10(): CrewLevelMemberBonuses {
  return { strength: 0, defense: 0, health: 0, incomePerSecond: 0.01 };
}

function rowForLevels11To20(): CrewLevelMemberBonuses {
  return { strength: 0, defense: 0, health: 5, incomePerSecond: 0.01 };
}

/** Levels 21–40: same totals (sheet 21–25 and 26–40). */
function rowForLevels21To40(): CrewLevelMemberBonuses {
  return { strength: 1, defense: 0, health: 5, incomePerSecond: 0.01 };
}

/** Levels 41–50. */
function rowForLevels41To50(): CrewLevelMemberBonuses {
  return { strength: 1, defense: 0.01, health: 5, incomePerSecond: 0.02 };
}

/**
 * Levels 51–75 — **total** row for this band (not incremental).
 * Income **0.18** $/s per spec; Str/Def/Health unchanged from level 50 until a fuller sheet replaces this.
 */
function rowForLevels51To75(): CrewLevelMemberBonuses {
  return { strength: 1, defense: 0.01, health: 5, incomePerSecond: 0.18 };
}

/** Levels 76–80. */
function rowForLevels76To80(): CrewLevelMemberBonuses {
  return { strength: 2, defense: 0.02, health: 10, incomePerSecond: 0.02 };
}

/** Levels 81–90. */
function rowForLevels81To90(): CrewLevelMemberBonuses {
  return { strength: 2, defense: 0.02, health: 10, incomePerSecond: 0.03 };
}

/** Levels 91–100. */
function rowForLevels91To100(): CrewLevelMemberBonuses {
  return { strength: 2, defense: 0.02, health: 15, incomePerSecond: 0.03 };
}

/** Levels 101–110. */
function rowForLevels101To110(): CrewLevelMemberBonuses {
  return { strength: 3, defense: 0.03, health: 15, incomePerSecond: 0.03 };
}

/** Levels 111–115. */
function rowForLevels111To115(): CrewLevelMemberBonuses {
  return { strength: 3, defense: 0.03, health: 15, incomePerSecond: 0.04 };
}

/** Levels 116–120. */
function rowForLevels116To120(): CrewLevelMemberBonuses {
  return { strength: 3, defense: 0.03, health: 15, incomePerSecond: 0.05 };
}

/** Levels 121–125. */
function rowForLevels121To125(): CrewLevelMemberBonuses {
  return { strength: 3, defense: 0.03, health: 15, incomePerSecond: 0.06 };
}

/** Levels 126–130. */
function rowForLevels126To130(): CrewLevelMemberBonuses {
  return { strength: 3, defense: 0.03, health: 15, incomePerSecond: 0.07 };
}

/** Levels 131–135. */
function rowForLevels131To135(): CrewLevelMemberBonuses {
  return { strength: 3, defense: 0.04, health: 20, incomePerSecond: 0.08 };
}

/** Levels 136–140. */
function rowForLevels136To140(): CrewLevelMemberBonuses {
  return { strength: 3, defense: 0.04, health: 20, incomePerSecond: 0.09 };
}

/** Levels 141–145. */
function rowForLevels141To145(): CrewLevelMemberBonuses {
  return { strength: 4, defense: 0.04, health: 20, incomePerSecond: 0.1 };
}

/** Levels 146–150. */
function rowForLevels146To150(): CrewLevelMemberBonuses {
  return { strength: 4, defense: 0.04, health: 20, incomePerSecond: 0.11 };
}

/** Levels 151–155. */
function rowForLevels151To155(): CrewLevelMemberBonuses {
  return { strength: 4, defense: 0.04, health: 20, incomePerSecond: 0.12 };
}

/** Levels 156–160. */
function rowForLevels156To160(): CrewLevelMemberBonuses {
  return { strength: 4, defense: 0.04, health: 20, incomePerSecond: 0.13 };
}

/** Levels 161–165. */
function rowForLevels161To165(): CrewLevelMemberBonuses {
  return { strength: 4, defense: 0.05, health: 20, incomePerSecond: 0.14 };
}

/** Levels 166–170. */
function rowForLevels166To170(): CrewLevelMemberBonuses {
  return { strength: 4, defense: 0.05, health: 20, incomePerSecond: 0.15 };
}

/** Levels 171–175. */
function rowForLevels171To175(): CrewLevelMemberBonuses {
  return { strength: 4, defense: 0.05, health: 25, incomePerSecond: 0.18 };
}

/** Levels 176–180. */
function rowForLevels176To180(): CrewLevelMemberBonuses {
  return { strength: 4, defense: 0.05, health: 25, incomePerSecond: 0.21 };
}

/** Levels 181–185. */
function rowForLevels181To185(): CrewLevelMemberBonuses {
  return { strength: 5, defense: 0.05, health: 25, incomePerSecond: 0.24 };
}

/** Levels 186–190. */
function rowForLevels186To190(): CrewLevelMemberBonuses {
  return { strength: 5, defense: 0.05, health: 25, incomePerSecond: 0.27 };
}

/** Levels 191–195. */
function rowForLevels191To195(): CrewLevelMemberBonuses {
  return { strength: 5, defense: 0.06, health: 25, incomePerSecond: 0.3 };
}

/** Levels 196–200. */
function rowForLevels196To200(): CrewLevelMemberBonuses {
  return { strength: 5, defense: 0.06, health: 25, incomePerSecond: 0.33 };
}

/** Levels 201–205. */
function rowForLevels201To205(): CrewLevelMemberBonuses {
  return { strength: 5, defense: 0.06, health: 25, incomePerSecond: 0.36 };
}

/** Levels 206–210. */
function rowForLevels206To210(): CrewLevelMemberBonuses {
  return { strength: 5, defense: 0.06, health: 25, incomePerSecond: 0.39 };
}

/** Levels 211–215. */
function rowForLevels211To215(): CrewLevelMemberBonuses {
  return { strength: 5, defense: 0.06, health: 30, incomePerSecond: 0.42 };
}

/** Levels 216–220. */
function rowForLevels216To220(): CrewLevelMemberBonuses {
  return { strength: 5, defense: 0.06, health: 30, incomePerSecond: 0.45 };
}

/** Levels 221–225. */
function rowForLevels221To225(): CrewLevelMemberBonuses {
  return { strength: 6, defense: 0.07, health: 30, incomePerSecond: 0.48 };
}

/** Levels 226–230. */
function rowForLevels226To230(): CrewLevelMemberBonuses {
  return { strength: 6, defense: 0.07, health: 30, incomePerSecond: 0.51 };
}

/** Levels 231–235. */
function rowForLevels231To235(): CrewLevelMemberBonuses {
  return { strength: 6, defense: 0.07, health: 30, incomePerSecond: 0.54 };
}

/** Levels 236–240. */
function rowForLevels236To240(): CrewLevelMemberBonuses {
  return { strength: 6, defense: 0.07, health: 30, incomePerSecond: 0.57 };
}

/** Levels 241–245. */
function rowForLevels241To245(): CrewLevelMemberBonuses {
  return { strength: 6, defense: 0.07, health: 30, incomePerSecond: 0.6 };
}

/** Levels 246–250. */
function rowForLevels246To250(): CrewLevelMemberBonuses {
  return { strength: 6, defense: 0.07, health: 30, incomePerSecond: 0.63 };
}

/** Levels 251–255. */
function rowForLevels251To255(): CrewLevelMemberBonuses {
  return { strength: 6, defense: 0.08, health: 35, incomePerSecond: 0.66 };
}

/** Levels 256–260. */
function rowForLevels256To260(): CrewLevelMemberBonuses {
  return { strength: 6, defense: 0.08, health: 35, incomePerSecond: 0.69 };
}

/** Levels 261–265. */
function rowForLevels261To265(): CrewLevelMemberBonuses {
  return { strength: 7, defense: 0.08, health: 35, incomePerSecond: 0.72 };
}

/** Levels 266–270. */
function rowForLevels266To270(): CrewLevelMemberBonuses {
  return { strength: 7, defense: 0.08, health: 35, incomePerSecond: 0.75 };
}

/** Levels 271–275. */
function rowForLevels271To275(): CrewLevelMemberBonuses {
  return { strength: 7, defense: 0.08, health: 35, incomePerSecond: 0.78 };
}

/** Levels 276–280. */
function rowForLevels276To280(): CrewLevelMemberBonuses {
  return { strength: 7, defense: 0.08, health: 35, incomePerSecond: 0.81 };
}

/** Levels 281–285. */
function rowForLevels281To285(): CrewLevelMemberBonuses {
  return { strength: 7, defense: 0.09, health: 35, incomePerSecond: 0.84 };
}

/** Levels 286–290. */
function rowForLevels286To290(): CrewLevelMemberBonuses {
  return { strength: 7, defense: 0.09, health: 35, incomePerSecond: 0.87 };
}

/** Levels 291–295. */
function rowForLevels291To295(): CrewLevelMemberBonuses {
  return { strength: 7, defense: 0.09, health: 40, incomePerSecond: 0.9 };
}

/** Levels 296–300. */
function rowForLevels296To300(): CrewLevelMemberBonuses {
  return { strength: 7, defense: 0.09, health: 40, incomePerSecond: 0.93 };
}

/** Levels 301–305. */
function rowForLevels301To305(): CrewLevelMemberBonuses {
  return { strength: 8, defense: 0.09, health: 40, incomePerSecond: 0.96 };
}

/** Levels 306–310. */
function rowForLevels306To310(): CrewLevelMemberBonuses {
  return { strength: 8, defense: 0.09, health: 40, incomePerSecond: 0.99 };
}

/** Levels 311–315. */
function rowForLevels311To315(): CrewLevelMemberBonuses {
  return { strength: 8, defense: 0.1, health: 40, incomePerSecond: 1.02 };
}

/** Levels 316–320. */
function rowForLevels316To320(): CrewLevelMemberBonuses {
  return { strength: 8, defense: 0.1, health: 40, incomePerSecond: 1.05 };
}

/** Levels 321–325. */
function rowForLevels321To325(): CrewLevelMemberBonuses {
  return { strength: 8, defense: 0.1, health: 40, incomePerSecond: 1.08 };
}

/** Levels 326–330. */
function rowForLevels326To330(): CrewLevelMemberBonuses {
  return { strength: 8, defense: 0.1, health: 40, incomePerSecond: 1.11 };
}

/** Levels 331–335. */
function rowForLevels331To335(): CrewLevelMemberBonuses {
  return { strength: 8, defense: 0.1, health: 45, incomePerSecond: 1.14 };
}

/** Levels 336–340. */
function rowForLevels336To340(): CrewLevelMemberBonuses {
  return { strength: 8, defense: 0.1, health: 45, incomePerSecond: 1.17 };
}

/** Levels 341–345. */
function rowForLevels341To345(): CrewLevelMemberBonuses {
  return { strength: 9, defense: 0.11, health: 45, incomePerSecond: 1.2 };
}

/** Levels 346–350. */
function rowForLevels346To350(): CrewLevelMemberBonuses {
  return { strength: 9, defense: 0.11, health: 45, incomePerSecond: 1.23 };
}

/** Levels 351–355. */
function rowForLevels351To355(): CrewLevelMemberBonuses {
  return { strength: 9, defense: 0.11, health: 45, incomePerSecond: 1.26 };
}

/** Levels 356–360. */
function rowForLevels356To360(): CrewLevelMemberBonuses {
  return { strength: 9, defense: 0.11, health: 45, incomePerSecond: 1.29 };
}

/** Levels 361–365. */
function rowForLevels361To365(): CrewLevelMemberBonuses {
  return { strength: 9, defense: 0.11, health: 45, incomePerSecond: 1.32 };
}

/** Levels 366–370. */
function rowForLevels366To370(): CrewLevelMemberBonuses {
  return { strength: 9, defense: 0.11, health: 45, incomePerSecond: 1.35 };
}

/** Levels 371–375. */
function rowForLevels371To375(): CrewLevelMemberBonuses {
  return { strength: 9, defense: 0.12, health: 50, incomePerSecond: 1.38 };
}

/** Levels 376–380. */
function rowForLevels376To380(): CrewLevelMemberBonuses {
  return { strength: 9, defense: 0.12, health: 50, incomePerSecond: 1.41 };
}

/** Levels 381–385. */
function rowForLevels381To385(): CrewLevelMemberBonuses {
  return { strength: 10, defense: 0.12, health: 50, incomePerSecond: 1.44 };
}

/** Levels 386–390. */
function rowForLevels386To390(): CrewLevelMemberBonuses {
  return { strength: 10, defense: 0.12, health: 50, incomePerSecond: 1.47 };
}

/** Levels 391–395. */
function rowForLevels391To395(): CrewLevelMemberBonuses {
  return { strength: 10, defense: 0.12, health: 50, incomePerSecond: 1.5 };
}

/** Levels 396–400. */
function rowForLevels396To400(): CrewLevelMemberBonuses {
  return { strength: 10, defense: 0.12, health: 50, incomePerSecond: 1.53 };
}

/**
 * Levels **401–999**: extrapolated from sheet cadence (not individually authored).
 * Verified continuous at **400 → 401** with the same rules applied at level 400.
 *
 * - **Income:** `0.51 + 0.03 × floor((level − 226) / 5)` — same +0.03 every 5 levels as 226–400.
 * - **Strength:** `8 + floor((level − 301) / 40)` — matches +1 at 301, 341, 381, …
 * - **Defense:** `0.09 + 0.01 × floor((level − 281) / 30)` — ~+0.01 every 30 levels from 281 (311, 341, 371, …).
 * - **Health:** `50 + 5 × floor((level − 371) / 40)` — +5 every 40 levels from 371 (331/371-style jumps).
 */
function crewLevelMemberBonusesExtrapolated(level: number): CrewLevelMemberBonuses {
  if (level < 401 || level > 999) {
    throw new Error(`crewLevelMemberBonusesExtrapolated: level ${level} out of range 401–999`);
  }
  const incomeRaw = 0.51 + 0.03 * Math.floor((level - 226) / 5);
  const defenseRaw = 0.09 + 0.01 * Math.floor((level - 281) / 30);
  return {
    strength: 8 + Math.floor((level - 301) / 40),
    defense: Math.round(defenseRaw * 100) / 100,
    health: 50 + 5 * Math.floor((level - 371) / 40),
    incomePerSecond: Math.round(incomeRaw * 100) / 100,
  };
}

const BY_LEVEL: CrewLevelMemberBonuses[] = [];
for (let lv = 0; lv <= 400; lv++) {
  if (lv <= 10) {
    BY_LEVEL[lv] = rowForLevels1To10();
  } else if (lv <= 20) {
    BY_LEVEL[lv] = rowForLevels11To20();
  } else if (lv <= 40) {
    BY_LEVEL[lv] = rowForLevels21To40();
  } else if (lv <= 50) {
    BY_LEVEL[lv] = rowForLevels41To50();
  } else if (lv <= 75) {
    BY_LEVEL[lv] = rowForLevels51To75();
  } else if (lv <= 80) {
    BY_LEVEL[lv] = rowForLevels76To80();
  } else if (lv <= 90) {
    BY_LEVEL[lv] = rowForLevels81To90();
  } else if (lv <= 100) {
    BY_LEVEL[lv] = rowForLevels91To100();
  } else if (lv <= 110) {
    BY_LEVEL[lv] = rowForLevels101To110();
  } else if (lv <= 115) {
    BY_LEVEL[lv] = rowForLevels111To115();
  } else if (lv <= 120) {
    BY_LEVEL[lv] = rowForLevels116To120();
  } else if (lv <= 125) {
    BY_LEVEL[lv] = rowForLevels121To125();
  } else if (lv <= 130) {
    BY_LEVEL[lv] = rowForLevels126To130();
  } else if (lv <= 135) {
    BY_LEVEL[lv] = rowForLevels131To135();
  } else if (lv <= 140) {
    BY_LEVEL[lv] = rowForLevels136To140();
  } else if (lv <= 145) {
    BY_LEVEL[lv] = rowForLevels141To145();
  } else if (lv <= 150) {
    BY_LEVEL[lv] = rowForLevels146To150();
  } else if (lv <= 155) {
    BY_LEVEL[lv] = rowForLevels151To155();
  } else if (lv <= 160) {
    BY_LEVEL[lv] = rowForLevels156To160();
  } else if (lv <= 165) {
    BY_LEVEL[lv] = rowForLevels161To165();
  } else if (lv <= 170) {
    BY_LEVEL[lv] = rowForLevels166To170();
  } else if (lv <= 175) {
    BY_LEVEL[lv] = rowForLevels171To175();
  } else if (lv <= 180) {
    BY_LEVEL[lv] = rowForLevels176To180();
  } else if (lv <= 185) {
    BY_LEVEL[lv] = rowForLevels181To185();
  } else if (lv <= 190) {
    BY_LEVEL[lv] = rowForLevels186To190();
  } else if (lv <= 195) {
    BY_LEVEL[lv] = rowForLevels191To195();
  } else if (lv <= 200) {
    BY_LEVEL[lv] = rowForLevels196To200();
  } else if (lv <= 205) {
    BY_LEVEL[lv] = rowForLevels201To205();
  } else if (lv <= 210) {
    BY_LEVEL[lv] = rowForLevels206To210();
  } else if (lv <= 215) {
    BY_LEVEL[lv] = rowForLevels211To215();
  } else if (lv <= 220) {
    BY_LEVEL[lv] = rowForLevels216To220();
  } else if (lv <= 225) {
    BY_LEVEL[lv] = rowForLevels221To225();
  } else if (lv <= 230) {
    BY_LEVEL[lv] = rowForLevels226To230();
  } else if (lv <= 235) {
    BY_LEVEL[lv] = rowForLevels231To235();
  } else if (lv <= 240) {
    BY_LEVEL[lv] = rowForLevels236To240();
  } else if (lv <= 245) {
    BY_LEVEL[lv] = rowForLevels241To245();
  } else if (lv <= 250) {
    BY_LEVEL[lv] = rowForLevels246To250();
  } else if (lv <= 255) {
    BY_LEVEL[lv] = rowForLevels251To255();
  } else if (lv <= 260) {
    BY_LEVEL[lv] = rowForLevels256To260();
  } else if (lv <= 265) {
    BY_LEVEL[lv] = rowForLevels261To265();
  } else if (lv <= 270) {
    BY_LEVEL[lv] = rowForLevels266To270();
  } else if (lv <= 275) {
    BY_LEVEL[lv] = rowForLevels271To275();
  } else if (lv <= 280) {
    BY_LEVEL[lv] = rowForLevels276To280();
  } else if (lv <= 285) {
    BY_LEVEL[lv] = rowForLevels281To285();
  } else if (lv <= 290) {
    BY_LEVEL[lv] = rowForLevels286To290();
  } else if (lv <= 295) {
    BY_LEVEL[lv] = rowForLevels291To295();
  } else if (lv <= 300) {
    BY_LEVEL[lv] = rowForLevels296To300();
  } else if (lv <= 305) {
    BY_LEVEL[lv] = rowForLevels301To305();
  } else if (lv <= 310) {
    BY_LEVEL[lv] = rowForLevels306To310();
  } else if (lv <= 315) {
    BY_LEVEL[lv] = rowForLevels311To315();
  } else if (lv <= 320) {
    BY_LEVEL[lv] = rowForLevels316To320();
  } else if (lv <= 325) {
    BY_LEVEL[lv] = rowForLevels321To325();
  } else if (lv <= 330) {
    BY_LEVEL[lv] = rowForLevels326To330();
  } else if (lv <= 335) {
    BY_LEVEL[lv] = rowForLevels331To335();
  } else if (lv <= 340) {
    BY_LEVEL[lv] = rowForLevels336To340();
  } else if (lv <= 345) {
    BY_LEVEL[lv] = rowForLevels341To345();
  } else if (lv <= 350) {
    BY_LEVEL[lv] = rowForLevels346To350();
  } else if (lv <= 355) {
    BY_LEVEL[lv] = rowForLevels351To355();
  } else if (lv <= 360) {
    BY_LEVEL[lv] = rowForLevels356To360();
  } else if (lv <= 365) {
    BY_LEVEL[lv] = rowForLevels361To365();
  } else if (lv <= 370) {
    BY_LEVEL[lv] = rowForLevels366To370();
  } else if (lv <= 375) {
    BY_LEVEL[lv] = rowForLevels371To375();
  } else if (lv <= 380) {
    BY_LEVEL[lv] = rowForLevels376To380();
  } else if (lv <= 385) {
    BY_LEVEL[lv] = rowForLevels381To385();
  } else if (lv <= 390) {
    BY_LEVEL[lv] = rowForLevels386To390();
  } else if (lv <= 395) {
    BY_LEVEL[lv] = rowForLevels391To395();
  } else {
    BY_LEVEL[lv] = rowForLevels396To400();
  }
}

for (let lv = 401; lv <= 999; lv++) {
  BY_LEVEL[lv] = crewLevelMemberBonusesExtrapolated(lv);
}

/**
 * Total bonuses for a crew at this level (one row — not cumulative with lower levels).
 * @param crewLevel — crew `level` from DB (1…999); clamped for lookup; &gt;999 uses row 999.
 */
export function getCrewLevelMemberBonuses(crewLevel: number): CrewLevelMemberBonuses {
  const lv = Math.max(1, Math.floor(Number.isFinite(crewLevel) ? crewLevel : 1));
  const idx = Math.min(lv, CREW_LEVEL_BONUS_TABLE_MAX);
  return { ...BY_LEVEL[idx] };
}
