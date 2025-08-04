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
}

export interface DoseHistory {
    id: string;
    medRemindId: string;
    timestamp: string;
    taken: boolean;
}

export async function getMedReminds(): Promise<MedRemind[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>('SELECT * FROM medReminds');
    return rows.map((row) => ({
        ...row,
        times: JSON.parse(row.times),
        reminderEnabled: !!row.reminderEnabled,
    }));
}

export async function addMedRemind(medRemind: MedRemind): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
        `INSERT INTO medReminds (id, name, dosage, times, startDate, duration, color, reminderEnabled) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        medRemind.id,
        medRemind.name,
        medRemind.dosage,
        JSON.stringify(medRemind.times),
        medRemind.startDate,
        medRemind.duration,
        medRemind.color,
        medRemind.reminderEnabled ? 1 : 0
    );
    // Push to backend, ensure reminderEnabled is 0/1
    await medRemindAPI.create({
        ...medRemind,
        reminderEnabled: medRemind.reminderEnabled ? 1 : 0
    });
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
    // Push to backend, ensure reminderEnabled is 0/1
    await medRemindAPI.update(id, {
        ...medRemind,
        reminderEnabled: medRemind.reminderEnabled ? 1 : 0
    });
}

export async function deleteMedRemind(id: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(`DELETE FROM medReminds WHERE id=?`, id);
    // Delete from backend
    await medRemindAPI.delete(id);
}

export async function getDoseHistory(): Promise<DoseHistory[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>('SELECT * FROM dose_history');
    return rows.map((row) => ({
        ...row,
        taken: !!row.taken,
    }));
}

export async function getTodaysDoses(): Promise<DoseHistory[]> {
    const db = await getDatabase();
    const today = new Date().toDateString();
    const rows = await db.getAllAsync<any>('SELECT * FROM dose_history');
    return rows.filter((dose) => new Date(dose.timestamp).toDateString() === today).map((row) => ({
        ...row,
        taken: !!row.taken,
    }));
}

export async function recordDose(
    medRemindId: string,
    taken: boolean,
    timestamp: string,
): Promise<void> {
    const db = await getDatabase();
    const id = Math.random().toString(36).substr(2, 9);
    await db.runAsync(
        `INSERT INTO dose_history (id, medRemindId, timestamp, taken) VALUES (?, ?, ?, ?)`,
        id,
        medRemindId,
        timestamp,
        taken ? 1 : 0
    );
    // Push to backend
    await doseHistoryAPI.create({ id, medRemindId, timestamp, taken });
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
    // Push to backend
    await doseHistoryAPI.update(id, dose);
}

export async function deleteDoseHistory(id: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(`DELETE FROM dose_history WHERE id=?`, id);
    // Delete from backend
    await doseHistoryAPI.delete(id);
}

export async function clearAllData(): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM medReminds');
    await db.runAsync('DELETE FROM dose_history');
}

export async function syncMedRemindsWithBackend() {
    try {
        console.log('Syncing medReminds: pulling from backend...');
        const remoteMeds = await medRemindAPI.getAll();
        console.log('MedReminds from backend:', remoteMeds);
        const db = await getDatabase();
        await db.runAsync('DELETE FROM medReminds');
        for (const med of remoteMeds) {
            // Map backend fields to camelCase for SQLite
            // Always store times as a valid JSON array string
            let timesString = '';
            if (Array.isArray(med.times)) {
                timesString = JSON.stringify(med.times);
            } else {
                try {
                    // Try to parse, if it's a stringified array
                    const arr = JSON.parse(med.times);
                    timesString = JSON.stringify(arr);
                } catch {
                    if (typeof med.times === 'string') {
                        // Try to extract times from malformed string like '{"09:00"}'
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
                `INSERT INTO medReminds (id, name, dosage, times, startDate, duration, color, reminderEnabled) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                med.id,
                med.name,
                med.dosage,
                timesString,
                med.startDate || med.startdate,
                med.duration,
                med.color,
                med.reminderEnabled !== undefined ? med.reminderEnabled : med.reminderenabled
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
                `INSERT INTO dose_history (id, medremindid, timestamp, taken) VALUES (?, ?, ?, ?)`,
                dose.id,
                dose.medremindid,
                dose.timestamp,
                dose.taken ? 1 : 0
            );
        }
        console.log('Dose history sync complete.');
    } catch (err) {
        console.error('Error syncing dose history:', err);
    }
}