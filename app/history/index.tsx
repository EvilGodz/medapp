import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  DoseHistory,
  MedRemind,
  clearAllData,
  getDoseHistory,
  getMedReminds,
} from "../../utils/storage";

type EnrichedDoseHistory = DoseHistory & { medRemind?: MedRemind };

export default function HistoryScreen() {
  const router = useRouter();
  const [history, setHistory] = useState<EnrichedDoseHistory[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<
    "ทั้งหมด" | "รับประทานแล้ว" | "ไม่ได้รับประทาน"
  >("ทั้งหมด");

  const loadHistory = useCallback(async () => {
    try {
      const [doseHistory, medications] = await Promise.all([
        getDoseHistory(),
        getMedReminds(),
      ]);


      const enrichedHistory = doseHistory.map((dose) => {
        const found = medications.find((med) => med.id === String(dose.medRemindId));
        return {
          ...dose,
          medRemind: found,
        };
      });

      setHistory(enrichedHistory);
    } catch (error) {
      console.error("Error loading history:", error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [loadHistory])
  );

  const groupHistoryByDate = (data = history) => {
    const grouped = data.reduce((acc, dose) => {
      const date = new Date(dose.timestamp).toDateString();
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(dose);
      return acc;
    }, {} as Record<string, EnrichedDoseHistory[]>);

    return Object.entries(grouped).sort(
      (a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime()
    );
  };

  const filteredHistory = history.filter((dose) => {
    if (selectedFilter === "ทั้งหมด") return true;
    if (selectedFilter === "รับประทานแล้ว") return dose.taken;
    if (selectedFilter === "ไม่ได้รับประทาน") return !dose.taken;
    return true;
  });

  const groupedHistory = groupHistoryByDate(filteredHistory);

  const handleClearAllData = () => {
    Alert.alert(
      "ล้างข้อมูล",
      "คุณแน่ใจหรือไม่ว่าต้องการล้างข้อมูลการใช้ยา? การกระทำนี้ไม่สามารถย้อนกลับได้",
      [
        {
          text: "ยกเลิก",
          style: "cancel",
        },
        {
          text: "ล้างข้อมูล",
          style: "destructive",
          onPress: async () => {
            try {
              await clearAllData();
              await loadHistory();
              Alert.alert("สำเร็จ", "ข้อมูลการใช้ยาถูกล้างเรียบร้อยแล้ว");
            } catch (error) {
              console.error("Error clearing data:", error);
              Alert.alert("Error", "ล้างข้อมูลไม่สำเร็จ กรุณาลองอีกครั้ง");
            }
          },
        },
      ]
    );
  };

  function getDoseStatsForMed(med: MedRemind | undefined, history: DoseHistory[]) {
    if (!med) return { taken: 0, total: 0 };
    const taken = history.filter(
      (dose) => dose.medRemindId === med.id && dose.taken
    ).length;
    // total = duration(วัน) * times.length (หรือ 1 ถ้าไม่มี times)
    let durationDays = 0;
    if (/(ongoing|ต่อเนื่อง)/i.test(med.duration)) {
      durationDays = 0; // ไม่ track total สำหรับ ongoing
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
          <Text style={styles.headerTitle}>ประวัติการทานยา</Text>
        </View>

        <View style={styles.filtersContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filtersScroll}
          >
            <TouchableOpacity
              style={[
                styles.filterButton,
                selectedFilter === "ทั้งหมด" && styles.filterButtonActive,
              ]}
              onPress={() => setSelectedFilter("ทั้งหมด")}
            >
              <Text
                style={[
                  styles.filterText,
                  selectedFilter === "ทั้งหมด" && styles.filterTextActive,
                ]}
              >
                All
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterButton,
                selectedFilter === "รับประทานแล้ว" && styles.filterButtonActive,
              ]}
              onPress={() => setSelectedFilter("รับประทานแล้ว")}
            >
              <Text
                style={[
                  styles.filterText,
                  selectedFilter === "รับประทานแล้ว" && styles.filterTextActive,
                ]}
              >
                รับประทานแล้ว
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterButton,
                selectedFilter === "ไม่ได้รับประทาน" && styles.filterButtonActive,
              ]}
              onPress={() => setSelectedFilter("ไม่ได้รับประทาน")}
            >
              <Text
                style={[
                  styles.filterText,
                  selectedFilter === "ไม่ได้รับประทาน" && styles.filterTextActive,
                ]}
              >
                ไม่ได้รับประทาน
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        <ScrollView
          style={styles.historyContainer}
          showsVerticalScrollIndicator={false}
        >
          {groupedHistory.map(([date, doses]) => (
            <View key={date} style={styles.dateGroup}>
              <Text style={styles.dateHeader}>
                {new Date(date).toLocaleDateString("default", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </Text>
              {doses.map((dose) => (
                <View key={dose.id} style={styles.historyCard}>
                  <View
                    style={[
                      styles.medicationColor,
                      { backgroundColor: dose.medRemind?.color || "#ccc" },
                    ]}
                  />
                  <View style={styles.medicationInfo}>
                    <Text style={styles.medicationName}>
                      {dose.medRemind?.name || "ไม่ระบุชื่อยา"}
                    </Text>
                    <Text style={styles.medicationDosage}>
                      {dose.medRemind?.dosage}
                    </Text>
                    <Text style={styles.timeText}>
                      {new Date(dose.timestamp).toLocaleTimeString("default", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Text>
                    <Text style={[styles.timeText, { color: '#888', fontSize: 13 }]}>ทานแล้ว {getDoseStatsForMed(dose.medRemind, history).taken} / {getDoseStatsForMed(dose.medRemind, history).total} ครั้ง</Text>
                  </View>
                  <View style={styles.statusContainer}>
                    {dose.taken ? (
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: "#E8F5E9" },
                        ]}
                      >
                        <Ionicons
                          name="checkmark-circle"
                          size={16}
                          color="#4CAF50"
                        />
                        <Text style={[styles.statusText, { color: "#4CAF50" }]}>
                          รับประทานแล้ว
                        </Text>
                      </View>
                    ) : (
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: "#FFEBEE" },
                        ]}
                      >
                        <Ionicons
                          name="close-circle"
                          size={16}
                          color="#F44336"
                        />
                        <Text style={[styles.statusText, { color: "#F44336" }]}>
                          ไม่ได้รับประทาน
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </View>
          ))}

          <View style={styles.clearDataContainer}>
            <TouchableOpacity
              style={styles.clearDataButton}
              onPress={handleClearAllData}
            >
              <Ionicons name="trash-outline" size={20} color="#FF5252" />
              <Text style={styles.clearDataText}>Clear All Data</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
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
  filtersContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
    backgroundColor: "#f8f9fa",
    paddingTop: 10,
  },
  filtersScroll: {
    paddingRight: 20,
  },
  filterButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "white",
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  filterButtonActive: {
    backgroundColor: "#1a8e2d",
    borderColor: "#1a8e2d",
  },
  filterText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
  },
  filterTextActive: {
    color: "white",
  },
  historyContainer: {
    flex: 1,
    paddingHorizontal: 20,
    backgroundColor: "#f8f9fa",
  },
  dateGroup: {
    marginBottom: 25,
  },
  dateHeader: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
    marginBottom: 12,
  },
  historyCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
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
    marginRight: 16,
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
  timeText: {
    fontSize: 14,
    color: "#666",
  },
  statusContainer: {
    alignItems: "flex-end",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    marginLeft: 4,
    fontSize: 14,
    fontWeight: "600",
  },
  clearDataContainer: {
    padding: 20,
    alignItems: "center",
    marginTop: 20,
    marginBottom: 40,
  },
  clearDataButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFEBEE",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FFCDD2",
  },
  clearDataText: {
    color: "#FF5252",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
});