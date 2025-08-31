import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const DEVICE_ID_KEY = '@RisingPunk:deviceId';

export const generateDeviceId = (): string => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2);
  const platform = Platform.OS.substring(0, 3);
  
  return `${platform}_${timestamp}_${random}`;
};

export const getDeviceId = async (): Promise<string> => {
  try {
    let deviceId = await AsyncStorage.getItem(DEVICE_ID_KEY);
    
    if (!deviceId) {
      deviceId = generateDeviceId();
      await AsyncStorage.setItem(DEVICE_ID_KEY, deviceId);
      console.log('🔧 Generated new device ID:', deviceId);
    }
    
    return deviceId;
  } catch (error) {
    console.error('❌ Error getting device ID:', error);
    // Fallback to generated ID if storage fails
    return generateDeviceId();
  }
};

export const setDeviceId = async (deviceId: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(DEVICE_ID_KEY, deviceId);
  } catch (error) {
    console.error('❌ Error setting device ID:', error);
  }
};
