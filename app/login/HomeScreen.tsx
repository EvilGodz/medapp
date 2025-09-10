import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { User } from '../../types/types';
import { authAPI } from '../../utils/api';


interface BMIStatus {
  text: string;
  color: string;
}

const HomeScreen: React.FC = () => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async (): Promise<void> => {
    try {
      // โหลดข้อมูลผู้ใช้จาก AsyncStorage
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        setUser(JSON.parse(userData));
      }
      
      // ดึงข้อมูลจาก API
      try {
        const response = await authAPI.getProfile();
        if (response.success && response.data) {
          setUser(response.data.user);
          await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      }
      //อาจ token หมดอายุ
      handleLogout();
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async (): Promise<void> => {
    Alert.alert(
      'ออกจากระบบ',
      'คุณต้องการออกจากระบบใช่หรือไม่?',
      [
        {
          text: 'ยกเลิก',
          style: 'cancel',
        },
        {
          text: 'ออกจากระบบ',
          onPress: async () => {
            await AsyncStorage.removeItem('token');
            await AsyncStorage.removeItem('user');
            router.replace('/test/LoginScreen');
          },
        },
      ]
    );
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return 'ไม่ได้ระบุ';
    const date = new Date(dateString);
    return date.toLocaleDateString('th-TH');
  };

  const calculateAge = (birthDate?: string): string => {
    if (!birthDate) return 'ไม่ได้ระบุ';
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return `${age} ปี`;
  };

  const calculateBMI = (weight?: number, height?: number): string => {
    if (!weight || !height) return 'ไม่สามารถคำนวณได้';
    const heightInMeters = height / 100;
    const bmi = weight / (heightInMeters * heightInMeters);
    return bmi.toFixed(1);
  };

  const getBMIStatus = (bmi: string): BMIStatus => {
    const bmiValue = parseFloat(bmi);
    if (bmiValue < 18.5) return { text: 'น้ำหนักต่ำกว่าเกณฑ์', color: '#17a2b8' };
    if (bmiValue < 23) return { text: 'น้ำหนักปกติ', color: '#28a745' };
    if (bmiValue < 25) return { text: 'น้ำหนักเกิน', color: '#ffc107' };
    if (bmiValue < 30) return { text: 'อ้วนระดับ 1', color: '#fd7e14' };
    return { text: 'อ้วนระดับ 2', color: '#dc3545' };
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>กำลังโหลด...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>ไม่พบข้อมูลผู้ใช้</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadUserData}>
          <Text style={styles.retryButtonText}>ลองใหม่</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const bmi = calculateBMI(user.weight, user.height);
  const bmiStatus = getBMIStatus(bmi);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.welcomeText}>ยินดีต้อนรับ</Text>
        <Text style={styles.userName}>{user.fullname}</Text>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>ออกจากระบบ</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.profileContainer}>
        <Text style={styles.sectionTitle}>ข้อมูลส่วนตัว</Text>
        
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>อีเมล:</Text>
            <Text style={styles.infoValue}>{user.email}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>วันเกิด:</Text>
            <Text style={styles.infoValue}>{formatDate(user.birth_date)}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>อายุ:</Text>
            <Text style={styles.infoValue}>{calculateAge(user.birth_date)}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>น้ำหนัก:</Text>
            <Text style={styles.infoValue}>{user.weight ? `${user.weight} กก.` : 'ไม่ได้ระบุ'}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>ส่วนสูง:</Text>
            <Text style={styles.infoValue}>{user.height ? `${user.height} ซม.` : 'ไม่ได้ระบุ'}</Text>
          </View>
        </View>

        {user.weight && user.height && (
          <View style={styles.bmiContainer}>
            <Text style={styles.sectionTitle}>ดัชนีมวลกาย (BMI)</Text>
            <View style={styles.bmiCard}>
              <View style={styles.bmiRow}>
                <Text style={styles.bmiLabel}>BMI:</Text>
                <Text style={styles.bmiValue}>{bmi}</Text>
              </View>
              <View style={styles.bmiRow}>
                <Text style={styles.bmiLabel}>สถานะ:</Text>
                <Text style={[styles.bmiStatus, { color: bmiStatus.color }]}>
                  {bmiStatus.text}
                </Text>
              </View>
            </View>
          </View>
        )}

        <View style={styles.joinDateContainer}>
          <Text style={styles.joinDateText}>
            เข้าร่วมเมื่อ: {formatDate(user.created_at)}
          </Text>
        </View>
      </View>
    </ScrollView>
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
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  errorText: {
    fontSize: 16,
    color: '#dc3545',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  header: {
    backgroundColor: '#007AFF',
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 18,
    color: '#fff',
    opacity: 0.9,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 5,
  },
  logoutButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 15,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  profileContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: 'bold',
  },
  bmiContainer: {
    marginBottom: 20,
  },
  bmiCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  bmiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  bmiLabel: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  bmiValue: {
    fontSize: 20,
    color: '#333',
    fontWeight: 'bold',
  },
  bmiStatus: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  joinDateContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  joinDateText: {
    fontSize: 14,
    color: '#999',
  },
});

export default HomeScreen;