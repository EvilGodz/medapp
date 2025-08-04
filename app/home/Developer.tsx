import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Link } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { DropDatabase, initDatabase } from '../../utils/database';

export default function DeveloperScreen() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleInitDatabase = async () => {
    setLoading(true);
    setMessage(null);
    try {
      await DropDatabase();
      await initDatabase();
      setMessage('Database initialized successfully!');
      Alert.alert('Success', 'Database initialized successfully!');
    } catch (error) {
      setMessage('Error initializing database.');
      Alert.alert('Error', 'Failed to initialize database.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#1a8e2d", "#146922"]}
        style={styles.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      />
      <View style={styles.contentCard}>
        <Text style={styles.title}>Developer Page</Text>
        <Text style={styles.subtitle}>This is a placeholder for developer tools and information.</Text>
        <View style={{ marginTop: 32, width: '100%', alignItems: 'center' }}>
          <TouchableOpacity
            style={[styles.greenButton, loading && styles.greenButtonDisabled]}
            onPress={handleInitDatabase}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.greenButtonText}>Init Database</Text>
            )}
          </TouchableOpacity>
        </View>
        {message && <Text style={styles.message}>{message}</Text>}
      </View>

      <View style={styles.bottomNav}>
                <Link href="/test/EmailVerificationScreen" asChild>
                    <TouchableOpacity style={styles.navItem}>
                        <Ionicons name="home" size={24} color="#1a8e2d" />
                        <Text style={styles.navLabel}>EmailVerificationScreen</Text>
                    </TouchableOpacity>
                </Link>
                <Link href="/test/EmailVerifiedScreen" asChild>
                    <TouchableOpacity style={styles.navItem}>
                        <Ionicons name="add-circle" size={28} color="#2E7D32" />
                        <Text style={styles.navLabel}>EmailVerifiedScreen</Text>
                    </TouchableOpacity>
                </Link>
                <Link href="/test/HomeScreen" asChild>
                    <TouchableOpacity style={styles.navItem}>
                        <Ionicons name="calendar" size={24} color="#1976D2" />
                        <Text style={styles.navLabel}>HomeScreen</Text>
                    </TouchableOpacity>
                </Link>
                <Link href="/test/LoginScreen" asChild>
                    <TouchableOpacity style={styles.navItem}>
                        <Ionicons name="time" size={24} color="#C2185B" />
                        <Text style={styles.navLabel}>LoginScreen</Text>
                    </TouchableOpacity>
                </Link>
                <Link href="/test/SignupScreen" asChild>
                    <TouchableOpacity style={styles.navItem}>
                        <Ionicons name="code-slash" size={24} color="#888" />
                        <Text style={styles.navLabel}>SignupScreen</Text>
                    </TouchableOpacity>
                </Link>
            </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: Platform.OS === 'ios' ? 140 : 120,
    zIndex: 0,
  },
  contentCard: {
    marginTop: Platform.OS === 'ios' ? 80 : 60,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 28,
    width: '88%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    zIndex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#1a8e2d',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
  },
  message: {
    marginTop: 20,
    fontSize: 16,
    color: '#1a8e2d',
    fontWeight: '600',
    textAlign: 'center',
  },
  greenButton: {
    backgroundColor: '#1a8e2d',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 32,
    minWidth: 160,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 1,
  },
  greenButtonDisabled: {
    opacity: 0.6,
  },
  greenButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: 60,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderColor: '#eee',
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 8,
},
navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
},
navLabel: {
    fontSize: 12,
    color: '#333',
    marginTop: 2,
},
}); 