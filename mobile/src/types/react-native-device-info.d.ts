declare module 'react-native-device-info' {
  export function getUniqueId(): Promise<string>;
  export function getUniqueIdSync(): string;
  const DeviceInfo: {
    getUniqueId: () => Promise<string>;
    getUniqueIdSync: () => string;
  };
  export default DeviceInfo;
}
