// Outbox for medRemind toggle (reminderEnabled only)
export async function addToMedRemindToggleOutbox(id: string, reminderEnabled: number) {
  let outbox = [];
  const outboxRaw = await AsyncStorage.getItem('medremind_toggle_outbox');
  if (outboxRaw) outbox = JSON.parse(outboxRaw);
  outbox.push({ id, reminderEnabled });
  await AsyncStorage.setItem('medremind_toggle_outbox', JSON.stringify(outbox));
}

export async function processMedRemindToggleOutbox(updateMedRemind: any) {
  try {
    const outboxRaw = await AsyncStorage.getItem('medremind_toggle_outbox');
    if (!outboxRaw) return;
    const outbox = JSON.parse(outboxRaw);
    if (!Array.isArray(outbox) || outbox.length === 0) return;
    const remaining = [];
    for (const { id, reminderEnabled } of outbox) {
      try {
        await Promise.race([
          updateMedRemind(id, { id, reminderEnabled }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000))
        ]);
      } catch (e) {
        remaining.push({ id, reminderEnabled });
      }
    }
    if (remaining.length > 0) {
      await AsyncStorage.setItem('medremind_toggle_outbox', JSON.stringify(remaining));
    } else {
      await AsyncStorage.removeItem('medremind_toggle_outbox');
    }
  } catch {}
}
// Outbox for medRemind updates
export async function addToMedRemindUpdateOutbox(id: string, medRemind: any) {
  let outbox = [];
  const outboxRaw = await AsyncStorage.getItem('medremind_update_outbox');
  if (outboxRaw) outbox = JSON.parse(outboxRaw);
  outbox.push({ id, medRemind });
  await AsyncStorage.setItem('medremind_update_outbox', JSON.stringify(outbox));
}

export async function processMedRemindUpdateOutbox(updateMedRemind: any) {
  try {
    const outboxRaw = await AsyncStorage.getItem('medremind_update_outbox');
    if (!outboxRaw) return;
    const outbox = JSON.parse(outboxRaw);
    if (!Array.isArray(outbox) || outbox.length === 0) return;
    const remaining = [];
    for (const { id, medRemind } of outbox) {
      try {
        await Promise.race([
          updateMedRemind(id, medRemind),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000))
        ]);
      } catch (e) {
        remaining.push({ id, medRemind });
      }
    }
    if (remaining.length > 0) {
      await AsyncStorage.setItem('medremind_update_outbox', JSON.stringify(remaining));
    } else {
      await AsyncStorage.removeItem('medremind_update_outbox');
    }
  } catch {}
}

// Outbox for medRemind deletes
export async function addToMedRemindDeleteOutbox(id: string) {
  let outbox = [];
  const outboxRaw = await AsyncStorage.getItem('medremind_delete_outbox');
  if (outboxRaw) outbox = JSON.parse(outboxRaw);
  outbox.push(id);
  await AsyncStorage.setItem('medremind_delete_outbox', JSON.stringify(outbox));
}

export async function processMedRemindDeleteOutbox(deleteMedRemind: any) {
  try {
    const outboxRaw = await AsyncStorage.getItem('medremind_delete_outbox');
    if (!outboxRaw) return;
    const outbox = JSON.parse(outboxRaw);
    if (!Array.isArray(outbox) || outbox.length === 0) return;
    const remaining = [];
    for (const id of outbox) {
      try {
        await Promise.race([
          deleteMedRemind(id),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000))
        ]);
      } catch (e) {
        remaining.push(id);
      }
    }
    if (remaining.length > 0) {
      await AsyncStorage.setItem('medremind_delete_outbox', JSON.stringify(remaining));
    } else {
      await AsyncStorage.removeItem('medremind_delete_outbox');
    }
  } catch {}
}
// Outbox for dose (take/miss) actions
export async function addToDoseOutbox(doseData: any) {
  let outbox = [];
  const outboxRaw = await AsyncStorage.getItem('dose_outbox');
  if (outboxRaw) outbox = JSON.parse(outboxRaw);
  outbox.push(doseData);
  await AsyncStorage.setItem('dose_outbox', JSON.stringify(outbox));
}

export async function processDoseOutbox(recordDose: any) {
  try {
    const outboxRaw = await AsyncStorage.getItem('dose_outbox');
    if (!outboxRaw) return;
    const outbox = JSON.parse(outboxRaw);
    if (!Array.isArray(outbox) || outbox.length === 0) return;
    const remaining = [];
    for (const doseData of outbox) {
      try {
        await Promise.race([
          recordDose(
            doseData.medRemindId,
            doseData.taken,
            doseData.timestamp,
            doseData.time
          ),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000))
        ]);
      } catch (e) {
        remaining.push(doseData);
      }
    }
    if (remaining.length > 0) {
      await AsyncStorage.setItem('dose_outbox', JSON.stringify(remaining));
    } else {
      await AsyncStorage.removeItem('dose_outbox');
    }
  } catch {}
}

import AsyncStorage from '@react-native-async-storage/async-storage';
import { addMedRemindToApi } from './storage';

// Outbox for notifications
export async function addToNotificationOutbox(notificationData: any) {
  let outbox = [];
  const outboxRaw = await AsyncStorage.getItem('notification_outbox');
  if (outboxRaw) outbox = JSON.parse(outboxRaw);
  outbox.push(notificationData);
  await AsyncStorage.setItem('notification_outbox', JSON.stringify(outbox));
}

import { getMedReminds } from './storage';

export async function processNotificationOutbox(addMedRemind: any, scheduleMedicationReminder: any) {
  try {
    const outboxRaw = await AsyncStorage.getItem('notification_outbox');
    if (!outboxRaw) return;
    const outbox = JSON.parse(outboxRaw);
    if (!Array.isArray(outbox) || outbox.length === 0) return;
    const remaining = [];
    // Get current local reminders to avoid duplicate insert
    const localReminds = await getMedReminds();
    for (const notificationData of outbox) {
      try {
        // Only add to local DB if not already present
        if (!localReminds.find((r) => r.id === notificationData.id)) {
          await addMedRemind(notificationData);
        }
        // Try to sync to backend (API), queue to outbox if fails
        const apiSynced = await Promise.race([
          addMedRemindToApi(notificationData),
          new Promise((resolve) => setTimeout(() => resolve(false), 3000))
        ]);
        if (!apiSynced) {
          remaining.push(notificationData);
          continue;
        }
        // Schedule notification (local only, do not queue in outbox)
        if (notificationData.reminderEnabled) {
          await scheduleMedicationReminder(notificationData);
        }
      } catch (e) {
        remaining.push(notificationData);
      }
    }
    if (remaining.length > 0) {
      await AsyncStorage.setItem('notification_outbox', JSON.stringify(remaining));
    } else {
      await AsyncStorage.removeItem('notification_outbox');
    }
  } catch {}
}

// Outbox for profile updates
export async function addToProfileOutbox(updateData: any) {
  let outbox: any[] = [];
  const outboxRaw = await AsyncStorage.getItem('profile_outbox');
  if (outboxRaw) outbox = JSON.parse(outboxRaw);
  outbox.push(updateData);
  await AsyncStorage.setItem('profile_outbox', JSON.stringify(outbox));
}

export async function processProfileOutbox(token: string, apiBaseUrl: string) {
  try {
    const outboxRaw = await AsyncStorage.getItem('profile_outbox');
    if (!outboxRaw) return;
    const outbox: any[] = JSON.parse(outboxRaw);
    if (!Array.isArray(outbox) || outbox.length === 0) return;
    let successCount = 0;
    for (const updateData of outbox) {
      try {
        const response = await fetch(`${apiBaseUrl}/api/auth/profile`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(updateData),
        });
        const data = await response.json();
        if (data.success) successCount++;
      } catch {}
    }
    // Remove outbox if all succeeded
    if (successCount === outbox.length) {
      await AsyncStorage.removeItem('profile_outbox');
    } else {
      // Keep only failed
      const failed = outbox.slice(successCount);
      await AsyncStorage.setItem('profile_outbox', JSON.stringify(failed));
    }
  } catch {}
}
