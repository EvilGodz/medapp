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
        const dayFrequency = Math.max(1, Number(medication.dayFrequency) || 1);

        // Duration is interpreted as number of occurrences, unless ongoing
        let occurrenceCount = Infinity;
        if (/(ongoing|ต่อเนื่อง)/i.test(medication.duration)) {
            // Schedule roughly one year ahead respecting frequency
            occurrenceCount = Math.ceil(365 / dayFrequency);
        } else {
            const match = medication.duration.match(/(\d+)/);
            if (match) occurrenceCount = parseInt(match[1], 10);
        }

        for (const time of medication.times) {
            const [hours, minutes] = time.split(':').map(Number);

            // Create notifications at start + i * dayFrequency for each occurrence
            for (let i = 0; i < occurrenceCount; i++) {
                const dayOffset = i * dayFrequency;
                const notificationDate = new Date(startDate);
                notificationDate.setDate(startDate.getDate() + dayOffset);
                notificationDate.setHours(hours, minutes, 0, 0);

                // Skip past dates
                if (notificationDate < new Date()) continue;

                await Notification.scheduleNotificationAsync({
                    content: {
                        title: "Medication Reminder",
                        body: `Time to take ${medication.name} (${medication.dosage})`,
                        data: { medicationId: medication.id },
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