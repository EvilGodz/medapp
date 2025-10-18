import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notification from "expo-notifications";
import { Alert, NativeModules, Platform } from 'react-native';
import { MedRemind } from "./storage";

// ฟังก์ชันขอ permission สำหรับ Exact Alarm
async function requestAlarmPermissions(): Promise<boolean> {
    if (Platform.OS === 'android') {
        try {
            // เช็คว่ามี AlarmModule หรือไม่
            if (!(NativeModules as any).AlarmModule?.requestExactAlarmPermission) {
                console.warn('AlarmModule not available');
                return false;
            }

            if (Platform.Version >= 33) { // Android 13 ขึ้นไป
                const status = await (NativeModules as any).AlarmModule.requestExactAlarmPermission();
                
                if (status !== 'granted') {
                    // แสดง dialog อธิบายว่าทำไมถึงต้องการ permission
                    Alert.alert(
                        'ต้องการสิทธิ์การแจ้งเตือนแบบแม่นยำ',
                        'เพื่อให้การแจ้งเตือนการทานยาทำงานได้อย่างแม่นยำ แอพจำเป็นต้องได้รับอนุญาตในการตั้งค่าการแจ้งเตือนแบบแม่นยำ',
                        [
                            {
                                text: 'ตั้งค่า',
                                onPress: async () => {
                                    // เปิดหน้าตั้งค่า permission
                                    await (NativeModules as any).AlarmModule.openAlarmSettings();
                                }
                            },
                            {
                                text: 'ยกเลิก',
                                style: 'cancel'
                            }
                        ]
                    );
                    return false;
                }
                return true;
            }

            // Android 12 หรือต่ำกว่า ไม่จำเป็นต้องขอ runtime permission
            return true;
        } catch (error) {
            console.error('Error requesting alarm permissions:', error);
            return false;
        }
    }
    // ไม่ใช่ Android ไม่ต้องขอ permission
    return true;
}

// ฟังก์ชันเช็ค permission ว่าได้รับอนุญาตหรือยัง
async function checkAlarmPermissions(): Promise<boolean> {
    if (Platform.OS === 'android') {
        try {
            if (!(NativeModules as any).AlarmModule?.checkExactAlarmPermission) {
                return false;
            }

            if (Platform.Version >= 33) {
                return await (NativeModules as any).AlarmModule.checkExactAlarmPermission() === 'granted';
            }
            return true;
        } catch (error) {
            console.error('Error checking alarm permissions:', error);
            return false;
        }
    }
    return true;
}

// คีย์สำหรับเก็บสถานะการตอบรับการแจ้งเตือน
const NOTIFICATION_RESPONSE_KEY = '@MedicineApp:notification_responses';

// interface สำหรับเก็บข้อมูลการตอบรับ
interface NotificationResponse {
    timestamp: number;
    reminderCount: number;
    responded: boolean;
}

// interface สำหรับเก็บการตอบรับทั้งหมด
interface NotificationResponses {
    [medicationId: string]: NotificationResponse;
}

// ฟังก์ชันเช็คการตอบรับก่อนหน้า
async function checkPreviousNotificationResponse(medicationId: string, currentCount: number): Promise<boolean> {
    try {
        const responsesStr = await AsyncStorage.getItem(NOTIFICATION_RESPONSE_KEY);
        if (responsesStr) {
            const responses: NotificationResponses = JSON.parse(responsesStr);
            const lastResponse = responses[medicationId];
            
            if (lastResponse && lastResponse.responded) {
                // เช็คว่าเป็นการตอบรับในช่วง 1 ชั่วโมงล่าสุด
                const isRecent = Date.now() - lastResponse.timestamp < 60 * 60 * 1000;
                // เช็คว่าเป็นการตอบรับของการแจ้งเตือนก่อนหน้า
                const isPreviousReminder = lastResponse.reminderCount < currentCount;
                
                return isRecent && isPreviousReminder;
            }
        }
    } catch (error) {
        console.error('Error checking notification response:', error);
    }
    return false;
}

// ฟังก์ชันบันทึกการตอบรับ
async function saveNotificationResponse(medicationId: string, reminderCount: number, responded: boolean = false) {
    try {
        const responsesStr = await AsyncStorage.getItem(NOTIFICATION_RESPONSE_KEY) || '{}';
        const responses: NotificationResponses = JSON.parse(responsesStr);
        
        responses[medicationId] = {
            timestamp: Date.now(),
            reminderCount,
            responded
        };
        
        await AsyncStorage.setItem(NOTIFICATION_RESPONSE_KEY, JSON.stringify(responses));
    } catch (error) {
        console.error('Error saving notification response:', error);
    }
}

Notification.setNotificationHandler({
    handleNotification: async (notification) => {
        const data = notification.request.content.data as {
            showAlarmScreen?: boolean;
            isFollowUpReminder?: boolean;
            medicationId?: string;
            reminderCount?: number;
        } | null;

        // ถ้าเป็นการแจ้งเตือนต่อเนื่อง
        if (data?.isFollowUpReminder && data?.medicationId && data?.reminderCount) {
            try {
                // เช็คการตอบรับก่อนหน้า
                const hasResponse = await checkPreviousNotificationResponse(data.medicationId, data.reminderCount);
                
                if (hasResponse) {
                    // ถ้ามีการตอบรับก่อนหน้าแล้ว ยกเลิกการแจ้งเตือนที่เหลือ
                    console.log('Previous notification was responded to, cancelling remaining reminders');
                    await cancelContinuousReminders(data.medicationId, Date.now());
                    return {
                        shouldPlaySound: false,
                        shouldSetBadge: false,
                        shouldShowAlert: false,
                        shouldShowBanner: false,
                        shouldShowList: false,
                        shouldPresent: false,
                    };
                }
                
                // บันทึกการแสดงการแจ้งเตือนปัจจุบัน
                await saveNotificationResponse(data.medicationId, data.reminderCount);
            } catch (error) {
                console.error("Error handling follow-up notification:", error);
            }
        }

        return {
            shouldPlaySound: true,
            shouldSetBadge: true,
            shouldShowBanner: true,
            shouldShowList: true,
            shouldPresent: true,
            shouldShowAlert: true,
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
    {
        identifier: 'DISMISS_ALL',
        buttonTitle: 'ยกเลิกการแจ้งเตือนทั้งหมด',
        options: {
            opensAppToForeground: false,
            isDestructive: true,
            isAuthenticationRequired: false,
        },
    }
]);

// เพิ่ม listener สำหรับการตอบรับการแจ้งเตือน
Notification.addNotificationResponseReceivedListener(async (response) => {
    const data = response.notification.request.content.data as {
        medicationId?: string;
        isFollowUpReminder?: boolean;
        reminderCount?: number;
    };

    if (data?.medicationId) {
        if (response.actionIdentifier === 'TAKE_NOW' || response.actionIdentifier === 'DISMISS_ALL') {
            // บันทึกการตอบรับ
            await saveNotificationResponse(data.medicationId, data.reminderCount || 0, true);
            
            // ยกเลิกการแจ้งเตือนที่เหลือ
            await cancelContinuousReminders(data.medicationId, Date.now());
        }
    }
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
        if (Platform.OS === 'android' && (NativeModules as any).AlarmModule?.scheduleExactAlarm) {
          // ตรวจสอบ permission ก่อน
          const hasPermission = await checkAlarmPermissions();
          
          if (!hasPermission) {
            // ถ้ายังไม่มี permission ให้ขอ
            const granted = await requestAlarmPermissions();
            if (!granted) {
              console.warn('Exact alarm permission not granted, falling back to Expo notifications');
              // ดำเนินการต่อไปโดยใช้ Expo notifications
            }
          }

          if (hasPermission || await checkAlarmPermissions()) {
            try {
              const alarmId = `${medication.id}_${notificationDate.getTime()}`;
              await (NativeModules as any).AlarmModule.scheduleExactAlarm(
                alarmId, 
                notificationDate.getTime(), 
                "Medication Reminder", 
                `อย่าลืมทาน ${medication.name} (${medication.dosage})`
              );
              console.log('Scheduled exact alarm:', alarmId);
              continue;
            } catch (e) {
              console.warn('Native exact alarm failed, falling back to Expo for', medication.name, e);
            }
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
            
            // ใช้ Native Exact Alarm สำหรับ Android
            if (Platform.OS === 'android' && (NativeModules as any).AlarmModule?.scheduleExactAlarm) {
              // ใช้ permission ที่ขอไว้แล้วจากการแจ้งเตือนหลัก
              const hasPermission = await checkAlarmPermissions();
              
              if (hasPermission) {
                try {
                  const alarmId = `${medication.id}_${reminderDate.getTime()}_followup_${i}`;
                  await (NativeModules as any).AlarmModule.scheduleExactAlarm(
                    alarmId,
                    reminderDate.getTime(),
                    "Medication Reminder",
                    `อย่าลืมทาน ${medication.name} (${medication.dosage}) (แจ้งเตือนซ้ำครั้งที่ ${i})`
                  );
                  console.log('Scheduled follow-up exact alarm:', alarmId);
                  continue; // ข้ามการใช้ Expo notification ถ้าใช้ Native Alarm สำเร็จ
                } catch (e) {
                  console.warn('Native exact alarm failed for follow-up, falling back to Expo', e);
                }
              }
            }
            
            // Fallback to Expo notifications หรือใช้สำหรับ iOS
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