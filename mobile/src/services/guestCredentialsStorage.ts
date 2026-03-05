/**
 * Persistent storage for guest account credentials (token and device ID).
 * Uses Keychain (iOS) / Keystore (Android) as primary storage so credentials survive
 * when AsyncStorage is cleared (e.g. app update, storage migration). Falls back to
 * AsyncStorage and migrates from AsyncStorage into Keychain when present.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';

const GUEST_TOKEN_KEY = 'guestToken';
const GUEST_DEVICE_ID_KEY = 'guestDeviceId';
const KEYCHAIN_SERVICE = 'com.risingpunk.guest';

async function getKeychainToken(): Promise<string | null> {
  try {
    const creds = await Keychain.getGenericPassword({ service: KEYCHAIN_SERVICE });
    if (creds && creds.username === 'token' && typeof creds.password === 'string' && creds.password.length > 0) {
      return creds.password;
    }
  } catch {
    // Keychain unavailable (e.g. first launch, simulator)
  }
  return null;
}

async function getKeychainDeviceId(): Promise<string | null> {
  try {
    const creds = await Keychain.getGenericPassword({ service: `${KEYCHAIN_SERVICE}.deviceId` });
    if (creds && creds.username === 'deviceId' && typeof creds.password === 'string' && creds.password.length > 0) {
      return creds.password;
    }
  } catch {
  }
  return null;
}

/** Get stored guest token: Keychain first, then AsyncStorage. Migrates from AsyncStorage to Keychain if found there. */
export async function getGuestToken(): Promise<string | null> {
  let value = await getKeychainToken();
  if (value) return value;
  value = await AsyncStorage.getItem(GUEST_TOKEN_KEY);
  if (value) {
    await setGuestToken(value);
  }
  return value;
}

/** Store guest token in both Keychain and AsyncStorage for resilience. */
export async function setGuestToken(token: string): Promise<void> {
  await AsyncStorage.setItem(GUEST_TOKEN_KEY, token);
  try {
    await Keychain.setGenericPassword('token', token, { service: KEYCHAIN_SERVICE });
  } catch {
    // Non-fatal; AsyncStorage still has it
  }
}

/** Remove stored guest token from both stores. */
export async function removeGuestToken(): Promise<void> {
  await AsyncStorage.removeItem(GUEST_TOKEN_KEY);
  try {
    await Keychain.resetGenericPassword({ service: KEYCHAIN_SERVICE });
  } catch {
  }
}

/** Get stored guest device ID: Keychain first, then AsyncStorage. Migrates from AsyncStorage to Keychain if found. */
export async function getGuestDeviceId(): Promise<string | null> {
  let value = await getKeychainDeviceId();
  if (value) return value;
  value = await AsyncStorage.getItem(GUEST_DEVICE_ID_KEY);
  if (value) {
    await setGuestDeviceId(value);
  }
  return value;
}

/** Store guest device ID in both Keychain and AsyncStorage. */
export async function setGuestDeviceId(deviceId: string): Promise<void> {
  await AsyncStorage.setItem(GUEST_DEVICE_ID_KEY, deviceId);
  try {
    await Keychain.setGenericPassword('deviceId', deviceId, { service: `${KEYCHAIN_SERVICE}.deviceId` });
  } catch {
  }
}
