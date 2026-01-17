import GameCenter from '../native/GameCenterModule';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LEADERBOARD_IDS = {
  TOTAL_BOTS_DESTROYED: 'total_bots_destroyed',
  LIFETIME_NET_WORTH: 'lifetime_net_worth',
};

const STORAGE_KEYS = {
  LAST_LIFETIME_NET_WORTH_SUBMISSION: 'gameCenter_last_lifetime_net_worth_submission',
};

// Throttle lifetime net worth submissions to once per hour
const LIFETIME_NET_WORTH_SUBMISSION_THROTTLE_MS = 60 * 60 * 1000; // 1 hour

class GameCenterService {
  private isAuthenticating = false;
  private authenticationPromise: Promise<void> | null = null;

  async ensureAuthenticated(): Promise<boolean> {
    try {
      const authenticated = await GameCenter.isAuthenticated();
      if (authenticated) {
        return true;
      }

      if (this.isAuthenticating && this.authenticationPromise) {
        await this.authenticationPromise;
        return await GameCenter.isAuthenticated();
      }

      this.isAuthenticating = true;
      this.authenticationPromise = GameCenter.authenticate()
        .then(() => {
          this.isAuthenticating = false;
          this.authenticationPromise = null;
        })
        .catch(() => {
          this.isAuthenticating = false;
          this.authenticationPromise = null;
        });

      await this.authenticationPromise;
      return await GameCenter.isAuthenticated();
    } catch (error) {
      return false;
    }
  }

  async submitBotsDestroyedScore(botsDestroyed: number): Promise<void> {
    try {
      const authenticated = await this.ensureAuthenticated();
      if (!authenticated) {
        return;
      }

      await GameCenter.submitScore(LEADERBOARD_IDS.TOTAL_BOTS_DESTROYED, botsDestroyed);
    } catch (error) {
      // Silently fail - Game Center is optional
    }
  }

  async submitLifetimeNetWorthScore(lifetimeNetWorth: number, force: boolean = false): Promise<void> {
    try {
      // Check throttling unless forced
      if (!force) {
        const lastSubmissionTime = await AsyncStorage.getItem(STORAGE_KEYS.LAST_LIFETIME_NET_WORTH_SUBMISSION);
        if (lastSubmissionTime) {
          const timeSinceLastSubmission = Date.now() - parseInt(lastSubmissionTime, 10);
          if (timeSinceLastSubmission < LIFETIME_NET_WORTH_SUBMISSION_THROTTLE_MS) {
            // Too soon, skip submission
            return;
          }
        }
      }

      const authenticated = await this.ensureAuthenticated();
      if (!authenticated) {
        return;
      }

      await GameCenter.submitScore(LEADERBOARD_IDS.LIFETIME_NET_WORTH, lifetimeNetWorth);
      
      // Update last submission time
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_LIFETIME_NET_WORTH_SUBMISSION, Date.now().toString());
    } catch (error) {
      // Silently fail - Game Center is optional
    }
  }
}

export default new GameCenterService();
