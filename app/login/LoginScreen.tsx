import AsyncStorage from '@react-native-async-storage/async-storage';
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
import { AuthResponse } from '../../types/types';

const CALL_API = 'http://192.168.1.89:3000';

const LoginScreen: React.FC = () => {
  const router = useRouter();
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const handleLogin = async (): Promise<void> => {
    if (!email || !password) {
      Alert.alert('ข้อผิดพลาด', 'กรุณากรอกอีเมลและรหัสผ่าน');
      return;
    }

    setLoading(true);
    try {
      // เรียกใช้ API จริง
      const response = await fetch(CALL_API + '/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          password: password,
        }),
      });

      const data: AuthResponse = await response.json();

      if (data.success) {
        // ⭐ เก็บ token และ user data ใน AsyncStorage
        if (data.data?.token && data.data?.user) {
          await AsyncStorage.setItem('token', data.data.token);
          await AsyncStorage.setItem('user', JSON.stringify(data.data.user));
        }
        
        Alert.alert('สำเร็จ', data.message, [
          { text: 'ตกลง', onPress: () => router.replace('/home/home') }
        ]);
      } else if (data.emailVerified === false) {
        // 🆕 ผู้ใช้ยังไม่ได้ยืนยันอีเมล
        Alert.alert(
          'ต้องยืนยันอีเมล',
          data.message,
          [
            { text: 'ยกเลิก', style: 'cancel' },
            { 
              text: 'ส่งอีเมลใหม่', 
              onPress: () => router.push({ pathname: '/login/EmailVerificationScreen', params: { email: data.email || email } })
            }
          ]
        );
      } else {
        Alert.alert('ข้อผิดพลาด', data.message || 'อีเมลหรือรหัสผ่านไม่ถูกต้อง');
      }
    } catch (error) {
      console.error('Login error:', error);
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
      <View style={styles.formContainer}>
        {/* Logo Section */}
        <View style={styles.logoContainer}>
          <Image
            source={require('../../assets/images/logomedicine-app.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
        
        <Text style={styles.title}>ลงชื่อเข้าใช้</Text>
        
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="ex: jon.smith@email.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••••"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        <TouchableOpacity 
          style={styles.loginButton}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.loginButtonText}>เข้าสู่ระบบ</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.orText}>or sign in with</Text>
        
        <View style={styles.socialContainer}>
          <TouchableOpacity style={styles.socialButton}>
            <Text style={styles.socialButtonText}>G</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.signupContainer}>
          <Text style={styles.signupText}>คุณยังไม่มีบัญชี? </Text>
          <TouchableOpacity onPress={() => router.push('/login/SignupScreen')}>
            <Text style={styles.signupLink}>สมัครสมาชิก</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
  },
  formContainer: {
    paddingHorizontal: 30,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 40,
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
  loginButton: {
    backgroundColor: '#28a745',
    paddingVertical: 15,
    borderRadius: 10,
    marginTop: 20,
    alignItems: 'center',
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  orText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 14,
    marginVertical: 20,
  },
  socialContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 30,
  },
  socialButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 10,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  socialButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  signupText: {
    fontSize: 16,
    color: '#666',
  },
  signupLink: {
    fontSize: 16,
    color: '#28a745',
    fontWeight: 'bold',
  },
});

export default LoginScreen;