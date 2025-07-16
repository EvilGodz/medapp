import { getDatabase } from './database';

export interface Medication {
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
    medicationId: string;
    timestamp: string;
    taken: boolean;
}

export async function getMedications(): Promise<Medication[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>('SELECT * FROM medications');
    return rows.map((row) => ({
        ...row,
        times: JSON.parse(row.times),
        reminderEnabled: !!row.reminderEnabled,
    }));
}

export async function addMedication(medication: Medication): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
        `INSERT INTO medications (id, name, dosage, times, startDate, duration, color, reminderEnabled) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        medication.id,
        medication.name,
        medication.dosage,
        JSON.stringify(medication.times),
        medication.startDate,
        medication.duration,
        medication.color,
        medication.reminderEnabled ? 1 : 0
    );
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
    medicationId: string,
    taken: boolean,
    timestamp: string,
): Promise<void> {
    const db = await getDatabase();
    const id = Math.random().toString(36).substr(2, 9);
    await db.runAsync(
        `INSERT INTO dose_history (id, medicationId, timestamp, taken) VALUES (?, ?, ?, ?)`,
        id,
        medicationId,
        timestamp,
        taken ? 1 : 0
    );
}

export async function clearAllData(): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM medications');
    await db.runAsync('DELETE FROM dose_history');
}