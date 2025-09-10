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
  }
};
