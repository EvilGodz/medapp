import { Medicine } from '../types/medicine';
import api from './api';

export const medicinesAPI = {
  //name
  search: async (name: string, userId?: string): Promise<Medicine[]> => {
    const params = new URLSearchParams();
    params.set('name', name);
    if (userId) params.set('userId', userId);
    const res = await api.get(`/medicines/search?${params.toString()}`);
    return res.data;
  },
  //userid or null
  list: async (userId?: string): Promise<Medicine[]> => {
    const qs = userId ? `?userId=${encodeURIComponent(userId)}` : '';
    const res = await api.get(`/medicines${qs}`);
    return res.data;
  },
  // เพิ่มยาใหม่
  create: async (data: { medicine_name: string; section_3_1_dosage?: string; userId?: string; medicine_category?: string ; section_4_precautions?: string }) => {
    const res = await api.post('/medicines', data);
    return res.data;
  },
  // ลบยา
  delete: async (id: string) => {
    const res = await api.delete(`/medicines/${id}`);
    return res.data;
  },
  // แก้ไขยา
  update: async (id: string, data: { medicine_name: string; section_3_1_dosage?: string; medicine_category?: string; section_4_precautions?: string }) => {
    const res = await api.put(`/medicines/${id}`, data);
    return res.data;
  },
  // ดึงข้อมูลยาตาม id
  getById: async (id: string) => {
    const res = await api.get(`/medicines/${id}`);
    return res.data;
  }
};
