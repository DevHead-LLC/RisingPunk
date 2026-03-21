/**
 * @file BattleNotificationService.ts
 * @description Sends PvP battle result notifications to attacker and defender via private messages (system sender, same pattern as Probe Report).
 */

import { IBattleDocument } from '../models/Battle';
import { PrivateMessage } from '../models/PrivateMessage';
import { User } from '../models/User';
import { BATTLE_REPORT_SENDER_ID, BATTLE_REPORT_SENDER_USERNAME } from '../constants/systemSenders';
import { NodeOwner, IBattalion } from '../types/battle';
import { formatHackLocationDisplay } from '../utils/battleHackLocation';

const BATTLE_REPORT_PREFIX = 'BTL|';
const MAX_MESSAGE_LENGTH = 600;

type BotCounts = { guardian: number; breacher: number; phreak: number };

function sumByOwnerAndType(battalions: IBattalion[], owner: NodeOwner): BotCounts {
  const out: BotCounts = { guardian: 0, breacher: 0, phreak: 0 };
  for (const b of battalions) {
    if (b.owner !== owner) continue;
    const t = b.type as keyof BotCounts;
    if (out[t] !== undefined) out[t] += b.quantity ?? 0;
  }
  return out;
}

/**
 * Send battle result DMs to attacker and defender. Only call for user-vs-user battles (isUserDefender).
 * @param cashTransferred dollars moved defender → attacker when attacker won (0 if none).
 * Does not throw; logs errors so battle end is not blocked.
 */
export async function sendBattleNotifications(
  battle: IBattleDocument,
  cashTransferred: number = 0
): Promise<void> {
  if (!battle.isUserDefender) return;

  const startingBattalions = battle.startingBattalions ?? [];
  const endingBattalions = battle.battalions ?? [];

  const attackerStart = sumByOwnerAndType(startingBattalions, NodeOwner.USER);
  const defenderStart = sumByOwnerAndType(startingBattalions, NodeOwner.ENEMY);
  const attackerEnd = sumByOwnerAndType(endingBattalions, NodeOwner.USER);
  const defenderEnd = sumByOwnerAndType(endingBattalions, NodeOwner.ENEMY);

  const attackerLost: BotCounts = {
    guardian: Math.max(0, attackerStart.guardian - attackerEnd.guardian),
    breacher: Math.max(0, attackerStart.breacher - attackerEnd.breacher),
    phreak: Math.max(0, attackerStart.phreak - attackerEnd.phreak),
  };
  const defenderLost: BotCounts = {
    guardian: Math.max(0, defenderStart.guardian - defenderEnd.guardian),
    breacher: Math.max(0, defenderStart.breacher - defenderEnd.breacher),
    phreak: Math.max(0, defenderStart.phreak - defenderEnd.phreak),
  };

  let attackerHandle = 'Unknown';
  let defenderHandle = 'Unknown';
  try {
    const [attacker, defender] = await Promise.all([
      User.findById(battle.attackerId).select('handle').lean(),
      User.findById(battle.defenderId).select('handle').lean(),
    ]);
    attackerHandle = (attacker as any)?.handle ?? 'Unknown';
    defenderHandle = (defender as any)?.handle ?? 'Unknown';
  } catch (e) {
    console.error('BattleNotificationService: failed to load handles', e);
  }

  const winner = battle.winner === NodeOwner.USER ? 'user' : 'enemy';
  const cash =
    typeof cashTransferred === 'number' && Number.isFinite(cashTransferred)
      ? Math.max(0, Math.floor(cashTransferred))
      : 0;
  let payload: Record<string, unknown> = {
    br: 1,
    attackerId: String(battle.attackerId),
    defenderId: String(battle.defenderId),
    attackerHandle,
    defenderHandle,
    attackerStart,
    defenderStart,
    attackerLost,
    defenderLost,
    winner,
    cash,
  };
  const bx = (battle as any).hackMapCellX;
  const by = (battle as any).hackMapCellY;
  if (
    typeof bx === 'number' &&
    Number.isFinite(bx) &&
    typeof by === 'number' &&
    Number.isFinite(by)
  ) {
    try {
      (payload as any).hl = formatHackLocationDisplay(bx, by);
    } catch (e) {
      console.error('BattleNotificationService: formatHackLocationDisplay failed', e);
    }
  }
  let messageBody = BATTLE_REPORT_PREFIX + JSON.stringify(payload);
  if (messageBody.length > MAX_MESSAGE_LENGTH) {
    payload.attackerHandle = String(attackerHandle).slice(0, 20);
    payload.defenderHandle = String(defenderHandle).slice(0, 20);
    messageBody = BATTLE_REPORT_PREFIX + JSON.stringify(payload);
    if (messageBody.length > MAX_MESSAGE_LENGTH) {
      console.error('BattleNotificationService: payload too long, skipping send');
      return;
    }
  }

  try {
    await PrivateMessage.insertMany([
      {
        senderId: BATTLE_REPORT_SENDER_ID,
        recipientId: battle.attackerId,
        senderUsername: BATTLE_REPORT_SENDER_USERNAME,
        message: messageBody,
        readAt: null,
        isFromAdmin: false,
      },
      {
        senderId: BATTLE_REPORT_SENDER_ID,
        recipientId: battle.defenderId,
        senderUsername: BATTLE_REPORT_SENDER_USERNAME,
        message: messageBody,
        readAt: null,
        isFromAdmin: false,
      },
    ]);
  } catch (e) {
    console.error('BattleNotificationService: failed to save battle notifications', e);
  }
}

export { BATTLE_REPORT_PREFIX };
