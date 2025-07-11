import React, {memo, useEffect, useRef, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { CloseButton } from '../components/common/CloseButton';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { toggleLegend } from '../store/slices/uiSlice';
import { setGrid, setLoading } from '../store/slices/mapSlice';
import { useFetchMapQuery } from '../store/api/mapApi';

const GRID_SIZE = 25;
const CELL_SIZE = 60;
const TOTAL_SIZE = GRID_SIZE * CELL_SIZE;
const MARGIN_SIZE = 80;


type TerrainType = 'plain' | 'mountain' | 'water' | 'forest';
type EntityType = 'empty' | 'player' | 'npc' | 'house';

const FRIENDLY_NAMES = [
  'Alpha', 'Beta', 'Gamma', 'Delta', 'Echo', 'Foxtrot',
  'Helix', 'Iris', 'Jupiter', 'Kilo', 'Lima', 'Matrix',
  'Nova', 'Omega', 'Pulse', 'Quantum', 'Razor', 'Sigma',
];

const HOSTILE_NAMES = [
  'Cipher', 'Shadow', 'Wraith', 'Phantom', 'Specter', 'Ghost',
  'Virus', 'Trojan', 'Malware', 'Breach', 'Havoc', 'Chaos',
  'Doom', 'Eclipse', 'Fang', 'Glitch', 'Hex', 'Inferno',
];

type CellData = {
  terrain: TerrainType;
  entity: EntityType;
  owner?: 'player' | 'enemy';
  name?: string;
};

type GridData = CellData[][];

type Props = {
  onClose: () => void;
};

export const HackMapScreen: React.FC<Props> = ({ onClose }) => {
  const dispatch = useAppDispatch();
  const grid = useAppSelector((state) => state.map.grid);
  const loading = useAppSelector((state) => state.map.loading);

  const [selectedCell, setSelectedCell] = useState<{x: number, y: number, info: CellData} | null>(null);
  const isLegendExpanded = useAppSelector((state) => state.ui.map.legendExpanded);
  const scrollViewRef = useRef<ScrollView>(null);
  const { data: mapData, isLoading } = useFetchMapQuery();

  useEffect(() => {
    dispatch(setLoading(isLoading));
    if (mapData && mapData.grid) {
      dispatch(setGrid(mapData.grid));
    }
  }, [mapData, isLoading, dispatch]);

  const handleCellPress = (x: number, y: number, cellData: CellData) => {
    setSelectedCell({x, y, info: cellData});
  };

  const renderLegend = () => (
    <View style={[styles.legend, !isLegendExpanded && styles.legendCollapsed]}>
      <TouchableOpacity
        style={styles.legendTitleContainer}
        onPress={() => dispatch(toggleLegend())}
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
    if (!selectedCell) {return null;}

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
              selectedCell.info.owner === 'player' ? styles.friendlyText : styles.hostileText,
            ]}>
              STATUS: {selectedCell.info.owner === 'player' ? 'FRIENDLY' : 'HOSTILE'}
            </Text>
          </>
        )}
      </View>
    );
  };

  if (loading) {
    return <View style={styles.container}><LoadingSpinner /></View>;
  }

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
        contentContainerStyle={styles.scrollContainer}
      >
        <ScrollView
          directionalLockEnabled={false}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.marginWrapper}>
            <View style={styles.gridArea}>
              {grid.map((row, y) => (
                <View key={y} style={styles.row}>
                  {row.map((cell, x) => (
                    <TouchableOpacity
                      key={`${x}-${y}`}
                      style={[
                        styles.cell,
                        selectedCell?.x === x && selectedCell?.y === y && styles.selectedCell,
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
                              styles.hostileSymbol,
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
          </View>
        </ScrollView>
      </ScrollView>
    </View>
  );
};

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
  marginWrapper: {
    width: TOTAL_SIZE + (MARGIN_SIZE * 2),
    height: TOTAL_SIZE + (MARGIN_SIZE * 2),
    backgroundColor: 'rgba(139, 0, 0, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridArea: {
    width: TOTAL_SIZE,
    height: TOTAL_SIZE,
    backgroundColor: '#000',
  },
  scrollContainer: {
    width: TOTAL_SIZE + (MARGIN_SIZE * 2),    // Exact width of grid + margins
    height: TOTAL_SIZE + (MARGIN_SIZE * 2),   // Exact height of grid + margins
  },
});
