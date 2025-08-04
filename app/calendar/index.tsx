import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  DoseHistory,
  getDoseHistory,
  getMedReminds,
  MedRemind,
  recordDose,
} from "../../utils/storage";

const WEEKDAYS = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];
const THAI_MONTHS = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
];

export default function CalendarScreen() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [medications, setMedications] = useState<MedRemind[]>([]);
  const [doseHistory, setDoseHistory] = useState<DoseHistory[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [meds, history] = await Promise.all([
        getMedReminds(),
        getDoseHistory(),
      ]);
      setMedications(meds);
      setDoseHistory(history);
    } catch (err) {
      setError('Error loading calendar data');
      console.error("Error loading calendar data:", err);
    }
  }, [selectedDate]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const days = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    return { days, firstDay };
  };

  const { days, firstDay } = getDaysInMonth(selectedDate);

  const renderCalendar = () => {
    const calendar: React.ReactElement[] = [];
    let week: React.ReactElement[] = [];

    // cell เปล่าก่อนวันแรก
    for (let i = 0; i < firstDay; i++) {
      week.push(<View key={`empty-${i}`} style={styles.calendarDay} />);
    }

    // Add days of the month
    for (let day = 1; day <= days; day++) {
      const date = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), day);
      const isToday = new Date().toDateString() === date.toDateString();
      const hasDoses = doseHistory.some(
        (dose) => new Date(dose.timestamp).toDateString() === date.toDateString()
      );

      week.push(
        <TouchableOpacity
          key={day}
          style={[
            styles.calendarDay,
            isToday && styles.today,
            hasDoses && styles.hasEvents,
          ]}
          onPress={() => setSelectedDate(date)}
        >
          <Text style={[styles.dayText, isToday && styles.todayText]}>
            {day}
          </Text>
          {hasDoses && <View style={styles.eventDot} />}
        </TouchableOpacity>
      );

      // If the week is complete, push it and reset
      if (week.length === 7) {
        calendar.push(
          <View key={`week-${day}`} style={styles.calendarWeek}>
            {week}
          </View>
        );
        week = [];
      }
    }

    // After all days, if any days remain in week, fill with empty cells and push
    if (week.length > 0) {
      while (week.length < 7) {
        week.push(<View key={`empty-end-${week.length}`} style={styles.calendarDay} />);
      }
      calendar.push(
        <View key={`last-week`} style={styles.calendarWeek}>
          {week}
        </View>
      );
    }

    return calendar;
  };

  const renderMedicationsForDate = () => {
    const dateStr = selectedDate.toDateString();
    const dayDoses = doseHistory.filter(
      (dose) => new Date(dose.timestamp).toDateString() === dateStr
    );

    // แสดงเฉพาะยาที่ต้องกินในวันที่ selectedDate
    const filteredMeds = medications.filter((medication) => {
      // Normalize selectedDate to local midnight
      const selected = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
      // Normalize medStart to local midnight
      const medStartDate = new Date(medication.startDate);
      const medStart = new Date(medStartDate.getFullYear(), medStartDate.getMonth(), medStartDate.getDate());
      let durationDays = -1;
      if (/(ongoing|ต่อเนื่อง)/i.test(medication.duration)) {
        durationDays = -1;
      } else {
        const match = medication.duration.match(/(\d+)/);
        if (match) durationDays = parseInt(match[1], 10);
      }
      const medEnd = durationDays === -1 ? null : new Date(medStart.getTime() + durationDays * 24 * 60 * 60 * 1000);
      // Normalize medEnd to local midnight if not null
      const medEndNorm = medEnd ? new Date(medEnd.getFullYear(), medEnd.getMonth(), medEnd.getDate()) : null;
      // เงื่อนไข: selectedDate >= startDate && (endDate == null หรือ selectedDate <= endDate)
      return selected >= medStart && (medEndNorm === null || selected <= medEndNorm);
    });

    if (filteredMeds.length === 0) {
      return <Text style={{ textAlign: 'center', color: '#888', marginTop: 20 }}>No medications for this date.</Text>;
    }

    return filteredMeds.map((medication) => {
      const taken = dayDoses.some(
        (dose) => dose.medRemindId === medication.id && dose.taken
      );

      return (
        <View key={medication.id} style={styles.medicationCard}>
          <View
            style={[
              styles.medicationColor,
              { backgroundColor: medication.color },
            ]}
          />
          <View style={styles.medicationInfo}>
            <Text style={styles.medicationName}>{medication.name}</Text>
            <Text style={styles.medicationDosage}>{medication.dosage}</Text>
            <Text style={styles.medicationTime}>{medication.times.join(', ')}</Text>
          </View>
          {taken ? (
            <View style={styles.takenBadge}>
              <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
              <Text style={styles.takenText}>ทานแล้ว</Text>
            </View>
          ) : (
            // Only allow taking medication if selectedDate is today
            (function() {
              const today = new Date();
              const isToday =
                selectedDate.getFullYear() === today.getFullYear() &&
                selectedDate.getMonth() === today.getMonth() &&
                selectedDate.getDate() === today.getDate();
              // Check if missed (only for today)
              let isMissed = false;
              if (isToday) {
                for (const time of medication.times) {
                  const [hour, minute] = time.split(':').map(Number);
                  if (!isNaN(hour) && !isNaN(minute)) {
                    const medTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hour, minute, 0, 0);
                    // Add 1 hour buffer
                    const bufferTime = new Date(medTime.getTime() + 60 * 60 * 1000);
                    if (today > bufferTime) {
                      isMissed = true;
                      break;
                    }
                  }
                }
              }
              if (isToday && isMissed) {
                return (
                  <View style={[styles.takenBadge, { backgroundColor: '#FFEBEE' }]}
                  >
                    <Ionicons name="close-circle" size={20} color="#E53935" />
                    <Text style={[styles.takenText, { color: '#E53935' }]}>ไม่ได้รับประทาน</Text>
                  </View>
                );
              } else if (isToday) {
                return (
                  <TouchableOpacity
                    style={[
                      styles.takeDoseButton,
                      { backgroundColor: medication.color },
                    ]}
                    onPress={async () => {
                      await recordDose(medication.id, true, new Date().toISOString());
                      loadData();
                    }}
                  >
                    <Text style={styles.takeDoseText}>รับประทาน</Text>
                  </TouchableOpacity>
                );
              } else {
                return (
                  <View style={[styles.takeDoseButton, { backgroundColor: '#ccc' }]}
                  >
                    <Text style={[styles.takeDoseText, { color: '#888' }]}>รับประทาน</Text>
                  </View>
                );
              }
            })()
          )}
        </View>
      );
    });
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#1a8e2d", "#146922"]}
        style={styles.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      />

      <View style={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={28} color="#1a8e2d" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>ปฏิทินทานยา</Text>
        </View>

        <View style={styles.calendarContainer}>
          <View style={styles.monthHeader}>
            <TouchableOpacity
              onPress={() => {
                const newDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1);
                setSelectedDate(newDate);
                if (
                  newDate.getFullYear() === new Date().getFullYear() &&
                  newDate.getMonth() === new Date().getMonth()
                ) {
                  setSelectedDate(new Date());
                }
              }}
            >
              <Ionicons name="chevron-back" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.monthText}>
              {THAI_MONTHS[selectedDate.getMonth()]} {selectedDate.getFullYear() + 543}
            </Text>
            <TouchableOpacity
              onPress={() => {
                const newDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1);
                setSelectedDate(newDate);
                if (
                  newDate.getFullYear() === new Date().getFullYear() &&
                  newDate.getMonth() === new Date().getMonth()
                ) {
                  setSelectedDate(new Date());
                }
              }}
            >
              <Ionicons name="chevron-forward" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <View style={styles.weekdayHeader}>
            {WEEKDAYS.map((day) => (
              <Text key={day} style={styles.weekdayText}>
                {day}
              </Text>
            ))}
          </View>

          {renderCalendar()}
        </View>

        <View style={styles.scheduleContainer}>
          <Text style={styles.scheduleTitle}>
            {`${WEEKDAYS[selectedDate.getDay()]} ${selectedDate.getDate()} ${THAI_MONTHS[selectedDate.getMonth()]} ${selectedDate.getFullYear() + 543}`}
          </Text>
          {error && <Text style={{ color: 'red', textAlign: 'center', margin: 10 }}>{error}</Text>}
          <ScrollView showsVerticalScrollIndicator={false}>
            {renderMedicationsForDate()}
          </ScrollView>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  headerGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: Platform.OS === "ios" ? 140 : 120,
  },
  content: {
    flex: 1,
    paddingTop: Platform.OS === "ios" ? 50 : 30,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 20,
    zIndex: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "white",
    marginLeft: 15,
  },
  calendarContainer: {
    backgroundColor: "white",
    borderRadius: 16,
    margin: 20,
    padding: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  monthHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  monthText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  weekdayHeader: {
    flexDirection: "row",
    marginBottom: 10,
  },
  weekdayText: {
    flex: 1,
    textAlign: "center",
    color: "#666",
    fontWeight: "500",
  },
  calendarWeek: {
    flexDirection: "row",
    marginBottom: 5,
  },
  calendarDay: {
    flex: 1,
    aspectRatio: 1,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
  },
  dayText: {
    fontSize: 16,
    color: "#333",
  },
  today: {
    backgroundColor: "#1a8e2d15",
  },
  todayText: {
    color: "#1a8e2d",
    fontWeight: "600",
  },
  hasEvents: {
    position: "relative",
  },
  eventDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#1a8e2d",
    position: "absolute",
    bottom: "15%",
  },
  scheduleContainer: {
    flex: 1,
    backgroundColor: "white",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  scheduleTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
    marginBottom: 15,
  },
  medicationCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 16,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  medicationColor: {
    width: 12,
    height: 40,
    borderRadius: 6,
    marginRight: 15,
  },
  medicationInfo: {
    flex: 1,
  },
  medicationName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  medicationDosage: {
    fontSize: 14,
    color: "#666",
    marginBottom: 2,
  },
  medicationTime: {
    fontSize: 14,
    color: "#666",
  },
  takeDoseButton: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 12,
  },
  takeDoseText: {
    color: "white",
    fontWeight: "600",
    fontSize: 14,
  },
  takenBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  takenText: {
    color: "#4CAF50",
    fontWeight: "600",
    fontSize: 14,
    marginLeft: 4,
  },
});