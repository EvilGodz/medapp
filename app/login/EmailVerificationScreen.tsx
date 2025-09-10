import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { ApiResponse } from '../../types/types';

const CALL_API = Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://192.168.1.89:3000';

const EmailVerificationScreen: React.FC = () => {
  const router = useRouter();
  const { email, fullname } = useLocalSearchParams<{ email?: string; fullname?: string }>();
  const [loading, setLoading] = useState<boolean>(false);
  const [resendLoading, setResendLoading] = useState<boolean>(false);

  const handleResendEmail = async (): Promise<void> => {
    if (!email) {
      Alert.alert('ข้อผิดพลาด', 'ไม่พบข้อมูลอีเมล');
      return;
    }

    setResendLoading(true);
    try {
      const response = await fetch(CALL_API + '/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data: ApiResponse = await response.json();

      if (data.success) {
        Alert.alert('สำเร็จ', 'ส่งอีเมลยืนยันใหม่แล้ว กรุณาตรวจสอบกล่องจดหมาย');
      } else {
        Alert.alert('ข้อผิดพลาด', data.message || 'ไม่สามารถส่งอีเมลได้');
      }
    } catch (error) {
      console.error('Resend email error:', error);
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Email Icon */}
        <View style={styles.iconContainer}>
          <Text style={styles.emailIcon}>📧</Text>
        </View>

        {/* Logo */}
        <View style={styles.logoContainer}>
          <Image
            source={require('../../assets/images/logomedicine-app.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <Text style={styles.title}>ตรวจสอบอีเมลของคุณ</Text>
        
        <Text style={styles.subtitle}>
          เราได้ส่งลิงก์ยืนยันไปที่
        </Text>
        
        <Text style={styles.email}>{email}</Text>
        
        <Text style={styles.description}>
          กรุณาคลิกลิงก์ในอีเมลเพื่อยืนยันบัญชีของคุณ
          {'\n\n'}
          หากไม่พบอีเมล กรุณาตรวจสอบในโฟลเดอร์ Spam
        </Text>

        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.resendButton}
            onPress={handleResendEmail}
            disabled={resendLoading}
          >
            {resendLoading ? (
              <ActivityIndicator color="#28a745" />
            ) : (
              <Text style={styles.resendButtonText}>ส่งอีเมลใหม่</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.replace('/login/LoginScreen')}
          >
            <Text style={styles.backButtonText}>กลับไปเข้าสู่ระบบ</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.helpContainer}>
          <Text style={styles.helpText}>
            หากยังมีปัญหา กรุณาติดต่อ:{' '}
            <Text style={styles.supportEmail}>theerapat.kh@rmuti.ac.th</Text>
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
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
  emailIcon: {
    fontSize: 60,
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
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 10,
  },
  email: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#28a745',
    textAlign: 'center',
    marginBottom: 30,
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
  buttonContainer: {
    width: '100%',
    marginBottom: 30,
  },
  resendButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#28a745',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 15,
  },
  resendButtonText: {
    color: '#28a745',
    fontSize: 16,
    fontWeight: 'bold',
  },
  backButton: {
    backgroundColor: '#28a745',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  helpContainer: {
    alignItems: 'center',
  },
  helpText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  supportEmail: {
    color: '#28a745',
    fontWeight: 'bold',
  },
});

export default EmailVerificationScreen;