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
      battalions: isUnlocked && data.battalions ? data.battalions : null,
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

    // Atomic guard: only one concurrent unlock can match — preset must still be locked (Bugbot: double-charge race if filter is only _id).
    const updateResult = await User.findOneAndUpdate(
      {
        _id: req.user._id,
        $or: [
          { [`battlePresets.${key}.unlockedAt`]: { $exists: false } },
          { [`battlePresets.${key}.unlockedAt`]: null },
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
      res.status(500).json({ error: 'Failed to unlock preset.' });
      return;
    }

    res.json({
      success: true,
      presets: buildPresetsResponse(updateResult),
      newBalance,
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
    for (const [battalionId, config] of Object.entries(battalions)) {
      if (!VALID_BATTALION_IDS.includes(battalionId as any)) {
        res.status(400).json({ error: `Invalid battalion ID: ${battalionId}. Must be A–F.` });
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
