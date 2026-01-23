import { NativeModules } from 'react-native';

interface BuildInfoModule {
  getVersionCode(): Promise<number>;
  getVersionName(): Promise<string>;
  getBuildInfo(): Promise<{
    versionCode: number;
    versionName: string;
    debug: boolean;
  }>;
}

const { BuildInfo } = NativeModules;

export const getBuildInfo = async (): Promise<{
  versionCode: number;
  versionName: string;
  debug: boolean;
}> => {
  if (!BuildInfo) {
    // Fallback for development or if module not available
    return {
      versionCode: 0,
      versionName: '0.0.0',
      debug: __DEV__,
    };
  }
  
  try {
    return await (BuildInfo as BuildInfoModule).getBuildInfo();
  } catch (error) {
    console.error('Failed to get build info:', error);
    return {
      versionCode: 0,
      versionName: '0.0.0',
      debug: __DEV__,
    };
  }
};

export const getVersionCode = async (): Promise<number> => {
  if (!BuildInfo) {
    return 0;
  }
  
  try {
    return await (BuildInfo as BuildInfoModule).getVersionCode();
  } catch (error) {
    console.error('Failed to get version code:', error);
    return 0;
  }
};

export const getVersionName = async (): Promise<string> => {
  if (!BuildInfo) {
    return '0.0.0';
  }
  
  try {
    return await (BuildInfo as BuildInfoModule).getVersionName();
  } catch (error) {
    console.error('Failed to get version name:', error);
    return '0.0.0';
  }
};
