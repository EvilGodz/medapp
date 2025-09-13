import * as Notification from "expo-notifications";
import { Platform } from "react-native";
import { MedRemind } from "./storage";

Notification.setNotificationHandler({
    handleNotification: async () => ({
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

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
}

export async function scheduleMedicationReminder(
  medication: MedRemind,
  settings: NotificationSettings = { sound: true, vibrate: true, showImage: false }
): Promise<string|undefined> {
  if (!medication.reminderEnabled) return;

  try {
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

        await Notification.scheduleNotificationAsync({
          content: {
            title: "Medication Reminder",
            body: `อย่าลืมทาน ${medication.name} (${medication.dosage})`,
            data: { medicationId: medication.id },
            sound: settings.sound ? undefined : null, // undefined = use default, null = no sound
            vibrate: settings.vibrate ? undefined : [], // undefined = use default, [] = no vibrate
            // showImage: custom logic below
            ...(settings.showImage && {
              // You can use local image or remote url here
              // For demo, use local icon
              // Only Android supports bigPicture
              android: {
                imageUrl: Platform.OS === 'android' ? 'asset:/icon.png' : undefined,
              },
              ios: {
                attachments: [
                  {
                    url: 'icon.png', // You may need to adjust path for iOS
                  },
                ],
              },
            }),
          },
          trigger: {
            type: Notification.SchedulableTriggerInputTypes.DATE,
            date: notificationDate,
          },
        });
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
    } catch (error) {
      console.error("Error canceling medication reminders:", error);
    }
  }

  export async function updateMedicationReminders(
    medication: MedRemind,
    settings: NotificationSettings = { sound: true, vibrate: true, showImage: false }
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