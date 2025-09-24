import { addToProfileOutbox, processProfileOutbox } from '@/utils/outbox';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { memo, startTransition, useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

function isEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (typeof a !== 'object' || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!isEqual(a[i], b[i])) return false;
    }
    return true;
  }
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  for (const key of aKeys) {
    if (!b.hasOwnProperty(key)) return false;
    if (!isEqual(a[key], b[key])) return false;
  }
  return true;
}

import { getApiBaseUrl } from '@/utils/env';
const API_BASE_URL = getApiBaseUrl();

interface User {
  id: number;
  fullname: string;
  email: string;
  phone?: string;
  birth_date?: string;
  weight?: number;
  height?: number;
  gender?: 'ชาย' | 'หญิง' | 'ไม่ระบุ';
}

const MyProfileScreen = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [userData, setUserData] = useState<User>({
    id: 0,
    fullname: '',
    email: '',
    phone: '',
    birth_date: '',
    weight: undefined,
    height: undefined,
    gender: 'ชาย',
  });
  const [editedData, setEditedData] = useState<User>(userData);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string>('');

  useEffect(() => {
    loadUserData();
  }, []);


  const loadUserData = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('เกิดข้อผิดพลาด', 'กรุณาล็อกอินใหม่อีกครั้ง');
        router.replace('/login/LoginScreen');
        return;
      }

      // 2s timeout
      const fetchWithTimeout = (url: string, options: any, timeout = 2000) => {
        return Promise.race([
          fetch(url, options),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Request timed out')), timeout))
        ]);
      };

      let user = null;
      let online = false;
      try {
        const response = await fetchWithTimeout(`${API_BASE_URL}/api/auth/profile`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });
        const data = await (response as Response).json();
        if (data.success && data.data?.user) {
          user = data.data.user;
          await AsyncStorage.setItem('user', JSON.stringify(user));
          online = true;
        }
      } catch (error) {
        // offline
        const cached = await AsyncStorage.getItem('user');
        if (cached) user = JSON.parse(cached);
      }
      if (user) {
        setUserData(user);
        setEditedData(user);
        if (user.birth_date) {
          const parsedDate = parseYMDLocal(user.birth_date);
          console.log('Parsed birth_date:', user.birth_date, '->', parsedDate);
          setSelectedDate(parsedDate);
        }
      }
  // outbox
  if (online) await processProfileOutbox(token, API_BASE_URL);
    } catch (error) {
      console.error('Error loading profile:', error);
      Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถโหลดข้อมูลโปรไฟล์ได้');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      if (editedData.phone && !validatePhoneNumber(editedData.phone)) {
        setPhoneError('เบอร์โทรศัพท์ต้องมี 10 หลัก');
        setSaving(false);
        return;
      }
      
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('เกิดข้อผิดพลาด', 'กรุณาล็อกอินใหม่อีกครั้ง');
        return;
      }

      const updateData = {
        fullname: editedData.fullname,
        birth_date: editedData.birth_date,
        weight: editedData.weight ? parseFloat(editedData.weight.toString()) : null,
        height: editedData.height ? parseFloat(editedData.height.toString()) : null,
        phone: editedData.phone || null,
        gender: editedData.gender || null
      };

      // save online 2s timeout
      const fetchWithTimeout = (url: string, options: any, timeout = 2000) => {
        return Promise.race([
          fetch(url, options),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Request timed out')), timeout))
        ]);
      };
      let success = false;
      try {
        const response = await fetchWithTimeout(`${API_BASE_URL}/api/auth/profile`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(updateData),
        });
        const data = await (response as Response).json();
        if (data.success) {
          success = true;
        } else {
          Alert.alert('เกิดข้อผิดพลาด', data.message || 'ไม่สามารถอัพเดทโปรไฟล์ได้');
        }
      } catch (error) {
        // outbox
        await addToProfileOutbox(updateData);
        Alert.alert('บันทึกแบบออฟไลน์', 'การอัพเดทโปรไฟล์จะ sync เมื่อคุณออนไลน์');
      }
      // update local cache
      setUserData(editedData);
      await AsyncStorage.setItem('user', JSON.stringify(editedData));
      if (success) {
        Alert.alert('สำเร็จ', 'โปรไฟล์อัพเดทสำเร็จ');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถบันทึกโปรไฟล์ได้');
    } finally {
      setSaving(false);
    }
  };

  const handleDateSelect = (date: Date): void => {
    const formattedDate = toYMDLocal(date);
    setEditedData({ ...editedData, birth_date: formattedDate });
    setSelectedDate(parseYMDLocal(formattedDate));
    setShowDatePicker(false);
  };

  const formatDisplayDate = (dateString?: string) => {
    if (!dateString) return 'เลือกวันเกิด';
    const date = parseYMDLocal(dateString);
    if (isNaN(date.getTime())) {
      return 'เลือกวันเกิด';
    }
    return formatDateThai(date);
  };

  const getInitials = (name: string) => {
    if (!name) return 'U';
    const names = name.trim().split(' ');
    if (names.length >= 2) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase();
    }
    return name[0].toUpperCase();
  };

  const toYMDLocal = (d: Date) => {
    const dd = new Date(d);
    dd.setHours(12, 0, 0, 0);
    const y = dd.getFullYear();
    const m = String(dd.getMonth() + 1).padStart(2, '0');
    const day = String(dd.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const parseYMDLocal = (s: string) => {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
  };

  const formatDateThai = (date: Date): string => {
    if (!date || isNaN(date.getTime())) {
      return 'เลือกวันเกิด';
    }

    const months = [
      'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
      'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];

    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear() + 543;

    return `${day} ${month} ${year}`;
  };

  const validatePhoneNumber = (phone: string): boolean => {
    if (!phone) return true; // Empty phone is valid (optional field)
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.length === 10;
  };

  const formatPhoneNumber = (phone: string): string => {
    if (!phone) return '';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  const handlePhoneChange = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    
    const limited = cleaned.slice(0, 10);
    
    setEditedData({ ...editedData, phone: limited });
    
    if (limited && limited.length !== 10) {
      setPhoneError('เบอร์โทรศัพท์ต้องมี 10 หลัก');
    } else {
      setPhoneError('');
    }
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
    const [draftDate, setDraftDate] = useState<Date>(() => {
      if (initialDate && !isNaN(initialDate.getTime())) {
        return initialDate;
      }
      return new Date();
    });

    useEffect(() => {
      if (visible && initialDate && !isNaN(initialDate.getTime())) {
        setDraftDate(initialDate);
      }
    }, [visible, initialDate]);

    const years = useMemo(() => {
      const currentYear = new Date().getFullYear();
      const arr: number[] = [];
      for (let y = currentYear - 80; y <= currentYear - 10; y++) arr.push(y);
      return arr.reverse();
    }, []);

    const months = useMemo(
      () => ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'],
      []
    );

    const daysInMonth = useMemo(() => {
      const y = draftDate.getFullYear();
      const m = draftDate.getMonth();
      const days = new Date(y, m + 1, 0).getDate();
      console.log('Calculating days for:', y, m, '->', days, 'days');
      return days;
    }, [draftDate]);

    const days = useMemo(() => {
      const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
      console.log('Days array:', daysArray);
      return daysArray;
    }, [daysInMonth]);

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

  // check edit
  const isEdited = !isEqual(editedData, userData);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1a8e2d" />
          <Text style={styles.loadingText}>กำลังโหลดข้อมูลโปรไฟล์...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>โปรไฟล์</Text>
            <View style={{ width: 24 }} />
          </View>

          {/* Profile Image Section */}
          <View style={styles.profileImageSection}>
            <View style={styles.profileImageContainer}>
              {profileImage ? (
                <Image source={{ uri: profileImage }} style={styles.profileImage} />
              ) : (
                <View style={styles.profileImagePlaceholder}>
                  <Text style={styles.initialsText}>
                    {getInitials(editedData.fullname)}
                  </Text>
                </View>
              )}
              {/* <TouchableOpacity style={styles.cameraButton}>
                <Ionicons name="camera" size={20} color="white" />
              </TouchableOpacity> */}
            </View>
          </View>

          {/* Form Section */}
          <View style={styles.formSection}>
          
            {/* Full Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>ชื่อ-นามสกุล</Text>
              <TextInput
                style={styles.input}
                value={editedData.fullname}
                onChangeText={(text) => setEditedData({ ...editedData, fullname: text })}
                placeholder="กรอกชื่อ-นามสกุล"
                placeholderTextColor="gray"
              />
            </View>

            {/* Email (Read-only) */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>อีเมล</Text>
              <View style={[styles.input, styles.readOnlyInput]}>
                <Text style={styles.readOnlyText}>{userData.email}</Text>
                <Ionicons name="lock-closed-outline" size={16} color="#999" />
              </View>
            </View>

            {/* Date of Birth */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>วันเกิด</Text>
              <TouchableOpacity 
                style={styles.dateInput}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={styles.dateText}>
                  {formatDisplayDate(editedData.birth_date)}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Gender */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>เพศ</Text>
              <View style={styles.genderContainer}>
                <TouchableOpacity
                  style={[
                    styles.genderButton,
                    editedData.gender === 'ชาย' && styles.genderButtonActive
                  ]}
                  onPress={() => setEditedData({ ...editedData, gender: 'ชาย' })}
                >
                  <View style={[
                    styles.radioButton,
                    editedData.gender === 'ชาย' && styles.radioButtonActive
                  ]} />
                  <Text style={[
                    styles.genderText,
                    editedData.gender === 'ชาย' && styles.genderTextActive
                  ]}>ชาย</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.genderButton,
                    editedData.gender === 'หญิง' && styles.genderButtonActive
                  ]}
                  onPress={() => setEditedData({ ...editedData, gender: 'หญิง' })}
                >
                  <View style={[
                    styles.radioButton,
                    editedData.gender === 'หญิง' && styles.radioButtonActive
                  ]} />
                  <Text style={[
                    styles.genderText,
                    editedData.gender === 'หญิง' && styles.genderTextActive
                  ]}>หญิง</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.genderButton,
                    editedData.gender === 'ไม่ระบุ' && styles.genderButtonActive
                  ]}
                  onPress={() => setEditedData({ ...editedData, gender: 'ไม่ระบุ' })}
                >
                  <View style={[
                    styles.radioButton,
                    editedData.gender === 'ไม่ระบุ' && styles.radioButtonActive
                  ]} />
                  <Text style={[
                    styles.genderText,
                    editedData.gender === 'ไม่ระบุ' && styles.genderTextActive
                  ]}>ไม่ระบุ</Text>
                </TouchableOpacity>
              </View>
            </View>
{/* 
            <Text style={[styles.sectionTitle, { marginTop: 30 }]}>ข้อมูลติดต่อ</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>เบอร์โทรศัพท์</Text>
              <TextInput
                style={[
                  styles.input,
                  phoneError ? styles.inputError : null
                ]}
                value={editedData.phone}
                onChangeText={handlePhoneChange}
                placeholder="กรอกเบอร์โทรศัพท์ 10 หลัก"
                placeholderTextColor="gray"
                keyboardType="phone-pad"
                maxLength={10}
              />
              {phoneError ? (
                <Text style={styles.errorText}>{phoneError}</Text>
              ) : null}
            </View> */}

            {/* Health Information Section */}
            <Text style={[styles.sectionTitle, { marginTop: 30 }]}>ข้อมูลสุขภาพ</Text>
            
            {/* Weight and Height Row */}
            <View style={styles.rowContainer}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                <Text style={styles.label}>น้ำหนัก (กก.)</Text>
                <TextInput
                  style={styles.input}
                  value={editedData.weight?.toString() || ''}
                  onChangeText={(text) => setEditedData({ ...editedData, weight: text ? parseFloat(text) : undefined })}
                  placeholder="น้ำหนัก"
                  placeholderTextColor="gray"
                  keyboardType="numeric"
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1, marginLeft: 10 }]}>
                <Text style={styles.label}>ส่วนสูง (ซม.)</Text>
                <TextInput
                  style={styles.input}
                  value={editedData.height?.toString() || ''}
                  onChangeText={(text) => setEditedData({ ...editedData, height: text ? parseFloat(text) : undefined })}
                  placeholder="ส่วนสูง"
                  placeholderTextColor="gray"
                  keyboardType="numeric"
                />
              </View>
            </View>

            {/* Save Button เฉพาะเมื่อมีการแก้ไข */}
            {isEdited && (
              <TouchableOpacity 
                style={styles.saveButton}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.saveButtonText}>บันทึก</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>

        {/* Custom Date Picker Modal */}
        <CustomDatePicker
          visible={showDatePicker}
          initialDate={selectedDate}
          onClose={() => setShowDatePicker(false)}
          onConfirm={handleDateSelect}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  profileImageSection: {
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: 'white',
  },
  profileImageContainer: {
    position: 'relative',
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  profileImagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#1a8e2d',
    justifyContent: 'center',
    alignItems: 'center',
  },
  initialsText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: 'white',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#4a90e2',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  formSection: {
    backgroundColor: 'white',
    marginTop: 10,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#fafafa',
  },
  inputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
  },
  readOnlyInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  readOnlyText: {
    fontSize: 16,
    color: '#999',
  },
  dateInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#fafafa',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 16,
    color: '#333',
  },
  genderContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  genderButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#fafafa',
  },
  genderButtonActive: {
    borderColor: '#1a8e2d',
    backgroundColor: '#f0f9f0',
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    marginRight: 8,
  },
  radioButtonActive: {
    borderColor: '#1a8e2d',
    backgroundColor: '#1a8e2d',
  },
  genderText: {
    fontSize: 16,
    color: '#666',
  },
  genderTextActive: {
    color: '#1a8e2d',
    fontWeight: '500',
  },
  rowContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  saveButton: {
    backgroundColor: '#1a8e2d',
    borderRadius: 25,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
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
});

export default MyProfileScreen;