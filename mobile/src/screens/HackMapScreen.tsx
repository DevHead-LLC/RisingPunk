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

const GRID_SIZE = 50;
const CELL_SIZE = 60;
const TOTAL_SIZE = GRID_SIZE * CELL_SIZE;
const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;

type TerrainType = 'plain' | 'mountain' | 'water' | 'forest';
type EntityType = 'empty' | 'player' | 'npc' | 'house';

const FRIENDLY_NAMES = [
  'Alpha', 'Beta', 'Gamma', 'Delta', 'Echo', 'Foxtrot',
  'Helix', 'Iris', 'Jupiter', 'Kilo', 'Lima', 'Matrix',
  'Nova', 'Omega', 'Pulse', 'Quantum', 'Razor', 'Sigma'
];

const HOSTILE_NAMES = [
  'Cipher', 'Shadow', 'Wraith', 'Phantom', 'Specter', 'Ghost',
  'Virus', 'Trojan', 'Malware', 'Breach', 'Havoc', 'Chaos',
  'Doom', 'Eclipse', 'Fang', 'Glitch', 'Hex', 'Inferno'
];

type CellData = {
  terrain: TerrainType;
  entity: EntityType;
  owner?: 'player' | 'enemy';
  name?: string;
};

type GridData = CellData[][];

const generateInitialGrid = (): GridData => {
  // Start with all plains
  const grid = Array(GRID_SIZE).fill(null).map(() =>
    Array(GRID_SIZE).fill(null).map((): CellData => ({
      terrain: 'plain',
      entity: 'empty'
    }))
  );

  // Generate forest clusters
  for (let i = 0; i < 5; i++) {
    const centerX = Math.floor(Math.random() * GRID_SIZE);
    const centerY = Math.floor(Math.random() * GRID_SIZE);
    const size = 3 + Math.floor(Math.random() * 4);

    for (let dy = -size; dy <= size; dy++) {
      for (let dx = -size; dx <= size; dx++) {
        const x = centerX + dx;
        const y = centerY + dy;
        if (x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE) {
          if (Math.random() < 0.7 && (dx * dx + dy * dy <= size * size)) {
            grid[y][x].terrain = 'forest';
          }
        }
      }
    }
  }

  // Generate mountain ranges
  for (let i = 0; i < 3; i++) {
    let x = Math.floor(Math.random() * GRID_SIZE);
    let y = Math.floor(Math.random() * GRID_SIZE);
    const length = 5 + Math.floor(Math.random() * 8);

    for (let j = 0; j < length; j++) {
      if (x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE) {
        grid[y][x].terrain = 'mountain';
        // Add some random adjacent mountains
        if (Math.random() < 0.4) {
          const adjY = y + (Math.random() < 0.5 ? 1 : -1);
          if (adjY >= 0 && adjY < GRID_SIZE) grid[adjY][x].terrain = 'mountain';
        }
      }
      // Move in a general direction
      x += Math.floor(Math.random() * 3) - 1;
      y += Math.floor(Math.random() * 3) - 1;
    }
  }

  // Generate rivers
  for (let i = 0; i < 2; i++) {
    let x = Math.floor(Math.random() * GRID_SIZE);
    let y = 0;
    while (y < GRID_SIZE) {
      if (x >= 0 && x < GRID_SIZE) {
        grid[y][x].terrain = 'water';
      }
      x += Math.floor(Math.random() * 3) - 1; // Meander left or right
      x = Math.max(0, Math.min(x, GRID_SIZE - 1)); // Keep within bounds
      y++;
    }
  }

  // Add player at 0,0
  grid[0][0] = {
    terrain: 'plain',
    entity: 'player',
    owner: 'player',
    name: 'YOU'
  };

  // Add other entities
  const addEntities = (entityType: 'player' | 'npc', owner: 'player' | 'enemy', count: number) => {
    const names = owner === 'player' ? FRIENDLY_NAMES : HOSTILE_NAMES;
    let placed = 0;
    while (placed < count) {
      const x = Math.floor(Math.random() * GRID_SIZE);
      const y = Math.floor(Math.random() * GRID_SIZE);
      
      if (grid[y][x].entity !== 'empty' || (x === 0 && y === 0)) {
        continue;
      }

      const name = names[Math.floor(Math.random() * names.length)];
      grid[y][x] = {
        ...grid[y][x],
        entity: entityType,
        owner: owner,
        name: name
      };
      placed++;
    }
  };

  addEntities('player', 'player', 8);
  addEntities('npc', 'enemy', 12);

  return grid;
};

const CellContent = memo(({ data }: { data: CellData }) => {
  return (
    <View style={[styles.cellContent, getTerrainStyle(data.terrain)]}>
      {getTerrainIcon(data.terrain)}
      {data.entity !== 'empty' && (
        <View style={styles.entityContainer}>
          <Text style={[
            styles.terrainSymbol,
            data.name === 'YOU' ? styles.playerSymbol : 
            data.owner === 'player' ? styles.friendlySymbol : 
            styles.hostileSymbol
          ]}>
            {data.name === 'YOU' ? '⚡' : data.owner === 'player' ? '◉' : '⊗'}
          </Text>
        </View>
      )}
    </View>
  );
});

export function HackMapScreen({ onClose }: { onClose: () => void }): React.JSX.Element {
  const [selectedCell, setSelectedCell] = useState<{x: number, y: number, info: CellData} | null>(null);
  const [gridData] = useState<GridData>(generateInitialGrid);
  const [isLegendExpanded, setIsLegendExpanded] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  
  const handleCellPress = (x: number, y: number, cellData: CellData) => {
    setSelectedCell({x, y, info: cellData});
  };

  const renderLegend = () => (
    <View style={[styles.legend, !isLegendExpanded && styles.legendCollapsed]}>
      <TouchableOpacity 
        style={styles.legendTitleContainer}
        onPress={() => setIsLegendExpanded(!isLegendExpanded)}
      >
        <Text style={styles.legendTitle}>
          {isLegendExpanded ? 'MAP LEGEND [-]' : 'LEGEND [+]'}
        </Text>
      </TouchableOpacity>
      {isLegendExpanded && (
        <View style={styles.legendItems}>
          <View style={styles.legendItem}>
            <Text style={[styles.terrainSymbol, styles.forestSymbol]}>♣</Text>
            <Text style={styles.legendText}>Forest</Text>
          </View>
          <View style={styles.legendItem}>
            <Text style={[styles.terrainSymbol, styles.waterSymbol]}>~</Text>
            <Text style={styles.legendText}>Water</Text>
          </View>
          <View style={styles.legendItem}>
            <Text style={[styles.terrainSymbol, styles.mountainSymbol]}>▲</Text>
            <Text style={styles.legendText}>Mountain</Text>
          </View>
          <View style={styles.legendItem}>
            <Text style={[styles.terrainSymbol, styles.friendlySymbol]}>◉</Text>
            <Text style={styles.legendText}>Friendly</Text>
          </View>
          <View style={styles.legendItem}>
            <Text style={[styles.terrainSymbol, styles.hostileSymbol]}>⊗</Text>
            <Text style={styles.legendText}>Hostile</Text>
          </View>
        </View>
      )}
    </View>
  );

  const renderInfoPanel = () => {
    if (!selectedCell) return null;
    
    return (
      <View style={styles.infoPanel}>
        <TouchableOpacity 
          style={styles.infoPanelClose}
          onPress={() => setSelectedCell(null)}
        >
          <Text style={styles.closeSymbol}>×</Text>
        </TouchableOpacity>
        <Text style={styles.coordsText}>
          GRID: ({selectedCell.x}, {selectedCell.y})
        </Text>
        <Text style={styles.terrainText}>
          TERRAIN: {selectedCell.info.terrain.toUpperCase()}
        </Text>
        {selectedCell.info.entity !== 'empty' && (
          <>
            <Text style={styles.entityText}>
              ENTITY: {selectedCell.info.name || 'UNKNOWN'}
            </Text>
            <Text style={[
              styles.statusText,
              selectedCell.info.owner === 'player' ? styles.friendlyText : styles.hostileText
            ]}>
              STATUS: {selectedCell.info.owner === 'player' ? 'FRIENDLY' : 'HOSTILE'}
            </Text>
          </>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <CloseButton onPress={onClose} />
      
      {renderLegend()}
      
      {renderInfoPanel()}

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
          {gridData.map((row, y) => (
            <View key={y} style={styles.row}>
              {row.map((cell, x) => (
                <TouchableOpacity
                  key={`${x}-${y}`}
                  style={[
                    styles.cell,
                    selectedCell?.x === x && selectedCell?.y === y && styles.selectedCell
                  ]}
                  onPress={() => handleCellPress(x, y, cell)}
                >
                  <View style={[styles.cellContent, getTerrainStyle(cell.terrain)]}>
                    {getTerrainIcon(cell.terrain)}
                    {cell.entity !== 'empty' && (
                      <View style={styles.entityContainer}>
                        <Text style={[
                          styles.terrainSymbol,
                          cell.name === 'YOU' ? styles.playerSymbol : 
                          cell.owner === 'player' ? styles.friendlySymbol : 
                          styles.hostileSymbol
                        ]}>
                          {cell.name === 'YOU' ? '⚡' : cell.owner === 'player' ? '◉' : '⊗'}
                        </Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const getTerrainIcon = (terrain: TerrainType) => {
  switch (terrain) {
    case 'water':
      return <Text style={[styles.terrainSymbol, styles.waterSymbol]}>~</Text>;
    case 'mountain':
      return <Text style={[styles.terrainSymbol, styles.mountainSymbol]}>▲</Text>;
    case 'forest':
      return <Text style={[styles.terrainSymbol, styles.forestSymbol]}>♣</Text>;
    default:
      return null;
  }
};

const getTerrainStyle = (terrain: TerrainType) => {
  switch (terrain) {
    case 'water':
      return styles.waterTerrain;
    case 'mountain':
      return styles.mountainTerrain;
    case 'forest':
      return styles.forestTerrain;
    default:
      return styles.plainTerrain;
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  grid: {
    backgroundColor: 'rgba(26, 77, 51, 0.1)',
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 65, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(26, 77, 51, 0.02)',
  },
  selectedCell: {
    backgroundColor: 'rgba(0, 255, 65, 0.1)',
    borderColor: 'rgba(0, 255, 65, 0.3)',
  },
  cellContent: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  plainTerrain: {
    backgroundColor: 'rgba(26, 77, 51, 0.05)',
    borderColor: 'rgba(0, 255, 65, 0.1)',
  },
  waterTerrain: {
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
    borderColor: 'rgba(33, 150, 243, 0.2)',
  },
  mountainTerrain: {
    backgroundColor: 'rgba(158, 158, 158, 0.1)',
    borderColor: 'rgba(158, 158, 158, 0.2)',
  },
  forestTerrain: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderColor: 'rgba(76, 175, 80, 0.2)',
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
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#00ff41',
    zIndex: 1,
  },
  coordsText: {
    color: '#00ff41',
    fontSize: 14,
    fontFamily: 'monospace',
  },
  entityName: {
    color: '#00ff41',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 8,
  },
  entityDetails: {
    color: 'rgba(0, 255, 65, 0.7)',
    fontSize: 12,
    marginTop: 4,
  },
  entityContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
  playerEntity: {
    backgroundColor: 'rgba(0, 255, 65, 0.1)',
  },
  enemyEntity: {
    backgroundColor: 'rgba(255, 65, 65, 0.1)',
  },
  infoPanel: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -100 }, { translateY: -50 }],
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#00ff41',
    zIndex: 2,
    minWidth: 200,
    paddingTop: 30,
  },
  terrainText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    marginBottom: 5,
  },
  entityText: {
    color: '#00ff41',
    fontSize: 14,
  },
  legend: {
    position: 'absolute',
    top: 20,
    left: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#00ff41',
    zIndex: 2,
  },
  legendCollapsed: {
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    padding: 10,
  },
  legendTitle: {
    color: '#00ff41',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  legendItems: {
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
  },
  statusText: {
    fontSize: 14,
    marginTop: 5,
  },
  friendlyText: {
    color: '#00ff41',
  },
  hostileText: {
    color: '#ff4141',
  },
  infoPanelClose: {
    position: 'absolute',
    top: 5,
    right: 10,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 3,
  },
  legendTitleContainer: {
    width: '100%',
    padding: 5,
  },
  terrainSymbol: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  waterSymbol: {
    color: 'rgba(33, 150, 243, 0.8)',
  },
  mountainSymbol: {
    color: 'rgba(158, 158, 158, 0.8)',
  },
  forestSymbol: {
    color: 'rgba(76, 175, 80, 0.8)',
  },
  friendlySymbol: {
    color: '#00ff41',
  },
  hostileSymbol: {
    color: '#ff4141',
  },
  closeSymbol: {
    color: '#00ff41',
    fontSize: 24,
    fontWeight: 'bold',
  },
  entitySymbol: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  playerSymbol: {
    color: '#00ffff',
    fontSize: 24,
  },
}); 