import express, { Request, Response } from 'express';
import auth from '../middleware/auth';
import { User } from '../models/User';
import {
  BATTLE_PRESET_DEFINITIONS,
  VALID_PRESET_IDS,
  VALID_BATTALION_IDS,
  VALID_BOT_TYPES,
} from '../config/battlePresetsConfig';
import { accrueBalanceToTime } from '../utils/balanceAccrual';

const router = express.Router();

type PresetKey = 'preset1' | 'preset2' | 'preset3';

function presetKey(id: string): PresetKey {
  return `preset${id}` as PresetKey;
}

/**
 * Mixed/legacy documents may store battalion keys as lowercase or odd shapes; API always returns A–F keys.
 */
function normalizeBattalionsFromRaw(raw: unknown): Record<string, { botType: string; quantity: number }> | null {
  if (raw == null) return null;
  let obj: Record<string, unknown>;
  if (raw instanceof Map) {
    obj = Object.fromEntries(raw);
  } else if (typeof raw === 'object' && !Array.isArray(raw)) {
    obj = raw as Record<string, unknown>;
  } else {
    return null;
  }
  const out: Record<string, { botType: string; quantity: number }> = {};
  for (const id of VALID_BATTALION_IDS) {
    const v = obj[id] ?? obj[id.toLowerCase()];
    if (!v || typeof v !== 'object' || Array.isArray(v)) continue;
    const cfg = v as Record<string, unknown>;
    const rawBt = typeof cfg.botType === 'string' ? cfg.botType.trim().toLowerCase() : '';
    if (!rawBt || !VALID_BOT_TYPES.includes(rawBt as (typeof VALID_BOT_TYPES)[number])) {
      continue;
    }
    const botType = rawBt;
    const rawQty = cfg.quantity;
    let qty: number;
    if (typeof rawQty === 'number' && Number.isFinite(rawQty)) {
      qty = Math.round(rawQty);
    } else if (typeof rawQty === 'string' && /^\d+$/.test(rawQty.trim())) {
      qty = parseInt(rawQty.trim(), 10);
    } else {
      continue;
    }
    if (!Number.isInteger(qty) || qty < 0) {
      continue;
    }
    if (qty > 0) {
      out[id] = { botType, quantity: qty };
    }
  }
  return Object.keys(out).length > 0 ? out : null;
}

function buildPresetsResponse(user: any) {
  const presets: Record<string, any> = {};
  for (const id of VALID_PRESET_IDS) {
    const def = BATTLE_PRESET_DEFINITIONS[id];
    const data = user.battlePresets?.[presetKey(id)];
    const isUnlocked = !!data?.unlockedAt;
    presets[id] = {
      id,
      levelRequired: def.level,
      cost: def.cost,
      unlocked: isUnlocked,
      unlockedAt: isUnlocked ? data.unlockedAt : null,
      battalions: isUnlocked ? normalizeBattalionsFromRaw(data?.battalions) : null,
    };
  }
  return presets;
}

router.get('/', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.user._id).select('battlePresets level');
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json({ presets: buildPresetsResponse(user), userLevel: user.level });
  } catch (error) {
    console.error('Error fetching battle presets:', error);
    res.status(500).json({ error: 'Failed to fetch battle presets' });
  }
});

router.post('/:presetId/unlock', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { presetId } = req.params;

    if (!VALID_PRESET_IDS.includes(presetId as any)) {
      res.status(400).json({ error: 'Invalid preset ID. Must be 1, 2, or 3.' });
      return;
    }

    const def = BATTLE_PRESET_DEFINITIONS[presetId];
    const key = presetKey(presetId);

    const user = await User.findById(req.user._id);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (user.battlePresets?.[key]?.unlockedAt) {
      res.status(400).json({ error: 'Preset already unlocked.' });
      return;
    }

    if (user.level < def.level) {
      res.status(400).json({
        error: `You must reach Level ${def.level} to unlock this preset.`,
        levelRequired: def.level,
        currentLevel: user.level,
      });
      return;
    }

    const now = new Date();
    const accrued = accrueBalanceToTime(
      user.balance.total,
      user.balance.ratePerSecond,
      user.balance.lastUpdated,
      user.balance.fractionalRemainder,
      now
    );

    if (accrued.total < def.cost) {
      res.status(400).json({
        error: `Insufficient funds — $${def.cost.toLocaleString()} required.`,
        costRequired: def.cost,
        currentBalance: accrued.total,
      });
      return;
    }

    const newBalance = accrued.total - def.cost;

    const frRead = user.balance.fractionalRemainder ?? 0;
    const fractionalFingerprint =
      frRead === 0
        ? {
            $or: [
              { 'balance.fractionalRemainder': 0 },
              { 'balance.fractionalRemainder': null },
              { 'balance.fractionalRemainder': { $exists: false } },
            ],
          }
        : { 'balance.fractionalRemainder': frRead };

    // Atomic guard: preset still locked + balance row unchanged since read (Bugbot: concurrent unlocks of
    // different presets must not both deduct from the same stale balance snapshot).
    const updateResult = await User.findOneAndUpdate(
      {
        _id: req.user._id,
        $and: [
          {
            $or: [
              { [`battlePresets.${key}.unlockedAt`]: { $exists: false } },
              { [`battlePresets.${key}.unlockedAt`]: null },
            ],
          },
          {
            'balance.total': user.balance.total,
            'balance.ratePerSecond': user.balance.ratePerSecond,
            'balance.lastUpdated': user.balance.lastUpdated,
          },
          fractionalFingerprint,
        ],
      },
      {
        $set: {
          'balance.total': newBalance,
          'balance.fractionalRemainder': accrued.fractionalRemainder,
          'balance.lastUpdated': accrued.lastUpdated,
          [`battlePresets.${key}.unlockedAt`]: now,
        },
      },
      { new: true }
    );

    if (!updateResult) {
      const existing = await User.findById(req.user._id).select(`battlePresets.${key}`);
      if (!existing) {
        res.status(404).json({ error: 'User not found' });
        return;
      }
      if (existing.battlePresets?.[key]?.unlockedAt) {
        res.status(400).json({ error: 'Preset already unlocked.' });
        return;
      }
      res.status(409).json({ error: 'Balance changed. Please try again.' });
      return;
    }

    res.json({
      success: true,
      presets: buildPresetsResponse(updateResult),
      newBalance: updateResult.balance.total,
    });
  } catch (error) {
    console.error('Error unlocking battle preset:', error);
    res.status(500).json({ error: 'Failed to unlock preset' });
  }
});

router.put('/:presetId', auth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { presetId } = req.params;
    const { battalions } = req.body;

    if (!VALID_PRESET_IDS.includes(presetId as any)) {
      res.status(400).json({ error: 'Invalid preset ID. Must be 1, 2, or 3.' });
      return;
    }

    const key = presetKey(presetId);

    const user = await User.findById(req.user._id).select('battlePresets');
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (!user.battlePresets?.[key]?.unlockedAt) {
      res.status(400).json({ error: 'Preset must be unlocked before configuring.' });
      return;
    }

    if (!battalions || typeof battalions !== 'object') {
      res.status(400).json({ error: 'battalions is required and must be an object.' });
      return;
    }

    const validatedBattalions: Record<string, { botType: string; quantity: number }> = {};
    for (const [battalionIdRaw, config] of Object.entries(battalions)) {
      const battalionId = String(battalionIdRaw).toUpperCase();
      if (!VALID_BATTALION_IDS.includes(battalionId as any)) {
        res.status(400).json({ error: `Invalid battalion ID: ${battalionIdRaw}. Must be A–F.` });
        return;
      }
      const cfg = config as any;
      if (!cfg || typeof cfg !== 'object') {
        res.status(400).json({ error: `Invalid config for battalion ${battalionId}.` });
        return;
      }
      if (!VALID_BOT_TYPES.includes(cfg.botType)) {
        res.status(400).json({ error: `Invalid bot type for battalion ${battalionId}. Must be breacher, guardian, or phreak.` });
        return;
      }
      if (typeof cfg.quantity !== 'number' || cfg.quantity < 0 || !Number.isInteger(cfg.quantity)) {
        res.status(400).json({ error: `Invalid quantity for battalion ${battalionId}. Must be a non-negative integer.` });
        return;
      }
      validatedBattalions[battalionId] = { botType: cfg.botType, quantity: cfg.quantity };
    }

    const updateResult = await User.findOneAndUpdate(
      { _id: req.user._id },
      { $set: { [`battlePresets.${key}.battalions`]: validatedBattalions } },
      { new: true }
    );

    if (!updateResult) {
      res.status(500).json({ error: 'Failed to save preset.' });
      return;
    }

    res.json({
      success: true,
      presets: buildPresetsResponse(updateResult),
    });
  } catch (error) {
    console.error('Error saving battle preset:', error);
    res.status(500).json({ error: 'Failed to save preset' });
  }
});

export default router;
