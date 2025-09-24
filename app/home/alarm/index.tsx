import { MedRemind, getMedReminds, getTodaysDoses, recordDose } from '@/utils/storage';
import { Ionicons } from '@expo/vector-icons';
import { useGlobalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Dimensions,
  Image,
  SafeAreaView,
  ScrollView,
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
      
      // get all med and today dose history
      const [allMeds, todayDoses] = await Promise.all([
        getMedReminds(),
        getTodaysDoses()
      ]);

      // filter 30min (not taken)
      const upcoming = allMeds.filter((med) => {
        // skip disabled
        if (!med.reminderEnabled) return false;

        if (medicationId && med.id !== medicationId) return false;

        const times = med.times || [];
        return times.some(time => {
          const [hours, minutes] = time.split(':').map(Number);
          const medicationTime = new Date();
          medicationTime.setHours(hours, minutes, 0, 0);

          // check taken
          const isDoseTaken = todayDoses.some(
            dose => 
              dose.medRemindId === med.id && 
              dose.taken &&
              new Date(dose.timestamp).getHours() === hours &&
              new Date(dose.timestamp).getMinutes() === minutes
          );

          // check if in 30m
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

  const handleTakeDose = async (medRemind: MedRemind, time?: string) => {
    try {
      await recordDose(medRemind.id, true, new Date().toISOString(), time);
      await loadUpcomingMedications();
    } catch (error) {
      Alert.alert("เกิดข้อผิดพลาด", "ไม่สามารถบันทึกการรับประทานยาได้ กรุณาลองอีกครั้ง");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>รายการยาที่ต้องทาน</Text>
        <Text style={styles.subtitle}>ในช่วง 30 นาทีถัดไป</Text>
        <Image
          source={require('@/assets/images/alarm.png')}
          style={styles.alarmImage}
        />
      </View>

      <ScrollView style={styles.medicationList} showsVerticalScrollIndicator={false}>
        {upcomingMedications.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="medical-outline" size={48} color='#ccc' />
            <Text style={styles.emptyText}>ไม่มียาที่ต้องทานในช่วงเวลานี้</Text>
          </View>
        ) : (
          upcomingMedications.map((medication) => (
            <View key={medication.id} style={styles.doseCard}>
              <View style={[styles.doseBadge, { backgroundColor: `${medication.color || '#1a8e2d'}20` }]}>
                <Ionicons name="medical" size={24} color={medication.color || '#1a8e2d'} />
              </View>
              <View style={styles.doseInfo}>
                <View>
                  <Text style={styles.medicineName}>{medication.name}</Text>
                  <Text style={styles.dosageText}>{medication.dosage}</Text>
                </View>
                <View style={styles.doseTime}>
                  <Ionicons name="time-outline" size={16} color="#ccc" />
                  <Text style={styles.timeText}>{Array.isArray(medication.times) ? medication.times[0] : ''}</Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.takeDoseButton, { backgroundColor: medication.color || '#1a8e2d' }]}
                onPress={() => handleTakeDose(medication, Array.isArray(medication.times) ? medication.times[0] : undefined)}
              >
                <Text style={styles.takeDoseText}>รับประทาน</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>

      <TouchableOpacity 
        style={styles.closeButton}
        onPress={() => router.back()}
      >
        <Text style={styles.closeButtonText}>ปิด</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const { width } = Dimensions.get('window');

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
  alarmImage: {
    width: width * 0.8,
    height: width * 0.6,
    marginVertical: 10,
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
  doseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3
  },
  doseBadge: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15
  },
  medicineName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4
  },
  doseInfo: {
    flex: 1,
    justifyContent: 'space-between'
  },
  dosageText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 2
  },
  doseTime: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4
  },
  timeText: {
    marginLeft: 5,
    color: "#666",
    fontSize: 14
  },
  takeDoseButton: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 15,
    marginLeft: 10
  },
  takeDoseText: {
    color: "white",
    fontWeight: "600",
    fontSize: 14
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: "white",
    borderRadius: 16,
    marginTop: 10
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    marginTop: 10
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