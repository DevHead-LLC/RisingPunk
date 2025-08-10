import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import { View, Text, StyleSheet, LayoutChangeEvent, Pressable, Image, Dimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withDecay, runOnJS, useAnimatedReaction } from 'react-native-reanimated';
import { CloseButton } from '../components/common/CloseButton';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { setGrid, setLoading } from '../store/slices/mapSlice';
import { useFetchMapQuery } from '../store/api/mapApi';
import { computePanBounds } from '../utils/mapPanBounds';

const CELL_SIZE = 55;
const MARGIN_SIZE = 80;


type TerrainType = 'plain' | 'mountain' | 'water' | 'forest' | 'road' | 'grass' | 'dirt';
type EntityType = 'empty' | 'player' | 'npc' | 'house';



  type CellData = {
  terrain: TerrainType;
  entity: EntityType;
  owner?: 'player' | 'enemy';
  name?: string;
  npcSlug?: string;
    npcInstanceId?: string;
};

type Props = {
  onClose: () => void;
  restorePan?: { x: number; y: number };
};

export const HackMapScreen: React.FC<Props> = ({ onClose, restorePan }) => {
  const dispatch = useAppDispatch();
  const grid = useAppSelector((state) => state.map.grid);
  const loading = useAppSelector((state) => state.map.loading);

  const [selectedCell, setSelectedCell] = useState<{x: number, y: number, info: CellData} | null>(null);
  const offsetX = useSharedValue(0);
  const offsetY = useSharedValue(0);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const minX = useSharedValue(-1000000);
  const maxX = useSharedValue(1000000);
  const minY = useSharedValue(-1000000);
  const maxY = useSharedValue(1000000);
  const boundsReady = useSharedValue(false);
  const currentPanRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const computeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialDims = Dimensions.get('window');
  const [containerSize, setContainerSize] = useState<{ width: number; height: number }>({ width: initialDims.width, height: initialDims.height });
  const [windowRange, setWindowRange] = useState<{ rowStart: number; rowEnd: number; colStart: number; colEnd: number }>({ rowStart: 0, rowEnd: Math.min(14, (grid.length || 50) - 1), colStart: 0, colEnd: Math.min(14, (grid.length || 50) - 1) });
  const lastVelocityRef = useRef<{ vx: number; vy: number }>({ vx: 0, vy: 0 });
  const rafIdRef = useRef<number | null>(null);
  const lastComputedPanRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lastComputeTsRef = useRef<number>(0);
  // Restore pan position if provided (initialized after computeWindow definition)
  const updateCurrentPan = (x: number, y: number) => {
    currentPanRef.current = { x, y };
  };

  const scheduleCompute = (x: number, y: number, vx: number = 0, vy: number = 0) => {
    // Update last known velocity on JS thread (safe)
    lastVelocityRef.current = { vx, vy };
    if (computeDebounceRef.current) {
      clearTimeout(computeDebounceRef.current);
    }
    computeDebounceRef.current = setTimeout(() => {
      computeWindow(x, y, containerSize.width, containerSize.height);
    }, 40);
  };

  const animatedMapStyle = useAnimatedStyle(() => {
    const tx = boundsReady.value
      ? Math.min(maxX.value, Math.max(minX.value, offsetX.value))
      : offsetX.value;
    const ty = boundsReady.value
      ? Math.min(maxY.value, Math.max(minY.value, offsetY.value))
      : offsetY.value;
    return {
      transform: [
        { translateX: tx },
        { translateY: ty },
      ],
    } as const;
  });

  useAnimatedReaction(
    () => ({ x: offsetX.value, y: offsetY.value }),
    (v, prev) => {
      if (!prev || Math.abs(v.x - prev.x) > 6 || Math.abs(v.y - prev.y) > 6) {
        const cx = boundsReady.value ? Math.min(maxX.value, Math.max(minX.value, v.x)) : v.x;
        const cy = boundsReady.value ? Math.min(maxY.value, Math.max(minY.value, v.y)) : v.y;
        runOnJS(scheduleCompute)(cx, cy, 0, 0);
        runOnJS(updateCurrentPan)(cx, cy);
      }
    }
  );

  const panGesture = Gesture.Pan()
    .onStart(() => {
      startX.value = offsetX.value;
      startY.value = offsetY.value;
    })
    .onUpdate((g) => {
      let x = startX.value + g.translationX;
      let y = startY.value + g.translationY;
      if (boundsReady.value) {
        x = Math.min(maxX.value, Math.max(minX.value, x));
        y = Math.min(maxY.value, Math.max(minY.value, y));
      }
      offsetX.value = x;
      offsetY.value = y;
      // Schedule JS-side window compute so tiles load beyond current view
      // @ts-ignore runOnJS bridge
      runOnJS(scheduleCompute)(x, y, g.velocityX ?? 0, g.velocityY ?? 0);
      // Keep JS ref in sync with UI pan so pendingMapPan is accurate
      // @ts-ignore
      runOnJS(updateCurrentPan)(x, y);
    })
    .onEnd((g) => {
      if (boundsReady.value) {
        offsetX.value = withDecay({ velocity: g.velocityX, deceleration: 0.997, clamp: [minX.value, maxX.value] } as any);
        offsetY.value = withDecay({ velocity: g.velocityY, deceleration: 0.997, clamp: [minY.value, maxY.value] } as any);
      } else {
        offsetX.value = withDecay({ velocity: g.velocityX, deceleration: 0.997 });
        offsetY.value = withDecay({ velocity: g.velocityY, deceleration: 0.997 });
      }
      const x = startX.value + (g.translationX ?? 0);
      const y = startY.value + (g.translationY ?? 0);
      const fx = boundsReady.value ? Math.min(maxX.value, Math.max(minX.value, x)) : x;
      const fy = boundsReady.value ? Math.min(maxY.value, Math.max(minY.value, y)) : y;
      runOnJS(scheduleCompute)(fx, fy, g.velocityX ?? 0, g.velocityY ?? 0);
      runOnJS(updateCurrentPan)(fx, fy);
    });
  const gridSize = grid.length || 50;
  const totalSize = gridSize * CELL_SIZE;
  const { data: mapData, isLoading } = useFetchMapQuery();

  // Precompute terrain style map and position style caches
  const terrainStyleMap = useMemo(() => ({
    water: styles.waterTerrain,
    mountain: styles.mountainTerrain,
    forest: styles.forestTerrain,
    road: styles.roadTerrain,
    grass: styles.grassTerrain,
    dirt: styles.dirtTerrain,
    plain: styles.plainTerrain,
  } as Record<TerrainType, any>), []);

  const xPosStyles = useMemo(() => {
    return Array.from({ length: gridSize }, (_, x) => ({ position: 'absolute', left: x * CELL_SIZE, top: 0 }));
  }, [gridSize]);

  const rowPosStyles = useMemo(() => {
    return Array.from({ length: gridSize }, (_, y) => ({ position: 'absolute', top: y * CELL_SIZE, left: 0 }));
  }, [gridSize]);

  const yPosStyles = useMemo(() => {
    return Array.from({ length: gridSize }, (_, y) => ({ position: 'absolute', top: y * CELL_SIZE }));
  }, [gridSize]);

  const visibleCells = useMemo(() => {
    const cells: Array<{ x: number; y: number; cell: CellData; selected: boolean }> = [];
    for (let y = windowRange.rowStart; y <= windowRange.rowEnd; y++) {
      const row = grid[y];
      if (!row) continue;
      for (let x = windowRange.colStart; x <= windowRange.colEnd; x++) {
        const cell = row[x];
        if (!cell) continue;
        const selected = !!(selectedCell && selectedCell.x === x && selectedCell.y === y);
        cells.push({ x, y, cell, selected });
      }
    }
    return cells;
  }, [grid, windowRange, selectedCell]);

  const [poolSize, setPoolSize] = useState<number>(0);
  useEffect(() => {
    setPoolSize(prev => Math.max(prev, visibleCells.length));
  }, [visibleCells.length]);

  useEffect(() => {
    dispatch(setLoading(isLoading));
    if (mapData && mapData.grid) {
      dispatch(setGrid(mapData.grid));
    }
  }, [mapData, isLoading, dispatch]);

  const computeWindow = useCallback((panX: number, panY: number, width: number, height: number) => {
    if (width <= 0 || height <= 0) {return;}
    const now = Date.now();
    if (now - lastComputeTsRef.current < 40) {return;} // time-based throttle (~25 fps)
    lastComputeTsRef.current = now;
    // Skip tiny pan changes to reduce churn
    const lx = lastComputedPanRef.current.x;
    const ly = lastComputedPanRef.current.y;
    if (Math.abs(panX - lx) < 8 && Math.abs(panY - ly) < 8) {
      return;
    }
    lastComputedPanRef.current = { x: panX, y: panY };
    const baseBuffer = 12;
    const vx = lastVelocityRef.current.vx || 0;
    const vy = lastVelocityRef.current.vy || 0;
    const leadX = Math.min(20, Math.ceil(Math.abs(vx) * 14));
    const leadY = Math.min(20, Math.ceil(Math.abs(vy) * 14));
    const dirX = vx === 0 ? 0 : (vx > 0 ? 1 : -1);
    const dirY = vy === 0 ? 0 : (vy > 0 ? 1 : -1);
    const leftBuffer = baseBuffer + (dirX < 0 ? leadX : Math.floor(leadX * 0.25));
    const rightBuffer = baseBuffer + (dirX > 0 ? leadX : Math.floor(leadX * 0.25));
    const upBuffer = baseBuffer + (dirY < 0 ? leadY : Math.floor(leadY * 0.25));
    const downBuffer = baseBuffer + (dirY > 0 ? leadY : Math.floor(leadY * 0.25));
    const gridLeft = panX + MARGIN_SIZE;
    const gridTop = panY + MARGIN_SIZE;
    const baseStartCol = Math.floor((-gridLeft) / CELL_SIZE);
    const baseEndCol = Math.ceil((width - gridLeft) / CELL_SIZE);
    const baseStartRow = Math.floor((-gridTop) / CELL_SIZE);
    const baseEndRow = Math.ceil((height - gridTop) / CELL_SIZE);
    const startCol = Math.max(0, baseStartCol - leftBuffer);
    const endCol = Math.min(gridSize - 1, baseEndCol + rightBuffer);
    const startRow = Math.max(0, baseStartRow - upBuffer);
    const endRow = Math.min(gridSize - 1, baseEndRow + downBuffer);
    const cols = Math.max(0, endCol - startCol + 1);
    const rows = Math.max(0, endRow - startRow + 1);
    const expected = Math.ceil(cols * rows * 1.2);
    setPoolSize(prev => (expected > prev + 50 ? expected : prev));
    setWindowRange(prev => {
      const same = prev.rowStart === startRow && prev.rowEnd === endRow && prev.colStart === startCol && prev.colEnd === endCol;
      if (same) return prev;
      const smallShift =
        Math.abs(prev.rowStart - startRow) < 2 &&
        Math.abs(prev.rowEnd - endRow) < 2 &&
        Math.abs(prev.colStart - startCol) < 2 &&
        Math.abs(prev.colEnd - endCol) < 2;
      if (smallShift) return prev; // require at least 2-cell change to update
      return { rowStart: startRow, rowEnd: endRow, colStart: startCol, colEnd: endCol };
    });
  }, [gridSize]);

  // Restore pan position if provided (now safe, computeWindow is defined)
  useEffect(() => {
    if (restorePan) {
      offsetX.value = restorePan.x;
      offsetY.value = restorePan.y;
      currentPanRef.current = { x: restorePan.x, y: restorePan.y };
      requestAnimationFrame(() => {
        computeWindow(restorePan.x, restorePan.y, containerSize.width, containerSize.height);
      });
    }
  }, [restorePan, containerSize.width, containerSize.height, computeWindow, offsetX, offsetY]);

  useEffect(() => {
    // Initial compute on mount and when container changes
    computeWindow(currentPanRef.current.x, currentPanRef.current.y, containerSize.width, containerSize.height);
    return () => {
      if (rafIdRef.current != null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      if (computeDebounceRef.current) {
        clearTimeout(computeDebounceRef.current);
        computeDebounceRef.current = null;
      }
    };
  }, [containerSize.width, containerSize.height, computeWindow]);

  const onContainerLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setContainerSize({ width, height });
    computeWindow(currentPanRef.current.x, currentPanRef.current.y, width, height);
  }, [computeWindow]);

  useEffect(() => {
    if (containerSize.width > 0 && containerSize.height > 0) {
      const bounds = computePanBounds({
        totalSize,
        containerWidth: containerSize.width,
        containerHeight: containerSize.height,
        marginSize: MARGIN_SIZE,
      });
      minX.value = bounds.minX;
      maxX.value = bounds.maxX;
      minY.value = bounds.minY;
      maxY.value = bounds.maxY;
      boundsReady.value = true;
      const clamped = {
        x: Math.min(bounds.maxX, Math.max(bounds.minX, currentPanRef.current.x)),
        y: Math.min(bounds.maxY, Math.max(bounds.minY, currentPanRef.current.y)),
      };
      offsetX.value = clamped.x;
      offsetY.value = clamped.y;
      currentPanRef.current = clamped;
      computeWindow(clamped.x, clamped.y, containerSize.width, containerSize.height);
    }
  }, [containerSize.width, containerSize.height, totalSize, minX, maxX, minY, maxY, offsetX, offsetY]);

  const handleCellPress = (x: number, y: number, cellData: CellData) => {
    setSelectedCell({x, y, info: cellData});
  };

  const renderLegend = () => null;

  const renderInfoPanel = () => {
    if (!selectedCell) {return null;}

    return (
      <View style={styles.infoPanel}>
        <Pressable
          style={styles.infoPanelClose}
          onPress={() => setSelectedCell(null)}
        >
          <Text style={styles.closeSymbol}>×</Text>
        </Pressable>
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
              {selectedCell.info.owner !== 'player' && selectedCell.info.npcSlug && (
              <Pressable
                style={[styles.hackButton]}
                onPress={() => {
                  (globalThis as any).pendingNpcSlug = selectedCell.info.npcSlug;
                    (globalThis as any).pendingNpcInstanceId = selectedCell.info.npcInstanceId;
                  (globalThis as any).pendingMapPan = {
                    x: currentPanRef.current.x,
                    y: currentPanRef.current.y,
                  };
                  onClose();
                }}
              >
                <Text style={styles.hackButtonText}>Hack Entity</Text>
              </Pressable>
            )}
          </>
        )}
      </View>
    );
  };

  if (loading) {
    return <View style={styles.container}><LoadingSpinner /></View>;
  }

  return (
    <View style={styles.container} onLayout={onContainerLayout}>
      <CloseButton onPress={onClose} />

      {renderLegend()}

      {renderInfoPanel()}

      <GestureDetector gesture={panGesture}>
        <Animated.View
          style={[
            styles.marginWrapper,
            { width: totalSize + (MARGIN_SIZE * 2), height: totalSize + (MARGIN_SIZE * 2) },
            animatedMapStyle as any,
          ]}
        >
          <View style={[styles.gridArea, { width: totalSize, height: totalSize }]}>
            {Array.from({ length: gridSize }).map((_, y) => (
              <Row
                key={y}
                y={y}
                row={grid[y]}
                colStart={windowRange.colStart}
                colEnd={windowRange.colEnd}
                rowVisible={y >= windowRange.rowStart && y <= windowRange.rowEnd}
                selectedCell={selectedCell}
                onPress={handleCellPress}
                rowStyle={rowPosStyles[y]}
                xPosStyles={xPosStyles}
                terrainStyleMap={terrainStyleMap}
                disableTiles
              />
            ))}

            {Array.from({ length: poolSize }).map((_, i) => {
              const assignment = visibleCells[i];
              if (!assignment) {
                return (
                  <View key={`pool-${i}`} style={{ position: 'absolute', left: -10000, top: -10000, width: 1, height: 1 }} />
                );
              }
              const { x, y, cell, selected } = assignment;
              return (
                <PoolTile
                  key={`pool-${i}`}
                  x={x}
                  y={y}
                  cell={cell}
                  selected={selected}
                  onPress={handleCellPress}
                  xStyle={xPosStyles[x]}
                  yStyle={yPosStyles[y]}
                  terrainStyleMap={terrainStyleMap}
                />
              );
            })}
          </View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
};

type TileProps = {
  x: number;
  y: number;
  cell: CellData;
  selected: boolean;
  onPress: (x: number, y: number, cell: CellData) => void;
  xStyle: any;
  terrainStyleMap: Record<TerrainType, any>;
};

const Tile: React.FC<TileProps> = React.memo(({ x, y, cell, selected, onPress, xStyle, terrainStyleMap }) => {
  return (
    <Pressable
      style={[
        styles.cell,
        xStyle,
        selected && styles.selectedCell,
      ]}
      onPress={() => onPress(x, y, cell)}
    >
      <View style={[styles.cellContent, terrainStyleMap[cell.terrain]]}>
        {getTerrainIcon(cell.terrain)}
        {cell.entity === 'house' && (
          <>
            {(cell.name === 'YOU' || cell.owner === 'player') ? (
              <Image source={require('../assets/images/home.png')} style={styles.playerHomeIcon} resizeMode="contain" />
            ) : (
              <View style={[styles.entityOverlay, styles.enemyHouse]} />
            )}
            <View style={styles.entityLabelContainer} pointerEvents="none">
              <Text
                style={[
                  styles.entityLabel,
                  (cell.name === 'YOU' || cell.owner === 'player') ? styles.playerLabel : styles.enemyLabel,
                ]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {cell.name || (cell.owner === 'player' ? 'YOU' : 'NPC')}
              </Text>
            </View>
          </>
        )}
      </View>
    </Pressable>
  );
});

type PoolTileProps = {
  x: number;
  y: number;
  cell: CellData;
  selected: boolean;
  onPress: (x: number, y: number, cell: CellData) => void;
  xStyle: any;
  yStyle: any;
  terrainStyleMap: Record<TerrainType, any>;
};

const PoolTile: React.FC<PoolTileProps> = React.memo(({ x, y, cell, selected, onPress, xStyle, yStyle, terrainStyleMap }) => {
  return (
    <View style={[yStyle]}>
      <Tile x={x} y={y} cell={cell} selected={selected} onPress={onPress} xStyle={xStyle} terrainStyleMap={terrainStyleMap} />
    </View>
  );
});

type RowProps = {
  y: number;
  row: CellData[] | undefined;
  colStart: number;
  colEnd: number;
  rowVisible: boolean;
  selectedCell: { x: number; y: number; info: CellData } | null;
  onPress: (x: number, y: number, cell: CellData) => void;
  rowStyle: any;
  xPosStyles: Array<any>;
  terrainStyleMap: Record<TerrainType, any>;
  disableTiles?: boolean;
};

const Row: React.FC<RowProps> = React.memo(({ y, row, colStart, colEnd, rowVisible, selectedCell, onPress, rowStyle, xPosStyles, terrainStyleMap, disableTiles }) => {
  // Always render the row container (grid shell), but only mount tiles when visible
  if (!row) {
    return <View style={[styles.row, rowStyle]} />;
  }

  if (disableTiles) {
    return <View style={[styles.row, rowStyle]} />;
  }

  const tiles = rowVisible
    ? Array.from({ length: colEnd - colStart + 1 }).map((_, offset) => {
        const x = colStart + offset;
        const cell = row[x];
        if (!cell) return null;
        const isSelected = !!(selectedCell && selectedCell.x === x && selectedCell.y === y);
        return <Tile key={x} x={x} y={y} cell={cell} selected={isSelected} onPress={onPress} xStyle={xPosStyles[x]} terrainStyleMap={terrainStyleMap} />;
      })
    : null;

  return (
    <View style={[styles.row, rowStyle]}>
      {tiles}
    </View>
  );
}, (prev, next) => {
  if (prev.rowVisible !== next.rowVisible) return false;
  if (prev.colStart !== next.colStart || prev.colEnd !== next.colEnd) return false;
  const prevSelInRow = prev.selectedCell && prev.selectedCell.y === prev.y ? prev.selectedCell.x : undefined;
  const nextSelInRow = next.selectedCell && next.selectedCell.y === next.y ? next.selectedCell.x : undefined;
  return prevSelInRow === nextSelInRow;
});

const getTerrainIcon = (terrain: TerrainType) => {
  switch (terrain) {
    case 'water':
      return <Text style={[styles.terrainSymbol, styles.waterSymbol]}>~</Text>;
    case 'mountain':
      return <Text style={[styles.terrainSymbol, styles.mountainSymbol]}>▲</Text>;
    case 'forest':
      return <Text style={[styles.terrainSymbol, styles.forestSymbol]}>♣</Text>;
    case 'road':
      return <Text style={[styles.terrainSymbol, styles.roadSymbol]}>≡</Text>;
    case 'grass':
      return null;
    case 'dirt':
      return null;
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
    case 'road':
      return styles.roadTerrain;
    case 'grass':
      return styles.grassTerrain;
    case 'dirt':
      return styles.dirtTerrain;
    default:
      return styles.plainTerrain;
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  dragContainer: {
    flex: 1,
    overflow: 'hidden',
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
  roadTerrain: {
    backgroundColor: 'rgba(255, 193, 7, 0.06)',
    borderColor: 'rgba(255, 193, 7, 0.2)',
  },
  grassTerrain: {
    backgroundColor: 'rgba(76, 175, 80, 0.08)',
    borderColor: 'rgba(76, 175, 80, 0.15)',
  },
  dirtTerrain: {
    backgroundColor: 'rgba(160, 82, 45, 0.09)',
    borderColor: 'rgba(160, 82, 45, 0.15)',
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
  hackButton: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#00ff41',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  hackButtonText: {
    color: '#00ff41',
    fontSize: 14,
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
  entityOverlay: {
    position: 'absolute',
    top: 6,
    left: 6,
    right: 6,
    bottom: 6,
    borderRadius: 6,
  },
  playerHouse: {
    backgroundColor: 'rgba(0, 255, 65, 0.35)',
  },
  enemyHouse: {
    backgroundColor: 'rgba(204, 85, 0, 0.35)',
  },
  playerHomeIcon: {
    width: CELL_SIZE - 10,
    height: CELL_SIZE - 10,
  },
  entityLabelContainer: {
    position: 'absolute',
    bottom: 2,
    left: 2,
    right: 2,
    alignItems: 'center',
  },
  entityLabel: {
    fontSize: 9,
    fontWeight: '600',
    paddingHorizontal: 2,
  },
  playerLabel: {
    color: '#00ff41',
  },
  enemyLabel: {
    color: '#cc5500',
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
  roadSymbol: {
    color: 'rgba(255, 193, 7, 0.9)',
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
    backgroundColor: 'rgba(139, 0, 0, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridArea: {
    backgroundColor: '#000',
  },
  scrollContainer: {
    // width/height are set dynamically on container View
  },
});
