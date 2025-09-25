import { registerForPushNotificationsAsync, scheduleMedicationReminder } from "@/utils/notifications";
import { addToDoseOutbox } from '@/utils/outbox';
import { DoseHistory, ensureMissedDosesForToday, getMedReminds, getTodaysDoses, MedRemind, recordDose } from "@/utils/storage";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { Link, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Animated, AppState, Dimensions, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

const { width } = Dimensions.get('window');
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

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
    const [todayMedications, setTodayMedications] = useState<MedRemind[]>([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const [doseHistory, setDoseHistory] = useState<DoseHistory[]>([]);
    const [medications, setMedications] = useState<MedRemind[]>([]);
    const isLoadingRef = useRef(false);

    const loadMedications = useCallback(async () => {
        if (isLoadingRef.current) return;
        isLoadingRef.current = true;
        try {
            const [allMedications, todayDoses] = await Promise.all([
                getMedReminds(),
                getTodaysDoses(),
            ]);

            setDoseHistory(todayDoses);
            setMedications(allMedications);

            // check today med
            const today = new Date();
            const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            const todayMeds = allMedications.filter((med) => {
                const startDate = new Date(med.startDate);
                const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
                const dayFrequency = Math.max(1, Number(med.dayFrequency) || 1);
                let occurrenceCount = Infinity;
                if (!/(ongoing|ต่อเนื่อง)/i.test(med.duration)) {
                    const match = med.duration.match(/(\d+)/);
                    if (match) occurrenceCount = parseInt(match[1], 10);
                }
                if (todayStart < start) return false;
                const daysSinceStart = Math.floor((todayStart.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
                if (daysSinceStart % dayFrequency !== 0) return false;
                const occurrenceIndex = Math.floor(daysSinceStart / dayFrequency);
                return occurrenceIndex >= 0 && occurrenceIndex < occurrenceCount;
            });

            // sort by time
            todayMeds.sort((a, b) => {
                const ta = (a.times?.[0] || '23:59');
                const tb = (b.times?.[0] || '23:59');
                return ta.localeCompare(tb);
            });

            setTodayMedications(todayMeds);

            try {
                await ensureMissedDosesForToday(todayMeds);
                const refreshedTodayDoses = await getTodaysDoses();
                setDoseHistory(refreshedTodayDoses);
            } catch (e) {
                console.error('Failed to miss doses:', e);
            }

        } catch (error) {
            console.error("Error loading medications:", error);
        } finally {
            isLoadingRef.current = false;
        }
    }, []);

    const setupNotifications = async () => {
        try {
            const token = await registerForPushNotificationsAsync();
            if (!token) {
                console.log("Failed to get push notifications token");
                return;
            }

            const medications = await getMedReminds();
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
        const initializeApp = async () => {
            try {
                await loadMedications();
                await setupNotifications();
            } catch (error) {
                console.error('Error init app:', error);
            }
        };

        initializeApp();

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
            }
            loadMedications();
            return () => unsubscribe();
        }, [loadMedications])
    );

    useEffect(() => {
        const checkAuth = async () => {
            const token = await AsyncStorage.getItem('token');
            const user = await AsyncStorage.getItem('user');
            if (!token || !user) {
                router.replace('/login/LoginScreen');
            }
        };
        checkAuth();
    }, []);

    const handleTakeDose = async (medRemind: MedRemind, time?: string) => {
        try {
            try {
                await Promise.race([
                    recordDose(medRemind.id, true, new Date().toISOString(), time),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout recording dose')), 1000))
                ]);
            } catch (error) {
                // outbox
                await addToDoseOutbox({
                    medRemindId: medRemind.id,
                    taken: true,
                    timestamp: new Date().toISOString(),
                    time,
                });
            }
            await loadMedications();
        } catch (error) {
            Alert.alert("เกิดข้อผิดพลาด", "ไม่สามารถบันทึกการรับประทานยาได้ กรุณาลองใหม่อีกครั้ง");
        }
    };
    const today = new Date().toDateString();
    const completedDoses = doseHistory.filter(
        (dose) => dose.taken && new Date(dose.timestamp).toDateString() === today
    ).length;
    const isTimeDoseTaken = (medicationsId: string, time: string) =>
        doseHistory.some(
            (dose) =>
                dose.medRemindId === medicationsId &&
                dose.taken &&
                (dose.time || '') === time &&
                new Date(dose.timestamp).toDateString() === today
        );

    const isTimeDoseMissed = (med: MedRemind, time: string) => {
        if (!time) return false;
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        const [hhStr, mmStr = '0'] = time.split(':');
        const hh = parseInt(hhStr, 10) || 0;
        const mm = parseInt(mmStr, 10) || 0;
        const sched = new Date(
            todayStart.getFullYear(),
            todayStart.getMonth(),
            todayStart.getDate(),
            hh,
            mm,
            0,
            0
        );
        const oneHourAfter = new Date(sched.getTime() + 60 * 60 * 1000);
        const takenToday = isTimeDoseTaken(med.id, time);
        return !takenToday && now > oneHourAfter;
    };
    const totalDoses = todayMedications.reduce(
        (sum, med) => sum + (med.times?.length || 0),
        0
    );
    const progress = totalDoses > 0 ? Math.min(completedDoses / totalDoses, 1) : 0;

    function getDoseStatsForMed(med: MedRemind, doseHistory: DoseHistory[]) {
        const taken = doseHistory.filter(
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
        <View style={{ flex: 1, backgroundColor: '#f8f9fa' }}>
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
                                {todayMedications.length > 0 && (
                                    <View style={style.notificationBadge}>
                                        <Text style={style.notificationCount}>
                                            {todayMedications.length}
                                        </Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        </View>
                        <CircularProgress
                            progress={progress}
                            totalDoses={totalDoses}
                            completeDoses={completedDoses}
                        />
                    </View>
                </LinearGradient>

                <View style={{
                    paddingHorizontal: 20,
                    paddingVertical: 20,
                    marginBottom: 60,
                }}>
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
                            <Link href="/notification/add" asChild>
                                <TouchableOpacity style={style.addMedicationButton}>
                                    <Text style={style.addMedicationButtonText}>เพิ่มยา</Text>
                                </TouchableOpacity>
                            </Link>
                        </View>
                    ) : (
                        (() => {
                            type Entry = { med: MedRemind; time: string };
                            const classifyPeriod = (timeStr: string): 'เช้า' | 'กลางวัน' | 'เย็น' | 'ก่อนนอน' => {
                                const [hhStr] = (timeStr || '23:59').split(':');
                                const hh = parseInt(hhStr, 10) || 23;
                                if (hh < 10) return 'เช้า';
                                if (hh < 15) return 'กลางวัน';
                                if (hh < 20) return 'เย็น';
                                return 'ก่อนนอน';
                            };
                            const entries: Entry[] = [];
                            for (const med of todayMedications) {
                                if (Array.isArray(med.times) && med.times.length > 0) {
                                    for (const t of med.times) entries.push({ med: med, time: t });
                                } else {
                                    entries.push({ med: med, time: '—' });
                                }
                            }
                            // group by period
                            const byPeriod: Record<string, Entry[]> = {};
                            for (const e of entries) {
                                const period = classifyPeriod(e.time);
                                if (!byPeriod[period]) byPeriod[period] = [];
                                byPeriod[period].push(e);
                            }
                            const periodOrder = ['เช้า', 'กลางวัน', 'เย็น', 'ก่อนนอน'];
                            return (
                                <>
                                    {periodOrder.filter(p => byPeriod[p]?.length).map((period) => {
                                        const mealGroups: Record<string, Entry[]> = { 'ก่อนอาหาร': [], 'หลังอาหาร': [], 'ระหว่างอาหาร': [], 'หลังอาหารทันที': [], 'ไม่ระบุ': [], '': [] };
                                        for (const e of byPeriod[period]) {
                                            const meal = ((e.med as any).mealTiming || '') as string;
                                            if (!mealGroups[meal]) mealGroups[meal] = [];
                                            mealGroups[meal].push(e);
                                        }
                                        const totalPendingInPeriod = ['ก่อนอาหาร', 'หลังอาหาร', 'ระหว่างอาหาร', 'หลังอาหารทันที', 'ไม่ระบุ', ''].reduce((acc, meal) => {
                                            const list = (mealGroups[meal] || []).slice().sort((a, b) => (a.time || '').localeCompare(b.time || ''));
                                            const pending = list.filter(e => !isTimeDoseTaken(e.med.id, e.time) && !isTimeDoseMissed(e.med, e.time));
                                            return acc + pending.length;
                                        }, 0);
                                        if (totalPendingInPeriod === 0) return null;
                                        return (
                                            <View key={period} style={{ marginTop: 12 }}>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                                                    <Ionicons name="time-outline" size={16} color="#1a8e2d" />
                                                    <Text style={{ marginLeft: 6, fontWeight: '700', color: '#1a1a1a' }}>{period}</Text>
                                                </View>
                                                {['ก่อนอาหาร', 'หลังอาหาร', 'ระหว่างอาหาร', 'หลังอาหารทันที', 'ไม่ระบุ', ''].map((meal) => {
                                                    const list = mealGroups[meal].slice().sort((a, b) => (a.time || '').localeCompare(b.time || ''));
                                                    const pending = list.filter(e => !isTimeDoseTaken(e.med.id, e.time) && !isTimeDoseMissed(e.med, e.time));
                                                    if (pending.length === 0) return null;
                                                    return (
                                                        <View key={period + '|' + meal}>
                                                            {!!meal && <Text style={{ fontWeight: '600', color: '#444', marginBottom: 4 }}>{meal}</Text>}
                                                            {pending.map((entry, idx) => {
                                                                const medication = entry.med;
                                                                const time = entry.time;
                                                                return (
                                                                    <View key={medication.id + '|' + time + '|' + idx} style={style.doseCard}>
                                                                        <View
                                                                            style={[
                                                                                style.medicationColor,
                                                                                { backgroundColor: medication.color },
                                                                            ]}
                                                                        />
                                                                        <View style={style.doseInfo}>
                                                                            <View>
                                                                                <Text style={style.medicineName}>{medication.name}</Text>
                                                                                <Text style={style.doseInfo}>{medication.dosage}</Text>
                                                                                <Text style={style.timeText}>{time}</Text>
                                                                            </View>
                                                                        </View>
                                                                        {(() => {
                                                                            const now = new Date();
                                                                            const [hour, minute] = (time || '00:00').split(':').map(Number);
                                                                            const scheduledTime = new Date(
                                                                                now.getFullYear(),
                                                                                now.getMonth(),
                                                                                now.getDate(),
                                                                                hour,
                                                                                minute
                                                                            );
                                                                            const timeDiff = now.getTime() - scheduledTime.getTime();
                                                                            const hourDiff = Math.abs(timeDiff) / (1000 * 60 * 60);

                                                                            if (hourDiff > 1) {
                                                                                return (
                                                                                    <View style={[style.takeDoseButton, { backgroundColor: '#ccc' }]}>
                                                                                        <Text style={[style.takeDoseText, { color: '#888' }]}>ยังไม่ถึงเวลา</Text>
                                                                                    </View>
                                                                                );
                                                                            }

                                                                            return (
                                                                                <TouchableOpacity
                                                                                    style={[style.takeDoseButton, { backgroundColor: medication.color }]}
                                                                                    onPress={() => handleTakeDose(medication, time)}
                                                                                >
                                                                                    <Text style={style.takeDoseText}>รับประทาน</Text>
                                                                                </TouchableOpacity>
                                                                            );
                                                                        })()}
                                                                    </View>
                                                                );
                                                            })}
                                                        </View>
                                                    );
                                                })}
                                            </View>
                                        );
                                    })}

                                    {(() => {
                                        // miss and taken group
                                        const allEntries: Entry[] = [];
                                        for (const p of periodOrder) {
                                            for (const e of byPeriod[p] || []) allEntries.push(e);
                                        }
                                        const missed = allEntries
                                            .filter(e => isTimeDoseMissed(e.med, e.time))
                                            .sort((a, b) => (a.time || '').localeCompare(b.time || ''));
                                        const taken = allEntries
                                            .filter(e => isTimeDoseTaken(e.med.id, e.time))
                                            .sort((a, b) => (a.time || '').localeCompare(b.time || ''));
                                        return (
                                            <>
                                                {taken.length > 0 && (
                                                    <View style={{ marginTop: 16 }}>
                                                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                                                            <Ionicons name="checkmark-done-outline" size={16} color="#4CAF50" />
                                                            <Text style={{ marginLeft: 6, fontWeight: '700', color: '#1a1a1a' }}>รับประทานแล้ว</Text>
                                                        </View>
                                                        {taken.map((entry, idx) => (
                                                            <View
                                                                key={'taken|' + entry.med.id + '|' + entry.time + '|' + idx}
                                                                style={[style.doseCard, { backgroundColor: '#F5F5F5', borderColor: '#E0E0E0', borderWidth: 1 }]}
                                                            >
                                                                <View
                                                                    style={[
                                                                        style.medicationColor,
                                                                        { backgroundColor: entry.med.color },
                                                                    ]}
                                                                />
                                                                <View style={style.doseInfo}>
                                                                    <View>
                                                                        <Text style={[style.medicineName, { color: '#999' }]}>{entry.med.name}</Text>
                                                                        <Text style={[style.doseInfo, { color: '#aaa' }]}>{entry.med.dosage}</Text>
                                                                    </View>
                                                                    <View style={style.doseTime}>
                                                                        <Ionicons name="time-outline" size={16} color="#ccc" />
                                                                        <Text style={[style.timeText, { color: '#aaa' }]}>{entry.time}</Text>
                                                                    </View>
                                                                </View>
                                                                <View style={style.takenBadge}>
                                                                    <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                                                                    <Text style={style.takenText}>ทานแล้ว</Text>
                                                                </View>
                                                            </View>
                                                        ))}
                                                    </View>
                                                )}

                                                {missed.length > 0 && (
                                                    <View style={{ marginTop: 16 }}>
                                                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                                                            <Ionicons name="close-circle-outline" size={16} color="#F44336" />
                                                            <Text style={{ marginLeft: 6, fontWeight: '700', color: '#1a1a1a' }}>พลาด</Text>
                                                        </View>
                                                        {missed.map((entry, idx) => (
                                                            <View
                                                                key={'missed|' + entry.med.id + '|' + entry.time + '|' + idx}
                                                                style={[style.doseCard, {
                                                                    backgroundColor: '#F5F5F5',
                                                                    borderColor: '#b71c1c',
                                                                    borderWidth: 2
                                                                }]}
                                                            >
                                                                <View
                                                                    style={[
                                                                        style.medicationColor,
                                                                        { backgroundColor: entry.med.color },
                                                                    ]}
                                                                />
                                                                <View style={style.doseInfo}>
                                                                    <View>
                                                                        <Text style={style.medicineName}>{entry.med.name}</Text>
                                                                        <Text style={style.doseInfo}>{entry.med.dosage}</Text>
                                                                        <Text style={style.timeText}>{entry.time}</Text>
                                                                    </View>
                                                                </View>
                                                                <View style={[style.takenBadge, { backgroundColor: '#fde0e0' }]}>
                                                                    <Ionicons name="close-circle" size={20} color="#b71c1c" />
                                                                    <Text style={[style.takenText, { color: '#b71c1c' }]}>ไม่ได้รับประทาน</Text>
                                                                </View>
                                                            </View>
                                                        ))}
                                                    </View>
                                                )}
                                            </>
                                        );
                                    })()}
                                </>
                            );
                        })()
                    )}

                </View>
                <Modal
                    visible={showNotifications}
                    transparent={true}
                    animationType="slide"
                    onRequestClose={() => setShowNotifications(false)}
                >
                    <View style={style.modalOverlay}>
                        <View style={style.modalContent}>
                            <View style={style.modalHeader}>
                                <Ionicons name="notifications" size={28} color="#1a8e2d" />
                                <Text style={style.modalTitle}>แจ้งเตือนวันนี้</Text>
                                <TouchableOpacity
                                    style={style.modalCloseButton}
                                    onPress={() => setShowNotifications(false)}
                                >
                                    <Ionicons name="close" size={24} color="#333" />
                                </TouchableOpacity>
                            </View>
                            {todayMedications.length === 0 ? (
                                <View style={{ alignItems: 'center', marginTop: 30 }}>
                                    <Ionicons name="notifications-off-circle" size={48} color="#ccc" />
                                    <Text style={{ color: '#888', marginTop: 10 }}>ไม่มีแจ้งเตือนสำหรับวันนี้</Text>
                                </View>
                            ) : (
                                todayMedications.map((medication) => (
                                    <View key={medication.id} style={style.notificationItem}>
                                        <View style={style.notificationIcon}>
                                            <Ionicons name="medical" size={24} color={medication.color} />
                                        </View>
                                        <View style={style.notificationContent}>
                                            <Text style={style.notificationTitle}>{medication.name}</Text>
                                            <Text style={style.notificationMessage}>
                                                {medication.dosage}
                                            </Text>
                                            <Text style={style.notificationTime}>
                                                {Array.isArray(medication.times)
                                                    ? medication.times.join(', ')
                                                    : medication.times}
                                            </Text>
                                            <Text style={style.notificationMessage}>
                                                ทานแล้ว {getDoseStatsForMed(medication, doseHistory).taken} / {getDoseStatsForMed(medication, doseHistory).total} ครั้ง
                                            </Text>
                                        </View>
                                    </View>
                                ))
                            )}
                        </View>
                    </View>
                </Modal>
            </ScrollView>
            <View style={style.bottomNav}>
                {[
                    { href: '/home/home', icon: 'home', label: 'หน้าหลัก', color: '#1a8e2d', size: 24 },
                    { href: '/notification/add', icon: 'add-circle-outline', label: 'แจ้งเตือน', color: '#2E7D32', size: 28 },
                    { href: '/medications/med', icon: 'medkit-outline', label: 'ข้อมูลยา', color: '#2E7D32', size: 28 },
                    { href: '/calendar', icon: 'calendar-outline', label: 'ปฏิทิน', color: '#2E7D32', size: 24 },
                    { href: '/history', icon: 'time-outline', label: 'ประวัติ', color: '#2E7D32', size: 24 },
                    { href: '/home/profile_screen', icon: 'person-outline', label: 'โปรไฟล์', color: '#2E7D32', size: 24 },
                ].map(({ href, icon, label, color, size }) => (
                    <Link key={href} href={href as any} asChild>
                        <TouchableOpacity style={style.navItem}>
                            <Ionicons name={icon as any} size={size} color={color} />
                            <Text style={style.navLabel}>{label}</Text>
                        </TouchableOpacity>
                    </Link>
                ))}
            </View>
        </View>
    )
}

const style = StyleSheet.create({
    // Medication Card Styles
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
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1a8e2d',
        flex: 1,
        textAlign: 'center',
    },
    modalCloseButton: {
        padding: 5,
    },
    notificationItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f8f9fa',
        borderRadius: 14,
        padding: 15,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 2,
    },
    notificationIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#E8F5E9',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    notificationContent: {
        flex: 1,
    },
    notificationTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    notificationMessage: {
        fontSize: 14,
        color: '#666',
        marginTop: 2,
    },
    notificationTime: {
        fontSize: 13,
        color: '#888',
        marginTop: 2,
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
    bottomNav: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        height: 100,
        backgroundColor: 'white',
        borderTopWidth: 1,
        borderColor: '#eee',
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 100,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 8,
        paddingBottom: 20,
    },
    navItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    navLabel: {
        fontSize: 12,
        color: '#333',
        marginTop: 2,
    },
    medicationColor: {
    width: 12,
    height: 40,
    borderRadius: 6,
    marginRight: 15,
  }
});