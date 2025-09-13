import React, { memo, startTransition, useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

import { useRouter } from 'expo-router';
import { AuthResponse, SignupFormData } from '../../types/types';

export default function SignupScreen() {
  const router = useRouter();
  const [formData, setFormData] = useState<SignupFormData>({
    fullname: '',
    email: '',
    password: '',
    confirmPassword: '',
    birth_date: '',
    weight: '',
    height: ''
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const handleInputChange = (field: keyof SignupFormData, value: string): void => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatDateThai = (date: Date): string => {
    const months = [
      'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
      'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];

    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear() + 543;

    return `${day} ${month} ${year}`;
  };

  const handleDateSelect = (date: Date): void => {
    const formattedDate = formatDate(date);
    handleInputChange('birth_date', formattedDate);
    setSelectedDate(date);
    setShowDatePicker(false);
  };

  const generateYears = (): number[] => {
    const currentYear = new Date().getFullYear();
    const years: number[] = [];
    for (let year = currentYear - 80; year <= currentYear - 10; year++) {
      years.push(year);
    }
    return years.reverse();
  };

  const generateMonths = (): string[] => {
    return [
      'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
      'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];
  };

  const generateDays = (): number[] => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: number[] = [];
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }
    return days;
  };

  type DatePickerProps = {
    visible: boolean;
    initialDate: Date;
    onClose: () => void;
    onConfirm: (date: Date) => void;
  };

  const ITEM_HEIGHT = 44;

  const PickerItem = memo(function PickerItem({
    label,
    selected,
    onPress,
  }: {
    label: string | number;
    selected: boolean;
    onPress: () => void;
  }) {
    return (
      <TouchableOpacity
        onPress={onPress}
        style={[
          { height: ITEM_HEIGHT, alignItems: 'center', justifyContent: 'center' },
          selected && { backgroundColor: 'rgba(0,0,0,0.06)', borderRadius: 10 },
        ]}
        activeOpacity={0.6}
      >
        <Text style={[{ fontSize: 16 }, selected && { fontWeight: '700', color: '#000' }]}>{label}</Text>
      </TouchableOpacity>
    );
  });

  const CustomDatePicker: React.FC<DatePickerProps> = ({ visible, initialDate, onClose, onConfirm }) => {
    const [draftDate, setDraftDate] = useState<Date>(initialDate);

    useEffect(() => {
      if (visible) setDraftDate(initialDate);
    }, [visible, initialDate]);

    const years = useMemo(() => {
      const currentYear = new Date().getFullYear();
      const arr: number[] = [];
      for (let y = currentYear - 80; y <= currentYear - 10; y++) arr.push(y);
      return arr.reverse(); // มาก่อนคือปีใหม่กว่า
    }, []);

    const months = useMemo(
      () => ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'],
      []
    );

    const daysInMonth = useMemo(() => {
      const y = draftDate.getFullYear();
      const m = draftDate.getMonth();
      return new Date(y, m + 1, 0).getDate();
    }, [draftDate]);

    const days = useMemo(() => Array.from({ length: daysInMonth }, (_, i) => i + 1), [daysInMonth]);

    const selectYear = useCallback(
      (y: number) => {
        startTransition(() => {
          const last = new Date(y, draftDate.getMonth() + 1, 0).getDate();
          const d = Math.min(draftDate.getDate(), last);
          setDraftDate(new Date(y, draftDate.getMonth(), d));
        });
      },
      [draftDate]
    );

    const selectMonth = useCallback(
      (m: number) => {
        startTransition(() => {
          const last = new Date(draftDate.getFullYear(), m + 1, 0).getDate();
          const d = Math.min(draftDate.getDate(), last);
          setDraftDate(new Date(draftDate.getFullYear(), m, d));
        });
      },
      [draftDate]
    );

    const selectDay = useCallback(
      (d: number) => {
        startTransition(() => {
          setDraftDate(new Date(draftDate.getFullYear(), draftDate.getMonth(), d));
        });
      },
      [draftDate]
    );

    const getItemLayout = useCallback(
      (_: any, index: number) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index }),
      []
    );

    return (
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <View style={styles.modalContainer}>
          <View style={styles.datePickerContainer}>
            <Text style={styles.datePickerTitle}>เลือกวันเกิด</Text>

            <View style={styles.datePickerContent}>
              {/* ปี */}
              <View style={styles.pickerColumn}>
                <Text style={styles.pickerLabel}>ปี</Text>
                <FlatList
                  data={years}
                  keyExtractor={(y) => String(y)}
                  renderItem={({ item: y }) => (
                    <PickerItem
                      label={y + 543}
                      selected={draftDate.getFullYear() === y}
                      onPress={() => selectYear(y)}
                    />
                  )}
                  getItemLayout={getItemLayout}
                  initialNumToRender={20}
                  windowSize={7}
                  removeClippedSubviews
                  showsVerticalScrollIndicator={false}
                  style={[styles.pickerScroll, { maxHeight: 160 }]}
                />
              </View>

              {/* เดือน */}
              <View style={styles.pickerColumn}>
                <Text style={styles.pickerLabel}>เดือน</Text>
                <FlatList
                  data={months}
                  keyExtractor={(_, i) => String(i)}
                  renderItem={({ item: label, index }) => (
                    <PickerItem
                      label={label}
                      selected={draftDate.getMonth() === index}
                      onPress={() => selectMonth(index)}
                    />
                  )}
                  getItemLayout={getItemLayout}
                  initialNumToRender={12}
                  windowSize={5}
                  removeClippedSubviews
                  showsVerticalScrollIndicator={false}
                  style={[styles.pickerScroll, { maxHeight: 160 }]}
                />
              </View>

              {/* วัน */}
              <View style={styles.pickerColumn}>
                <Text style={styles.pickerLabel}>วัน</Text>
                <FlatList
                  data={days}
                  keyExtractor={(d) => String(d)}
                  renderItem={({ item: d }) => (
                    <PickerItem
                      label={d}
                      selected={draftDate.getDate() === d}
                      onPress={() => selectDay(d)}
                    />
                  )}
                  getItemLayout={getItemLayout}
                  initialNumToRender={31}
                  windowSize={7}
                  removeClippedSubviews
                  showsVerticalScrollIndicator={false}
                  style={[styles.pickerScroll, { maxHeight: 160 }]}
                />
              </View>
            </View>

            <View style={styles.datePickerButtons}>
              <TouchableOpacity style={[styles.datePickerButton, styles.cancelButton]} onPress={onClose}>
                <Text style={styles.cancelButtonText}>ยกเลิก</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.datePickerButton, styles.confirmButton]}
                onPress={() => onConfirm(draftDate)}
                activeOpacity={0.8}
              >
                <Text style={styles.confirmButtonText}>ตกลง</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const validateForm = (): boolean => {
    const { fullname, email, password, confirmPassword } = formData;

    if (!fullname || !email || !password) {
      Alert.alert('ข้อผิดพลาด', 'กรุณากรอกข้อมูลที่จำเป็น');
      return false;
    }

    if (password !== confirmPassword) {
      Alert.alert('ข้อผิดพลาด', 'รหัสผ่านไม่ตรงกัน');
      return false;
    }

    if (password.length < 6) {
      Alert.alert('ข้อผิดพลาด', 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
      return false;
    }

    return true;
  };

  const handleSignup = async (): Promise<void> => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      console.log('Starting signup with data:', formData);

      const { getApiBaseUrl } = require('@/utils/env');
      const CALL_API = getApiBaseUrl();
      const response = await fetch(CALL_API + '/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullname: formData.fullname,
          email: formData.email,
          password: formData.password,
          birth_date: formData.birth_date || null,
          weight: formData.weight ? parseFloat(formData.weight) : null,
          height: formData.height ? parseFloat(formData.height) : null,
        }),
      });

      console.log('Response status:', response.status);
      const data: AuthResponse = await response.json();
      console.log('Response data:', data);

      if (data.success) {
        // ไม่เก็บ token ยืนยันอีเมลก่อน
        Alert.alert('สำเร็จ', data.message, [
          {
            text: 'ตกลง',
            onPress: () => router.push({ pathname: '/login/EmailVerificationScreen', params: { email: formData.email, fullname: formData.fullname } })
          }
        ]);
      } else {
        Alert.alert('ข้อผิดพลาด', data.message || 'เกิดข้อผิดพลาดในการสมัครสมาชิก');
      }
    } catch (error) {
      console.error('❌ Signup error:', error);
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.formContainer}>

          <Text style={styles.title}>สร้างบัญชีของคุณ</Text>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>ชื่อ</Text>
            <TextInput
              style={styles.input}
              placeholder="ex: สมชาย หมายดี"
              value={formData.fullname}
              onChangeText={(text) => handleInputChange('fullname', text)}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>อีเมล</Text>
            <TextInput
              style={styles.input}
              placeholder="ex: som.chai@gmail.com"
              value={formData.email}
              onChangeText={(text) => handleInputChange('email', text)}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>รหัสผ่าน</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••••"
              value={formData.password}
              onChangeText={(text) => handleInputChange('password', text)}
              secureTextEntry
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>ยืนยันรหัสผ่าน</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••••"
              value={formData.confirmPassword}
              onChangeText={(text) => handleInputChange('confirmPassword', text)}
              secureTextEntry
            />
          </View>

          <View style={styles.inputContainer}>
            <TouchableOpacity
              style={styles.dateInputButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={[
                styles.dateInputText,
                !formData.birth_date && styles.placeholderText
              ]}>
                {formData.birth_date ? formatDateThai(new Date(formData.birth_date)) : 'เลือกวันเกิด'}
              </Text>
              <Text style={styles.dateInputIcon}>📅</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="น้ำหนัก (กก.)"
              value={formData.weight}
              onChangeText={(text) => handleInputChange('weight', text)}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="ส่วนสูง (ซม.)"
              value={formData.height}
              onChangeText={(text) => handleInputChange('height', text)}
              keyboardType="numeric"
            />
          </View>

          <TouchableOpacity
            style={styles.signupButton}
            onPress={handleSignup}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.signupButtonText}>สมัครสมาชิก</Text>
            )}
          </TouchableOpacity>

          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>มีบัญชีอยู่แล้ว? </Text>
            <TouchableOpacity onPress={() => router.push('/login/LoginScreen')}>
              <Text style={styles.loginLink}>ลงชื่อเข้าใช้</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <CustomDatePicker
        visible={showDatePicker}
        initialDate={selectedDate}
        onClose={() => setShowDatePicker(false)}
        onConfirm={(d) => handleDateSelect(d)}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  formContainer: {
    paddingHorizontal: 30,
    paddingTop: 20,
    paddingBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    color: '#333',
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 15,
    paddingVertical: 15,
    borderRadius: 10,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
    color: '#333',
  },
  dateInputButton: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 15,
    paddingVertical: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e9ecef',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateInputText: {
    fontSize: 16,
    color: '#333',
  },
  placeholderText: {
    color: '#999',
  },
  dateInputIcon: {
    fontSize: 18,
  },
  signupButton: {
    backgroundColor: '#28a745',
    paddingVertical: 15,
    borderRadius: 10,
    marginTop: 10,
    alignItems: 'center',
  },
  signupButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
  },
  loginText: {
    fontSize: 16,
    color: '#666',
  },
  loginLink: {
    fontSize: 16,
    color: '#28a745',
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  datePickerContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxHeight: '70%',
  },
  datePickerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  datePickerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    height: 200,
  },
  pickerColumn: {
    flex: 1,
    marginHorizontal: 5,
  },
  pickerLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#666',
  },
  pickerScroll: {
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    maxHeight: 160,
  },
  pickerItem: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  selectedPickerItem: {
    backgroundColor: '#28a745',
    borderRadius: 8,
    marginHorizontal: 4,
    marginVertical: 2,
  },
  pickerItemText: {
    fontSize: 16,
    color: '#333',
  },
  selectedPickerItemText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  datePickerButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  datePickerButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  confirmButton: {
    backgroundColor: '#28a745',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: 'bold',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
}
)