import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

import { getApiBaseUrl } from '@/utils/env';
const CALL_API = getApiBaseUrl();

const ForgotPasswordScreen: React.FC = () => {
  const router = useRouter();
  const [email, setEmail] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [emailSent, setEmailSent] = useState<boolean>(false);

  const handleResetPassword = async (): Promise<void> => {
    if (!email) {
      Alert.alert('ข้อผิดพลาด', 'กรุณากรอกอีเมล');
      return;
    }

    // ตรวจสอบรูปแบบอีเมล
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('ข้อผิดพลาด', 'รูปแบบอีเมลไม่ถูกต้อง');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(CALL_API + '/api/password-reset/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (data.success) {
        setEmailSent(true);
        Alert.alert(
          'ส่งอีเมลสำเร็จ',
          data.message,
          [{ text: 'ตกลง' }]
        );
      } else {
        Alert.alert('ข้อผิดพลาด', data.message || 'ไม่สามารถส่งอีเมลได้');
      }
    } catch (error) {
      console.error('Password reset error:', error);
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
    } finally {
      setLoading(false);
    }
  };

  const handleResendEmail = async (): Promise<void> => {
    setEmailSent(false);
    await handleResetPassword();
  };

  if (emailSent) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          {/* Success Icon */}
          <View style={styles.iconContainer}>
            <Text style={styles.successIcon}>📧</Text>
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
            เราได้ส่งลิงก์รีเซ็ตรหัสผ่านไปที่
          </Text>
          
          <Text style={styles.email}>{email}</Text>
          
          <Text style={styles.description}>
            กรุณาคลิกลิงก์ในอีเมลเพื่อรีเซ็ตรหัสผ่านของคุณ
            {'\n\n'}
            หากไม่พบอีเมล กรุณาตรวจสอบในโฟลเดอร์ Spam
            {'\n\n'}
            ลิงก์จะหมดอายุใน 1 ชั่วโมง
          </Text>

          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={styles.resendButton}
              onPress={handleResendEmail}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#28a745" />
              ) : (
                <Text style={styles.resendButtonText}>ส่งอีเมลใหม่</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Text style={styles.backButtonText}>กลับไปเข้าสู่ระบบ</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        {/* Icon */}
        <View style={styles.iconContainer}>
          <Text style={styles.lockIcon}>🔒</Text>
        </View>

        {/* Logo */}
        <View style={styles.logoContainer}>
          <Image
            source={require('../../assets/images/logomedicine-app.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <Text style={styles.title}>ลืมรหัสผ่าน?</Text>
        
        <Text style={styles.subtitle}>
          ไม่ต้องกังวล! กรอกอีเมลของคุณ
          {'\n'}
          เราจะส่งลิงก์รีเซ็ตรหัสผ่านให้
        </Text>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>อีเมล</Text>
          <TextInput
            style={styles.input}
            placeholder="ex: som.chai@gmail.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <TouchableOpacity 
          style={styles.submitButton}
          onPress={handleResetPassword}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>ส่งลิงก์รีเซ็ตรหัสผ่าน</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.backLink}
          onPress={() => router.back()}
        >
          <Text style={styles.backLinkText}>← กลับไปเข้าสู่ระบบ</Text>
        </TouchableOpacity>

        <View style={styles.helpContainer}>
          <Text style={styles.helpText}>
            จำอีเมลไม่ได้? ติดต่อ:{' '}
            <Text style={styles.supportEmail}>theerapat.kh@rmuti.ac.th</Text>
          </Text>
        </View>
      </View>
    </KeyboardAvoidingView>
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
  lockIcon: {
    fontSize: 60,
  },
  successIcon: {
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
    marginBottom: 30,
    lineHeight: 24,
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
  inputContainer: {
    width: '100%',
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
  submitButton: {
    backgroundColor: '#28a745',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  backLink: {
    paddingVertical: 10,
    marginBottom: 30,
  },
  backLinkText: {
    color: '#28a745',
    fontSize: 16,
    fontWeight: '500',
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
    position: 'absolute',
    bottom: 30,
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

export default ForgotPasswordScreen;