type ToggleMedRemind = { id: string; reminderEnabled: number };
import { medRemindAPI } from '@/utils/api';
import { addToMedRemindDeleteOutbox, addToMedRemindToggleOutbox, addToMedRemindUpdateOutbox } from '@/utils/outbox';
import { deleteMedRemind, getMedReminds, toggleMedRemindEnabled, updateMedRemind } from '@/utils/storage';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, Platform, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function NotificationsManagerScreen() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editData, setEditData] = useState<any | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);
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
            // 1s timeout for delete
            await Promise.race([
              deleteMedRemind(id),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout deleting')), 1000))
            ]);
          } catch (e) {
            // If offline or failed, queue in outbox
            await addToMedRemindDeleteOutbox(id);
          }
          loadNotifications();
        }
      }
    ]);
  };

  // In-place edit modal logic
  const handleEdit = (id: string) => {
    const med = notifications.find((n) => n.id === id);
    if (med) {
      setEditData({ ...med });
      setEditModalVisible(true);
    }
  };

  const handleEditSave = async () => {
    if (!editData) return;
    setEditSubmitting(true);
    try {
      // Update local DB immediately for UX
      await updateMedRemind(editData.id, editData);
      // Try to sync to backend, queue to outbox if fails (1s timeout)
      let apiSynced = false;
      try {
        await Promise.race([
          updateMedRemind(editData.id, editData),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout updating')), 1000))
        ]);
        apiSynced = true;
      } catch (e) {
        await addToMedRemindUpdateOutbox(editData.id, editData);
        apiSynced = false;
      }
      setEditModalVisible(false);
      setEditData(null);
      loadNotifications();
      Alert.alert(
        apiSynced ? 'สำเร็จ' : 'บันทึกแบบออฟไลน์',
        apiSynced ? 'แก้ไขข้อมูลสำเร็จ' : 'แก้ไขข้อมูลแบบออฟไลน์ จะซิงค์เมื่อออนไลน์'
      );
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleEditChange = (field: string, value: any) => {
    setEditData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleToggleReminder = async (item: any) => {
    const newValue = item.reminderEnabled ? 0 : 1;
    // Update local DB immediately for UX
    await toggleMedRemindEnabled(item.id, !!newValue);
    // Try to sync to backend, queue to toggle outbox if fails (1s timeout)
    try {
      await Promise.race([
        medRemindAPI.toggle(item.id, newValue),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout updating')), 1000))
      ]);
      // Wait 500ms to ensure API call is sent before UI refresh
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (e) {
      await addToMedRemindToggleOutbox(item.id, newValue);
    }
    loadNotifications();
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.info}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.detail}>{item.dosage} | {item.frequency || ''}</Text>
        <Text style={styles.detail}>เริ่ม: {item.startDate ? new Date(item.startDate).toLocaleDateString() : '-'}</Text>
      </View>
      <View style={styles.actions}>
        <Switch
          value={!!item.reminderEnabled}
          onValueChange={() => handleToggleReminder(item)}
          trackColor={{ false: '#ddd', true: '#1a8e2d' }}
          thumbColor={Platform.OS === 'android' ? (item.reminderEnabled ? '#1a8e2d' : '#f4f3f4') : ''}
          style={{ marginRight: 8 }}
        />
        <TouchableOpacity style={styles.actionBtn} onPress={() => handleEdit(item.id)}>
          <Ionicons name="create-outline" size={22} color="#1976D2" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(item.id)}>
          <Ionicons name="trash-outline" size={22} color="#C2185B" />
        </TouchableOpacity>
      </View>
    </View>
  );
  const handleGoBack = () => {
      router.back();
    };

  return (
    
    <View style={styles.container}>
      {/* Header */}
            <View style={styles.headerBack}>
              <TouchableOpacity onPress={handleGoBack} style={styles.backIconContainer}>
                <Ionicons name="arrow-back" size={24} color="#374151" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Profile</Text>
            </View>
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

      {/* Edit Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>แก้ไขการแจ้งเตือน</Text>
            {editData && (
              <>
                {/* reminderEnabled switch OUTSIDE modal content */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 18, alignSelf: 'center' }}>
                  <Text style={{ marginRight: 8, fontSize: 16 }}>เปิดแจ้งเตือน</Text>
                  <Switch
                    value={!!editData.reminderEnabled}
                    onValueChange={val => handleEditChange('reminderEnabled', val)}
                    trackColor={{ false: '#ddd', true: '#1a8e2d' }}
                    thumbColor={Platform.OS === 'android' ? (editData.reminderEnabled ? '#1a8e2d' : '#f4f3f4') : ''}
                  />
                </View>
                <TextInput
                  style={styles.input}
                  value={editData.name}
                  onChangeText={text => handleEditChange('name', text)}
                  placeholder="ชื่อยา"
                />
                <TextInput
                  style={styles.input}
                  value={editData.dosage}
                  onChangeText={text => handleEditChange('dosage', text)}
                  placeholder="ขนาดยา"
                />
                <TextInput
                  style={styles.input}
                  value={editData.duration}
                  onChangeText={text => handleEditChange('duration', text)}
                  placeholder="ระยะเวลา"
                />
                {/* mealTiming as dropdown */}
                <View style={{ marginBottom: 12 }}>
                  <Text style={{ marginBottom: 4, fontSize: 15 }}>เวลากับมื้ออาหาร</Text>
                  <View style={{ borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 10, backgroundColor: '#fafafa' }}>
                    <Picker
                      selectedValue={editData.mealTiming}
                      onValueChange={val => handleEditChange('mealTiming', val)}
                      style={{ height: 50 }}
                    >
                      <Picker.Item label="ก่อนอาหาร" value="ก่อนอาหาร" />
                      <Picker.Item label="หลังอาหาร" value="หลังอาหาร" />
                      <Picker.Item label="ระหว่างอาหาร" value="ระหว่างอาหาร" />
                      <Picker.Item label="หลังอาหารทันที" value="หลังอาหารทันที" />
                      <Picker.Item label="ไม่ระบุ" value="ไม่ระบุ" />
                    </Picker>
                  </View>
                </View>
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.saveButton, editSubmitting && styles.saveButtonDisabled]}
                    onPress={handleEditSave}
                    disabled={editSubmitting}
                  >
                    <Text style={styles.saveButtonText}>{editSubmitting ? 'กำลังบันทึก...' : 'บันทึก'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => setEditModalVisible(false)}
                    disabled={editSubmitting}
                  >
                    <Text style={styles.cancelButtonText}>ยกเลิก</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
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
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    alignItems: 'stretch',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a8e2d',
    marginBottom: 18,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
    backgroundColor: '#fafafa',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  saveButton: {
    backgroundColor: '#1a8e2d',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 16,
  },
  cancelButton: {
    backgroundColor: '#e0e0e0',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    flex: 1,
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: '700',
    fontSize: 16,
  },
    headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827'
  },
  headerBack: {
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
    padding: 4,
    marginRight: 12
  },
});
