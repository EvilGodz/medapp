import { deleteMedRemind, getMedReminds } from '@/utils/storage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function NotificationsManagerScreen() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const data = await getMedReminds();
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const filtered = data.filter((item) => {
        // Check duration (not expired)
        if (!item.startDate || !item.duration) return true;
        if (/(ongoing|ต่อเนื่อง)/i.test(item.duration)) return true;
        const match = item.duration.match(/(\d+)/);
        if (!match) return true;
        const days = parseInt(match[1], 10);
        const start = new Date(item.startDate);
        const end = new Date(start.getTime() + days * 24 * 60 * 60 * 1000);
        return now < end;
      });
      setNotifications(filtered);
    } catch (e) {
      Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถโหลดข้อมูลแจ้งเตือนได้');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleDelete = (id: string) => {
    Alert.alert('ลบแจ้งเตือน', 'คุณต้องการลบแจ้งเตือนนี้หรือไม่?', [
      { text: 'ยกเลิก', style: 'cancel' },
      {
        text: 'ลบ', style: 'destructive', onPress: async () => {
          try {
            await deleteMedRemind(id);
            loadNotifications();
          } catch (e) {
            Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถลบแจ้งเตือนได้');
          }
        }
      }
    ]);
  };

  const handleEdit = (id: string) => {
    router.push({ pathname: '/notification/add', params: { editId: id } });
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.info}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.detail}>{item.dosage} | {item.frequency || ''}</Text>
        <Text style={styles.detail}>เริ่ม: {item.startDate ? new Date(item.startDate).toLocaleDateString() : '-'}</Text>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => handleEdit(item.id)}>
          <Ionicons name="create-outline" size={22} color="#1976D2" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(item.id)}>
          <Ionicons name="trash-outline" size={22} color="#C2185B" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>จัดการการแจ้งเตือน</Text>
      {loading ? (
        <ActivityIndicator size="large" color="#1a8e2d" style={{ marginTop: 40 }} />
      ) : notifications.length === 0 ? (
        <Text style={{ textAlign: 'center', color: '#888', marginTop: 40 }}>ไม่มีการแจ้งเตือน</Text>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a8e2d',
    textAlign: 'center',
    marginTop: 30,
    marginBottom: 10,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 18,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 17,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  detail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 1,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
  },
  actionBtn: {
    marginLeft: 8,
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#f3f3f3',
  },
});
