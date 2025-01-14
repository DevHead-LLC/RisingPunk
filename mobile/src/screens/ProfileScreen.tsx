import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
} from 'react-native';

export function ProfileScreen({ onClose }: { onClose: () => void }): React.JSX.Element {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onClose}>
          <Text style={styles.backButtonText}>×</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Profile</Text>
        <View style={styles.profileCard}>
          <Text style={styles.label}>Username</Text>
          <Text style={styles.value}>CyberRunner</Text>
          
          <Text style={styles.label}>Reputation</Text>
          <Text style={styles.value}>Rookie Hacker</Text>
          
          <Text style={styles.label}>Network Level</Text>
          <Text style={styles.value}>1</Text>

          <Text style={styles.sectionTitle}>Stats</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Total Bots</Text>
              <Text style={styles.statValue}>0</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Successful Hacks</Text>
              <Text style={styles.statValue}>0</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: '#4a90e2',
  },
  backButtonText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  profileCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    padding: 20,
    borderWidth: 1,
    borderColor: '#2ecc71',
  },
  label: {
    color: '#2ecc71',
    fontSize: 14,
    marginBottom: 5,
  },
  value: {
    color: '#fff',
    fontSize: 18,
    marginBottom: 20,
  },
  sectionTitle: {
    color: '#2ecc71',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 15,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    width: '48%',
    backgroundColor: '#000',
    padding: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#2ecc71',
  },
  statLabel: {
    color: '#2ecc71',
    fontSize: 12,
    marginBottom: 5,
  },
  statValue: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40, // Extra padding at bottom for scroll space
  },
}); 