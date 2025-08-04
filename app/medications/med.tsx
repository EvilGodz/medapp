
import { Medicine } from '@/types/medicine';
import { medicinesAPI } from '@/utils/medicinesApi';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from "expo-router";
import React, { useState } from 'react';
import { Dimensions, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';


const { width } = Dimensions.get('window');

export default function MedicinesPage() {
    const [search, setSearch] = useState('');
    const [results, setResults] = useState<Medicine[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showResults, setShowResults] = useState(false);
    const [suggestions, setSuggestions] = useState<Medicine[]>([]);
    const [selectedMedicine, setSelectedMedicine] = useState<Medicine | null>(null);
    const router = useRouter();

    // Autocomplete: fetch suggestions as user types
    const handleInputChange = async (text: string) => {
        setSearch(text);
        setSelectedMedicine(null);
        setError('');
        setShowResults(false);
        if (text.length > 1) {
            setLoading(true);
            try {
                const meds = await medicinesAPI.search(text);
                setSuggestions(meds);
            } catch (e: any) {
                setSuggestions([]);
            } finally {
                setLoading(false);
            }
        } else {
            setSuggestions([]);
        }
    };

    // On search button or submit, show full results
    const handleSearch = async () => {
        setLoading(true);
        setError('');
        setShowResults(false);
        try {
            const meds = await medicinesAPI.search(search);
            setResults(meds);
            setShowResults(true);
        } catch (e: any) {
            setError('Error searching medicines');
        } finally {
            setLoading(false);
        }
    };

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
                                placeholderTextColor={'#999'}
                                value={search}
                                onChangeText={handleInputChange}
                                onSubmitEditing={handleSearch}
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
                            {suggestions.length > 0 && (
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
                                    maxHeight: 200,
                                }}>
                                    {suggestions.map((med) => (
                                        <TouchableOpacity
                                            key={med.id}
                                            onPress={() => {
                                                setSearch(med.medicine_name);
                                                setSelectedMedicine(med);
                                                setSuggestions([]);
                                                handleSearch();
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
                            <Text style={styles.sectionTitle}>ผลการค้นหา</Text>
                            {loading ? (
                                <Text style={{ textAlign: 'center', marginTop: 20 }}>กำลังค้นหา...</Text>
                            ) : (
                                results.length > 0 ? (
                                    results.map((item) => (
                                        <View key={item.id} style={styles.resultCard}>
                                            <Text style={styles.resultName}>{item.medicine_name}</Text>
                                            {item.section_3_1_dosage && (
                                                <Text style={styles.resultDetail}>ขนาดยา: {item.section_3_1_dosage}</Text>
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
});
