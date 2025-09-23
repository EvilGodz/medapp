import { getApiBaseUrl } from "@/utils/env";
import { registerForPushNotificationsAsync, scheduleMedicationReminder } from "@/utils/notifications";
import { addMedRemind, addMedRemindToApi } from "@/utils/storage";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from '@react-native-community/datetimepicker';
import axios from 'axios';
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
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

const DAY_FREQUENCIES = [
    { id: '1', label: 'ทุกวัน', value: 1 },
    { id: '2', label: 'วันเว้นวัน', value: 2 },
    { id: '3', label: 'เว้นสองวัน', value: 3 },
    { id: '4', label: 'กำหนดเอง', value: 0 },
];

const DURATIONS = [
    { id: '1', label: '7 วัน', value: 7 },
    { id: '2', label: '30 วัน', value: 30 },
    { id: '3', label: 'ต่อเนื่อง', value: -1 },
    { id: '4', label: 'กำหนดเอง', value: 0 },
];

export default function addNotificationScreen() {

    // Request notification permission on screen mount to ensure user is prompted early
    useEffect(() => {
        (async () => {
            if (Platform.OS === 'android') {
                try {
                    await registerForPushNotificationsAsync();
                } catch (e) {
                    console.warn('Failed to request notification permission on mount', e);
                }
            }
        })();
    }, []);

    const [form, setForm] = useState({
        name: "",
        dosage: "",
        frequency: "",
        duration: "",
        startDate: new Date(),
        times: ["09:00"],
        notes: "",
        reminderEnabled: true,
        dayFrequency: 1,
        mealTiming: "", // 'ก่อนอาหาร' | 'หลังอาหาร'
    });

    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [selectedFrequency, setSelectedFrequency] = useState("");
    const [selectedDuration, setSelectedDuration] = useState("");
    const [showTimePicker, setShowTimePicker] = useState<number | false>(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [customDuration, setCustomDuration] = useState('');
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [selectedMedicine, setSelectedMedicine] = useState<any | null>(null);
    const [selectedDayFrequency, setSelectedDayFrequency] = useState("ทุกวัน");
    const [customDayFrequency, setCustomDayFrequency] = useState('');

    // สำหรับ dosage unit & conversion
    const [dosageType, setDosageType] = useState<'เม็ด' | 'ยาน้ำ'>('เม็ด');
    const [dosageUnit, setDosageUnit] = useState<'ml' | 'ช้อนชา' | 'ช้อนโต๊ะ'>('ml');
    // เพิ่ม state สำหรับเม็ด/ครึ่งเม็ด
    const [tabletType, setTabletType] = useState<'เม็ด' | 'ครึ่งเม็ด'>('เม็ด');

    // แปลงค่าระหว่างหน่วย
    const convertDosage = (value: string, from: 'ml' | 'ช้อนชา' | 'ช้อนโต๊ะ', to: 'ml' | 'ช้อนชา' | 'ช้อนโต๊ะ') => {
        const num = parseFloat(value);
        if (isNaN(num)) return '';
        let ml = num;
        if (from === 'ช้อนชา') ml = num * 5;
        if (from === 'ช้อนโต๊ะ') ml = num * 15;
        if (to === 'ml') return ml.toString();
        if (to === 'ช้อนชา') return (ml / 5).toString();
        if (to === 'ช้อนโต๊ะ') return (ml / 15).toString();
        return '';
    };

    const router = useRouter()
    const CALL_API = getApiBaseUrl();
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
                    <View style={styles.customInputBox}>
                        <TextInput
                            style={styles.customInput}
                            keyboardType="numeric"
                            placeholder="จำนวนวัน"
                            value={customDuration}
                            onChangeText={(text) => {
                                setCustomDuration(text.replace(/[^0-9]/g, ''));
                                setForm({ ...form, duration: text ? `${text} วัน` : '' });
                            }}
                            maxLength={3}
                        />
                        <Text style={styles.customInputHint}>กรอกจำนวนวัน</Text>
                    </View>
                )}
            </View>
        )
    };

    const renderDayFrequencyOptions = () => {
        return (
            <View style={styles.optionsGrid}>
                {DAY_FREQUENCIES.map((dayFreq) => (
                    <TouchableOpacity
                        key={dayFreq.id}
                        style={[
                            styles.optionsCard,
                            selectedDayFrequency === dayFreq.label && styles.selectedOptionCard
                        ]}
                        onPress={() => {
                            setSelectedDayFrequency(dayFreq.label);
                            setForm({ ...form, dayFrequency: dayFreq.value });
                        }}
                    >
                        <Text
                            style={[
                                styles.optionsLabel,
                                selectedDayFrequency === dayFreq.label && styles.selectedOptionsLabel
                            ]}>
                            {dayFreq.label}
                        </Text>
                    </TouchableOpacity>
                ))}
                {selectedDayFrequency === 'กำหนดเอง' && (
                    <View style={styles.customInputBox}>
                        <TextInput
                            style={styles.customInput}
                            keyboardType="numeric"
                            placeholder="จำนวนวัน"
                            value={customDayFrequency}
                            onChangeText={(text) => {
                                const clean = text.replace(/[^0-9]/g, '');
                                setCustomDayFrequency(clean);
                                if (clean === '' || clean === '0') {
                                    setForm({ ...form, dayFrequency: 0 });
                                } else {
                                    setForm({ ...form, dayFrequency: Number(clean) + 1 });
                                }
                            }}
                            maxLength={3}
                        />
                        <Text style={styles.customInputHint}>ทานยาทุกๆ กี่วัน</Text>
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

        if (!form.mealTiming) {
            newErrors.mealTiming = "กรุณาเลือกเวลากับมื้ออาหาร";
        }

        if (!form.frequency) {
            newErrors.frequency = "กรุณาเลือกความถี่";
        }

        if (!form.duration) {
            newErrors.duration = "กรุณาเลือกระยะเวลา";
        } else if (selectedDuration === 'กำหนดเอง' && (!customDuration || isNaN(Number(customDuration)) || Number(customDuration) <= 0)) {
            newErrors.duration = "กรุณากรอกจำนวนวันที่ถูกต้อง";
        }

        if (selectedDayFrequency === 'กำหนดเอง' && (!customDayFrequency || isNaN(Number(customDayFrequency)) || Number(customDayFrequency) <= 0)) {
            newErrors.dayFrequency = "กรุณากรอกจำนวนวันที่ต้องการเว้นที่ถูกต้อง";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };
    const renderMealTiming = () => {
        return (
            <View>
                <View style={styles.optionsGrid}>
                    {[{ label: 'ก่อนอาหาร', value: 'ก่อนอาหาร' }, { label: 'หลังอาหาร', value: 'หลังอาหาร' }, { label: 'ระหว่างอาหาร', value: 'ระหว่างอาหาร' }, { label: 'หลังอาหารทันที', value: 'หลังอาหารทันที' }, { label: 'ไม่ระบุ', value: 'ไม่ระบุ' }].map((opt) => (
                        <TouchableOpacity
                            key={opt.value}
                            style={[
                                styles.optionsCard,
                                form.mealTiming === opt.value && styles.selectedOptionCard
                            ]}
                            onPress={() => setForm({ ...form, mealTiming: opt.value })}
                        >
                            <Text
                                style={[
                                    styles.optionsLabel,
                                    form.mealTiming === opt.value && styles.selectedOptionsLabel
                                ]}
                            >
                                {opt.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
                {errors.mealTiming ? (
                    <Text style={styles.mealTimingError}>{errors.mealTiming}</Text>
                ) : null}
            </View>
        );
    };

    const handleSave = async () => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            if (!validateForm()) {
                setIsSubmitting(false);
                Alert.alert("Error", "กรุณากรอกข้อมูลให้ครบถ้วน");
                return;
            }

            //สี
            const colors = ["#4CAF50", "#2196F3", "#FF9800", "#E91E63", "#9C27B0"];
            const randomColor = colors[Math.floor(Math.random() * colors.length)]

            //คำนวณ dayFrequency
            const finalDayFrequency = selectedDayFrequency === 'กำหนดเอง' ? Number(customDayFrequency) : form.dayFrequency;

            // เพิ่ม dosageUnit/dosageType ต่อท้าย dosage
            let dosageWithUnit = form.dosage;
            if (dosageType === 'ยาน้ำ' && form.dosage) {
                dosageWithUnit = `${form.dosage} ${dosageUnit}`;
            } else if (dosageType === 'เม็ด' && form.dosage) {
                dosageWithUnit = `${form.dosage} ${tabletType}`;
            }

            //สร้าง notification ตาม dayFrequency
            const notificationData = {
                id: Math.random().toString(36).substr(2, 9),
                ...form,
                dosage: dosageWithUnit,
                dosageUnit: dosageType === 'ยาน้ำ' ? dosageUnit : 'เม็ด',
                dosageType: dosageType,
                startDate: form.startDate.toISOString(),
                color: randomColor,
                duration: selectedDuration === 'กำหนดเอง' && customDuration ? `${customDuration} วัน` : form.duration,
                dayFrequency: finalDayFrequency,
            };

            // Always update local storage for offline UX
            try {
                await addMedRemind(notificationData);
            } catch (err) {
                setIsSubmitting(false);
                Alert.alert(
                    "Error",
                    "บันทึกข้อมูลในเครื่องไม่สำเร็จ กรุณาลองใหม่อีกครั้ง",
                    [{ text: "ตกลง" }],
                    { cancelable: false },
                );
                return;
            }

            // Try to sync to backend (API), queue to outbox if fails
            let apiSynced = false;

            try {
                // 3s timeout for API sync
                const result = await Promise.race([
                    addMedRemindToApi(notificationData),
                ]);
                apiSynced = typeof result === 'boolean' ? result : false;
            } catch (e) {
                // If API sync or outbox fails, treat as offline
                apiSynced = false;
            }

            // Schedule notification (local only, do not queue in outbox)
            let scheduled = false;
            try {
                        // Ensure runtime notification permission (Android 13+)
                        if (Platform.OS === 'android') {
                            await registerForPushNotificationsAsync();
                        }
                if (notificationData.reminderEnabled) {
                    await Promise.race([
                        scheduleMedicationReminder(notificationData),
                        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout scheduling notification')), 3000))
                    ]);
                }
                scheduled = true;
            } catch (e) {
                // Notification scheduling failed, but do not queue in outbox
                scheduled = false;
            }

            setIsSubmitting(false); // ปิด loading ก่อน alert
            Alert.alert(
                apiSynced ? "สำเร็จ" : "บันทึกแบบออฟไลน์",
                apiSynced ? "เพิ่มการแจ้งเตือนเสร็จสิ้น" : "เพิ่มการแจ้งเตือนแบบออฟไลน์ จะซิงค์เมื่อออนไลน์",
                [
                    {
                        text: "ตกลง",
                        onPress: () => router.back()
                    },
                ],
                { cancelable: false }
            );
        } catch (error) {
            setIsSubmitting(false);
            console.error("Save error:", error);
            Alert.alert(
                "Error",
                "บันทึกการแจ้งเตือนไม่สำเร็จ กรุณาลองใหม่อีกครั้ง",
                [{ text: "ตกลง" }],
                { cancelable: false },
            );
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
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={styles.section}>
                        <View style={styles.relative}>
                            <TextInput
                                style={[styles.mainInput, styles.inputContainer, errors.name && styles.inputError]}
                                placeholder="ชื่อยา"
                                placeholderTextColor={'gray'}
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
                            {/* เลือกประเภทขนาดยา */}
                            <View style={styles.typeRow}>
                                <Text style={{ marginRight: 10, fontSize: 16 }}>ประเภท:</Text>
                                <TouchableOpacity
                                    style={[styles.typeButton, dosageType === 'เม็ด' ? styles.typeButtonActive : styles.typeButtonInactive]}
                                    onPress={() => setDosageType('เม็ด')}
                                >
                                    <Text style={{ color: dosageType === 'เม็ด' ? 'white' : '#333' }}>เม็ด/แคปซูล</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.typeButton, dosageType === 'ยาน้ำ' ? styles.typeButtonActive : styles.typeButtonInactive, { marginRight: 0 }]}
                                    onPress={() => setDosageType('ยาน้ำ')}
                                >
                                    <Text style={{ color: dosageType === 'ยาน้ำ' ? 'white' : '#333' }}>ยาน้ำ</Text>
                                </TouchableOpacity>
                            </View>
                            
                            {/* ช่อง dosage + หน่วย */}
                            <View style={styles.dosageRow}>
                                <TextInput
                                    style={[styles.mainInput, styles.inputContainer, errors.dosage && styles.inputError, { flex: 1 }]}
                                    placeholder={dosageType === 'ยาน้ำ' ? `ขนาดยา (${dosageUnit})` : 'ขนาดยา (เช่น 1 เม็ด)'}
                                    placeholderTextColor={'gray'}
                                    value={form.dosage}
                                    keyboardType={dosageType === 'ยาน้ำ' ? 'numeric' : 'default'}
                                    onChangeText={(text) => {
                                        setForm({ ...form, dosage: text });
                                        if (errors.dosage) {
                                            setErrors({ ...errors, dosage: '' });
                                        }
                                    }}
                                />
                                {/* เลือกหน่วย เฉพาะยาน้ำ */}
                                {dosageType === 'ยาน้ำ' && (
                                    <View style={styles.dosageUnitRow}>
                                        <TouchableOpacity
                                            style={[styles.dosageUnitButton, dosageUnit === 'ml' ? styles.dosageUnitButtonActive : styles.dosageUnitButtonInactive]}
                                            onPress={() => setDosageUnit('ml')}
                                        >
                                            <Text style={{ color: dosageUnit === 'ml' ? 'white' : '#333' ,textAlign: 'center',}}>ml</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.dosageUnitButton, dosageUnit === 'ช้อนชา' ? styles.dosageUnitButtonActive : styles.dosageUnitButtonInactive]}
                                            onPress={() => setDosageUnit('ช้อนชา')}
                                        >
                                            <Text style={{ color: dosageUnit === 'ช้อนชา' ? 'white' : '#333' ,textAlign: 'center',}}>ช้อนชา</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.dosageUnitButton, dosageUnit === 'ช้อนโต๊ะ' ? styles.dosageUnitButtonActive : styles.dosageUnitButtonInactive]}
                                            onPress={() => setDosageUnit('ช้อนโต๊ะ')}
                                        >
                                            <Text style={{ color: dosageUnit === 'ช้อนโต๊ะ' ? 'white' : '#333' ,textAlign: 'center',}}>ช้อนโต๊ะ</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                                {/* ถ้าเลือกเม็ด/แคปซูล ให้เลือก เม็ด หรือ ครึ่งเม็ด */}
                                {dosageType === 'เม็ด' && (
                                <View style={styles.dosageUnitRow}>
                                    <TouchableOpacity
                                        style={[styles.dosageUnitButton, tabletType === 'เม็ด' ? styles.dosageUnitButtonActive : styles.dosageUnitButtonInactive]}
                                        onPress={() => setTabletType('เม็ด')}
                                    >
                                        <Text style={{ color: tabletType === 'เม็ด' ? 'white' : '#333' ,textAlign: 'center',}}>เม็ด</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.dosageUnitButton, tabletType === 'ครึ่งเม็ด' ? styles.dosageUnitButtonActive : styles.dosageUnitButtonInactive]}
                                        onPress={() => setTabletType('ครึ่งเม็ด')}
                                    >
                                        <Text style={{ color: tabletType === 'ครึ่งเม็ด' ? 'white' : '#333' ,textAlign: 'center',}}>ครึ่งเม็ด</Text>
                                    </TouchableOpacity>
                                </View>
                                )}
                            </View>
                            {/* ปุ่มแปลงหน่วย เฉพาะยาน้ำ */}
                            {dosageType === 'ยาน้ำ' && form.dosage && (
                                <View style={styles.convertRow}>
                                    <Text style={styles.convertLabel}>แปลงหน่วย:</Text>
                                    {["ml", "ช้อนชา", "ช้อนโต๊ะ"].filter(u => u !== dosageUnit).map((unit) => (
                                        <TouchableOpacity
                                            key={unit}
                                            style={styles.convertButton}
                                            onPress={() => {
                                                // แปลงค่าและเปลี่ยนหน่วย
                                                const newValue = convertDosage(form.dosage, dosageUnit, unit as any);
                                                setForm({ ...form, dosage: newValue });
                                                setDosageUnit(unit as any);
                                            }}
                                        >
                                            <Text style={{ color: '#333' }}>{unit}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}
                            {selectedMedicine?.section_3_1_dosage && (
                                <Text style={{ marginTop: 6, color: '#1a8e2d', fontSize: 13 }}>
                                    แนะนำ: {selectedMedicine.section_3_1_dosage}
                                </Text>
                            )}
                            {suggestions.length > 0 && (
                                <View style={styles.suggestionBox}>
                                    {suggestions.map((med) => (
                                        <TouchableOpacity
                                            key={med.id}
                                            onPress={() => {
                                                setForm({ ...form, name: med.medicine_name });
                                                setSelectedMedicine(med);
                                                setSuggestions([]);
                                            }}
                                            style={styles.suggestionItem}
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
                        <Text style={styles.sectionTitle}>ระยะเวลา</Text>
                        {errors.duration && (
                            <Text style={styles.errorText}>{errors.duration}</Text>
                        )}
                        {renderDurationOptions()}

                        <Text style={styles.sectionTitle}>เวลากับมื้ออาหาร</Text>
                        {renderMealTiming()}

                        <Text style={styles.sectionTitle}>ความถี่รายวัน</Text>
                        {renderDayFrequencyOptions()}

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

                    {/* หมายเหตุ */}
                    
                    {/* <View style={styles.section}>
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
                    </View> */}
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
        position: 'relative',
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
    typeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 10,
        marginBottom: 4,
    },
    typeButton: {
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 6,
        marginRight: 8,
    },
    typeButtonActive: {
        backgroundColor: '#1a8e2d',
    },
    typeButtonInactive: {
        backgroundColor: '#e0e0e0',
    },
    dosageUnitRow: {
        flexDirection: 'column',
        alignItems: 'center',
        marginBottom: 8,
    },
    dosageUnitButton: {
        textAlign: 'center',
        width: '100%',
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 6,
        marginLeft: 6,
    },
    dosageUnitButtonActive: { backgroundColor: '#1a8e2d' ,textAlign: 'center',},
    dosageUnitButtonInactive: { backgroundColor: '#f8f9fa' ,textAlign: 'center',},
    tabletTypeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    tabletTypeButton: {
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 6,
        marginRight: 8,
    },
    tabletTypeButtonActive: {
        backgroundColor: '#1a8e2d',
    },
    tabletTypeButtonInactive: {
        backgroundColor: '#e0e0e0',
    },
    convertRow: {
        flexDirection: 'row',
        marginTop: 8,
        alignItems: 'center' 
    },
    convertLabel: {
        marginRight: 8, 
        color: '#1a8e2d', 
        fontWeight: '600' 
    },
    convertButton: {
        backgroundColor: '#e0e0e0',
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 6,
        marginRight: 6,
    },
    suggestionBox: {
        backgroundColor: 'white',
        borderRadius: 8,
        elevation: 2,
        position: 'absolute',
        top: 60,
        left: 0,
        right: 0,
        zIndex: 20,
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    suggestionItem: {
        padding: 10 
    },
    customInputBox: {
        width: '100%',
        marginTop: 10,
        alignItems: 'center',
    },
    customInput: {
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
    },
    customInputHint: { 
        color: '#888', fontSize: 13 
    },
    mealTimingLabel: {
        fontWeight: '600', color: '#333',
        marginBottom: 8 
    },
    mealTimingError: {
        color: 'red', marginTop: 6 
    },
    relative: { position: 'relative' },
    dosageRow: { flexDirection: 'row', alignItems: 'center' },
})