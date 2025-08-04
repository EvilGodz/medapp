import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

interface AuthResponse {
  success: boolean;
  message?: string;
  data?: {
    token?: string;
    user?: any;
  };
}

const CALL_API = Constants.expoConfig?.extra?.CALL_API || process.env.CALL_API || 'http://localhost:3000';

const EmailVerifiedScreen: React.FC = () => {
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token?: string }>();
  const [loading, setLoading] = useState<boolean>(true);
  const [verified, setVerified] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (token) {
      verifyEmail(token);
    } else {
      setError('ไม่พบ token สำหรับยืนยัน');
      setLoading(false);
    }
  }, [token]);

  const verifyEmail = async (token: string): Promise<void> => {
    try {
      const response = await fetch(CALL_API + `/api/auth/verify-email/${token}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data: AuthResponse = await response.json();

      if (data.success) {
        if (data.data?.token && data.data?.user) {
          await AsyncStorage.setItem('token', data.data.token);
          await AsyncStorage.setItem('user', JSON.stringify(data.data.user));
        }
        setVerified(true);
      } else {
        setError(data.message || 'การยืนยันอีเมลไม่สำเร็จ');
      }
    } catch (error) {
      console.error('Email verification error:', error);
      setError('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = (): void => {
    if (verified) {
      router.replace('/home/home');
    } else {
      router.replace('/login/LoginScreen');
    }
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#28a745" />
          <Text style={styles.loadingText}>กำลังยืนยันอีเมล...</Text>
        </View>
      ) : (
        <View style={styles.content}>
          {/* Success/Error Icon */}
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>
              {verified ? '✅' : '❌'}
            </Text>
          </View>

          {/* Logo */}
          <View style={styles.logoContainer}>
            <Image
              source={require('../../assets/images/logomedicine-app.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          <Text style={styles.title}>
            {verified ? 'ยืนยันอีเมลสำเร็จ!' : 'การยืนยันล้มเหลว'}
          </Text>

          <Text style={styles.message}>
            {verified
              ? 'ยินดีต้อนรับสู่ Medicine App! คุณสามารถใช้งานแอปได้เต็มรูปแบบแล้ว'
              : error || 'ลิงก์ยืนยันไม่ถูกต้องหรือหมดอายุแล้ว'}
          </Text>

          <TouchableOpacity
            style={[styles.continueButton, !verified && styles.errorButton]}
            onPress={handleContinue}
          >
            <Text style={styles.continueButtonText}>
              {verified ? 'เริ่มใช้งาน' : 'กลับไปเข้าสู่ระบบ'}
            </Text>
          </TouchableOpacity>

          {!verified && (
            <TouchableOpacity
              style={styles.helpButton}
              onPress={() => router.push({ pathname: '/login/EmailVerificationScreen', params: { email: '' } })}
            >
              <Text style={styles.helpButtonText}>ส่งอีเมลยืนยันใหม่</Text>
            </TouchableOpacity>
          )}

          <View style={styles.featuresContainer}>
            <Text style={styles.featuresTitle}>สิ่งที่คุณจะได้รับ:</Text>
            <View style={styles.featureItem}>
              <Text style={styles.featureIcon}>💊</Text>
              <Text style={styles.featureText}>ติดตามการกินยา</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureIcon}>📊</Text>
              <Text style={styles.featureText}>วิเคราะห์สุขภาพ</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureIcon}>🔔</Text>
              <Text style={styles.featureText}>แจ้งเตือนการกินยา</Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#666',
  },
  content: {
    flex: 1,
    paddingHorizontal: 30,
    paddingTop: 80,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 20,
  },
  icon: {
    fontSize: 80,
  },
  logoContainer: {
    marginBottom: 30,
  },
  logo: {
    width: 60,
    height: 60,
    borderRadius: 15,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
  continueButton: {
    backgroundColor: '#28a745',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 20,
    width: '100%',
  },
  errorButton: {
    backgroundColor: '#dc3545',
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  helpButton: {
    backgroundColor: 'transparent',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#28a745',
    marginBottom: 40,
    width: '100%',
  },
  helpButtonText: {
    color: '#28a745',
    fontSize: 16,
    fontWeight: 'bold',
  },
  featuresContainer: {
    alignItems: 'center',
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  featureIcon: {
    fontSize: 20,
    marginRight: 15,
  },
  featureText: {
    fontSize: 16,
    color: '#666',
  },
});

export default EmailVerifiedScreen;