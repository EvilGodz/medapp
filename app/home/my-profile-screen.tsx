import { addToProfileOutbox, processProfileOutbox } from '@/utils/outbox';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
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
  gender?: 'Male' | 'Female';
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
    gender: 'Male',
  });
  const [editedData, setEditedData] = useState<User>(userData);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [profileImage, setProfileImage] = useState<string | null>(null);

  useEffect(() => {
    loadUserData();
  }, []);


  const loadUserData = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Error', 'Please login again');
        router.replace('/login/LoginScreen');
        return;
      }

      // Add 2s timeout to fetch
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
        // offline fallback
        const cached = await AsyncStorage.getItem('user');
        if (cached) user = JSON.parse(cached);
      }
      if (user) {
        setUserData(user);
        setEditedData(user);
        if (user.birth_date) setSelectedDate(new Date(user.birth_date));
      }
  // If online, process outbox
  if (online) await processProfileOutbox(token, API_BASE_URL);
    } catch (error) {
      console.error('Error loading profile:', error);
      Alert.alert('Error', 'Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Error', 'Please login again');
        return;
      }

      // Prepare update data
      const updateData = {
        fullname: editedData.fullname,
        birth_date: editedData.birth_date,
        weight: editedData.weight ? parseFloat(editedData.weight.toString()) : null,
        height: editedData.height ? parseFloat(editedData.height.toString()) : null,
        phone: editedData.phone || null,
        gender: editedData.gender || null
      };

      // Try to save online with 2s timeout
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
          Alert.alert('Error', data.message || 'Failed to update profile');
        }
      } catch (error) {
        // If offline or failed, queue in outbox
        await addToProfileOutbox(updateData);
        Alert.alert('Saved offline', 'Profile update will sync when online.');
      }
      // Always update local cache
      setUserData(editedData);
      await AsyncStorage.setItem('user', JSON.stringify(editedData));
      if (success) {
        Alert.alert('Success', 'Profile updated successfully');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const handleDateChange = (event: any, date?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (date) {
      setSelectedDate(date);
      const formattedDate = date.toISOString().split('T')[0];
      setEditedData({ ...editedData, birth_date: formattedDate });
    }
  };

  const formatDisplayDate = (dateString?: string) => {
    if (!dateString) return 'เลือกวันเกิด';
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    };
    return date.toLocaleDateString('th-TH', options);
  };

  const getInitials = (name: string) => {
    if (!name) return 'U';
    const names = name.trim().split(' ');
    if (names.length >= 2) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase();
    }
    return name[0].toUpperCase();
  };

  // ตรวจสอบว่ามีการแก้ไขข้อมูลหรือไม่
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
                    editedData.gender === 'Male' && styles.genderButtonActive
                  ]}
                  onPress={() => setEditedData({ ...editedData, gender: 'Male' })}
                >
                  <View style={[
                    styles.radioButton,
                    editedData.gender === 'Male' && styles.radioButtonActive
                  ]} />
                  <Text style={[
                    styles.genderText,
                    editedData.gender === 'Male' && styles.genderTextActive
                  ]}>ชาย</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.genderButton,
                    editedData.gender === 'Female' && styles.genderButtonActive
                  ]}
                  onPress={() => setEditedData({ ...editedData, gender: 'Female' })}
                >
                  <View style={[
                    styles.radioButton,
                    editedData.gender === 'Female' && styles.radioButtonActive
                  ]} />
                  <Text style={[
                    styles.genderText,
                    editedData.gender === 'Female' && styles.genderTextActive
                  ]}>หญิง</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Contact Detail Section */}
            <Text style={[styles.sectionTitle, { marginTop: 30 }]}>ข้อมูลติดต่อ</Text>
            
            {/* Mobile Number */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>เบอร์โทรศัพท์</Text>
              <TextInput
                style={styles.input}
                value={editedData.phone}
                onChangeText={(text) => setEditedData({ ...editedData, phone: text })}
                placeholder="กรอกเบอร์โทรศัพท์"
                keyboardType="phone-pad"
              />
            </View>

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

        {/* Date Picker Modal */}
        {showDatePicker && (
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleDateChange}
            maximumDate={new Date()}
          />
        )}
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
    padding: 4,
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
    gap: 15,
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
});

export default MyProfileScreen;