import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notification from "expo-notifications";
import { NativeModules, Platform } from 'react-native';
import { MedRemind } from "./storage";

Notification.setNotificationHandler({
    handleNotification: async (notification) => {
        const data = notification.request.content.data as {
            showAlarmScreen?: boolean;
        } | null;

        return {
            shouldPlaySound: true,
            shouldSetBadge: true,
            shouldShowBanner: true,
            shouldShowList: true,
            shouldPresent: true,
            shouldShowAlert: true, // Show alert when in background
        };
    },
});

// Configure background behavior
Notification.setNotificationCategoryAsync('medication_alarm', [
    {
        identifier: 'TAKE_NOW',
        buttonTitle: 'รับประทานตอนนี้',
        options: {
            opensAppToForeground: true,
            isDestructive: false,
            isAuthenticationRequired: false,
        },
    },
]);

export async function registerForPushNotificationsAsync(): Promise<string|null> {
    let token: string | null = null;
    
    const {status: existingStatus} = await Notification.getPermissionsAsync();
    let finalStatus = existingStatus;

    if(existingStatus !== 'granted'){
        const {status} = await Notification.requestPermissionsAsync();
        finalStatus = status;
    }

    if(finalStatus !== 'granted'){
        return null;
    }

    try {
        const response = await Notification.getExpoPushTokenAsync();
        token = response.data;

        if(Platform.OS === 'android'){
            await Notification.setNotificationChannelAsync('default',{
                name:'default',
                importance: Notification.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250 ,250],
                lightColor: '#1a8e2d',
            });
        }

        return token;
    } catch (error) {
        console.error("Error getting push token:",error)
        return null;
    }
}

export interface NotificationSettings {
  sound: boolean;
  vibrate: boolean;
  showImage: boolean;
  continuousReminder: boolean;
}

export async function scheduleMedicationReminder(
  medication: MedRemind,
  settings?: NotificationSettings
): Promise<string|undefined> {
  if (!medication.reminderEnabled) return;

  try {
    // Load notification settings from AsyncStorage if not provided
    let notificationSettings: NotificationSettings;
    if (settings) {
      notificationSettings = settings;
    } else {
      try {
        const saved = await AsyncStorage.getItem('notification_settings');
        notificationSettings = saved ? JSON.parse(saved) : { sound: true, vibrate: true, showImage: false };
      } catch {
        notificationSettings = { sound: true, vibrate: true, showImage: false, continuousReminder: false };
      }
    }
    // Cancel all existing notifications for this medication first
    await cancelMedicationReminders(medication.id);

    // Only schedule for today and tomorrow
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    // Get all scheduled notifications to prevent duplicates
    const scheduledNotifications = await Notification.getAllScheduledNotificationsAsync();
    const scheduledTimes = new Set(
      scheduledNotifications
        .filter(n => n.content.data && n.content.data.medicationId === medication.id)
        .map(n => {
          const d = n.trigger && (n.trigger as any).date;
          return d ? new Date(d).getTime() : null;
        })
        .filter(Boolean)
    );

    for (const time of medication.times) {
      const [hours, minutes] = time.split(":").map(Number);
      for (const day of [today, tomorrow]) {
        const notificationDate = new Date(day);
        notificationDate.setHours(hours, minutes, 0, 0);

        // Only schedule if in the future
        if (notificationDate < now) continue;

        // Only schedule if after medication startDate
        const medStart = new Date(medication.startDate);
        if (notificationDate < medStart) continue;

        // Only schedule if within duration (if not ongoing)
        if (!/(ongoing|ต่อเนื่อง)/i.test(medication.duration)) {
          const match = medication.duration.match(/(\d+)/);
          if (match) {
            const durationDays = parseInt(match[1], 10);
            const endDate = new Date(medStart);
            endDate.setDate(medStart.getDate() + durationDays - 1);
            if (notificationDate > endDate) continue;
          }
        }

        // Prevent duplicate scheduling
        if (scheduledTimes.has(notificationDate.getTime())) continue;

        console.log('Scheduling notification for', medication.name, notificationDate.toString());
        // On Android prefer native exact alarms for precision
        if (Platform.OS === 'android' && (NativeModules as any).AlarmModule && (NativeModules as any).AlarmModule.scheduleExactAlarm) {
          try {
            const alarmId = `${medication.id}_${notificationDate.getTime()}`;
            await (NativeModules as any).AlarmModule.scheduleExactAlarm(alarmId, notificationDate.getTime(), "Medication Reminder", `อย่าลืมทาน ${medication.name} (${medication.dosage})`);
            continue;
          } catch (e) {
            console.warn('Native exact alarm failed, falling back to Expo for', medication.name, e);
          }
        }

        // Schedule initial notification
        await Notification.scheduleNotificationAsync({
          content: {
            title: "Medication Reminder",
            body: `อย่าลืมทาน ${medication.name} (${medication.dosage})`,
            data: { 
              medicationId: medication.id,
              showAlarmScreen: notificationSettings.showImage,
              isInitialReminder: true
            },
            // ensure android channel is set
            ...(Platform.OS === 'android' && { channelId: 'default' }),
            // platform-specific control for sound/vibrate
            ...(Platform.OS === 'android' ? {
              sound: notificationSettings.sound ? 'default' : undefined,
              // Android vibration pattern is set via channel; handled in registerForPushNotificationsAsync
            } : {}),
            ...(Platform.OS === 'ios' ? {
              sound: notificationSettings.sound ? 'default' : undefined,
            } : {}),
            // When showImage is true, we'll navigate to the alarm screen instead of showing an image
            categoryIdentifier: notificationSettings.showImage ? 'medication_alarm' : undefined,
          },
          trigger: {
            type: Notification.SchedulableTriggerInputTypes.DATE,
            date: notificationDate,
          },
        });

        // Schedule continuous reminders if enabled
        if (notificationSettings.continuousReminder) {
          // Schedule 5 additional reminders at 10-minute intervals (total 1 hour coverage)
          for (let i = 1; i <= 5; i++) {
            const reminderDate = new Date(notificationDate.getTime() + i * 10 * 60 * 1000); // Add 10 minutes * i
            
            await Notification.scheduleNotificationAsync({
              content: {
                title: "Medication Reminder",
                body: `อย่าลืมทาน ${medication.name} (${medication.dosage}) (แจ้งเตือนซ้ำครั้งที่ ${i})`,
                data: { 
                  medicationId: medication.id,
                  showAlarmScreen: notificationSettings.showImage,
                  isFollowUpReminder: true,
                  reminderCount: i
                },
                ...(Platform.OS === 'android' && { channelId: 'default' }),
                ...(Platform.OS === 'android' ? {
                  sound: notificationSettings.sound ? 'default' : undefined,
                } : {}),
                ...(Platform.OS === 'ios' ? {
                  sound: notificationSettings.sound ? 'default' : undefined,
                } : {}),
                categoryIdentifier: notificationSettings.showImage ? 'medication_alarm' : undefined,
              },
              trigger: {
                type: Notification.SchedulableTriggerInputTypes.DATE,
                date: reminderDate,
              },
            });
          }
        }
      }
    }
    return "scheduled";
  } catch (error) {
    console.error("Error scheduling medication reminder:", error);
    return undefined;
  }
}

export async function cancelMedicationReminders(
    medicationId: string
  ): Promise<void> {
    try {
      const scheduledNotifications =
        await Notification.getAllScheduledNotificationsAsync();
  
      for (const notification of scheduledNotifications) {
        const data = notification.content.data as {
          medicationId?: string;
        } | null;
        if (data?.medicationId === medicationId) {
          await Notification.cancelScheduledNotificationAsync(
            notification.identifier
          );
        }
      }
      // Also cancel native exact alarms for this medication
      if (Platform.OS === 'android' && (NativeModules as any).AlarmModule && (NativeModules as any).AlarmModule.cancelExactAlarm) {
        // We persisted IDs as `${medication.id}_${timestamp}`; scan prefs via native side if implemented else try best-effort
        // Best-effort: cancel alarms within next 48 hours for this medication
        const now = Date.now();
        const twoDays = now + 48 * 60 * 60 * 1000;
        // Try many times for safety — native side ideally exposes a query; for now only attempt likely IDs
        for (let t = now; t <= twoDays; t += 60 * 60 * 1000) {
          const id = `${medicationId}_${t}`;
          try { (NativeModules as any).AlarmModule.cancelExactAlarm(id); } catch {};
        }
      }
    } catch (error) {
      console.error("Error canceling medication reminders:", error);
    }
  }

  export async function updateMedicationReminders(
    medication: MedRemind,
    settings?: NotificationSettings
  ): Promise<void> {
    try {
      //cancel old reminders
      await cancelMedicationReminders(medication.id);
  
      //schedule new reminders
      await scheduleMedicationReminder(medication, settings);
    } catch (error) {
      console.error("Error updating medication reminders:", error);
    }
  }

  // ลบแจ้งเตือนทั้งหมด (ใช้เมื่อออกจากระบบ)
  export async function cancelContinuousReminders(
    medicationId: string,
    timestamp: number
  ): Promise<void> {
    try {
      const scheduledNotifications = await Notification.getAllScheduledNotificationsAsync();
      
      for (const notification of scheduledNotifications) {
        const data = notification.content.data as {
          medicationId?: string;
          isFollowUpReminder?: boolean;
        } | null;

        // Only cancel follow-up reminders for this specific medication
        if (data?.medicationId === medicationId && data?.isFollowUpReminder) {
          const triggerDate = (notification.trigger as any)?.date;
          if (triggerDate) {
            const notificationTime = new Date(triggerDate).getTime();
            // Cancel if it's a future reminder for this medication dose
            if (notificationTime > timestamp) {
              await Notification.cancelScheduledNotificationAsync(notification.identifier);
              console.log('Cancelled follow-up reminder:', notification.identifier);
            }
          }
        }
      }

      // Also cancel any native exact alarms for follow-up reminders if on Android
      if (Platform.OS === 'android' && (NativeModules as any).AlarmModule && (NativeModules as any).AlarmModule.cancelExactAlarm) {
        const oneHourLater = timestamp + 60 * 60 * 1000;
        // Try to cancel all potential follow-up alarms within the next hour
        for (let t = timestamp; t <= oneHourLater; t += 10 * 60 * 1000) {
          const id = `${medicationId}_${t}`;
          try { 
            await (NativeModules as any).AlarmModule.cancelExactAlarm(id);
          } catch {};
        }
      }
    } catch (error) {
      console.error("Error canceling continuous reminders:", error);
    }
  }

  export async function cancelAllNotifications(): Promise<void> {
    try {
      await Notification.cancelAllScheduledNotificationsAsync();
      console.log("All notifications cancelled");
    } catch (error) {
      console.error("Error cancelling all notifications:", error);
    }
  }