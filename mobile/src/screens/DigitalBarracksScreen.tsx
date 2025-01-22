import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Balance } from '../components/common/Balance';
import { CloseButton } from '../components/common/CloseButton';
import { useBots } from '../context/BotsContext';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config';
import { SIZING } from '../styles/theme';
import { COLORS } from '../styles/theme';

export function DigitalBarracksScreen({ onClose }: { onClose: () => void }): React.JSX.Element {
  const { botCounts } = useBots();
  const { token } = useAuth();

  const testBotModel = async () => {
    try {
      // Test POST endpoint
      const response = await fetch(`${API_URL}/api/bots/test`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      console.log('Bot test response:', data);

      // Get bot counts
      const countsResponse = await fetch(`${API_URL}/api/bots`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const counts = await countsResponse.json();
      console.log('Bot counts:', counts);
    } catch (error) {
      console.error('Bot test error:', error);
    }
  };

  const BotStatCard = ({ type, count }: { type: string; count: number }) => (
    <View style={styles.statCard}>
      <Text style={styles.botType}>{type}</Text>
      <Text style={styles.botCount}>{count}</Text>
      <View style={styles.botDetails}>
        <Text style={styles.detailText}>Available: {count}</Text>
        <Text style={styles.detailText}>Deployed: 0</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <CloseButton onPress={onClose} />
      <View style={styles.header}>
        <Balance />
      </View>

      <TouchableOpacity 
        style={styles.testButton} 
        onPress={testBotModel}
      >
        <Text style={styles.testButtonText}>Test Bot Model</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Digital Barracks</Text>
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.statsContainer}>
          <BotStatCard type="Breacher" count={botCounts.breacher} />
          <BotStatCard type="Guardian" count={botCounts.guardian} />
          <BotStatCard type="Phreak" count={botCounts.phreak} />
        </View>

        <View style={styles.totalContainer}>
          <Text style={styles.totalLabel}>Total Army Size:</Text>
          <Text style={styles.totalCount}>
            {Object.values(botCounts).reduce((a, b) => a + b, 0)}
          </Text>
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
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 20,
  },
  scrollContent: {
    flexGrow: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
    padding: 20,
  },
  statCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    padding: 15,
    width: '45%',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#4a90e2',
    minHeight: 120,
  },
  botType: {
    color: '#4a90e2',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  botCount: {
    color: '#00ff00',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  botDetails: {
    borderTopWidth: 1,
    borderTopColor: '#333',
    paddingTop: 10,
  },
  detailText: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 5,
  },
  totalContainer: {
    backgroundColor: '#1a1a1a',
    padding: 20,
    margin: 20,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#4a90e2',
  },
  totalLabel: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  totalCount: {
    color: '#00ff00',
    fontSize: 24,
    fontWeight: 'bold',
  },
  testButton: {
    backgroundColor: '#4717F6',
    padding: SIZING.spacing.sm,
    borderRadius: 4,
    alignSelf: 'center',
    marginVertical: SIZING.spacing.md,
  },
  testButtonText: {
    color: COLORS.text.primary,
    fontSize: SIZING.font.small,
  },
}); 