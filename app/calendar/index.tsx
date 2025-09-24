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
import { initDatabase } from "../../utils/database";
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
      await initDatabase();
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

    for (let day = 1; day <= days; day++) {
      const date = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), day);
      const isToday = new Date().toDateString() === date.toDateString();
      const hasDoses = doseHistory.some(
        (dose) => new Date(dose.timestamp).toDateString() === date.toDateString()
      );
      
      // check if med should be taked today
      const hasMedicationsForDate = medications.some((medication) => {
        const medStartDate = new Date(medication.startDate);
        const medStart = new Date(
          medStartDate.getFullYear(),
          medStartDate.getMonth(),
          medStartDate.getDate()
        );

        // duration
        const dayFrequency = Math.max(1, Number(medication.dayFrequency) || 1);
        let occurrenceCount = Infinity;
        if (!/(ongoing|ต่อเนื่อง)/i.test(medication.duration)) {
          const match = medication.duration.match(/(\d+)/);
          if (match) occurrenceCount = parseInt(match[1], 10);
        }

        if (date < medStart) return false;

        const daysSinceStart = Math.floor(
          (date.getTime() - medStart.getTime()) / (24 * 60 * 60 * 1000)
        );
        if (daysSinceStart % dayFrequency !== 0) return false;

        const occurrenceIndex = Math.floor(daysSinceStart / dayFrequency);
        return occurrenceIndex >= 0 && occurrenceIndex < occurrenceCount;
      });

      week.push(
        <TouchableOpacity
          key={day}
          style={[
            styles.calendarDay,
            isToday && styles.today,
            (hasDoses || hasMedicationsForDate) && styles.hasEvents,
          ]}
          onPress={() => setSelectedDate(date)}
        >
          <Text style={[styles.dayText, isToday && styles.todayText]}>
            {day}
          </Text>
          {(hasDoses || hasMedicationsForDate) && <View style={styles.eventDot} />}
        </TouchableOpacity>
      );

      if (week.length === 7) {
        calendar.push(
          <View key={`week-${day}`} style={styles.calendarWeek}>
            {week}
          </View>
        );
        week = [];
      }
    }

    // เติมช่องสัปดาห์สุดท้าย
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
      const selected = new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate()
      );
      const medStartDate = new Date(medication.startDate);
      const medStart = new Date(
        medStartDate.getFullYear(),
        medStartDate.getMonth(),
        medStartDate.getDate()
      );

      const dayFrequency = Math.max(1, Number(medication.dayFrequency) || 1);
      let occurrenceCount = Infinity;
      if (!/(ongoing|ต่อเนื่อง)/i.test(medication.duration)) {
        const match = medication.duration.match(/(\d+)/);
        if (match) occurrenceCount = parseInt(match[1], 10);
      }

      if (selected < medStart) return false;

      const daysSinceStart = Math.floor(
        (selected.getTime() - medStart.getTime()) / (24 * 60 * 60 * 1000)
      );
      if (daysSinceStart % dayFrequency !== 0) return false;

      const occurrenceIndex = Math.floor(daysSinceStart / dayFrequency);
      return occurrenceIndex >= 0 && occurrenceIndex < occurrenceCount;
    });

    if (filteredMeds.length === 0) {
      return <Text style={{ textAlign: 'center', color: '#888', marginTop: 20 }}>No medications for this date.</Text>;
    }

    const entries = filteredMeds.flatMap((med) => {
      if (Array.isArray(med.times) && med.times.length > 0) {
        return med.times.map((t) => ({ med, time: t }));
      }
      return [{ med, time: '' }];
    });

    // เช้า, กลางวัน, เย็น, ก่อนนอน
    const classifyPeriod = (timeStr: string): 'เช้า'|'กลางวัน'|'เย็น'|'ก่อนนอน' => {
      const [hhStr] = (timeStr || '23:59').split(':');
      const hh = parseInt(hhStr, 10) || 23;
      if (hh < 10) return 'เช้า';
      if (hh < 15) return 'กลางวัน';
      if (hh < 20) return 'เย็น';
      return 'ก่อนนอน';
    };
    const periodOrder = ['เช้า','กลางวัน','เย็น','ก่อนนอน'];
    const byPeriod: Record<string, typeof entries> = { 'เช้า': [], 'กลางวัน': [], 'เย็น': [], 'ก่อนนอน': [] };
    for (const e of entries) {
      byPeriod[classifyPeriod(e.time)].push(e);
    }

    // render group
    return (
      <>
        {periodOrder.map(period => {
          const list = byPeriod[period].slice().sort((a,b) => (a.time||'').localeCompare(b.time||''));
          if (list.length === 0) return null;
          const pending: typeof list = [];
          const taken: typeof list = [];
          const missed: typeof list = [];
          list.forEach(({ med: medication, time }, idx) => {
            const isTaken = dayDoses.some(
              (dose) => dose.medRemindId === medication.id && dose.taken && ((dose as any).time || '') === time
            );
            let isMissed = false;
            const today = new Date();
            const isToday =
              selectedDate.getFullYear() === today.getFullYear() &&
              selectedDate.getMonth() === today.getMonth() &&
              selectedDate.getDate() === today.getDate();
            if (isToday && time && !isTaken) {
              const [hour, minute] = time.split(':').map(Number);
              if (!isNaN(hour) && !isNaN(minute)) {
                const medTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hour, minute, 0, 0);
                const bufferTime = new Date(medTime.getTime() + 60 * 60 * 1000);
                if (today > bufferTime) {
                  isMissed = true;
                }
              }
            }
            if (isTaken) taken.push({ med: medication, time });
            else if (isMissed) missed.push({ med: medication, time });
            else pending.push({ med: medication, time });
          });
          const sorted = [...pending, ...taken, ...missed];
          return (
            <View key={period} style={{ marginTop: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                <Ionicons name="time-outline" size={16} color="#1a8e2d" />
                <Text style={{ marginLeft: 6, fontWeight: '700', color: '#1a1a1a' }}>{period}</Text>
              </View>
              {sorted.map(({ med: medication, time }, idx) => {
                const taken = dayDoses.some(
                  (dose) => dose.medRemindId === medication.id && dose.taken && ((dose as any).time || '') === time
                );
                let isMissed = false;
                const today = new Date();
                const isToday =
                  selectedDate.getFullYear() === today.getFullYear() &&
                  selectedDate.getMonth() === today.getMonth() &&
                  selectedDate.getDate() === today.getDate();
                if (isToday && time && !taken) {
                  const [hour, minute] = time.split(':').map(Number);
                  if (!isNaN(hour) && !isNaN(minute)) {
                    const medTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hour, minute, 0, 0);
                    const bufferTime = new Date(medTime.getTime() + 60 * 60 * 1000);
                    if (today > bufferTime) {
                      isMissed = true;
                    }
                  }
                }
                let cardStyle: any = { backgroundColor: 'white' };
                if (taken) cardStyle = { backgroundColor: '#F5F5F5', borderColor: '#E0E0E0', borderWidth: 1 };
                else if (isMissed) cardStyle = { backgroundColor: '#F5F5F5', borderColor: '#b71c1c', borderWidth: 2 };
                return (
                  <View key={medication.id + '|' + time + '|' + idx} style={[styles.medicationCard, cardStyle]}> 
                    <View
                      style={[
                        styles.medicationColor,
                        { backgroundColor: medication.color },
                      ]}
                    />
                    <View style={styles.medicationInfo}>
                      <Text style={styles.medicationName}>{medication.name}</Text>
                      <Text style={styles.medicationDosage}>{medication.dosage}</Text>
                      <Text style={styles.medicationTime}>{time || '-'}</Text>
                      <Text style={[styles.medicationDosage, { color: '#888', fontSize: 13 }]}>ทานแล้ว {getDoseStatsForMed(medication, doseHistory).taken} / {getDoseStatsForMed(medication, doseHistory).total} ครั้ง</Text>
                    </View>
                    {taken ? (
                      <View style={styles.takenBadge}>
                        <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                        <Text style={styles.takenText}>ทานแล้ว</Text>
                      </View>
                    ) : isMissed ? (
                      <View style={[styles.takenBadge, { backgroundColor: '#fde0e0' }]}
                      >
                        <Ionicons name="close-circle" size={20} color="#b71c1c" />
                        <Text style={[styles.takenText, { color: '#b71c1c' }]}>ไม่ได้รับประทาน</Text>
                      </View>
                    ) : (
                      isToday ? (
                        <TouchableOpacity
                          style={[styles.takeDoseButton, { backgroundColor: medication.color }]}
                          onPress={async () => {
                            try {
                              await Promise.race([
                                recordDose(medication.id, true, new Date().toISOString(), time),
                                new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout recording dose')), 1000))
                              ]);
                            } catch (error) {
                              if (typeof require !== 'undefined') {
                                // dynamic import to avoid circular deps
                                const { addToDoseOutbox } = require('../../utils/outbox');
                                await addToDoseOutbox({
                                  medRemindId: medication.id,
                                  taken: true,
                                  timestamp: new Date().toISOString(),
                                  time,
                                });
                              }
                            }
                            loadData();
                          }}
                        >
                          <Text style={styles.takeDoseText}>รับประทาน</Text>
                        </TouchableOpacity>
                      ) : (
                        <View style={[styles.takeDoseButton, { backgroundColor: '#ccc' }]
                        }>
                          <Text style={[styles.takeDoseText, { color: '#888' }]}>รับประทาน</Text>
                        </View>
                      )
                    )}
                  </View>
                );
              })}
            </View>
          );
        })}
      </>
    );
  };

  function getDoseStatsForMed(med: MedRemind, history: DoseHistory[]) {
    const taken = history.filter(
      (dose) => dose.medRemindId === med.id && dose.taken
    ).length;
    let durationDays = 0;
    if (/(ongoing|ต่อเนื่อง)/i.test(med.duration)) {
      durationDays = 0;
    } else {
      const match = med.duration.match(/(\d+)/);
      if (match) durationDays = parseInt(match[1], 10);
    }
    const timesPerDay = Array.isArray(med.times) && med.times.length > 0 ? med.times.length : 1;
    const total = durationDays > 0 ? durationDays * timesPerDay : 0;
    return { taken, total };
  }

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