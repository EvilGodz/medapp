import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Always use this to get the API base URL
export function getApiBaseUrl() {
  // Use 10.0.2.2 for Android emulator, otherwise use env
  if (Platform.OS === 'android') {
    return 'https://ecpmecoreapp.online';
  }
  // Try expo extra first, fallback to process.env (for web), fallback to default
  return (
    Constants.expoConfig?.extra?.CALL_API ||
    process.env.CALL_API ||
    'https://ecpmecoreapp.online'
  );
}
