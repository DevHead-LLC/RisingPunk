import React, { useState } from 'react';
import { CloseButton } from '../components/common/CloseButton';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
} from 'react-native';
import { Balance } from '../components/common/Balance';
import { useBots } from '../context/BotsContext';
import { useBalance } from '../context/BalanceContext';

type BotType = 'breacher' | 'guardian' | 'phreak';

export function BotAssemblyScreen({ onClose }: { onClose: () => void }): React.JSX.Element {
  const { balance } = useBalance();
  const { botCounts, buildingProgress, selectedType, selectBotType, startBuilding } = useBots();
  const [quantity, setQuantity] = useState('1');

  const BOT_COST = 1;

  const handleBuild = () => {
    if (!selectedType) return;
    
    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) return;
    
    if (!balance) return;
    const totalCost = BOT_COST * qty;
    if (totalCost > balance) return;

    startBuilding(selectedType, qty);
  };

  return (
    <SafeAreaView style={styles.container}>
      <CloseButton onPress={onClose} />
      <View style={styles.header}>
        <Balance />
        <Text style={styles.title}>BOT_ASSEMBLY</Text>
      </View>
      
      <View style={styles.content}>
        <View style={styles.botTypes}>
          {(['breacher', 'guardian', 'phreak'] as BotType[]).map((type) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.botTypeButton,
                selectedType === type && styles.selectedBotType,
              ]}
              onPress={() => selectBotType(type)}
            >
              <Text style={styles.botTypeText}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </Text>
              <Text style={styles.botCount}>Owned: {botCounts[type]}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.buildControls}>
          <TextInput
            style={styles.input}
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="numeric"
            placeholder="Quantity"
            placeholderTextColor="#666"
          />
          <TouchableOpacity 
            style={[
              styles.buildButton,
              (!selectedType || buildingProgress !== null) && styles.buildButtonDisabled
            ]}
            onPress={handleBuild}
            disabled={!selectedType || buildingProgress !== null}
          >
            <Text style={styles.buildButtonText}>
              Build ({BOT_COST * parseInt(quantity || '0')} credits)
            </Text>
          </TouchableOpacity>
        </View>

        {buildingProgress !== null && (
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${buildingProgress}%` }]} />
            <Text style={styles.progressText}>{Math.round(buildingProgress)}%</Text>
          </View>
        )}
      </View>
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
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 80,
    paddingBottom: 10,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
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
  botTypes: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  botTypeButton: {
    padding: 15,
    borderRadius: 8,
    backgroundColor: '#2c3e50',
    width: '30%',
    alignItems: 'center',
  },
  selectedBotType: {
    backgroundColor: '#4a90e2',
  },
  botTypeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  botCount: {
    color: '#aaa',
    fontSize: 12,
    marginTop: 5,
  },
  buildControls: {
    width: '80%',
    alignItems: 'center',
  },
  input: {
    width: '100%',
    height: 40,
    backgroundColor: '#1a1a1a',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#4a90e2',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 20,
  },
  buildButton: {
    backgroundColor: '#4a90e2',
    padding: 15,
    borderRadius: 5,
    width: '100%',
    alignItems: 'center',
  },
  buildButtonDisabled: {
    backgroundColor: '#2c3e50',
  },
  buildButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  progressBar: {
    width: '80%',
    height: 20,
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    marginTop: 20,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4a90e2',
  },
  progressText: {
    position: 'absolute',
    width: '100%',
    textAlign: 'center',
    color: '#fff',
    fontSize: 12,
    lineHeight: 20,
  },
}); 