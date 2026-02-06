import { IUser } from '../models/User';
import { IUserTaskProgress } from '../models/UserTaskProgress';

export interface Task {
  id: string;
  title: string;
  description: string;
  order: number;
  autoCompleteConditions?: (user: IUser, progress?: IUserTaskProgress) => boolean;
  skipable: boolean;
  reward?: {
    type: string;
    value: number;
  };
  howTo?: string;
}

let cachedTaskList: Task[] | null = null;

export const getTaskList = (): Task[] => {
  if (!cachedTaskList) {
    cachedTaskList = TASK_LIST;
  }
  return cachedTaskList;
};

const TASK_LIST: Task[] = [
  {
    id: 'create-account',
    title: 'Create Account',
    description: 'Welcome to RisingPunk!',
    order: 1,
    autoCompleteConditions: (user: IUser) => true, // Always true for logged-in users
    skipable: false,
    reward: { type: 'wallet', value: 10 }
  },
  {
    id: 'view-profile',
    title: 'View Profile',
    description: 'Check out your profile page',
    order: 2,
    autoCompleteConditions: (user: IUser, progress?: IUserTaskProgress) => {
      // Auto-complete if profile has been visited (forward compatible only)
      return !!(progress?.profileVisitedAt);
    },
    skipable: true,
    reward: { type: 'wallet', value: 10 }
  },
  {
    id: 'use-hacker-mode',
    title: 'Use Hacker (Dark) Mode',
    description: 'Switch to dark theme',
    order: 3,
    autoCompleteConditions: (user: IUser, progress?: IUserTaskProgress) => {
      return !!(progress?.themeChangedToDarkAt);
    },
    skipable: true,
    reward: { type: 'wallet', value: 10 }
  },
  {
    id: 'use-business-mode',
    title: 'Use Business (Light) Mode',
    description: 'Switch to light theme',
    order: 4,
    autoCompleteConditions: (user: IUser, progress?: IUserTaskProgress) => {
      return !!(progress?.themeChangedToLightAt);
    },
    skipable: true,
    reward: { type: 'wallet', value: 10 }
  },
  {
    id: 'change-avatar',
    title: 'Change your avatar',
    description: 'Update your profile avatar',
    order: 5,
    autoCompleteConditions: (user: IUser, progress?: IUserTaskProgress) => {
      return !!(progress?.avatarChangedAt);
    },
    skipable: true,
    reward: { type: 'wallet', value: 10 }
  },
  {
    id: 'hide-task-list',
    title: 'Hide this Task List',
    description: 'Hide the task guide from view',
    order: 6,
    autoCompleteConditions: (user: IUser, progress?: IUserTaskProgress) => {
      return progress?.showTaskGuide === false;
    },
    skipable: true,
    reward: { type: 'wallet', value: 10 }
  },
  {
    id: 'show-task-list',
    title: 'Show the Task List',
    description: 'Show the task guide',
    order: 7,
    autoCompleteConditions: (user: IUser, progress?: IUserTaskProgress) => {
      return !!(progress?.taskGuideShownAt);
    },
    skipable: true,
    reward: { type: 'wallet', value: 10 }
  },
  {
    id: 'visit-home',
    title: 'Visit the Home Location',
    description: 'Navigate to your home',
    order: 8,
    autoCompleteConditions: (user: IUser, progress?: IUserTaskProgress) => {
      return !!(progress?.homeVisitedAt);
    },
    skipable: true,
    reward: { type: 'wallet', value: 10 }
  },
  {
    id: 'build-100-guardians',
    title: 'Build 100 Guardians',
    description: 'Build 100 Guardian bots in your garage',
    order: 9,
    // Auto-complete when user has built 100+ guardians (checked on every task list fetch)
    // Logic:
    // - If totalGuardiansBuilt doesn't exist (undefined/null): assume 0, don't auto-complete
    // - If totalGuardiansBuilt exists and < 100: don't auto-complete
    // - If totalGuardiansBuilt exists and >= 100: auto-complete (show "Collect" button)
    autoCompleteConditions: (user: IUser, progress?: IUserTaskProgress) => {
      // Explicitly check if property exists and is a valid number
      const totalBuilt = user.totalGuardiansBuilt;
      // If property doesn't exist (undefined/null) or is not a number, treat as 0
      if (totalBuilt === undefined || totalBuilt === null || typeof totalBuilt !== 'number') {
        return false;
      }
      // Only auto-complete if user has built 100 or more guardians
      return totalBuilt >= 100;
    },
    skipable: true,
    reward: { type: 'wallet', value: 50 }
  },
  {
    id: 'free-hack-rig',
    title: 'Free your Hack Rig',
    description: 'Unlock the Hack Rig feature',
    order: 10,
    autoCompleteConditions: (user: IUser, progress?: IUserTaskProgress) => {
      return user.unlockedFeatures?.hackRig === true;
    },
    skipable: true,
    reward: { type: 'wallet', value: 20 }
  },
  {
    id: 'visit-hackmap',
    title: 'Visit the Hackmap',
    description: 'Explore the hack map',
    order: 11,
    autoCompleteConditions: (user: IUser, progress?: IUserTaskProgress) => {
      return !!(progress?.hackmapVisitedAt);
    },
    skipable: true,
    reward: { type: 'wallet', value: 20 }
  },
  {
    id: 'visit-digital-barracks',
    title: 'Visit the Digital Barracks',
    description: 'Check out the Digital Barracks',
    order: 12,
    autoCompleteConditions: (user: IUser, progress?: IUserTaskProgress) => {
      return !!(progress?.digitalBarracksVisitedAt);
    },
    skipable: true,
    reward: { type: 'wallet', value: 20 }
  },
  {
    id: 'view-wallet',
    title: 'View your wallet',
    description: 'Check your balance',
    order: 13,
    autoCompleteConditions: (user: IUser, progress?: IUserTaskProgress) => {
      return !!(progress?.walletViewedAt);
    },
    skipable: true,
    reward: { type: 'wallet', value: 20 }
  },
  {
    id: 'hack-first-npc',
    title: 'Hack a Level 1 NPC',
    description: 'Attack an NPC on the hack map',
    order: 14,
    autoCompleteConditions: (user: IUser, progress?: IUserTaskProgress) => {
      return !!(progress?.attackedLevel1NpcAt);
    },
    skipable: true,
    reward: { type: 'wallet', value: 20 },
    howTo: 'Navigate: HomeLocation > HackRig > HackMap > LEVEL 1 NPC\n\nLook for the level indicator at the top right of the NPC tile.'
  },
  {
    id: 'build-research-center',
    title: 'Build the Research Center',
    description: 'Construct the Research Center building',
    order: 15,
    autoCompleteConditions: (user: IUser, progress?: IUserTaskProgress) => {
      return user.unlockedFeatures?.researchCenter === true;
    },
    skipable: true,
    reward: { type: 'wallet', value: 30 }
  },
  {
    id: 'reach-level-2',
    title: 'Get to level 2',
    description: 'Level up to level 2',
    order: 16,
    autoCompleteConditions: (user: IUser, progress?: IUserTaskProgress) => {
      return user.level >= 2;
    },
    skipable: true,
    reward: { type: 'wallet', value: 30 },
    howTo: 'Navigate: HomeLocation > HackRig > HackMap\n\nGo through enough battles to advance to level 2. You can view your current level and progress in your profile.'
  },
  {
    id: 'view-member-profile',
    title: "View another member's Profile",
    description: 'Visit another player\'s profile',
    order: 17,
    autoCompleteConditions: (user: IUser, progress?: IUserTaskProgress) => {
      return !!(progress?.visitedAnotherUserProfileAt);
    },
    skipable: true,
    reward: { type: 'wallet', value: 30 },
    howTo: 'Navigate: HomeLocation > HackRig > HackMap\n\nClick on a player-owned cell on the map, then click "View Profile" to visit another player\'s profile.'
  },
  {
    id: 'build-investment-property',
    title: 'Build an Investment Property',
    description: 'Construct your first investment property',
    order: 18,
    autoCompleteConditions: (user: IUser, progress?: IUserTaskProgress) => {
      return user.unlockedFeatures?.rentalHousing1 === true;
    },
    skipable: true,
    reward: { type: 'wallet', value: 30 }
  },
  {
    id: 'unlock-home-defense',
    title: 'Unlock Home Defense Category in Research Center',
    description: 'Unlock the Home Defense research category',
    order: 19,
    autoCompleteConditions: (user: IUser, progress?: IUserTaskProgress) => {
      return !!(progress?.homeDefenseUnlockedAt);
    },
    skipable: true,
    reward: { type: 'wallet', value: 25 },
    howTo: 'Navigate: HomeLocation > Research Center > Home Defense Category\n\nRequirements: Level 2 and $10,000 wallet balance. If you don\'t meet these requirements yet, fight NPCs in the HackMap to level up and earn money.'
  },
  {
    id: 'unlock-antivirus',
    title: 'Unlock Antivirus Shielding Feature',
    description: 'Research and unlock Antivirus protection',
    order: 20,
    autoCompleteConditions: (user: IUser, progress?: IUserTaskProgress) => {
      return !!(progress?.antivirusUnlockedAt);
    },
    skipable: true,
    reward: { type: 'wallet', value: 30 },
    howTo: 'Navigate: HomeLocation > Research Center > Home Defense Category > Antivirus Feature\n\nRequirements: Level 2 and $25,000 wallet balance. If you don\'t meet these requirements yet, fight NPCs in the HackMap to level up and earn money. Once you start research, it will take time to complete. You can speed it up for a fee if desired.'
  },
  {
    id: 'use-shield',
    title: 'Use a shield',
    description: 'Activate an Antivirus Shield to protect your system from attacks',
    order: 21,
    autoCompleteConditions: (user: IUser, progress?: IUserTaskProgress) => {
      return !!(progress?.shieldActivatedAt);
    },
    skipable: true,
    reward: { type: 'wallet', value: 35 },
    howTo: 'Navigate: Home > HackRig / HackMapScreen > Toolbar (bottom right of screen) > Click Shield > In modal, select a shield time and click it.\n\n*Must have unlocked Antivirus in research for shielding ability.'
  },
  {
    id: 'build-investment-property-2',
    title: 'Build Investment Property 2',
    description: 'Construct your second investment property (Property 2)',
    order: 22,
    autoCompleteConditions: (user: IUser, progress?: IUserTaskProgress) => {
      return user.unlockedFeatures?.rentalHousing2 === true;
    },
    skipable: true,
    reward: { type: 'wallet', value: 40 },
    howTo: 'Navigate: Home (Turf) > Development Zone > Investment Property 2 — tap the location to unlock and start construction. Build completes in 2 hours (or speed up for a fee). Requires Property 1 built first and sufficient balance to unlock.'
  },
  {
    id: 'view-financial-statement',
    title: 'View financial statement',
    description: 'Open the Financial Statement screen to see income and cash flow',
    order: 23,
    autoCompleteConditions: (user: IUser, progress?: IUserTaskProgress) => {
      return !!(progress?.financialStatementViewedAt);
    },
    skipable: true,
    reward: { type: 'wallet', value: 45 },
    howTo: 'Navigate: Home (Turf) > tap Wallet/Balance (top) > Financial Statement view opens.'
  },
  {
    id: 'reach-level-3',
    title: 'Achieve level 3',
    description: 'Reach level 3 by fighting on the Hack Map',
    order: 24,
    autoCompleteConditions: (user: IUser, progress?: IUserTaskProgress) => {
      return user.level >= 3;
    },
    skipable: true,
    reward: { type: 'wallet', value: 50 },
    howTo: 'Navigate: Home (Turf) > HackRig > HackMap. Fight NPCs or players to gain experience and reach level 3. You can view your current level and progress in your profile.'
  },
  {
    id: 'view-username-change-setting',
    title: 'View "Username Change" setting',
    description: 'Open the Account settings and view the Change User Handle (username change) option',
    order: 25,
    autoCompleteConditions: (user: IUser, progress?: IUserTaskProgress) => {
      return !!(progress?.usernameChangeSettingViewedAt);
    },
    skipable: true,
    reward: { type: 'wallet', value: 55 },
    howTo: 'Navigate: Home (Turf) > Profile > Account tab. The "Change User Handle" (username change) setting is here.'
  },
  {
    id: 'build-100-each-bot-type-remaining',
    title: 'Achieve total bot builds of 100 of each type remaining',
    description: 'Build 100 Breachers and 100 Phreaks (100 Guardians already counted in a prior task)',
    order: 26,
    autoCompleteConditions: (user: IUser, progress?: IUserTaskProgress) => {
      const breachers = user.totalBreachersBuilt;
      const phreaks = user.totalPhreaksBuilt;
      if (breachers === undefined || breachers === null || typeof breachers !== 'number') return false;
      if (phreaks === undefined || phreaks === null || typeof phreaks !== 'number') return false;
      return breachers >= 100 && phreaks >= 100;
    },
    skipable: true,
    reward: { type: 'wallet', value: 60 },
    howTo: 'Navigate: Home (Turf) > Digital Barracks. Build bots in the garage until you have 100 Breachers and 100 Phreaks (Guardians already count from a prior task).'
  },
  {
    id: 'hack-level-5-npc',
    title: 'Hack a level 5 NPC',
    description: 'Attack a level 5 NPC on the hack map',
    order: 27,
    autoCompleteConditions: (user: IUser, progress?: IUserTaskProgress) => {
      return !!(progress?.attackedLevel5NpcAt);
    },
    skipable: true,
    reward: { type: 'wallet', value: 65 },
    howTo: 'Navigate: Home (Turf) > HackRig > HackMap > LEVEL 5 NPC. Look for the level indicator at the top right of the NPC tile.'
  },
  {
    id: 'build-500-each-bot-type',
    title: 'Achieve total bot builds of 500 of each type',
    description: 'Build 500 Guardians, 500 Breachers, and 500 Phreaks',
    order: 29,
    autoCompleteConditions: (user: IUser, progress?: IUserTaskProgress) => {
      const guardians = user.totalGuardiansBuilt;
      const breachers = user.totalBreachersBuilt;
      const phreaks = user.totalPhreaksBuilt;
      if (guardians === undefined || guardians === null || typeof guardians !== 'number') return false;
      if (breachers === undefined || breachers === null || typeof breachers !== 'number') return false;
      if (phreaks === undefined || phreaks === null || typeof phreaks !== 'number') return false;
      return guardians >= 500 && breachers >= 500 && phreaks >= 500;
    },
    skipable: true,
    reward: { type: 'wallet', value: 75 },
    howTo: 'Navigate: Home (Turf) > Digital Barracks. Build bots in the garage until you have 500 Guardians, 500 Breachers, and 500 Phreaks.'
  }
];

export default TASK_LIST;

