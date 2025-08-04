import { scheduleMedicationReminder } from "@/utils/notifications";
import { addMedRemind } from "@/utils/storage";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from '@react-native-community/datetimepicker';
import axios from 'axios';
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Dimensions, Platform, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';

const { width } = Dimensions.get('window');

const FREQUENCIES = [
    {
        id: '1',
        label: 'วันละครั้ง',
        icon: 'sunny-outline' as const,
        times: ["09:00"],
    },
    {
        id: '2',
        label: 'วันละสองครั้ง',
        icon: 'sync-outline' as const,
        times: ["09:00", "21:00"],
    },
    {
        id: '3',
        label: 'วันละสามครั้ง',
        icon: 'time-outline' as const,
        times: ["09:00", "15:00", "21:00"],
    },
    {
        id: '4',
        label: 'วันละสี่ครั้ง',
        icon: 'repeat-outline' as const,
        times: ["09:00", "13:00", "17:00", "21:00"],
    },
    {
        id: '5',
        label: 'ตามต้องการ',
        icon: 'calendar-outline' as const,
        times: [],
    },
];

const DURATIONS = [
    { id: '1', label: '7 วัน', value: 7 },
    { id: '2', label: '30 วัน', value: 30 },
    { id: '3', label: 'ต่อเนื่อง', value: -1 },
    { id: '4', label: 'กำหนดเอง', value: 0 },
];

export default function addNotificationScreen() {

    const [form, setForm] = useState({
        name: "",
        dosage: "",
        frequency: "",
        duration: "",
        startDate: new Date(),
        times: ["09:00"],
        notes: "",
        reminderEnabled: true,
    });

    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [selectedFrequency, setSelectedFrequency] = useState("");
    const [selectedDuration, setSelectedDuration] = useState("");
    // showTimePicker: number | false
    const [showTimePicker, setShowTimePicker] = useState<number | false>(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [customDuration, setCustomDuration] = useState('');
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [selectedMedicine, setSelectedMedicine] = useState<any | null>(null);

    const router = useRouter()
    const CALL_API = 'http://192.168.1.89:3000';
    const renderFrequencyOptions = () => {
        return (
            <View style={styles.optionsGrid}>
                {FREQUENCIES.map((freq) => (
                    <TouchableOpacity
                        key={freq.id}
                        style={[
                            styles.optionsCard,
                            selectedFrequency === freq.label && styles.selectedOptionCard
                        ]}
                        onPress={() => {
                            setSelectedFrequency(freq.label);
                            setForm((prev) => ({
                                ...prev,
                                frequency: freq.label,
                                times: freq.times.length > 0 ? [...freq.times] : ["09:00"],
                            }));
                        }}
                    >
                        <View style={[
                            styles.optionsIcon,
                            selectedFrequency === freq.label && styles.selectedOptionsIcon
                        ]}>
                            <Ionicons
                                name={freq.icon}
                                size={24}
                                color={selectedFrequency === freq.label ? 'white' : '#666'}
                            />
                        </View>
                        <Text
                            style={[
                                styles.optionsLabel,
                                selectedFrequency === freq.label && styles.selectedOptionsLabel
                            ]}>
                            {freq.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        )
    };

    const renderDurationOptions = () => {
        return (
            <View style={styles.optionsGrid}>
                {DURATIONS.map((dur) => (
                    <TouchableOpacity
                        key={dur.id}
                        style={[
                            styles.optionsCard,
                            selectedDuration === dur.label && styles.selectedOptionCard
                        ]}
                        onPress={() => {
                            setSelectedDuration(dur.label);
                            setForm({ ...form, duration: dur.label });
                        }}
                    >

                        <Text
                            style={[
                                styles.durationNumber,
                                selectedDuration === dur.label && styles.selectedDurationNumber
                            ]}>
                            {dur.value > 0 ? dur.value : dur.value === 0 ? '?' : '∞'}</Text>
                        <Text
                            style={[
                                styles.optionsLabel,
                                selectedDuration === dur.label && styles.selectedOptionsLabel
                            ]}>
                            {dur.label}</Text>



                    </TouchableOpacity>
                ))}
                {/* If custom selected, show input */}
                {selectedDuration === 'กำหนดเอง' && (
                    <View style={{ width: '100%', marginTop: 10, alignItems: 'center' }}>
                        <TextInput
                            style={{
                                borderWidth: 1,
                                borderColor: '#1a8e2d',
                                borderRadius: 12,
                                padding: 10,
                                width: 120,
                                textAlign: 'center',
                                fontSize: 18,
                                marginBottom: 4,
                                color: '#1a8e2d',
                                backgroundColor: '#f8f9fa',
                            }}
                            keyboardType="numeric"
                            placeholder="จำนวนวัน"
                            value={customDuration}
                            onChangeText={(text) => {
                                setCustomDuration(text.replace(/[^0-9]/g, ''));
                                setForm({ ...form, duration: text ? `${text} วัน` : '' });
                            }}
                            maxLength={3}
                        />
                        <Text style={{ color: '#888', fontSize: 13 }}>กรอกจำนวนวัน</Text>
                    </View>
                )}
            </View>
        )
    };

    const validateForm = () => {
        const newErrors: { [key: string]: string } = {};

        if (!form.name.trim()) {
            newErrors.name = "กรุณากรอกชื่อยา";
        }

        if (!form.dosage.trim()) {
            newErrors.dosage = "กรุณากรอกขนาดยา";
        }

        if (!form.frequency) {
            newErrors.frequency = "กรุณาเลือกความถี่";
        }

        if (!form.duration) {
            newErrors.duration = "กรุณาเลือกระยะเวลา";
        } else if (selectedDuration === 'กำหนดเอง' && (!customDuration || isNaN(Number(customDuration)) || Number(customDuration) <= 0)) {
            newErrors.duration = "กรุณากรอกจำนวนวันที่ถูกต้อง";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = async () => {
        try {
            if (!validateForm()) {
                Alert.alert("Error", "กรุณากรอกข้อมูลให้ครบถ้วน");
                return;
            }

            if (isSubmitting) return;
            setIsSubmitting(true);

            //สี
            const colors = ["#4CAF50", "#2196F3", "#FF9800", "#E91E63", "#9C27B0"];
            const randomColor = colors[Math.floor(Math.random() * colors.length)]


            // เพิ่มแยกแต่ละเวลา (แบบ async ทีละอัน ป้องกัน SQLite error)
            for (const time of form.times) {
                const notificationData = {
                    id: Math.random().toString(36).substr(2, 9),
                    ...form,
                    times: [time],
                    startDate: form.startDate.toISOString(),
                    color: randomColor,
                    duration: selectedDuration === 'กำหนดเอง' && customDuration ? `${customDuration} วัน` : form.duration,
                };
                await addMedRemind(notificationData);
                if (notificationData.reminderEnabled) {
                    await scheduleMedicationReminder(notificationData);
                }
            }

            Alert.alert(
                "สำเร็จ",
                "เพิ่มการแจ้งเตือนเสร็จสิ้น",
                [
                    {
                        text: "ตกลง",
                        onPress: () => router.back()
                    },
                ],
                { cancelable: false }
            );
        } catch (error) {
            console.error("Save error:", error);
            Alert.alert(
                "Error",
                "บันทึกการแจ้งเตือนไม่สำเร็จ กรุณาลองใหม่อีกครั้ง",
                [{ text: "ตกลง" }],
                { cancelable: false },
            );

        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={["#1a8e2d", "#146922"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.headerGradient}
            />
            <View style={styles.content}>
                <View style={styles.header}>

                    <TouchableOpacity
                        onPress={() => router.back()}
                        style={styles.backButton}>
                        <Ionicons name="chevron-back" size={28} color={'#1a8e2d'} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>เพิ่มการแจ้งเตือนใหม่</Text>
                </View>

                <ScrollView showsVerticalScrollIndicator={false}
                    style={{ flex: 1, }}
                    contentContainerStyle={styles.formContentContainer}
                >
                    <View style={styles.section}>
                        <View style={[styles.inputContainer, { position: 'relative' }]}>
                            <TextInput
                                style={[styles.mainInput, errors.name && styles.inputError]}
                                placeholder="ชื่อยา"
                                placeholderTextColor={'#999'}
                                value={form.name}
                                onChangeText={async (text) => {
                                    setForm({ ...form, name: text });
                                    setSelectedMedicine(null);
                                    if (text.length > 1) {
                                        try {
                                            const res = await axios.get(CALL_API + '/api/medicines/search?name=' + encodeURIComponent(text));
                                            setSuggestions(res.data);
                                        } catch (e) {
                                            setSuggestions([]);
                                        }
                                    } else {
                                        setSuggestions([]);
                                    }
                                    if (errors.name) {
                                        setErrors({ ...errors, name: '' });
                                    }
                                }}
                            />
                            {errors.name && (
                                <Text style={styles.errorText}>{errors.name}</Text>
                            )}

                            <TextInput
                                style={[styles.mainInput, errors.name && styles.inputError, { marginTop: 10 }]}
                                placeholder="ขนาดยา (เช่น 500mg)"
                                placeholderTextColor={'#999'}
                                value={form.dosage}
                                onChangeText={(text) => {
                                    setForm({ ...form, dosage: text });
                                    if (errors.dosage) {
                                        setErrors({ ...errors, dosage: '' });
                                    }
                                }}
                            />
                            {selectedMedicine?.section_3_1_dosage && (
                                <Text style={{ marginTop: 6, color: '#1a8e2d', fontSize: 13 }}>
                                    แนะนำ: {selectedMedicine.section_3_1_dosage}
                                </Text>
                            )}

                            {suggestions.length > 0 && (
                                <View style={{
                                    backgroundColor: 'white',
                                    borderRadius: 8,
                                    elevation: 2,
                                    position: 'absolute',
                                    top: 110, // overlay both inputs (adjust as needed)
                                    left: 0,
                                    right: 0,
                                    zIndex: 20,
                                    borderWidth: 1,
                                    borderColor: '#e0e0e0'
                                }}>
                                    {suggestions.map((med) => (
                                        <TouchableOpacity
                                            key={med.id}
                                            onPress={() => {
                                                setForm({ ...form, name: med.medicine_name });
                                                setSelectedMedicine(med);
                                                setSuggestions([]);
                                            }}
                                            style={{ padding: 10 }}
                                        >
                                            <Text>{med.medicine_name}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}
                        </View>
                        {errors.dosage && (
                            <Text style={styles.errorText}>{errors.dosage}</Text>
                        )}
                    </View>
                    <View style={styles.container}>
                        <Text style={styles.sectionTitle}>ความถี่ในการรับประทาน</Text>
                        {errors.frequency && (
                            <Text style={styles.errorText}>{errors.frequency}</Text>
                        )}
                        {renderFrequencyOptions()}

                        <Text style={styles.sectionTitle}>ระยะเวลา</Text>
                        {errors.duration && (
                            <Text style={styles.errorText}>{errors.duration}</Text>
                        )}
                        {renderDurationOptions()}

                        <TouchableOpacity
                            style={styles.dateButton}
                            onPress={() => setShowDatePicker(true)}
                        >
                            <View style={styles.dateIconContainer}>
                                <Ionicons name="calendar" size={20} color={'#1a8e2d'} />
                            </View>
                            <Text style={styles.dateButtonText}>
                                {`เริ่ม: ${form.startDate.toLocaleDateString()}`}
                            </Text>
                            <Ionicons name="chevron-forward" size={20} color={'#666'} />
                        </TouchableOpacity>
                        {showDatePicker && (
                            <DateTimePicker value={form.startDate} mode="date"
                                onChange={(event, date) => {
                                    setShowDatePicker(false);
                                    if (date) setForm({ ...form, startDate: date })
                                }}
                            />
                        )}

                        {form.frequency && form.frequency !== 'ตามต้องการ' && (
                            <View style={styles.timesContainer}>
                                <Text style={styles.timesTitle}>เวลาทานยา</Text>
                                {form.times.map((time, index) => (
                                    <TouchableOpacity
                                        key={index}
                                        style={styles.timeButton}
                                        onPress={() => {
                                            setShowTimePicker(index);
                                        }}
                                    >
                                        <View style={styles.timeIconContainer}>
                                            <Ionicons name="time-outline" size={20} color={'#1a8e2d'} />
                                        </View>
                                        <Text style={styles.timeButtonText}>{time}</Text>
                                        <Ionicons name="chevron-forward" size={20} color={'#666'} />
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}

                        {typeof showTimePicker === 'number' && (
                            <DateTimePicker
                                mode="time"
                                value={(() => {
                                    const [hours, minutes] = form.times[showTimePicker].split(":").map(Number);
                                    const date = new Date();
                                    date.setHours(hours, minutes, 0, 0);
                                    return date;
                                })()}
                                onChange={(event, date) => {
                                    setShowTimePicker(false);
                                    if (date) {
                                        const newTime = date.toLocaleTimeString('default', {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                            hour12: false,
                                        });
                                        setForm((prev) => ({
                                            ...prev,
                                            times: prev.times.map((t, i) => (i === showTimePicker ? newTime : t))
                                        }));
                                    }
                                }}
                            />
                        )}
                    </View>

                    <View style={styles.section}>
                        <View style={styles.card}>
                            <View style={styles.switchRow}>
                                <View style={styles.switchLabelContainer}>
                                    <View style={styles.iconContainer}>
                                        <Ionicons name="notifications" color={'#1a8e2d'} />
                                    </View>
                                    <View>
                                        <Text style={styles.switchLabel}>แจ้งเตือน</Text>
                                        <Text style={styles.switchSubLabel}>รับการแจ้งเตือนเมื่อถึงเวลาทานยา</Text>
                                    </View>
                                </View>
                                <Switch
                                    value={form.reminderEnabled}
                                    trackColor={{ false: '#ddd', true: '#1a8e2d' }}
                                    thumbColor={'white'}
                                    onValueChange={(value) =>
                                        setForm({ ...form, reminderEnabled: value })
                                    }
                                />
                            </View>
                        </View>
                    </View>





                    <View style={styles.section}>
                        <View style={styles.textAreaContainer}>
                            <TextInput
                                style={styles.textArea}
                                placeholder="เพิ่มหมายเหตุหรือคำแนะนำพิเศษ..."
                                placeholderTextColor={'#999'}
                                value={form.notes}
                                onChangeText={(text) =>
                                    setForm({ ...form, notes: text })
                                }
                                multiline
                                numberOfLines={4}
                                textAlignVertical="top"
                            />

                        </View>
                    </View>
                </ScrollView>
                <View style={styles.footer}>
                    <TouchableOpacity style={[styles.saveButton, isSubmitting && styles.saveButtonDisabled]}
                        onPress={() => handleSave()}>
                        <LinearGradient
                            colors={["#1a8e2d", "#146922"]}
                            style={styles.saveButtonGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                        >
                            <Text
                                style={styles.saveButtonText}
                            >
                                {isSubmitting ? "กำลังเพิ่ม..." : "เพิ่มยา"}
                            </Text>

                        </LinearGradient>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={() => router.back()}
                        disabled={isSubmitting}
                    >
                        <Text style={styles.cancelButtonText}>ยกเลิก</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    headerGradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: Platform.OS === 'ios' ? 140 : 120,
    },
    content: {
        flex: 1,
        paddingTop: Platform.OS === 'ios' ? 50 : 30,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 50,
        zIndex: 1,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'white',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '700',
        color: 'white',
        marginLeft: 15,
    },
    formContentContainer: {
        padding: 20,
    },
    section: {
        marginBottom: 25,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1a1a1a',
        marginBottom: 15,
        marginTop: 10,
    },
    mainInput: {
        fontSize: 20,
        color: '#333',
        padding: 15,
    },
    inputContainer: {
        backgroundColor: 'white',
        borderRadius: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
        position: 'relative', // <-- add this
    },
    inputError: {
        borderColor: '#FF5252',
    },
    errorText: {
        color: '#FF5252',
        fontSize: 12,
        marginTop: 4,
        marginLeft: 12,
    },
    optionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginHorizontal: -5,
    },
    optionsCard: {
        width: (width - 60) / 2,
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 15,
        margin: 5,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e0e0e0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    selectedOptionCard: {
        backgroundColor: '#1a8e2d',
        borderColor: '#1a8e2d',
    },
    optionsIcon: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#f5f5f5',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    selectedOptionsIcon: {
        backgroundColor: "rgba(255,255,255,0.2)"
    },
    optionsLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        textAlign: 'center',
    },
    selectedOptionsLabel: {
        color: "white"
    },
    durationNumber: {
        fontSize: 24,
        fontWeight: '700',
        color: '#1a8e2d',
        marginBottom: 5,
    },
    selectedDurationNumber: {
        color: "white"
    },
    dateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 15,
        marginTop: 15,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    dateIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#f5f5f5',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    dateButtonText: {
        flex: 1,
        fontSize: 16,
        color: '#333',
    },
    timesContainer: {
        marginTop: 20,
    },
    timesTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 10,
    },
    timeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 15,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    timeIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#f5f5f5',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    timeButtonText: {
        flex: 1,
        fontSize: 16,
        color: '#333',
    },
    card: {
        marginTop: 10,
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    switchRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    switchLabelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#f5f5f5',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15
    },
    switchLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    switchSubLabel: {
        fontSize: 13,
        color: '#666',
        marginTop: 2,
    },
    textAreaContainer: {
        backgroundColor: 'white',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    textArea: {
        height: 100,
        padding: 15,
        fontSize: 16,
        color: '#333',
    },
    footer: {
        padding: 20,
        backgroundColor: 'white',
        borderTopWidth: 1,
        borderTopColor: '#e0e0e0',
    },
    saveButton: {
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 12,
    },
    saveButtonDisabled: {
        opacity: 0.7
    },
    saveButtonGradient: {
        paddingVertical: 15,
        justifyContent: 'center',
        alignItems: 'center',
    },
    saveButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '700',
    },
    cancelButton: {
        paddingVertical: 15,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'white',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#e0e0e0'
    },
    cancelButtonText: {
        color: '#666',
        fontSize: 16,
        fontWeight: '600',
    },

})