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
    title: 'Hack your first NPC',
    description: 'Attack an NPC on the hack map',
    order: 14,
    skipable: true,
    reward: { type: 'wallet', value: 20 }
  },
  {
    id: 'build-research-center',
    title: 'Build the Research Center',
    description: 'Construct the Research Center building',
    order: 15,
    skipable: true,
    reward: { type: 'wallet', value: 30 }
  },
  {
    id: 'reach-level-2',
    title: 'Get to level 2',
    description: 'Level up to level 2',
    order: 16,
    skipable: true,
    reward: { type: 'wallet', value: 30 }
  },
  {
    id: 'view-member-profile',
    title: "View another member's Profile",
    description: 'Visit another player\'s profile',
    order: 17,
    skipable: true,
    reward: { type: 'wallet', value: 30 }
  },
  {
    id: 'build-investment-property',
    title: 'Build an Investment Property',
    description: 'Construct your first investment property',
    order: 18,
    skipable: true,
    reward: { type: 'wallet', value: 30 }
  },
  {
    id: 'unlock-home-defense',
    title: 'Unlock Home Defense Category in Research Center',
    description: 'Unlock the Home Defense research category',
    order: 19,
    skipable: true,
    reward: { type: 'wallet', value: 30 }
  },
  {
    id: 'unlock-antivirus',
    title: 'Unlock Antivirus Shielding Feature',
    description: 'Research and unlock Antivirus protection',
    order: 20,
    skipable: true,
    reward: { type: 'wallet', value: 30 }
  }
];

export default TASK_LIST;

