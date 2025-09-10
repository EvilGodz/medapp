// types.ts - Type definitions for the app

export interface User {
  id: string;
  fullname: string;
  email: string;
  birth_date?: string;
  weight?: number;
  height?: number;
  created_at: string;
  updated_at: string;
  email_verified: boolean;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data?: {
    token: string;
    user: User;
  };
  emailVerified?: boolean;
  email?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
}

export interface SignupFormData {
  fullname: string;
  email: string;
  password: string;
  confirmPassword: string;
  birth_date: string;
  weight: string;
  height: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface NavigationProps {
  navigation: any; // You can replace with proper React Navigation types
  route?: any;
}

export interface RouteParams {
  email?: string;
  fullname?: string;
  token?: string;
}