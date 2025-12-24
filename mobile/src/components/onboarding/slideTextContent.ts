export interface SlideTextConfig {
  narrative: string;
  message: string;
  style: 'typewriter' | 'caption' | 'hybrid';
  position: 'top' | 'bottom' | 'center';
}

export const SLIDE_TEXT_CONTENT: Record<number, SlideTextConfig> = {
  1: {
    narrative: 'The world runs on systems. Systems run on money. And money attracts hackers.',
    message: 'This is a living, competitive economy. Nothing is free. Nothing is safe.',
    style: 'hybrid',
    position: 'bottom',
  },
  2: {
    narrative: 'You write code by night. By day, you work. Invest. Build. You are a hacker and an entrepreneur.',
    message: 'This game is about dual identity. Skill alone is not enough.',
    style: 'hybrid',
    position: 'bottom',
  },
  3: {
    narrative: 'You don\'t fight directly. You build bots. Each one costs money. Each one can be lost forever.',
    message: 'Every decision has a financial consequence.',
    style: 'hybrid',
    position: 'bottom',
  },
  4: {
    narrative: 'Stronger bots. Better defense. Smarter attacks. Research unlocks power - but drains cash fast.',
    message: 'You cannot master everything. Specialization matters.',
    style: 'hybrid',
    position: 'bottom',
  },
  5: {
    narrative: 'Build too fast and go broke. Save too much and fall behind. Power without planning collapses.',
    message: 'Aggression without economy is suicide.',
    style: 'hybrid',
    position: 'bottom',
  },
  6: {
    narrative: 'No diamonds. No magic currencies. Only money - and how you earn it.',
    message: 'Real-world financial thinking wins here.',
    style: 'hybrid',
    position: 'bottom',
  },
  7: {
    narrative: 'Rental properties generate cash. Research improves margins. Stability buys time. Time buys advantage.',
    message: 'Defense starts with income.',
    style: 'hybrid',
    position: 'bottom',
  },
  8: {
    narrative: 'High net worth gets noticed. Hackers scan the network. Someone is always watching.',
    message: 'Money attracts enemies. Protection is mandatory.',
    style: 'hybrid',
    position: 'bottom',
  },
  9: {
    narrative: 'Hack other players. Defend against raids. Lose bots. Lose money. Learn fast.',
    message: 'Every encounter is a financial bet.',
    style: 'hybrid',
    position: 'bottom',
  },
  10: {
    narrative: 'Join a crew for protection. Or stand alone and risk everything. Alliances shift. Trust breaks.',
    message: 'Social strategy matters as much as code.',
    style: 'hybrid',
    position: 'bottom',
  },
  11: {
    narrative: 'Focus on hacking - and risk bankruptcy. Focus on wealth - and risk being overrun. Balance is rare. Mastery is earned.',
    message: 'There is no perfect build.',
    style: 'hybrid',
    position: 'bottom',
  },
  12: {
    narrative: 'Top hackers by bots destroyed. Top tycoons by net worth. Few dominate both.',
    message: 'Define your legacy.',
    style: 'hybrid',
    position: 'bottom',
  },
  13: {
    narrative: 'Can you grow rich without being drained? Can you dominate without collapsing financially? Can you stay invisible - or rule openly?',
    message: 'Endgame tension is survival, not victory alone.',
    style: 'hybrid',
    position: 'bottom',
  },
  14: {
    narrative: 'This is not just hacking. This is not just strategy. This is financial warfare.',
    message: 'The game begins now.',
    style: 'hybrid',
    position: 'bottom',
  },
};

