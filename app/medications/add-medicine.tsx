import { medicinesAPI } from '@/utils/medicinesApi';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function AddMedicineScreen() {
  const [medicine_name, setMedicineName] = useState('');
  const [section_3_1_dosage, setSection3_1_Dosage] = useState('');
  const [dose_limit, setDoseLimit] = useState('');
  const [doseUnit, setDoseUnit] = useState('เม็ด');
  const [medicineCategory, setMedicineCategory] = useState<'ชนิดเม็ด' | 'ชนิดน้ำ' | 'ยาทา'>('ชนิดเม็ด');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState('');

  const getDoseUnits = (category: string) => {
    switch (category) {
      case 'ชนิดเม็ด':
        return ['เม็ด', 'ครึ่งเม็ด'];
      case 'ชนิดน้ำ':
        return ['ml', 'ช้อนชา', 'ช้อนโต๊ะ'];
      default:
        return [];
    }
  };
  const router = useRouter();

  React.useEffect(() => {
    const fetchUserId = async () => {
      try {
        const userStr = await AsyncStorage.getItem('user');
        if (userStr) {
          const user = JSON.parse(userStr);
          setUserId(user.id);
        }
      } catch (e) {
        Alert.alert('Error', 'ไม่สามารถโหลดข้อมูลผู้ใช้ได้');
      }
    };
    fetchUserId();
  }, []);

  const validateDosage = (value: string) => {
    // Allow only positive numbers with up to 2 digits for whole numbers and 2 decimal places
    const regex = /^(?:\d{1,2}|\d{1,2}\.\d{1,2})$/;
    const number = parseFloat(value);
    return regex.test(value) && !isNaN(number) && number > 0;
  };

  const handleSave = async () => {
    if (!medicine_name.trim()) {
      setError('กรุณากรอกชื่อยา');
      return;
    }
    if (medicineCategory !== 'ยาทา') {
      if (!dose_limit) {
        setError('กรุณากรอกขนาดยา');
        return;
      }
      if (!validateDosage(dose_limit)) {
        setError('กรุณากรอกขนาดยาเป็นตัวเลขที่มากกว่า 0');
        return;
      }
    }
    setLoading(true);
    setError('');
    try {
      const formattedDoseLimit = medicineCategory !== 'ยาทา' 
        ? `${dose_limit} ${doseUnit}`  // กรณียาเม็ดหรือยาน้ำ
        : "ทาบริเวณที่มีอาการ";       // กรณียาทา
      
      // สร้างข้อมูลสำหรับส่งไป API
      const medicineData = {
        medicine_name,
        section_3_1_dosage,
        medicine_category: medicineCategory,
        dose_limit: formattedDoseLimit,
        userId
      };
      
      await medicinesAPI.create(medicineData);
      Alert.alert('สำเร็จ', 'เพิ่มข้อมูลยาเรียบร้อยแล้ว', [
        { text: 'ตกลง', onPress: () => router.back() }
      ]);
    } catch (e: any) {
      setError('เกิดข้อผิดพลาดในการบันทึก');
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
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={28} color={'#1a8e2d'} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>เพิ่มข้อมูลยา</Text>
        </View>
        <ScrollView contentContainerStyle={styles.formContentContainer}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>ชื่อยา *</Text>
            <TextInput
              style={styles.input}
              value={medicine_name}
              onChangeText={setMedicineName}
              placeholder="ชื่อยา"
              placeholderTextColor="gray"
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>ประเภท</Text>
            <View style={styles.optionsGrid}>
              {['ชนิดเม็ด', 'ชนิดน้ำ', 'ยาทา'].map((category) => (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.optionsCard,
                    medicineCategory === category && styles.selectedOptionCard
                  ]}
                  onPress={() => {
                    setMedicineCategory(category as typeof medicineCategory);
                    // เมื่อเลือกประเภทยา
                    if (category === 'ยาทา') {
                      setDoseLimit('ทาบริเวณที่มีอาการ');
                    } else {
                      setDoseLimit(''); // รีเซ็ตค่าเมื่อเปลี่ยนประเภท
                      const units = getDoseUnits(category);
                      if (units.length > 0) {
                        setDoseUnit(units[0]);
                      }
                    }
                  }}
                >
                  <Text
                    style={[
                      styles.optionsLabel,
                      medicineCategory === category && styles.selectedOptionsLabel
                    ]}>
                    {category === 'ชนิดเม็ด' ? 'เม็ด' :
                     category === 'ชนิดน้ำ' ? 'ยาน้ำ' : 'ยาทา'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          {medicineCategory !== 'ยาทา' && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>ขนาดยา</Text>
              <View style={styles.doseContainer}>
                <TextInput
                  style={[styles.input, styles.doseInput]}
                  value={dose_limit}
                  onChangeText={(text) => {
                    // Remove any non-numeric characters except decimal point
                    const cleanText = text.replace(/[^0-9.]/g, '');
                    // Ensure only one decimal point
                    const parts = cleanText.split('.');
                    if (parts.length > 2) return;
                    // Limit whole number to 2 digits
                    if (parts[0].length > 2) return;
                    // Limit decimal places to 2
                    if (parts.length === 2 && parts[1].length > 2) return;
                    // Don't allow leading zeros unless it's a decimal
                    if (parts[0].length > 1 && parts[0][0] === '0' && parts[0][1] !== '.') return;
                    setDoseLimit(cleanText);
                  }}
                  placeholder="ขนาด"
                  placeholderTextColor="gray"
                  keyboardType="decimal-pad"
                />
                <View style={styles.doseUnitContainer}>
                  {getDoseUnits(medicineCategory).map((unit) => (
                    <TouchableOpacity
                      key={unit}
                      style={[
                        styles.doseUnitButton,
                        doseUnit === unit && styles.selectedOptionCard
                      ]}
                      onPress={() => setDoseUnit(unit)}
                    >
                      <Text
                        style={[
                          styles.optionsLabel,
                          doseUnit === unit && styles.selectedOptionsLabel
                        ]}>
                        {unit}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          )}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>หมายเหตุ</Text>
            <TextInput
              style={styles.input}
              value={section_3_1_dosage}
              onChangeText={setSection3_1_Dosage}
              placeholder="หมายเหตุ (เช่น วิธีใช้ยา คำแนะนำเพิ่มเติม)"
              placeholderTextColor="gray"
              multiline={true}
              numberOfLines={4}
            />
          </View>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <TouchableOpacity
            style={[styles.saveButton, loading && { opacity: 0.7 }]}
            onPress={handleSave}
            disabled={loading}
          >
            <Text style={styles.saveButtonText}>{loading ? 'กำลังบันทึก...' : 'บันทึก'}</Text>
          </TouchableOpacity>
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
  doseContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  doseInput: {
    flex: 1,
  },
  doseUnitContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  doseUnitButton: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -5,
    marginTop: 10,
  },
  optionsCard: {
    flex: 1,
    minWidth: 100,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
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
  optionsLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  selectedOptionsLabel: {
    color: 'white',
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
  inputGroup: {
    marginBottom: 22,
  },
  label: {
    fontSize: 16,
    color: '#1a8e2d',
    marginBottom: 8,
    fontWeight: '600',
  },
  input: {
    fontSize: 18,
    color: '#333',
    padding: 14,
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  errorText: {
    color: '#FF5252',
    fontSize: 13,
    marginBottom: 10,
    marginLeft: 4,
  },
  saveButton: {
    backgroundColor: '#1a8e2d',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  saveButtonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 18,
  },
});
