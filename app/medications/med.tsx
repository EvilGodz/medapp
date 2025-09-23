import { Medicine } from '@/types/medicine';
import { medicinesAPI } from '@/utils/medicinesApi';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from "expo-router";
import React, { useEffect, useState } from 'react';
import { Alert, Dimensions, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';


const { width } = Dimensions.get('window');

export default function MedicinesPage() {
    const [search, setSearch] = useState('');
    const [results, setResults] = useState<Medicine[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showResults, setShowResults] = useState(false);
    const [suggestions, setSuggestions] = useState<Medicine[]>([]);
    const [selectedMedicine, setSelectedMedicine] = useState<Medicine | null>(null);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [showUserOnly, setShowUserOnly] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const getCurrentUser = async () => {
            try {
                const userStr = await AsyncStorage.getItem('user');
                if (userStr) {
                    const user = JSON.parse(userStr);
                    setCurrentUserId(user.id);
                }
            } catch (error) {
                console.error('Error getting current user:', error);
            }
        };
        getCurrentUser();
    }, []);

    useEffect(() => {
        loadAllMedicines();
    }, [currentUserId]);

    // รีโหลดรายการยาเมื่อกลับมาหน้านี้ (หลังเพิ่ม/แก้ไข)
    useFocusEffect(
        React.useCallback(() => {
            loadAllMedicines();
        }, [currentUserId])
    );

    const loadAllMedicines = async () => {
        if (!currentUserId) return;
        
        setLoading(true);
        setError('');
        try {
            const meds = await medicinesAPI.list(currentUserId);
            setResults(meds);
            setShowResults(true);
        } catch (e: any) {
            setError('Error loading medicines');
        } finally {
            setLoading(false);
        }
    };

    //autocomplete
    const handleInputChange = async (text: string) => {
        setSearch(text);
        setSelectedMedicine(null);
        setError('');
        
        //ซ่อน suggestions เมื่อว่าง แต่ยังแสดงรายการยาทั้งหมด
        if (text.length === 0) {
            setSuggestions([]);
            setShowResults(false);
            await loadAllMedicines();
            return;
        }
        
        if (text.length > 1) {
            setLoading(true);
            try {
                const meds = await medicinesAPI.search(text, currentUserId || undefined);
                setSuggestions(meds);
                // แสดงผลการค้นหาอัตโนมัติ
                setResults(meds);
                setShowResults(true);
            } catch (e: any) {
                setSuggestions([]);
                setResults([]);
                setShowResults(true);
            } finally {
                setLoading(false);
            }
        } else {
            setSuggestions([]);
            setShowResults(false);
        }
    };

    const handleSearch = async () => {
        if (!search.trim()) {
            await loadAllMedicines();
            return;
        }
        
        setLoading(true);
        setError('');
        setShowResults(false);
        try {
            const meds = await medicinesAPI.search(search, currentUserId || undefined);
            setResults(meds);
            setShowResults(true);
        } catch (e: any) {
            setError('Error searching medicines');
        } finally {
            setLoading(false);
        }
    };

    const handleSearchWithName = async (medicineName: string) => {
        if (!medicineName.trim()) {
            await loadAllMedicines();
            return;
        }
        
        setLoading(true);
        setError('');
        setShowResults(false);
        try {
            const meds = await medicinesAPI.search(medicineName, currentUserId || undefined);
            setResults(meds);
            setShowResults(true);
        } catch (e: any) {
            setError('Error searching medicines');
        } finally {
            setLoading(false);
        }
    };

    // เพิ่มฟังก์ชันสำหรับเพิ่มยาใหม่
    const handleAddMedicine = async () => {
        router.push('/medications/add-medicine');
    };

    // ฟังก์ชันลบยา
    const handleDeleteMedicine = async (id: string, userId: string | null | undefined) => {
        if (!userId || userId === 'null') {
            Alert.alert('ไม่สามารถลบ', 'ไม่สามารถลบยาหลักของระบบได้');
            return;
        }
        Alert.alert('ยืนยันการลบ', 'คุณต้องการลบยานี้หรือไม่?', [
            { text: 'ยกเลิก', style: 'cancel' },
            {
                text: 'ลบ', style: 'destructive', onPress: async () => {
                    try {
                        await medicinesAPI.delete(id);
                        loadAllMedicines();
                    } catch (e) {
                        Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถลบข้อมูลยาได้');
                    }
                }
            }
        ]);
    };

    // ฟังก์ชันแก้ไขยา (ตัวอย่าง: นำทางไปหน้าแก้ไข)
    const handleEditMedicine = (item: Medicine) => {
        router.push(`/medications/edit-medicine?id=${item.id}`);
    };

    // ฟิลเตอร์รายการยาเฉพาะของผู้ใช้
    const filteredResults = showUserOnly && currentUserId
        ? results.filter(item => {
            // ตรวจสอบว่า userid มีค่าและตรงกับ currentUserId (แปลงเป็น string)
            return item.userid && item.userid !== 'null' && item.userid === String(currentUserId);
        })
        : results;
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
                    <Text style={styles.headerTitle}>ค้นหาข้อมูลยา</Text>
                </View>
                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={styles.formContentContainer}
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={styles.section}>
                        <View style={{ position: 'relative', marginTop: 20 }}>
                            <TextInput
                                style={styles.mainInput}
                                placeholder="ชื่อยา"
                                placeholderTextColor={'gray'}
                                value={search}
                                onChangeText={handleInputChange}
                                onSubmitEditing={handleSearch}
                                onBlur={() => setSuggestions([])}
                                returnKeyType="search"
                            />
                            <TouchableOpacity
                                style={styles.searchButton}
                                onPress={handleSearch}
                                disabled={loading || !search.trim()}
                            >
                                <LinearGradient
                                    colors={["#1a8e2d", "#146922"]}
                                    style={styles.searchButtonGradient}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                >
                                    <Ionicons name="search" size={22} color="white" />
                                </LinearGradient>
                            </TouchableOpacity>
                            {suggestions.length > 0 && search.length > 0 && (
                                <View style={{
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
                                    maxHeight: 'auto',
                                }}>
                                    {suggestions.map((med) => (
                                        <TouchableOpacity
                                            key={med.id}
                                            onPress={async () => {
                                                setSearch(med.medicine_name);
                                                setSelectedMedicine(med);
                                                setSuggestions([]);
                                                // ค้นหาด้วยชื่อยาที่เลือก
                                                await handleSearchWithName(med.medicine_name);
                                            }}
                                            style={{ padding: 10 }}
                                        >
                                            <Text style={{ fontSize: 16, color: '#1a8e2d' }}>{med.medicine_name}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}
                        </View>
                        {error ? <Text style={styles.errorText}>{error}</Text> : null}
                    </View>

                    {showResults && (
                        <View style={styles.section}>
                            {/* เมนู filter เฉพาะยาของฉัน */}
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                                <TouchableOpacity
                                    style={{ flexDirection: 'row', alignItems: 'center', marginRight: 16 }}
                                    onPress={() => setShowUserOnly(v => !v)}
                                >
                                    <Ionicons name={showUserOnly ? 'checkbox' : 'square-outline'} size={20} color="#1a8e2d" />
                                    <Text style={{ marginLeft: 6, color: '#1a8e2d', fontWeight: '600' }}>แสดงเฉพาะยาที่ฉันเพิ่ม</Text>
                                </TouchableOpacity>
                            </View>
                            <Text style={styles.sectionTitle}>
                                {search.trim() ? 'ผลการค้นหา' : 'รายการยาทั้งหมด'}
                            </Text>
                            {loading ? (
                                <Text style={{ textAlign: 'center', marginTop: 20 }}>กำลังค้นหา...</Text>
                            ) : (
                                filteredResults.length > 0 ? (
                                    filteredResults.map((item) => (
                                        <View key={item.id} style={styles.resultCard}>
                                            <Text style={styles.resultName}>{item.medicine_name}</Text>
                                            {item.medicine_category && (
                                                <Text style={styles.resultDetail}>ชนิดยา: {item.medicine_category}</Text>
                                            )}
                                            {item.section_3_1_dosage && (
                                                <Text style={styles.resultDetail}>ขนาดยา: {item.section_3_1_dosage}</Text>
                                            )}
                                            {item.section_4_precautions && (
                                                <Text style={styles.resultDetail}>หมายเหตุ: {item.section_4_precautions}</Text>
                                            )}
                                            {/* ปุ่มแก้ไข/ลบ เฉพาะยาที่ userId ไม่เป็น null */}
                                            {item.userid && item.userid !== 'null' && (
                                                <View style={{ flexDirection: 'row', marginTop: 10 }}>
                                                    <TouchableOpacity onPress={() => handleEditMedicine(item)} style={{ marginRight: 18 }}>
                                                        <Ionicons name="create-outline" size={22} color="#1976D2" />
                                                    </TouchableOpacity>
                                                    <TouchableOpacity onPress={() => handleDeleteMedicine(item.id, item.userid)}>
                                                        <Ionicons name="trash-outline" size={22} color="#C2185B" />
                                                    </TouchableOpacity>
                                                </View>
                                            )}
                                        </View>
                                    ))
                                ) : (
                                    <Text style={{ textAlign: 'center', marginTop: 20 }}>ไม่พบข้อมูลยา</Text>
                                )
                            )}
                        </View>
                    )}
                </ScrollView>
            </View>
            {/* Floating Action Button */}
            <TouchableOpacity style={styles.fabStyle} onPress={handleAddMedicine} activeOpacity={0.85}>
                <Ionicons name="add" size={32} color="white" />
            </TouchableOpacity>
        </View>
    );
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
        paddingBottom: 30,
        zIndex: 1,
    },
    headerIcon: {
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
        backgroundColor: 'white',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        marginBottom: 10,
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
    searchButton: {
        position: 'absolute',
        right: 10,
        top: 10,
        zIndex: 10,
        borderRadius: 12,
        overflow: 'hidden',
    },
    searchButtonGradient: {
        padding: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorText: {
        color: '#FF5252',
        fontSize: 12,
        marginTop: 4,
        marginLeft: 12,
    },
    resultCard: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 18,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    resultName: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1a8e2d',
        marginBottom: 6,
    },
    resultDetail: {
        color: '#555',
        fontSize: 16,
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
    // Floating Action Button (FAB) style
    fabStyle: {
        position: 'absolute' as const,
        right: 24,
        bottom: 36,
        zIndex: 100,
        elevation: 5,
        backgroundColor: '#1a8e2d',
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center' as const,
        alignItems: 'center' as const,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
    },
});
