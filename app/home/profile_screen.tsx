// ProfileScreen.tsx - Updated to fetch data from backend API
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

import { getApiBaseUrl } from '@/utils/env';
const API_BASE_URL = getApiBaseUrl();

// User Interface based on backend User model
interface User {
  id: number;
  fullname: string;
  email: string;
  birth_date?: string;
  weight?: number;
  height?: number;
  gender?: string;
  phone?: string;
  email_verified: boolean;
  created_at: string;
}

interface ApiResponse {
  success: boolean;
  data?: {
    user: User;
  };
  message?: string;
}

// API Service for user data
const AuthService = {
  // Get user profile using the existing /api/auth/profile endpoint
  getProfile: async (): Promise<User> => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Add 2-second timeout to fetch
      const fetchWithTimeout = (url: string, options: any, timeout = 2000) => {
        return Promise.race([
          fetch(url, options),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Request timed out')), timeout))
        ]);
      };

      const response = await fetchWithTimeout(`${API_BASE_URL}/api/auth/profile`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!(response as Response).ok) {
        if ((response as Response).status === 401) {
          throw new Error('UNAUTHORIZED');
        }
        throw new Error(`HTTP error! status: ${(response as Response).status}`);
      }

      const data: ApiResponse = await (response as Response).json();
      if (!data.success || !data.data?.user) {
        throw new Error('Invalid response format');
      }

      // Save to cache for offline use
      await AsyncStorage.setItem('user', JSON.stringify(data.data.user));
      return data.data.user;
    } catch (error) {
      // Try to load from cache if fetch fails
      console.error('Error fetching profile, trying offline cache:', error);
      const cachedUser = await AsyncStorage.getItem('user');
      if (cachedUser) {
        return JSON.parse(cachedUser);
      }
      throw error;
    }
  },

  logout: async (): Promise<boolean> => {
    try {
      // Clear local storage
      await AsyncStorage.multiRemove(['token', 'user']);
      // Clear SQLite data
      const { clearAllData } = await import('@/utils/storage');
      await clearAllData();
      return true;
    } catch (error) {
      console.error('Error during logout:', error);
      return false;
    }
  },
};

const ProfileScreen = () => {
  const [userData, setUserData] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      setLoading(true);
      setError(null);

      const user = await AuthService.getProfile();
      setUserData(user);

    } catch (error: any) {
      console.error('Error loading user data:', error);

      if (error.message === 'UNAUTHORIZED') {
        // Token expired or invalid, redirect to login
        Alert.alert(
          'Session Expired',
          'Please login again',
          [{ text: 'OK', onPress: () => router.replace('/login/LoginScreen') }]
        );
        return;
      }

      setError(error.message || 'Failed to load user data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          try {
            const success = await AuthService.logout();
            if (success) {
              router.replace('/login/LoginScreen');
            } else {
              Alert.alert('Error', 'Logout failed. Please try again.');
            }
          } catch (error) {
            console.error('Logout error:', error);
            Alert.alert('Error', 'An error occurred during logout.');
          }
        },
      },
    ]);
  };

  const handleMyProfile = () => {
    router.push('/home/my-profile-screen');
  };

  const handleNotifications = () => {
    // Navigate to notifications (if implemented)
    router.push('/notification/notifications-manage');
  };

  const handleSettings = () => {
    router.push('/home/NotificationSettingsMenu');
  };

  const handleGoBack = () => {
    router.back();
  };

  const getInitials = (fullname: string) => {
    if (!fullname) return 'U';
    const names = fullname.trim().split(' ');
    return names.length >= 2
      ? `${names[0][0]}${names[1][0]}`.toUpperCase()
      : fullname[0].toUpperCase();
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('th-TH');
    } catch {
      return 'Invalid date';
    }
  };

  const formatPhoneNumber = (phone: string) => {
    if (!phone) return '-';
    // Remove all non-digit characters
    const cleaned = phone.replace(/\D/g, '');
    // Format as xxx-xxx-xxxx
    if (cleaned.length === 10) {
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    // If not 10 digits, return as is
    return phone;
  };

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#1a8e2d" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </SafeAreaView>
    );
  }

  // Error state
  if (error || !userData) {
    return (
      <SafeAreaView style={[styles.container, styles.centerContent]}>
        <View style={styles.errorContainer}>
          <View style={styles.errorIcon}>
            <Ionicons name="person-outline" size={32} color="#EF4444" />
          </View>
          <Text style={styles.errorTitle}>Profile Not Found</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <View style={styles.errorActions}>
            <TouchableOpacity style={styles.retryButton} onPress={loadUserData}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
              <Text style={styles.backButtonText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Success state
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleGoBack} style={styles.backIconContainer}>
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
        </View>

        {/* Profile Info */}
        <View style={styles.profileCard}>
          <View style={styles.profileRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getInitials(userData.fullname)}</Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.fullName}>{userData.fullname}</Text>
              <Text style={styles.email}>{userData.email}</Text>
              <Text style={styles.userId}>User ID: {userData.id}</Text>
              <Text style={styles.joinDate}>
                เป็นสมาชิกตั้งแต่: {formatDate(userData.created_at)}
              </Text>
            </View>
          </View>
        </View>

        {/* Additional Info Card */}
        {(userData.birth_date || userData.weight || userData.height || userData.gender || userData.phone) && (
          <View style={styles.infoCard}>
            <Text style={styles.infoCardTitle}>ข้อมูลส่วนตัว</Text>
            {userData.birth_date && (
              <View style={styles.infoRow}>
                <Ionicons name="calendar-outline" size={20} color="#6B7280" />
                <Text style={styles.infoLabel}>วันเกิด:</Text>
                <Text style={styles.infoValue}>{formatDate(userData.birth_date)}</Text>
              </View>
            )}
            {userData.weight && (
              <View style={styles.infoRow}>
                <Ionicons name="fitness-outline" size={20} color="#6B7280" />
                <Text style={styles.infoLabel}>น้ำหนัก:</Text>
                <Text style={styles.infoValue}>{userData.weight} กก.</Text>
              </View>
            )}
            {userData.height && (
              <View style={styles.infoRow}>
                <Ionicons name="resize-outline" size={20} color="#6B7280" />
                <Text style={styles.infoLabel}>ส่วนสูง:</Text>
                <Text style={styles.infoValue}>{userData.height} ซม.</Text>
              </View>
            )}
            <View style={styles.infoRow}>
              <Ionicons name="person-outline" size={20} color="#6B7280" />
              <Text style={styles.infoLabel}>เพศ:</Text>
              <Text style={styles.infoValue}>{userData.gender || '-'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="call-outline" size={20} color="#6B7280" />
              <Text style={styles.infoLabel}>เบอร์โทรศัพท์:</Text>
              <Text style={styles.infoValue}>{formatPhoneNumber(userData.phone || '')}</Text>
            </View>
          </View>
        )}

        {/* Menu */}
        <View style={styles.menuCard}>
          <TouchableOpacity style={styles.menuItem} onPress={handleMyProfile}>
            <View style={styles.menuIconContainer}>
              <Ionicons name="person-outline" size={20} color="#6B7280" />
            </View>
            <Text style={styles.menuText}>แก้ไขโปรไฟล์</Text>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, styles.menuItemBorder]}
            onPress={handleNotifications}
          >
            <View style={styles.menuIconContainer}>
              <Ionicons name="notifications-outline" size={20} color="#6B7280" />
            </View>
            <Text style={styles.menuText}>Notifications</Text>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, styles.menuItemBorder]}
            onPress={handleSettings}
          >
            <View style={styles.menuIconContainer}>
              <Ionicons name="settings-outline" size={20} color="#6B7280" />
            </View>
            <Text style={styles.menuText}>ตั้งค่าการแจ้งเตือน</Text>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
            <View style={[styles.menuIconContainer, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="log-out-outline" size={20} color="#EF4444" />
            </View>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        {/* API Info */}
        <View style={styles.apiInfo}>
          <Text style={styles.apiInfoText}>Connected to: {API_BASE_URL}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB'
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280'
  },
  errorContainer: {
    alignItems: 'center',
    paddingHorizontal: 32,
    maxWidth: 320
  },
  errorIcon: {
    width: 64,
    height: 64,
    backgroundColor: '#FEE2E2',
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8
  },
  errorMessage: {
    fontSize: 14,
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 24
  },
  errorActions: {
    width: '100%',
    gap: 12
  },
  retryButton: {
    backgroundColor: '#1a8e2d',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500'
  },
  backButton: {
    backgroundColor: '#6B7280',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500'
  },
  header: {
    backgroundColor: 'white',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  backIconContainer: {
    padding: 12,
    marginRight: 8,
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
    color: '#111827'
  },
  profileCard: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  avatar: {
    width: 64,
    height: 64,
    backgroundColor: '#1a8e2d',
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    color: 'white',
    fontSize: 20,
    fontWeight: '600'
  },
  profileInfo: {
    flex: 1
  },
  fullName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827'
  },
  email: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4
  },
  verificationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  verificationText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  userId: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2
  },
  joinDate: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  infoCard: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  infoCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 8,
    minWidth: 80,
  },
  infoValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
    marginLeft: 8,
  },
  menuCard: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16
  },
  menuItemBorder: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#F3F4F6'
  },
  menuIconContainer: {
    width: 32,
    height: 32,
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#111827'
  },
  logoutText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#EF4444'
  },
  apiInfo: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 32,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#EBF8FF',
    borderRadius: 8,
    alignItems: 'center',
  },
  apiInfoText: {
    fontSize: 12,
    color: '#1E40AF',
    textAlign: 'center',
    fontWeight: '500'
  },
});

export default ProfileScreen;