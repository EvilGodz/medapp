import * as  Notification from "expo-notifications";
import { Platform } from "react-native";
import { Medication } from "./storage";

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
    medication: Medication
): Promise<string|undefined> {
    if(!medication.reminderEnabled) return;

    try {
        for ( const time of medication.times) {
            const [hours, minutes] = time.split(':').map(Number);
            const today = new Date();
            today.setHours(hours,minutes,0,0);

            if(today < new Date()){
                today.setDate(today.getDate() + 1)
            }

            const identifier = await Notification.scheduleNotificationAsync({
                content: {
                    title: "Medication Reminder",
                    body: `Time to take ${medication.name} (${medication.dosage})`,
                    data: {medicationId: medication.id},
                },
                trigger: {
                    type: Notification.SchedulableTriggerInputTypes.DAILY,
                    hour: hours,
                    minute: minutes,
                },
            });
            return identifier;
        }
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
    medication: Medication
  ): Promise<void> {
    try {
      // Cancel existing reminders
      await cancelMedicationReminders(medication.id);
  
      // Schedule new reminders
      await scheduleMedicationReminder(medication);
    } catch (error) {
      console.error("Error updating medication reminders:", error);
    }
  }