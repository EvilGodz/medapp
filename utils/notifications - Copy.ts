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

export async function scheduleMedicationReminder(
    medication: MedRemind
): Promise<string|undefined> {
    if(!medication.reminderEnabled) return;

    try {
        const startDate = new Date(medication.startDate);
        let durationDays = 0;
        if (medication.duration === 'ต่อเนื่อง') {
            durationDays = 365 * 10; // Schedule for 10 years for "ต่อเนื่อง"
        } else {
            const match = medication.duration.match(/\d+/);
            if (match) {
                durationDays = parseInt(match[0], 10);
            } else {
                console.warn("Could not parse duration string:", medication.duration);
                return undefined;
            }
        }

        for (let i = 0; i < durationDays; i += medication.dayFrequency) {
            const targetDate = new Date(startDate);
            targetDate.setDate(startDate.getDate() + i);

            for (const time of medication.times) {
                const [hours, minutes] = time.split(':').map(Number);
                targetDate.setHours(hours, minutes, 0, 0);

                if (targetDate < new Date()) {
                    // Skip if the target date is in the past
                    continue;
                }

                const identifier = await Notification.scheduleNotificationAsync({
                    content: {
                        title: "Medication Reminder",
                        body: `Time to take ${medication.name} (${medication.dosage})`,
                        data: { medicationId: medication.id },
                    },
                    trigger: {
                        type: Notification.SchedulableTriggerInputTypes.DATE,
                        date: targetDate,
                    },
                });
                console.log(`Scheduled notification for ${medication.name} on ${targetDate.toLocaleString()} with id ${identifier}`);
            }
        }
        return undefined; 
    } catch (error) {
        console.error("Error scheduling medication reminder:", error)
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
    medication: MedRemind
  ): Promise<void> {
    try {
      //cancel old reminders
      await cancelMedicationReminders(medication.id);
  
      //schedule new reminders
      await scheduleMedicationReminder(medication);
    } catch (error) {
      console.error("Error updating medication reminders:", error);
    }
  }