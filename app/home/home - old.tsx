import { Ionicons } from "@expo/vector-icons";
import { useState, useEffect, useRef, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, Animated, Dimensions, StyleSheet, Modal, AppState, Alert } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Link, useRouter } from "expo-router";
import Svg, { Circle } from "react-native-svg";
import { DoseHistory, getMedications, getTodaysDoses, Medication, recordDose } from "@/utils/storage";
import { registerForPushNotificationsAsync, scheduleMedicationReminder } from "@/utils/notifications";
import { useFocusEffect } from "@react-navigation/native";

const { width } = Dimensions.get('window');
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const QUICK_ACTIONS = [
    {
        icon: "add-circle-outline" as const,
        label: 'Add\nMedication',
        route: '/medications/add' as const,
        color: '#2E7D32',
        gradient: ['#4CAF50', '#2E7D32'] as [string, string]
    },
    {
        icon: "calendar-outline" as const,
        label: 'Calendar\nView',
        route: '/calendar' as const,
        color: '#1976D2',
        gradient: ['#2196F3', '#1976D2'] as [string, string]
    },
    {
        icon: 'time-outline' as const,
        label: 'History\nLog',
        route: '/history' as const,
        color: '#C2185B',
        gradient: ['#E91E63', '#C2185B'] as [string, string]
    },
    // {
    //     icon: 'medical-outline' as const,
    //     label: 'Refill\nTracker',
    //     route: '/refills' as const,
    //     color: '#E64A19',
    //     gradient: ['#FF5722', '#E64A19'] as [string, string]
    // }
]

interface CircularProgressProps {
    progress: number;
    totalDoses: number;
    completeDoses: number;
}

function CircularProgress({
    progress,
    totalDoses,
    completeDoses,
}: CircularProgressProps) {
    const animationValue = useRef(new Animated.Value(0)).current;
    const size = width * 0.55;
    const strokeWidth = 15;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    useEffect(() => {
        Animated.timing(animationValue, {
            toValue: progress,
            duration: 1000,
            useNativeDriver: true,
        }).start();
    }, [progress]);

    const strokeDashoffset = animationValue.interpolate({
        inputRange: [0, 1],
        outputRange: [circumference, 0],
    });

    return (
        <View style={style.progressContainer}>
            <View style={style.progressTextContainer}>
                <Text style={style.progressPercentage}>
                    {Math.round(progress * 100)}%
                </Text>
                <Text style={style.progressLabel}>
                    {" "}
                    {completeDoses} จาก {totalDoses} โดส
                </Text>

            </View>
            <Svg width={size} height={size} style={style.progressRing}>
                <Circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="rgba(255,255,255,0.2)"
                    strokeWidth={strokeWidth}
                    fill="none"
                />
                <AnimatedCircle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="white"
                    strokeWidth={strokeWidth}
                    fill="none"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    transform={`rotate(-90 ${size / 2} ${size / 2})`}
                />

            </Svg>
        </View>
    )
}

export default function HomeScreen() {
    const router = useRouter();
    const [todayMedications, setTodayMedications] = useState<Medication[]>([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const [completedDoses, setCompletedDoses] = useState(0);
    const [doseHistory, setDoseHistory] = useState<DoseHistory[]>([]);
    const [medications, setMedications] = useState<Medication[]>([]);

    const loadMedications = useCallback(async () => {
        try {
            const [allMedications, todayDoses] = await Promise.all([
                getMedications(),
                getTodaysDoses(),
            ]);

            setDoseHistory(todayDoses);
            setMedications(allMedications);

            const today = new Date();
            const todayMeds = allMedications.filter((med) => {
                const startDate = new Date(med.startDate);
                const durationDays = parseInt(med.duration.split(" ")[0]);
                if (
                    durationDays === -1 || (today >= startDate && today <= new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000))
                ) {
                    return true;
                }
                return false;
            });

            setTodayMedications(todayMeds);

            const completed = todayDoses.filter((dose) => dose.taken).length;
            setCompletedDoses(completed);
        } catch (error) {
            console.error("Error loading medications:", error);
        }
    }, []);

    const setupNotifications = async () => {
        try {
            const token = await registerForPushNotificationsAsync();
            if (!token) {
                console.log("Failed to get push notifications token");
                return;
            }

            const medifications = await getMedications();
            for (const medication of medications) {
                if (medication.reminderEnabled) {
                    await scheduleMedicationReminder(medication);
                }
            }
        } catch (error) {
            console.error("Error setting up notifications:", error);
        }
    };

    useEffect(() => {
        loadMedications();
        setupNotifications();

        const subscription = AppState.addEventListener('change', (nextAppState) => {
            if (nextAppState === 'active') {
                loadMedications();
            }
        });

        return () => {
            subscription.remove();
        };
    }, [])

    useFocusEffect(
        useCallback(() => {
            const unsubscribe = () => {
                //cleanup
            }
            loadMedications();
            return () => unsubscribe();
        }, [loadMedications])
    );

    const handleTakeDose = async (medications: Medication) => {
        try {
            await recordDose(medications.id, true, new Date().toISOString());
            await loadMedications();
        } catch (error) {
            console.error("Error recording dose:", error);
            Alert.alert("Error", "Failed to record dose. Please try again.");
        }
    };
    const isDoseTaken = (medicationsId: string) => {
        return doseHistory.some(
            (dose) => dose.medicationId === medicationsId && dose.taken
        );
    };

    // const progress = todayMedications.length > 0 ? completedDoses / (todayMedications.length * 2) : 0
    // คำนวณ totalDoses จากจำนวน times ของแต่ละยา
    const totalDoses = todayMedications.reduce(
      (sum, med) => sum + (med.times?.length || 0),
      0
    );
    // completedDoses ใช้จำนวนโดสที่ taken ใน doseHistory (ของวันนี้)
    // (สมมติว่า doseHistory มีเฉพาะโดสของวันนี้)
    const progress = totalDoses > 0 ? completedDoses / totalDoses : 0;

    return (
        <ScrollView style={style.containter} showsVerticalScrollIndicator={false} >
            <LinearGradient colors={["#1a8e2d", "#146922"]} style={style.header}>
                <View style={style.headerContent}>
                    <View style={style.headerTop}>
                        <View style={{ flex: 1 }}>
                            <Text style={style.greeting}>
                                ความคืบหน้าประจำวัน
                            </Text>
                        </View>
                        <TouchableOpacity style={style.notificationButton}
                        onPress={() => setShowNotifications(true)}
                        >
                            <Ionicons name="notifications-outline" size={24} color="white" />
                            {<View style={style.notificationBadge}>
                                <Text style={style.notificationCount}>
                                {todayMedications.length}</Text></View>}
                        </TouchableOpacity>
                    </View>
                    <CircularProgress
                        progress={progress}
                        // totalDoses={todayMedications.length * 2}
                        totalDoses={totalDoses}
                        completeDoses={completedDoses}
                    />
                </View>
            </LinearGradient>

            <View style={style.content}>
                <View style={style.quickActionsContainer}>
                    <Text style={style.sectionTitle}> Quick Action</Text>
                    <View style={style.quickActionsGrid}>
                        {QUICK_ACTIONS.map((actions) => (
                            <Link href={actions.route as any} key={actions.label} asChild>
                                <TouchableOpacity style={style.actionButton}>
                                    <LinearGradient colors={actions.gradient} style={style.actionGradient}>
                                        <View style={style.actionContent}>
                                            <View style={style.actionIcon}>
                                                <Ionicons name={actions.icon} size={24} color="white" />
                                            </View>
                                            <Text style={style.actionLabel}>{actions.label}</Text>
                                        </View>
                                    </LinearGradient>
                                </TouchableOpacity>
                            </Link>
                        ))}
                    </View>
                </View>
            </View>

            <View style={{ paddingHorizontal: 20 }}>
                <View style={style.sectionHeader}>
                    <Text style={style.sectionTitle}>รายการยาวันนี้</Text>
                    <Link href={"/calendar" as any} asChild>
                        <TouchableOpacity>
                            <Text style={style.seeAllButton}>ดูทั้งหมด</Text>
                        </TouchableOpacity>
                    </Link>
                </View>

                {todayMedications.length === 0 ? (
                    <View style={style.emptyState}>
                        <Ionicons name="medical-outline" size={48} color='#ccc' />
                        <Text style={style.emptyStateText}>ไม่มีรายการยาสำหรับวันนี้</Text>
                        <Link href="/medications/add">
                            <TouchableOpacity style={style.addMedicationButton}>
                                <Text style={style.addMedicationButtonText}>เพิ่มยา</Text>
                            </TouchableOpacity>
                        </Link>
                    </View>
                ) : (
                    todayMedications.map((medication) => {
                        const taken = isDoseTaken(medication.id);

                        return (
                            <View key={medication.id} style={style.doseCard}>
                                <View style={[
                                    style.doseBadge,
                                    {
                                        backgroundColor: `${medication.color}15`
                                    }
                                ]}>
                                    <Ionicons name="medical" size={24} color={medication.color} />
                                </View>
                                <View style={style.doseInfo}>
                                    <View>
                                        <Text style={style.medicineName}>{medication.name}</Text>
                                        <Text style={style.doseInfo}>{medication.dosage}</Text>
                                    </View>
                                    <View style={style.doseTime}>
                                        <Ionicons name="time-outline" size={16} color="#ccc" />
                                        <Text style={style.timeText}>{medication.times[0]}</Text>
                                    </View>
                                </View>
                                {taken ? (
                                    <View style={style.takenBadge}>
                                        <Ionicons name="checkmark-circle-outline" size={24} color="#4CAF50" />
                                        <Text style={style.takenText}>รับประทานแล้ว</Text>
                                    </View>
                                ) : (
                                    <TouchableOpacity
                                        style={[
                                            style.takeDoseButton,
                                            { backgroundColor: medication.color },
                                        ]}
                                        onPress={() => handleTakeDose(medication)}
                                    >
                                        <Text style={style.takeDoseText}>รับประทาน</Text>
                                    </TouchableOpacity>
                                )}

                            </View>
                        )
                    })
                )}

            </View>
            <Modal visible={showNotifications} transparent={true} animationType="slide" onRequestClose={() => setShowNotifications(false)}>
                <View style={style.modalOverlay}>
                    <View style={style.modalContent}>
                        <Text style={style.modalTitle}>
                            Notification
                        </Text>
                        <TouchableOpacity style={style.modalCloseButton}
                            onPress={() => setShowNotifications(false)}
                        >
                            <Ionicons name="close" size={24} color="#333" />
                        </TouchableOpacity>
                    </View>
                    {todayMedications.map((medication) => (
                        <View style={style.notificationItem}>
                            <View style={style.notificationIcon}>
                                <Ionicons name="medical" size={24} />
                            </View>
                            <View style={style.notificationContent}>
                                <Text style={style.notificationTitle}>{medication.name}</Text>
                                <Text style={style.notificationMessage}>{medication.dosage}</Text>
                                <Text style={style.notificationTime}>{medication.times[0]}</Text>
                            </View>
                        </View>
                    ))}
                </View>

            </Modal>
        </ScrollView>
    )
}

const style = StyleSheet.create({
    containter: {
        flex: 1,
        backgroundColor: "#f8f9fa",
    },
    header: {
        paddingTop: 50,
        paddingBottom: 25,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
    },
    headerContent: {
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        width: "100%",
        marginBottom: 20
    },
    greeting: {
        fontSize: 18,
        fontWeight: "600",
        color: "white",
        opacity: 0.9
    },
    content: {
        flex: 1,
        paddingTop: 20
    },
    notificationButton: {
        position: "relative",
        padding: 8,
        backgroundColor: "rgba(255,255,255,0.15)",
        borderRadius: 12,
        marginLeft: 8
    },
    notificationBadge: {
        position: "absolute",
        top: -4,
        right: -4,
        backgroundColor: "#ff5252",
        borderRadius: 10,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
        borderWidth: 2,
        borderColor: "#146922",
        minWidth: 20
    },
    notificationCount: {
        fontSize: 11,
        fontWeight: "bold",
        color: "white"
    },
    progressContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 10
    },
    progressTextContainer: {
        position: 'absolute',
        zIndex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    progressPercentage: {
        fontSize: 36,
        color: "white",
        fontWeight: 'bold',
    },
    progressLabel: {
        fontSize: 14,
        color: "rgba(255,255,255,0.9)",
        fontWeight: 'bold'
    },
    progressDetails: {
        fontSize: 11,
        color: "white",
        fontWeight: "bold"
    },
    progressRing: {
        transform: [{ rotate: "-90deg" }]
    },
    quickActionsContainer: {
        paddingHorizontal: 20,
        marginBottom: 25,
    },
    quickActionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginTop: 15
    },
    actionButton: {
        width: (width - 52) / 2,
        height: 110,
        borderRadius: 16,
        overflow: 'hidden',
    },
    actionGradient: {
        flex: 1,
        padding: 15,
    },
    actionIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: "rgba(255,255,255,0.2)",
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionLabel: {
        fontSize: 14,
        marginTop: 8,
        fontWeight: "600",
        color: "white"
    },
    actionContent: {
        flex: 1,
        justifyContent: 'space-between',
    },
    sectionTitle: {
        fontWeight: "700",
        fontSize: 20,
        color: "#1a1a1a",
        marginBottom: 5,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15
    },
    seeAllButton: {
        color: "#2E7D32",
        fontWeight: "600"
    },
    emptyState: {
        alignItems: 'center',
        padding: 30,
        backgroundColor: "white",
        borderRadius: 16,
        marginTop: 10
    },
    emptyStateText: {
        fontSize: 16,
        color: "#666",
        marginTop: 10,
        marginBottom: 20
    },
    addMedicationButton: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        backgroundColor: "#1a8e2d",
        borderRadius: 20,
    },
    addMedicationButtonText: {
        color: "white",
        fontWeight: "600",
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
    doseTime: {
        flexDirection: 'row',
        alignItems: 'center'
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
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: 'flex-end'
    },
    modalContent: {
        backgroundColor: 'white',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        maxHeight: "80%"
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#333"
    },
    modalCloseButton: {
        padding: 5
    },
    notificationItem: {
        flexDirection: 'row',
        padding: 15,
        borderRadius: 12,
        backgroundColor: "#f5f5f5",
        marginBottom: 10
    },
    notificationIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#E8F5E9",
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15
    },
    notificationContent: {
        flex: 1,
    },
    notificationTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: "#333",
        marginBottom: 4
    },
    notificationMessage: {
        fontSize: 14,
        color: "#666",
        marginBottom: 4
    },
    notificationTime: {
        fontSize: 12,
        color: "#999"
    },
    takenBadge: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "#E8F5E9",
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 12,
      marginLeft: 10,
    },
    takenText: {
      color: "#4CAF50",
      fontWeight: "600",
      fontSize: 14,
      marginLeft: 4,
    },
  });