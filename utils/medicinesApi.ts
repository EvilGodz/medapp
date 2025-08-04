import api from './api';
import { Medicine } from '../types/medicine';

export const medicinesAPI = {
  // Search medicines by name
  search: async (name: string): Promise<Medicine[]> => {
    const res = await api.get(`/medicines/search?name=${encodeURIComponent(name)}`);
    return res.data;
  },
  // Add more CRUD methods as needed
};
