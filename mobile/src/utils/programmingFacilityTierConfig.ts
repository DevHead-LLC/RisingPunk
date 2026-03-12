/**
 * Shared tier config and helpers for Programming Facility level screens:
 * Packet Breach, Race Condition Heist, Binary Bank Crack.
 * Single source of truth for tier reward labels and level ranges (Attack / Health / Defense cycle).
 */

export const TIER_CONFIGS: { tier: number; rewardLabel: string; levelRange: string }[] = [
  { tier: 1, rewardLabel: 'Attack +0.5', levelRange: '1.1–1.5' },
  { tier: 2, rewardLabel: 'Health +1', levelRange: '2.1–2.5' },
  { tier: 3, rewardLabel: 'Defense +0.10%', levelRange: '3.1–3.5' },
  { tier: 4, rewardLabel: 'Attack +1', levelRange: '4.1–4.5' },
  { tier: 5, rewardLabel: 'Health +2', levelRange: '5.1–5.5' },
  { tier: 6, rewardLabel: 'Defense +0.30%', levelRange: '6.1–6.5' },
  { tier: 7, rewardLabel: 'Attack +1.5', levelRange: '7.1–7.5' },
  { tier: 8, rewardLabel: 'Health +3', levelRange: '8.1–8.5' },
  { tier: 9, rewardLabel: 'Defense +0.50%', levelRange: '9.1–9.5' },
  { tier: 10, rewardLabel: 'Attack +2', levelRange: '10.1–10.5' },
  { tier: 11, rewardLabel: 'Health +4', levelRange: '11.1–11.5' },
  { tier: 12, rewardLabel: 'Defense +0.70%', levelRange: '12.1–12.5' },
  { tier: 13, rewardLabel: 'Attack +2.5', levelRange: '13.1–13.5' },
  { tier: 14, rewardLabel: 'Health +5', levelRange: '14.1–14.5' },
  { tier: 15, rewardLabel: 'Defense +0.90%', levelRange: '15.1–15.5' },
  { tier: 16, rewardLabel: 'Attack +3', levelRange: '16.1–16.5' },
  { tier: 17, rewardLabel: 'Health +6', levelRange: '17.1–17.5' },
  { tier: 18, rewardLabel: 'Defense +1.10%', levelRange: '18.1–18.5' },
  { tier: 19, rewardLabel: 'Attack +3.5', levelRange: '19.1–19.5' },
  { tier: 20, rewardLabel: 'Health +7', levelRange: '20.1–20.5' },
  { tier: 21, rewardLabel: 'Defense +1.30%', levelRange: '21.1–21.5' },
];

export function formatCost(cost: number): string {
  return `$${cost.toLocaleString()}`;
}
