import { NativeModules, Platform } from 'react-native';

// Define the interface for our native module
interface AppleSignInNativeModule {
  requestAppleSignIn(): Promise<{
    user: string;
    identityToken: string;
    email?: string;
    fullName?: {
      givenName?: string;
      familyName?: string;
    };
  }>;
  isAvailable(): Promise<boolean>;
}

// Get the native module
const { AppleSignInModule } = NativeModules as { AppleSignInModule: AppleSignInNativeModule };

export class AppleSignInBridge {
  /**
   * Check if Apple Sign In is available on this device
   */
  static async isAvailable(): Promise<boolean> {
    if (Platform.OS !== 'ios') {
      return false;
    }
    
    try {
      return await AppleSignInModule.isAvailable();
    } catch (error) {
      console.error('Apple Sign In availability check failed:', error);
      return false;
    }
  }

  /**
   * Request Apple Sign In authentication
   */
  static async requestAppleSignIn(): Promise<{
    user: string;
    identityToken: string;
    email?: string;
    fullName?: {
      givenName?: string;
      familyName?: string;
    };
  }> {
    if (Platform.OS !== 'ios') {
      throw new Error('Apple Sign In is only available on iOS');
    }

    try {
      const result = await AppleSignInModule.requestAppleSignIn();
      return result;
    } catch (error) {
      console.error('Apple Sign In request failed:', error);
      throw error;
    }
  }
}

export default AppleSignInBridge;
