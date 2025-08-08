### CURRENT TASK: NPC enemy entities (Levels 1–3) for battles and map

### Objectives
- Define 3 NPC enemy levels with increasing stats (attack, defense, speed, health); attack range stays constant per bot type.
- Prepare entities so Level 1 can be used for initial Hack Rig unlock battle; later distribute 2–3 of each on the map.
- Provide Mongo shell commands to seed these NPCs (manual one-time insert). No auto-creation in game logic.

### Authorities and constraints
- Follow `intended.md` for battle behavior. Use existing authorities before adding new logic.
- Keep a single source of truth for bot base stats: reuse server `BOT_CONFIG` (server/src/services/BotService.ts). NPC docs store multipliers, not duplicated absolute stats.
- Attack range remains constant across levels (range multiplier = 1.0 for all).
- Source of truth: **server** for stats application and battle assembly; client only visualizes.

### Document shape (collection: `npcs`)
```json
{
  "slug": string,                 // stable identifier (e.g., "npc-small-corporation")
  "name": string,                 // display name (e.g., "Small Corporation")
  "title": string,                // optional flavor title (e.g., "Level 1 Corporation")
  "tier": 1|2|3,                  // NPC level
  "battalions": [                 // composition for battle creation
    { "type": "guardian"|"breacher"|"phreak", "quantity": number }
  ],
  "statMultipliers": {            // applied over server BOT_CONFIG.ENEMY_BOT_STATS
    "health": number,
    "speed": number,
    "offense": number,
    "defense": number,
    "range": 1.0                  // range kept constant
  },
  "mapRecoverySeconds": number,   // respawn delay on the map (defeated → respawn elsewhere)
  "createdAt": Date,
  "updatedAt": Date
}
```

### Level specs (required)
- Level 1 (Small Corporation): 3 battalions × 25 each → 1 Guardian, 1 Breacher, 1 Phreak; multipliers 1.0×; mapRecoverySeconds = 300.
- Level 2 (Small Bank): 3 battalions × 150 each → 1 Guardian, 1 Breacher, 1 Phreak; multipliers 2.0× over Level 1; mapRecoverySeconds = 600.
- Level 3 (Large Corporation): 4 battalions × 250 each → 2 Guardians, 2 Phreaks; multipliers 1.5× over Level 2 (i.e., 3.0× over Level 1); mapRecoverySeconds = 900.

### Mongo shell seed commands (run manually)
```js
// DB: use your app DB, then run these. Collection: npcs
db.npcs.insertOne({
  slug: 'npc-small-corporation',
  name: 'Small Corporation',
  title: 'Level 1 Corporation',
  tier: 1,
  battalions: [
    { type: 'guardian', quantity: 25 },
    { type: 'breacher', quantity: 25 },
    { type: 'phreak', quantity: 25 }
  ],
  statMultipliers: { health: 1.0, speed: 1.0, offense: 1.0, defense: 1.0, range: 1.0 },
  mapRecoverySeconds: 300,
  createdAt: new Date(),
  updatedAt: new Date()
});

db.npcs.insertOne({
  slug: 'npc-small-bank',
  name: 'Small Bank',
  title: 'Level 2 Bank',
  tier: 2,
  battalions: [
    { type: 'guardian', quantity: 150 },
    { type: 'breacher', quantity: 150 },
    { type: 'phreak', quantity: 150 }
  ],
  statMultipliers: { health: 2.0, speed: 2.0, offense: 2.0, defense: 2.0, range: 1.0 },
  mapRecoverySeconds: 600,
  createdAt: new Date(),
  updatedAt: new Date()
});

db.npcs.insertOne({
  slug: 'npc-large-corporation',
  name: 'Large Corporation',
  title: 'Level 3 Corporation',
  tier: 3,
  battalions: [
    { type: 'guardian', quantity: 250 },
    { type: 'guardian', quantity: 250 },
    { type: 'phreak', quantity: 250 },
    { type: 'phreak', quantity: 250 }
  ],
  statMultipliers: { health: 3.0, speed: 3.0, offense: 3.0, defense: 3.0, range: 1.0 },
  mapRecoverySeconds: 900,
  createdAt: new Date(),
  updatedAt: new Date()
});
```

### Planned usage (no code changes in this task)
- Hack Rig unlock battle: use Level 1 NPC (`slug: npc-small-corporation`) as defender; server assembles enemy battalions directly from the document.
- Map: store NPC presence by referencing `slug` in `Map` cells (later), and when defeated set a respawn timer using `mapRecoverySeconds` before relocating.
- Stats application: apply `statMultipliers` over `BOT_CONFIG.ENEMY_BOT_STATS` at battle assembly time; keep range equal to base.

### Follow-ups to enable usage (future tasks)
- Add `NPCService` (server authority) to fetch an NPC by `slug`/`_id` and assemble enemy battalions and stats.
- Extend battle start API to accept `defenderNpcSlug` (or map spawn reference) and route to `NPCService`.
- Map integration: place 2–3 of each NPC level on the map, store `slug` per occupied cell, and implement respawn using `mapRecoverySeconds`.

### Clarifications needed
- Confirm base stats for Level 1: use `BOT_CONFIG.ENEMY_BOT_STATS` as the baseline to multiply, keeping per-type range unchanged. OK?
- Bot types locked to `guardian | breacher | phreak` for these NPCs? Any mark level defaults you want stored on the NPCs?
- Titles/names: keep as above (Level 1: Small Corporation, Level 2: Small Bank, Level 3: Large Corporation) with titles shown? Any preferred alternatives?
