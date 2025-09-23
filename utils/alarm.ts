import { NativeModules, Platform } from 'react-native';

export function triggerAlarm(title = 'Medicine Reminder', message = 'ถึงเวลาทานยา!') {
  if (Platform.OS === 'android' && NativeModules.AlarmModule) {
    NativeModules.AlarmModule.triggerAlarmNotification(title, message);
  }
}
