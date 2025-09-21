
import { doseHistoryAPI, medRemindAPI } from './api';
import { getDatabase } from './database';

export interface MedRemind {
    id: string;
    name: string;
    dosage: string;
    times: string[];
    startDate: string;
    duration: string;
    color: string;
    reminderEnabled: boolean;
    dayFrequency: number;
    mealTiming?: string; // 'before' | 'after' (ก่อนอาหาร | หลังอาหาร)
}

export interface DoseHistory {
    id: string;
    medRemindId: string;
    timestamp: string;
    taken: boolean;
    time?: string; // specific dose time like '09:00'
}

export async function getMedReminds(): Promise<MedRemind[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>('SELECT * FROM medReminds');
    return rows.map((row) => ({
        ...row,
        times: JSON.parse(row.times),
        reminderEnabled: !!row.reminderEnabled,
        dayFrequency: row.dayFrequency || 1,
        mealTiming: row.mealTiming || row.mealtiming || '',
    }));
}


// Insert to local DB only
export async function addMedRemind(medRemind: MedRemind): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
        `INSERT INTO medReminds (id, name, dosage, times, startDate, duration, color, reminderEnabled, dayFrequency, mealTiming) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        medRemind.id,
        medRemind.name,
        medRemind.dosage,
        JSON.stringify(medRemind.times),
        medRemind.startDate,
        medRemind.duration,
        medRemind.color,
        medRemind.reminderEnabled ? 1 : 0,
        medRemind.dayFrequency || 1,
        medRemind.mealTiming || ''
    );
}

// Try to sync to backend, queue to outbox if fails
import { addToNotificationOutbox } from './outbox';
export async function addMedRemindToApi(medRemind: MedRemind): Promise<boolean> {
    try {
        // 3s timeout for API call
        await Promise.race([
            medRemindAPI.create({
                ...medRemind,
                reminderEnabled: medRemind.reminderEnabled ? 1 : 0
            }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout syncing to API')), 3000))
        ]);
        return true;
    } catch (e) {
        await addToNotificationOutbox(medRemind);
        return false;
    }
}

export async function updateMedRemind(id: string, medRemind: MedRemind): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
        `UPDATE medReminds SET name=?, dosage=?, times=?, startDate=?, duration=?, color=?, reminderEnabled=? WHERE id=?`,
        medRemind.name,
        medRemind.dosage,
        JSON.stringify(medRemind.times),
        medRemind.startDate,
        medRemind.duration,
        medRemind.color,
        medRemind.reminderEnabled ? 1 : 0,
        id
    );
    await medRemindAPI.update(id, {
        ...medRemind,
        reminderEnabled: medRemind.reminderEnabled ? 1 : 0
    });
}

export async function deleteMedRemind(id: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(`DELETE FROM medReminds WHERE id=?`, id);
    await medRemindAPI.delete(id);
}
// Toggle reminderEnabled for a medRemind by id
export async function toggleMedRemindEnabled(id: string, enabled: boolean): Promise<MedRemind | null> {
    const db = await getDatabase();
    // Get current medRemind
    const rows = await db.getAllAsync<any>('SELECT * FROM medReminds WHERE id=?', id);
    if (!rows || rows.length === 0) return null;
    const med = rows[0];
    await db.runAsync(
        `UPDATE medReminds SET reminderEnabled=? WHERE id=?`,
        enabled ? 1 : 0,
        id
    );
    // Return updated object (with correct types)
    return {
        ...med,
        reminderEnabled: enabled,
        times: JSON.parse(med.times),
        dayFrequency: med.dayFrequency || 1,
        mealTiming: med.mealTiming || med.mealtiming || '',
    };
}

export async function getDoseHistory(): Promise<DoseHistory[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>('SELECT * FROM dose_history');
  return rows.map((row) => ({
      id: row.id,
      medRemindId: String(row.medRemindId ?? row.medremindid),
      timestamp: row.timestamp,
      taken: !!row.taken,
      time: row.time || '',
  }));
}

export async function getTodaysDoses(): Promise<DoseHistory[]> {
    const db = await getDatabase();
    const today = new Date().toDateString();
    const rows = await db.getAllAsync<any>('SELECT * FROM dose_history');
  return rows
      .filter((row) => new Date(row.timestamp).toDateString() === today)
      .map((row) => ({
          id: row.id,
          medRemindId: String(row.medRemindId ?? row.medremindid),
          timestamp: row.timestamp,
          taken: !!row.taken,
          time: row.time || '',
      }));
}

export async function recordDose(
    medRemindId: string,
    taken: boolean,
    timestamp: string,
    time?: string,
): Promise<void> {
    const db = await getDatabase();
    const id = Math.random().toString(36).substr(2, 9);
    await db.runAsync(
        `INSERT INTO dose_history (id, medremindid, timestamp, taken, time) VALUES (?, ?, ?, ?, ?)`,
        id,
        medRemindId,
        timestamp,
        taken ? 1 : 0,
        time || ''
    );
    await doseHistoryAPI.create({ id, medRemindId, timestamp, taken, time });
}

//miss if >1h
export async function ensureMissedDosesForToday(medications: MedRemind[]): Promise<void> {
    const db = await getDatabase();
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

    const checkExists = async (medRemindId: string, isoTimestamp: string) => {
        const rows = await db.getAllAsync<any>(
            'SELECT id FROM dose_history WHERE medremindid = ? AND timestamp = ? LIMIT 1',
            medRemindId,
            isoTimestamp
        );
        return rows.length > 0;
    };

    for (const med of medications) {
        if (!Array.isArray(med.times) || med.times.length === 0) continue;

        for (const timeStr of med.times) {
            const [hhStr, mmStr = '0'] = String(timeStr).split(':');
            const hh = parseInt(hhStr, 10) || 0;
            const mm = parseInt(mmStr, 10) || 0;
            const scheduled = new Date(
                today.getFullYear(),
                today.getMonth(),
                today.getDate(),
                hh,
                mm,
                0,
                0
            );

            const deadline = new Date(scheduled.getTime() + 60 * 60 * 1000);
            if (now <= deadline) continue; // not yet missed

            const isoTimestamp = scheduled.toISOString();
            const exists = await checkExists(med.id, isoTimestamp);
            if (exists) continue;

            try {
                await recordDose(med.id, false, isoTimestamp, timeStr);
            } catch (err) {
                //log
                console.error('Failed to record missed dose', { medId: med.id, isoTimestamp, time: timeStr }, err);
            }
        }
    }
}

export async function updateDoseHistory(id: string, dose: DoseHistory): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
        `UPDATE dose_history SET medremindid=?, timestamp=?, taken=? WHERE id=?`,
        dose.medRemindId,
        dose.timestamp,
        dose.taken ? 1 : 0,
        id
    );
    await doseHistoryAPI.update(id, dose);
}

export async function deleteDoseHistory(id: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(`DELETE FROM dose_history WHERE id=?`, id);
    await doseHistoryAPI.delete(id);
}

export async function clearAllData(): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM medReminds');
    await db.runAsync('DELETE FROM dose_history');
    
    // ลบแจ้งเตือนทั้งหมด
    const { cancelAllNotifications } = await import('./notifications');
    await cancelAllNotifications();
}

export async function syncMedRemindsWithBackend() {
    try {
        console.log('Syncing medReminds: pulling from backend...');
        const remoteMeds = await medRemindAPI.getAll();
        console.log('MedReminds from backend:', remoteMeds);
        const db = await getDatabase();
        await db.runAsync('DELETE FROM medReminds');
        for (const med of remoteMeds) {
            let timesString = '';
            if (Array.isArray(med.times)) {
                timesString = JSON.stringify(med.times);
            } else {
                try {
                    const arr = JSON.parse(med.times);
                    timesString = JSON.stringify(arr);
                } catch {
                    if (typeof med.times === 'string') {
                        const match = med.times.match(/"([^"]+)"/g);
                        if (match) {
                            timesString = JSON.stringify(match.map((s: string) => s.replace(/"/g, '')));
                        } else {
                            timesString = JSON.stringify([med.times]);
                        }
                    } else {
                        timesString = JSON.stringify([]);
                    }
                }
            }
            await db.runAsync(
                `INSERT INTO medReminds (id, name, dosage, times, startDate, duration, color, reminderEnabled, dayFrequency, mealTiming) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                med.id,
                med.name,
                med.dosage,
                timesString,
                med.startDate || med.startdate,
                med.duration,
                med.color,
                med.reminderEnabled !== undefined ? med.reminderEnabled : med.reminderenabled,
                (med.dayFrequency ?? med.dayfrequency ?? 1),
                (med.mealTiming ?? med.mealtiming ?? '')
            );
        }
        console.log('MedReminds sync complete.');
    } catch (err) {
        console.error('Error syncing medReminds:', err);
    }
}

export async function syncDoseHistoryWithBackend() {
    try {
        console.log('Syncing dose history: pulling from backend...');
        const remoteDoses = await doseHistoryAPI.getAll();
        console.log('Dose history from backend:', remoteDoses);
        const db = await getDatabase();
        await db.runAsync('DELETE FROM dose_history');
        for (const dose of remoteDoses) {
            await db.runAsync(
                `INSERT INTO dose_history (id, medremindid, timestamp, taken, time) VALUES (?, ?, ?, ?, ?)`,
                dose.id,
                dose.medremindid,
                dose.timestamp,
                dose.taken ? 1 : 0,
                dose.time
            );
        }
        console.log('Dose history sync complete.');
    } catch (err) {
        console.error('Error syncing dose history:', err);
    }
}