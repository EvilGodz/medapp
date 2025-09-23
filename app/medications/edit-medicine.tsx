import { medicinesAPI } from '@/utils/medicinesApi';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function EditMedicineScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [medicine_name, setMedicineName] = useState('');
  const [section_4_precautions, setSection4Precautions] = useState('');
  const [dosage, setDosage] = useState('');
  const [medicineCategory, setMedicineCategory] = useState<'เม็ด' | 'น้ำ'>('เม็ด');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!id) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const med = await medicinesAPI.getById(id);
        if (med) {
          setMedicineName(med.medicine_name);
          setDosage(med.section_3_1_dosage || '');
          setMedicineCategory((med.medicine_category as 'เม็ด' | 'น้ำ') || 'เม็ด');
        }
      } catch (e) {
        setError('ไม่พบข้อมูลยา');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleSave = async () => {
    if (!medicine_name.trim()) {
      setError('กรุณากรอกชื่อยา');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await medicinesAPI.update(id, { medicine_name, section_3_1_dosage: dosage, medicine_category: medicineCategory, section_4_precautions });
      Alert.alert('สำเร็จ', 'แก้ไขข้อมูลยาเรียบร้อยแล้ว', [
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
          <Text style={styles.headerTitle}>แก้ไขข้อมูลยา</Text>
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
            <Text style={styles.label}>ขนาดยา</Text>
            <TextInput
              style={styles.input}
              value={dosage}
              onChangeText={setDosage}
              placeholder="ขนาดยา (เช่น 500mg)"
              placeholderTextColor="gray"
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>ประเภท</Text>
            <View style={{ borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 10, backgroundColor: '#fafafa' }}>
              <Picker
                selectedValue={medicineCategory}
                onValueChange={v => setMedicineCategory(v)}
                style={{ height: 50 }}
              >
                <Picker.Item label="เม็ด" value="เม็ด" />
                <Picker.Item label="น้ำ" value="น้ำ" />
              </Picker>
            </View>
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>หมายเหตุ</Text>
            <TextInput
              style={styles.input}
              value={section_4_precautions}
              onChangeText={setSection4Precautions}
              placeholder="หมายเหตุ (เช่น ห้ามใช้ร่วมกับยาอื่น)"
              placeholderTextColor="gray"
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

import { Picker } from '@react-native-picker/picker';
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
