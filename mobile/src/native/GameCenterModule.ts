import { NativeModules, Platform } from 'react-native';

const { GameCenterModule } = NativeModules;

export interface GameCenterAuthResult {
  authenticated: boolean;
  playerID: string;
  displayName: string;
  alias: string;
}

export interface GameCenterSubmitResult {
  success: boolean;
  leaderboardID: string;
  score: number;
}

class GameCenter {
  async authenticate(): Promise<GameCenterAuthResult> {
    if (Platform.OS !== 'ios') {
      throw new Error('Game Center is only available on iOS');
    }
    if (!GameCenterModule) {
      throw new Error('Game Center module is not available');
    }
    return GameCenterModule.authenticate();
  }

  async submitScore(leaderboardID: string, score: number): Promise<GameCenterSubmitResult> {
    if (Platform.OS !== 'ios') {
      throw new Error('Game Center is only available on iOS');
    }
    if (!GameCenterModule) {
      throw new Error('Game Center module is not available');
    }
    return GameCenterModule.submitScore(leaderboardID, score);
  }

  async isAuthenticated(): Promise<boolean> {
    if (Platform.OS !== 'ios') {
      return false;
    }
    if (!GameCenterModule) {
      return false;
    }
    return GameCenterModule.isAuthenticated();
  }

  async getPlayerID(): Promise<string> {
    if (Platform.OS !== 'ios') {
      throw new Error('Game Center is only available on iOS');
    }
    if (!GameCenterModule) {
      throw new Error('Game Center module is not available');
    }
    return GameCenterModule.getPlayerID();
  }
}

export default new GameCenter();
