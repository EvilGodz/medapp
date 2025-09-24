import { MedRemind, getMedReminds, getTodaysDoses } from '@/utils/storage';
import { useGlobalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export default function AlarmScreen() {
  const [upcomingMedications, setUpcomingMedications] = useState<MedRemind[]>([]);
  const router = useRouter();
  const { medicationId } = useGlobalSearchParams();

  useEffect(() => {
    loadUpcomingMedications();
  }, [medicationId]);

  const loadUpcomingMedications = async () => {
    try {
      const now = new Date();
      const thirtyMinsBefore = new Date(now.getTime() - 30 * 60000); // 30 minutes before
      const thirtyMinsAfter = new Date(now.getTime() + 30 * 60000);  // 30 minutes after
      
      // Get all medications and today's dose history
      const [allMeds, todayDoses] = await Promise.all([
        getMedReminds(),
        getTodaysDoses()
      ]);

      // Filter medications that need to be taken in the 30-minute window
      const upcoming = allMeds.filter((med) => {
        // Skip if not enabled
        if (!med.reminderEnabled) return false;

        // If we have a specific medicationId from the notification, only show that one
        if (medicationId && med.id !== medicationId) return false;

        const times = med.times || [];
        return times.some(time => {
          const [hours, minutes] = time.split(':').map(Number);
          const medicationTime = new Date();
          medicationTime.setHours(hours, minutes, 0, 0);

          // Check if this dose has been taken
          const isDoseTaken = todayDoses.some(
            dose => 
              dose.medRemindId === med.id && 
              dose.taken &&
              new Date(dose.timestamp).getHours() === hours &&
              new Date(dose.timestamp).getMinutes() === minutes
          );

          // Only include if not taken and within the 30-minute window
          return !isDoseTaken && 
                 medicationTime >= thirtyMinsBefore && 
                 medicationTime <= thirtyMinsAfter;
        });
      });

      setUpcomingMedications(upcoming);
    } catch (error) {
      console.error('Error loading upcoming medications:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>รายการยาที่ต้องทาน</Text>
        <Text style={styles.subtitle}>ในช่วง 1 ชั่วโมงถัดไป</Text>
      </View>

      {upcomingMedications.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>ไม่มียาที่ต้องทานในช่วงเวลานี้</Text>
        </View>
      ) : (
        <View style={styles.medicationList}>
          {upcomingMedications.map((medication) => (
            <View key={medication.id} style={styles.medicationCard}>
              <View style={styles.medicationInfo}>
                <Text style={styles.medicationName}>{medication.name}</Text>
                <Text style={styles.medicationDosage}>{medication.dosage}</Text>
                <Text style={styles.medicationTime}>
                  {medication.times?.join(', ')}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      <TouchableOpacity 
        style={styles.closeButton}
        onPress={() => router.back()}
      >
        <Text style={styles.closeButtonText}>ปิด</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    paddingTop: 20,
    paddingBottom: 20,
    alignItems: 'center',
    backgroundColor: '#1a8e2d',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  medicationList: {
    padding: 16,
  },
  medicationCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  medicationInfo: {
    flex: 1,
  },
  medicationName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  medicationDosage: {
    fontSize: 16,
    color: '#666',
    marginBottom: 2,
  },
  medicationTime: {
    fontSize: 14,
    color: '#1a8e2d',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  closeButton: {
    backgroundColor: '#1a8e2d',
    padding: 16,
    margin: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});