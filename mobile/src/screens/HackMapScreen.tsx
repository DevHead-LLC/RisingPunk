import React, {memo, useState, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { CloseButton } from '../components/common/CloseButton';

const GRID_SIZE = 20;
const CELL_SIZE = 60;
const TOTAL_SIZE = GRID_SIZE * CELL_SIZE;
const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;

const GridCell = memo(({ x, y, content, onPress }: { 
  x: number; 
  y: number; 
  content: EntityInfo | null;
  onPress: () => void;
}) => (
  <TouchableOpacity style={styles.cell} onPress={onPress}>
    {content && (
      <Icon 
        name={content.type === 'player' ? 'account-circle' : 'desktop-tower-monitor'} 
        size={30} 
        color={content.type === 'player' ? '#00ff00' : '#ff0000'}
      />
    )}
  </TouchableOpacity>
));

type EntityInfo = {
  type: 'player' | 'npc' | null;
  name: string;
  details: string;
};

export function HackMapScreen({ onClose }: { onClose: () => void }): React.JSX.Element {
  const [playerPos] = useState({ x: 10, y: 10 });
  const [npcs] = useState([
    { x: 8, y: 8, name: 'Terminal #127', details: 'Basic security terminal' },
    { x: 12, y: 12, name: 'Node #445', details: 'High-security node' },
    { x: 15, y: 7, name: 'Storage #892', details: 'Data storage unit' },
  ]);
  const [selectedInfo, setSelectedInfo] = useState<{
    coords: string;
    entity: EntityInfo | null;
  } | null>(null);
  
  const scrollViewRef = useRef<ScrollView>(null);

  const getCellContent = (x: number, y: number): EntityInfo | null => {
    if (playerPos.x === x && playerPos.y === y) {
      return {
        type: 'player',
        name: 'You',
        details: 'Your current position in the network',
      };
    }
    
    const npc = npcs.find(n => n.x === x && n.y === y);
    if (npc) {
      return {
        type: 'npc',
        name: npc.name,
        details: npc.details,
      };
    }
    
    return null;
  };

  const handleCellPress = (x: number, y: number) => {
    const entity = getCellContent(x, y);
    setSelectedInfo({
      coords: `${x}, ${y}`,
      entity,
    });
  };

  return (
    <View style={styles.container}>
      <CloseButton onPress={onClose} />
      
      {selectedInfo && (
        <View style={styles.coordsDisplay}>
          <Text style={styles.coordsText}>Location: {selectedInfo.coords}</Text>
          {selectedInfo.entity && (
            <>
              <Text style={styles.entityName}>{selectedInfo.entity.name}</Text>
              <Text style={styles.entityDetails}>{selectedInfo.entity.details}</Text>
            </>
          )}
        </View>
      )}

      <ScrollView
        ref={scrollViewRef}
        horizontal={true}
        directionalLockEnabled={false}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        contentContainerStyle={{
          width: TOTAL_SIZE,
          height: TOTAL_SIZE,
        }}
      >
        <View style={styles.grid}>
          {Array.from({ length: GRID_SIZE }).map((_, y) => (
            <View key={y} style={styles.row}>
              {Array.from({ length: GRID_SIZE }).map((_, x) => (
                <GridCell
                  key={`${x}-${y}`}
                  x={x}
                  y={y}
                  content={getCellContent(x, y)}
                  onPress={() => handleCellPress(x, y)}
                />
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollContainer: {
    flexGrow: 1,
  },
  grid: {
    padding: 20,
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderWidth: 1,
    borderColor: '#2c3e50',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a0a0a',
  },
  backButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4a90e2',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  coordsDisplay: {
    position: 'absolute',
    top: 20,
    left: 20,
    backgroundColor: '#1a1a1a',
    padding: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#4a90e2',
    zIndex: 1,
    minWidth: 200,
  },
  coordsText: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 4,
  },
  entityName: {
    color: '#4a90e2',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 4,
  },
  entityDetails: {
    color: '#808080',
    fontSize: 14,
    marginTop: 2,
  },
}); 