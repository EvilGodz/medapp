import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from "expo-router";
import React, { useEffect, useState } from 'react';
import { Image, Modal, Platform, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';

export interface NotificationSettings {
  sound: boolean;
  vibrate: boolean;
  showImage: boolean;
}

interface Props {
  settings?: NotificationSettings;
  onChange?: (settings: NotificationSettings) => void;
}

const router = useRouter();
const defaultSettings: NotificationSettings = { sound: true, vibrate: true, showImage: false };

const NotificationSettingsMenu: React.FC<Props> = ({ settings = defaultSettings, onChange = () => { } }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [editData, setEditData] = useState<NotificationSettings>(settings || defaultSettings);
  const [submitting, setSubmitting] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Load settings from AsyncStorage on mount
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem('notification_settings');
        if (saved) {
          setEditData(JSON.parse(saved));
        }
      } catch { }
      setLoaded(true);
    })();
  }, []);

  const openModal = async () => {
    try {
      const saved = await AsyncStorage.getItem('notification_settings');
      if (saved) {
        setEditData(JSON.parse(saved));
      } else {
        setEditData(settings || defaultSettings);
      }
    } catch {
      setEditData(settings || defaultSettings);
    }
    setModalVisible(true);
  };
  const handleSave = async () => {
    setSubmitting(true);
    try {
      await AsyncStorage.setItem('notification_settings', JSON.stringify(editData));
    } catch { }
    setTimeout(() => {
      onChange(editData);
      setModalVisible(false);
      setSubmitting(false);
    }, 400);
  };
  const handleChange = (field: keyof NotificationSettings, value: boolean) => {
    setEditData(prev => ({ ...prev, [field]: value }));
  };
  const handleGoBack = () => {
    router.back();
  };

  return (
    <>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backIconContainer}>
          <Ionicons name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>
      <TouchableOpacity style={styles.card} onPress={openModal} activeOpacity={0.85}>
        <Text style={styles.title}>ตั้งค่าการแจ้งเตือน</Text>
        <Text style={{ color: '#888', fontSize: 15 }}>
          {(editData.sound ? 'เสียงเปิด' : 'เสียงปิด')} | {(editData.vibrate ? 'สั่นเปิด' : 'สั่นปิด')} | {(editData.showImage ? 'แสดงภาพ' : 'ไม่แสดงภาพ')}
        </Text>
      </TouchableOpacity>
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>ตั้งค่าการแจ้งเตือน</Text>
            <View style={styles.row}>
              <Text style={styles.label}>เสียง</Text>
              <Switch
                value={!!editData.sound}
                onValueChange={v => handleChange('sound', v)}
                trackColor={{ false: '#ddd', true: '#1a8e2d' }}
                thumbColor={Platform.OS === 'android' ? (editData.sound ? '#1a8e2d' : '#f4f3f4') : ''}
              />
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>สั่น</Text>
              <Switch
                value={!!editData.vibrate}
                onValueChange={v => handleChange('vibrate', v)}
                trackColor={{ false: '#ddd', true: '#1a8e2d' }}
                thumbColor={Platform.OS === 'android' ? (editData.vibrate ? '#1a8e2d' : '#f4f3f4') : ''}
              />
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>แสดงภาพ</Text>
              <Switch
                value={!!editData.showImage}
                onValueChange={v => handleChange('showImage', v)}
                trackColor={{ false: '#ddd', true: '#1a8e2d' }}
                thumbColor={Platform.OS === 'android' ? (editData.showImage ? '#1a8e2d' : '#f4f3f4') : ''}
              />
              {editData.showImage && (
                <Image source={require('../../assets/images/icon.png')} style={styles.icon} />
              )}
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.saveButton, submitting && styles.saveButtonDisabled]}
                onPress={handleSave}
                disabled={submitting}
              >
                <Text style={styles.saveButtonText}>{submitting ? 'กำลังบันทึก...' : 'บันทึก'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setModalVisible(false)}
                disabled={submitting}
              >
                <Text style={styles.cancelButtonText}>ยกเลิก</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};


const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 18,
    marginHorizontal: 16,
    marginTop: 16,
    flexDirection: 'column',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1a8e2d',
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  label: {
    fontSize: 15,
    color: '#333',
  },
  icon: {
    width: 32,
    height: 32,
    marginLeft: 10,
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
    padding: 4,
    marginRight: 12
  },
});

export default NotificationSettingsMenu;
