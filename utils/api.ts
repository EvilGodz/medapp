import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthResponse, ApiResponse, User } from '../types/types';

// ใช้ IP address จาก ipconfig ของคุณ
const API_BASE_URL = 'http://192.168.1.55:3000/api';

const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// เพิ่ม token ใน header สำหรับ request ที่ต้องการ authentication
api.interceptors.request.use(
  async (config: AxiosRequestConfig) => {
    const token = await AsyncStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// API response interceptor for handling common errors
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // Handle 401 errors (unauthorized)
    if (error.response?.status === 401) {
      // Token might be expired, redirect to login
      AsyncStorage.multiRemove(['token', 'user']);
    }
    return Promise.reject(error);
  }
);

interface SignupData {
  fullname: string;
  email: string;
  password: string;
  birth_date?: string | null;
  weight?: number | null;
  height?: number | null;
}

// API functions
export const authAPI = {
  // สมัครสมาชิก
  signup: async (userData: SignupData): Promise<AuthResponse> => {
    try {
      const response = await api.post<AuthResponse>('/auth/signup', userData);
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error.message;
    }
  },

  // เข้าสู่ระบบ
  login: async (email: string, password: string): Promise<AuthResponse> => {
    try {
      const response = await api.post<AuthResponse>('/auth/login', { email, password });
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error.message;
    }
  },

  // ดึงข้อมูลผู้ใช้
  getProfile: async (): Promise<ApiResponse<{ user: User }>> => {
    try {
      const response = await api.get<ApiResponse<{ user: User }>>('/auth/profile');
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error.message;
    }
  },

  // ส่งอีเมลยืนยันใหม่
  resendVerification: async (email: string): Promise<ApiResponse> => {
    try {
      const response = await api.post<ApiResponse>('/auth/resend-verification', { email });
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error.message;
    }
  },

  // ยืนยันอีเมล
  verifyEmail: async (token: string): Promise<AuthResponse> => {
    try {
      const response = await api.get<AuthResponse>(`/auth/verify-email/${token}`);
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error.message;
    }
  },

  // อัปเดตข้อมูลผู้ใช้
  updateProfile: async (userData: Partial<User>): Promise<ApiResponse<{ user: User }>> => {
    try {
      const response = await api.put<ApiResponse<{ user: User }>>('/auth/profile', userData);
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error.message;
    }
  },

  // เปลี่ยนรหัสผ่าน
  changePassword: async (currentPassword: string, newPassword: string): Promise<ApiResponse> => {
    try {
      const response = await api.post<ApiResponse>('/auth/change-password', {
        currentPassword,
        newPassword
      });
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error.message;
    }
  },

  // ลบบัญชี
  deleteAccount: async (): Promise<ApiResponse> => {
    try {
      const response = await api.delete<ApiResponse>('/auth/account');
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error.message;
    }
  }
};

export default api;