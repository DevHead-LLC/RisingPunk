import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import { View, Text, StyleSheet, LayoutChangeEvent, Pressable, Image, Dimensions, TouchableOpacity, ScrollView, unstable_batchedUpdates } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withDecay, runOnJS, useAnimatedReaction } from 'react-native-reanimated';
import { CloseButton } from '../components/common/CloseButton';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { CollapsibleToolbar } from '../components/hackMap/CollapsibleToolbar';
import { AntivirusModal } from '../components/hackMap/AntivirusModal';
import { CrewOnboardingModal } from '../components/hackMap/CrewOnboardingModal';
import { CrewModal } from '../components/hackMap/CrewModal';
import { VisitingProfileModal } from '../components/hackMap/VisitingProfileModal';
import { VisitCrewModal } from '../components/hackMap/VisitCrewModal';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { setGrid, setLoading } from '../store/slices/mapSlice';
import { useFetchMapQuery, useFetchMapViewportQuery } from '../store/api/mapApi';
import { useGetShieldStatusQuery } from '../store/api/antivirusApi';
import { useGetUserFeaturesQuery } from '../store/api/researchFeaturesApi';
import { useGetCrewStatusQuery, useGetUserCrewStatusQuery, useGetCrewDetailsQuery, useGetWarStatusQuery, useGetAllianceStatusQuery } from '../store/api/authApi';
import { API_URL } from '../config';
import { computePanBounds } from '../utils/mapPanBounds';
import { CellData, TerrainType, EntityType } from '../types/map';
import { useThemeColors } from '../hooks/useThemeColors';
import { useTheme } from '../context/ThemeContext';
import { SIZING } from '../styles/theme';

const CELL_SIZE = 75;
const MARGIN_SIZE = 80;

// Constants for viewport fetching and panning
const VIEWPORT_FETCH_THRESHOLD = 5; // Cells to move before triggering viewport fetch
const PAN_BUFFER = 8; // Buffer in cells for window range calculation
const PAN_CHANGE_THRESHOLD = 4; // Minimum pan change in pixels to trigger update
const MAX_CACHE_SIZE = 1000; // Maximum number of cached cell objects
const PANNING_STOPPED_DEBOUNCE_MS = 200; // Debounce time for panning stopped detection

/**
 * Convert grid coordinates to pan coordinates (centers the cell on screen)
 * @param gridX - Grid X coordinate (column)
 * @param gridY - Grid Y coordinate (row)
 * @param width - Container width
 * @param height - Container height
 * @returns Pan coordinates { x, y } to center the grid cell on screen
 */
const gridToPanCoordinates = (
  gridX: number,
  gridY: number,
  width: number,
  height: number
): { x: number; y: number } => {
  const x = (width / 2) - MARGIN_SIZE - ((gridX + 0.5) * CELL_SIZE);
  const y = (height / 2) - MARGIN_SIZE - ((gridY + 0.5) * CELL_SIZE);
  return { x, y };
};

/**
 * Calculate viewport coordinates from pan position
 * @param panX - Pan X coordinate
 * @param panY - Pan Y coordinate
 * @param width - Container width
 * @param height - Container height
 * @param gridSize - Grid size (for clamping)
 * @param buffer - Optional buffer in cells (default: 0)
 * @returns Viewport coordinates { startCol, endCol, startRow, endRow } clamped to grid bounds
 */
const calculateViewportFromPan = (
  panX: number,
  panY: number,
  width: number,
  height: number,
  gridSize: number,
  buffer: number = 0
): { startCol: number; endCol: number; startRow: number; endRow: number } => {
  const gridLeft = panX + MARGIN_SIZE;
  const gridTop = panY + MARGIN_SIZE;
  
  // Convert screen coordinates to grid coordinates
  const baseStartCol = Math.floor((-gridLeft) / CELL_SIZE);
  const baseEndCol = Math.ceil((width - gridLeft) / CELL_SIZE);
  const baseStartRow = Math.floor((-gridTop) / CELL_SIZE);
  const baseEndRow = Math.ceil((height - gridTop) / CELL_SIZE);
  
  // Apply buffer and clamp to grid bounds
  const startCol = Math.max(0, baseStartCol - buffer);
  const endCol = Math.min(gridSize - 1, baseEndCol + buffer);
  const startRow = Math.max(0, baseStartRow - buffer);
  const endRow = Math.min(gridSize - 1, baseEndRow + buffer);
  
  return { startCol, endCol, startRow, endRow };
};

/**
 * Generate Set of visible tile keys from viewport coordinates
 * @param startCol - Start column
 * @param endCol - End column
 * @param startRow - Start row
 * @param endRow - End row
 * @returns Set of tile keys in format "x,y"
 */
const generateVisibleTileKeys = (
  startCol: number,
  endCol: number,
  startRow: number,
  endRow: number
): Set<string> => {
  const visibleTiles = new Set<string>();
  for (let y = startRow; y <= endRow; y++) {
    for (let x = startCol; x <= endCol; x++) {
      visibleTiles.add(`${x},${y}`);
    }
  }
  return visibleTiles;
};

/**
 * Clean up empty cells from merged cache data
 * Removes cache entries for cells that are now empty (entity removed)
 * @param merged - The merged cache object to clean (will be mutated)
 * @param grid - Grid data to check
 * @param viewport - Viewport coordinates { x1, y1, x2, y2 }
 * @returns Array of deleted keys (for tracking purposes, optional)
 */
const cleanupEmptyCells = (
  merged: Record<string, any>,
  grid: any[][],
  viewport: { x1: number; y1: number; x2: number; y2: number }
): string[] => {
  const deletedKeys: string[] = [];
  for (let y = viewport.y1; y <= viewport.y2; y++) {
    const row = grid[y];
    if (!row) continue;
    for (let x = viewport.x1; x <= viewport.x2; x++) {
      const cell = row[x];
      const key = `${x},${y}`;
      if (cell && cell.entity === 'empty' && merged[key]) {
        delete merged[key];
        deletedKeys.push(key);
      }
    }
  }
  return deletedKeys;
};

/**
 * Get cells to check for cleanup operations
 * Returns array of {x, y, cell} objects either from viewport or full grid
 * @param grid - Grid data
 * @param viewport - Optional viewport coordinates { x1, y1, x2, y2 }
 * @returns Array of {x, y, cell} objects
 */
const getCellsToCheck = (
  grid: any[][],
  viewport?: { x1: number; y1: number; x2: number; y2: number }
): Array<{ x: number; y: number; cell: any }> => {
  const cells: Array<{ x: number; y: number; cell: any }> = [];
  
  if (viewport) {
    // Viewport: only iterate through cells in viewport
    for (let y = viewport.y1; y <= viewport.y2; y++) {
      const row = grid[y];
      if (!row) continue;
      for (let x = viewport.x1; x <= viewport.x2; x++) {
        const cell = row[x];
        if (cell) cells.push({ x, y, cell });
      }
    }
  } else {
    // Full map: iterate through all cells
    for (let y = 0; y < grid.length; y++) {
      const row = grid[y];
      if (!row) continue;
      for (let x = 0; x < row.length; x++) {
        const cell = row[x];
        if (cell) cells.push({ x, y, cell });
      }
    }
  }
  
  return cells;
};

/**
 * Merge grid data from new grid into current grid for a specific viewport
 * Creates a deep copy of current grid and merges new data within viewport bounds
 * @param currentGrid - Current grid data (from gridRef or state)
 * @param newGrid - New grid data to merge
 * @param viewport - Viewport coordinates { x1, y1, x2, y2 }
 * @param gridSize - Grid size (for fallback empty grid creation)
 * @returns Merged grid (deep copy, safe to mutate)
 */
const mergeGridData = (
  currentGrid: any[][],
  newGrid: any[][],
  viewport: { x1: number; y1: number; x2: number; y2: number },
  gridSize: number
): any[][] => {
  // Create a deep copy to avoid mutating Redux state
  const mergedGrid = (currentGrid.length > 0 ? currentGrid : Array.from({ length: gridSize }, () => 
    Array.from({ length: gridSize }, () => ({ terrain: 'plain' as TerrainType, entity: 'empty' as EntityType }))
  )).map(row => row ? [...row] : []);
  
  // Only update cells within viewport
  for (let y = viewport.y1; y <= viewport.y2; y++) {
    const row = newGrid[y];
    if (!row) continue;
    if (!mergedGrid[y]) {
      mergedGrid[y] = [];
    }
    for (let x = viewport.x1; x <= viewport.x2; x++) {
      const cell = row[x];
      if (cell) {
        if (!mergedGrid[y][x]) {
          mergedGrid[y][x] = { terrain: 'plain' as TerrainType, entity: 'empty' as EntityType };
        }
        mergedGrid[y][x] = { ...mergedGrid[y][x], ...cell };
      }
    }
  }
  
  return mergedGrid;
};

/**
 * Get grid size from grid array with fallback
 * @param grid - Grid array
 * @param fallback - Fallback size if grid is empty (default: 50)
 * @returns Grid size
 */
const getGridSize = (grid: any[][] | null | undefined, fallback: number = 50): number => {
  if (!grid || grid.length === 0) return fallback;
  return grid.length;
};

/**
 * Validate viewport coordinates
 * @param viewport - Viewport coordinates { x1, y1, x2, y2 }
 * @returns true if viewport is valid (all coordinates are valid numbers)
 */
const isValidViewport = (viewport: { x1: number; y1: number; x2: number; y2: number } | undefined): boolean => {
  if (!viewport) return false;
  const { x1, y1, x2, y2 } = viewport;
  return !isNaN(x1) && !isNaN(y1) && !isNaN(x2) && !isNaN(y2) && 
         x1 >= 0 && y1 >= 0 && x2 >= x1 && y2 >= y1;
};

/**
 * Check if viewport has moved significantly outside the last fetched viewport
 * @param newViewport - New viewport coordinates { x1, y1, x2, y2 }
 * @param lastViewport - Last fetched viewport coordinates { x1, y1, x2, y2 } or null
 * @param threshold - Movement threshold in cells (default: 5)
 * @returns true if viewport should be fetched
 */
const shouldFetchViewport = (
  newViewport: { x1: number; y1: number; x2: number; y2: number },
  lastViewport: { x1: number; y1: number; x2: number; y2: number } | null,
  threshold: number = VIEWPORT_FETCH_THRESHOLD
): boolean => {
  if (!lastViewport) return true;
  return (
    newViewport.x1 < lastViewport.x1 - threshold ||
    newViewport.x2 > lastViewport.x2 + threshold ||
    newViewport.y1 < lastViewport.y1 - threshold ||
    newViewport.y2 > lastViewport.y2 + threshold
  );
};

/**
 * Trigger viewport fetch with minimal flag
 * Prevents new requests while one is in flight to avoid cancelling requests
 * @param newViewport - New viewport coordinates { x1, y1, x2, y2, minimal?: boolean }
 * @param panningViewportMinimalRef - Ref to store minimal flag
 * @param setPanningViewportParams - State setter for viewport params
 * @param viewportRequestInFlightRef - Ref to track if request is in flight
 * @param pendingViewportParamsRef - Ref to store pending viewport if request is in flight
 */
const triggerViewportFetch = (
  newViewport: { x1: number; y1: number; x2: number; y2: number; minimal?: boolean },
  panningViewportMinimalRef: React.MutableRefObject<boolean>,
  setPanningViewportParams: React.Dispatch<React.SetStateAction<{ x1: number; y1: number; x2: number; y2: number; minimal?: boolean } | null>>,
  viewportRequestInFlightRef: React.MutableRefObject<boolean>,
  pendingViewportParamsRef: React.MutableRefObject<{ x1: number; y1: number; x2: number; y2: number; minimal?: boolean } | null>
): void => {
  if (viewportRequestInFlightRef.current) {
    // Request already in flight - store this as pending instead of cancelling the current one
    pendingViewportParamsRef.current = newViewport;
    return;
  }
  
  // No request in flight - start new request
  viewportRequestInFlightRef.current = true;
  panningViewportMinimalRef.current = true;
  setPanningViewportParams(newViewport);
};

type Props = {
  onClose: () => void;
  restorePan?: { x: number; y: number };
};

/**
 * Shared memo comparison function for Tile and PoolTile components
 * Uses fast path (cell reference equality) with deep comparison fallback
 */
const tileMemoComparison = <T extends { 
  x: number; 
  y: number; 
  cell: CellData; 
  selected: boolean; 
  currentUserHandle?: string | null; 
  isShieldActive: boolean; 
  isCrewMember?: boolean; 
  isWarCrewMember?: boolean; 
  isAllianceCrewMember?: boolean; 
  dynamicEntityData: Record<string, any> 
}>(prevProps: T, nextProps: T): boolean => {
  // Phase 4: Enhanced memo comparison with fast path and deep fallback
  // Fast path: Phase 2's stable cell references enable efficient reference equality check
  if (prevProps.cell === nextProps.cell) {
    // Same cell object reference - check other props that might affect rendering
    return (
      prevProps.x === nextProps.x &&
      prevProps.y === nextProps.y &&
      prevProps.selected === nextProps.selected &&
      prevProps.currentUserHandle === nextProps.currentUserHandle &&
      prevProps.isShieldActive === nextProps.isShieldActive &&
      prevProps.isCrewMember === nextProps.isCrewMember &&
      prevProps.isWarCrewMember === nextProps.isWarCrewMember &&
      prevProps.isAllianceCrewMember === nextProps.isAllianceCrewMember &&
      prevProps.dynamicEntityData[`${prevProps.x},${prevProps.y}`]?.isShielded === 
      nextProps.dynamicEntityData[`${nextProps.x},${nextProps.y}`]?.isShielded
    );
  }
  
  // Deep comparison fallback: cell reference changed, check if cell data actually changed
  return (
    prevProps.x === nextProps.x &&
    prevProps.y === nextProps.y &&
    prevProps.selected === nextProps.selected &&
    prevProps.cell.terrain === nextProps.cell.terrain &&
    prevProps.cell.entity === nextProps.cell.entity &&
    prevProps.cell.owner === nextProps.cell.owner &&
    prevProps.cell.name === nextProps.cell.name &&
    prevProps.cell.userId === nextProps.cell.userId &&
    prevProps.cell.npcSlug === nextProps.cell.npcSlug &&
    prevProps.cell.npcInstanceId === nextProps.cell.npcInstanceId &&
    prevProps.cell.npcLevel === nextProps.cell.npcLevel &&
    prevProps.cell.isShielded === nextProps.cell.isShielded &&
    prevProps.currentUserHandle === nextProps.currentUserHandle &&
    prevProps.isShieldActive === nextProps.isShieldActive &&
    prevProps.isCrewMember === nextProps.isCrewMember &&
    prevProps.isWarCrewMember === nextProps.isWarCrewMember &&
    prevProps.isAllianceCrewMember === nextProps.isAllianceCrewMember &&
    prevProps.dynamicEntityData[`${prevProps.x},${prevProps.y}`]?.isShielded === 
    nextProps.dynamicEntityData[`${nextProps.x},${nextProps.y}`]?.isShielded
  );
};

/**
 * Shared memo comparison function for PanningTile and PanningPoolTile components
 */
const panningTileMemoComparison = <T extends {
  x: number;
  y: number;
  terrain: TerrainType;
  entityImage?: {
    entity: EntityType;
    owner?: string;
    userId?: string;
    npcSlug?: string;
  };
  currentUserId?: string | null;
  isShieldActive: boolean;
}>(prevProps: T, nextProps: T): boolean => {
  return (
    prevProps.x === nextProps.x &&
    prevProps.y === nextProps.y &&
    prevProps.terrain === nextProps.terrain &&
    prevProps.entityImage?.entity === nextProps.entityImage?.entity &&
    prevProps.entityImage?.owner === nextProps.entityImage?.owner &&
    prevProps.entityImage?.userId === nextProps.entityImage?.userId &&
    prevProps.entityImage?.npcSlug === nextProps.entityImage?.npcSlug &&
    prevProps.currentUserId === nextProps.currentUserId &&
    prevProps.isShieldActive === nextProps.isShieldActive
  );
};

export const HackMapScreen: React.FC<Props> = ({ onClose, restorePan }) => {
  const dispatch = useAppDispatch();
  const grid = useAppSelector((state) => state.map.grid);
  const loading = useAppSelector((state) => state.map.loading);
  const currentUserHandle = useAppSelector((state) => state.auth.user?.handle);
  const currentUserId = useAppSelector((state) => state.auth.user?._id);
  const token = useAppSelector((state) => state.auth.token);
  const colors = useThemeColors();
  const { themeMode } = useTheme();

  // Memoize the styles object to prevent unnecessary re-renders
  const memoizedStyles = useMemo(() => getStyles(colors, themeMode), [colors, themeMode]);
  const styles = memoizedStyles;

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

  const Tile: React.FC<TileProps> = React.memo(({ x, y, cell, selected, onPress, xStyle, terrainStyleMap, currentUserHandle, colors, themeMode, styles, dynamicEntityData, isShieldActive, isCrewMember, isWarCrewMember, isAllianceCrewMember }) => {
    const key = `${x},${y}`;
    const dynamicEntity = dynamicEntityData[key];
    const isShielded = dynamicEntity?.isShielded ?? (cell as any).isShielded;
    
    const houseBgStyle = cell.entity === 'house'
      ? (cell.owner === 'player'
          ? (cell.name === currentUserHandle ? styles.userHouseBg : styles.otherUserHouseBg)
          : styles.enemyHouseBg)
      : null;
    return (
      <Pressable
        style={[
          styles.cell,
          xStyle,
          selected && styles.selectedCell,
          // War takes precedence over alliance (war is more critical to display)
          isWarCrewMember && styles.warCrewMemberCell,
          !isWarCrewMember && isAllianceCrewMember && styles.allianceCrewMemberCell,
          !isWarCrewMember && !isAllianceCrewMember && isCrewMember && styles.crewMemberCell,
        ]}
        onPress={() => onPress(x, y, cell)}
      >
        <View style={[styles.cellContent, terrainStyleMap[cell.terrain], houseBgStyle]}>
          {cell.entity !== 'house' && getTerrainIcon(cell.terrain)}
          {cell.entity === 'house' && (
            <>
              {cell.owner === 'player' ? (
                <Image 
                  source={(cell.name === currentUserHandle && isShieldActive) || isShielded
                    ? require('../assets/images/hackMap/shielded.png')
                    : require('../assets/images/home.png')
                  } 
                  style={styles.playerHomeIcon} 
                  resizeMode="contain" 
                />
              ) : (
                <>
                  {(() => {
                    const slug = (cell as any).npcSlug as string | undefined;
                    if (slug === 'npc-small-corporation') {
                      return <Image source={require('../assets/images/fog-building.png')} style={styles.playerHomeIcon} resizeMode="contain" />;
                    }
                    // default for small bank and large corporation
                    return <Image source={require('../assets/images/fog-tall-building.png')} style={styles.playerHomeIcon} resizeMode="contain" />;
                  })()}
                </>
              )}
              <View style={styles.entityLabelContainer} pointerEvents="none">
                <Text
                  style={[
                    styles.entityLabel,
                    cell.owner === 'player' ? styles.playerLabel : styles.enemyLabel,
                  ]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {cell.name || (cell.owner === 'player' ? 'YOU' : 'NPC')}
                </Text>
              </View>
              {/* NPC Level Indicator */}
              {cell.owner !== 'player' && cell.npcLevel && (
                <View style={styles.npcLevelContainer} pointerEvents="none">
                  <Text style={styles.npcLevelText}>{cell.npcLevel}</Text>
                </View>
              )}
            </>
          )}
        </View>
      </Pressable>
    );
  }, tileMemoComparison);

  // Phase 3: Simplified tile component for panning (terrain + image only, no labels/levels/indicators)
  type PanningTileProps = {
    x: number;
    y: number;
    terrain: TerrainType;
    entityImage?: {
      entity: EntityType;
      owner?: string;
      userId?: string;
      npcSlug?: string;
    };
    xStyle: any;
    terrainStyleMap: Record<TerrainType, any>;
    currentUserId?: string | null;
    isShieldActive: boolean;
    styles: any;
  };

  const PanningTile: React.FC<PanningTileProps> = React.memo(({ x, y, terrain, entityImage, xStyle, terrainStyleMap, currentUserId, isShieldActive, styles }) => {
    const houseBgStyle = entityImage?.entity === 'house'
      ? (entityImage.owner === 'player'
          ? (entityImage.userId && entityImage.userId === currentUserId ? styles.userHouseBg : styles.otherUserHouseBg)
          : styles.enemyHouseBg)
      : null;

    // For panning tiles, show shield only for current user's house (minimal data)
    const isCurrentUserHouse = entityImage?.owner === 'player' && entityImage?.userId === currentUserId;
    const showShield = isCurrentUserHouse && isShieldActive;

    return (
      <View
        style={[
          styles.cell,
          xStyle,
        ]}
        pointerEvents="none"
      >
        <View style={[styles.cellContent, terrainStyleMap[terrain], houseBgStyle]}>
          {entityImage?.entity !== 'house' && getTerrainIcon(terrain)}
          {entityImage?.entity === 'house' && (
            <>
              {entityImage.owner === 'player' ? (
                <Image 
                  source={showShield
                    ? require('../assets/images/hackMap/shielded.png')
                    : require('../assets/images/home.png')
                  } 
                  style={styles.playerHomeIcon} 
                  resizeMode="contain" 
                />
              ) : (
                <>
                  {(() => {
                    const slug = entityImage.npcSlug;
                    if (slug === 'npc-small-corporation') {
                      return <Image source={require('../assets/images/fog-building.png')} style={styles.playerHomeIcon} resizeMode="contain" />;
                    }
                    return <Image source={require('../assets/images/fog-tall-building.png')} style={styles.playerHomeIcon} resizeMode="contain" />;
                  })()}
                </>
              )}
            </>
          )}
        </View>
      </View>
    );
  }, panningTileMemoComparison);

  // Phase 3: Wrapper for PanningTile (adds yStyle positioning like PoolTile does for Tile)
  type PanningPoolTileProps = {
    x: number;
    y: number;
    terrain: TerrainType;
    entityImage?: {
      entity: EntityType;
      owner?: string;
      userId?: string;
      npcSlug?: string;
    };
    xStyle: any;
    yStyle: any;
    terrainStyleMap: Record<TerrainType, any>;
    currentUserId?: string | null;
    isShieldActive: boolean;
    styles: any;
  };

  const PanningPoolTile: React.FC<PanningPoolTileProps> = React.memo(({ x, y, terrain, entityImage, xStyle, yStyle, terrainStyleMap, currentUserId, isShieldActive, styles }) => {
    return (
      <View style={[yStyle]}>
        <PanningTile x={x} y={y} terrain={terrain} entityImage={entityImage} xStyle={xStyle} terrainStyleMap={terrainStyleMap} currentUserId={currentUserId} isShieldActive={isShieldActive} styles={styles} />
      </View>
    );
  }, panningTileMemoComparison);

  const PoolTile: React.FC<PoolTileProps> = React.memo(({ x, y, cell, selected, onPress, xStyle, yStyle, terrainStyleMap, currentUserHandle, colors, themeMode, styles, dynamicEntityData, isShieldActive, isCrewMember, isWarCrewMember, isAllianceCrewMember }) => {
    return (
      <View style={[yStyle]}>
        <Tile x={x} y={y} cell={cell} selected={selected} onPress={onPress} xStyle={xStyle} terrainStyleMap={terrainStyleMap} currentUserHandle={currentUserHandle} colors={colors} themeMode={themeMode} styles={styles} dynamicEntityData={dynamicEntityData} isShieldActive={isShieldActive} isCrewMember={isCrewMember} isWarCrewMember={isWarCrewMember} isAllianceCrewMember={isAllianceCrewMember} />
      </View>
    );
  }, tileMemoComparison);

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
    currentUserHandle?: string | null;
    colors: ReturnType<typeof useThemeColors>;
    themeMode: 'light' | 'dark';
    styles: any;
    dynamicEntityData: Record<string, any>;
    isShieldActive: boolean;
  };

  const Row: React.FC<RowProps> = ({ y, row, colStart, colEnd, rowVisible, selectedCell, onPress, rowStyle, xPosStyles, terrainStyleMap, disableTiles, currentUserHandle, colors, themeMode, styles, dynamicEntityData, isShieldActive }) => {
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
          return <Tile key={`${x}-${y}`} x={x} y={y} cell={cell} selected={isSelected} onPress={onPress} xStyle={xPosStyles[x]} terrainStyleMap={terrainStyleMap} currentUserHandle={currentUserHandle} colors={colors} themeMode={themeMode} styles={styles} dynamicEntityData={dynamicEntityData} isShieldActive={isShieldActive} />;
        })
      : null;

    return (
      <View style={[styles.row, rowStyle]}>
        {tiles}
      </View>
    );
  };

  const [selectedCell, setSelectedCell] = useState<{x: number, y: number, info: CellData} | null>(null);
  const [showAntivirusModal, setShowAntivirusModal] = useState(false);
  const [showCrewModal, setShowCrewModal] = useState(false);
  const [showCrewOnboardingModal, setShowCrewOnboardingModal] = useState(false);
  const [showVisitingProfileModal, setShowVisitingProfileModal] = useState(false);
  const [visitingProfileUserId, setVisitingProfileUserId] = useState<string | null>(null);
  const visitingProfileCloseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const visitCrewCloseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showVisitCrewModal, setShowVisitCrewModal] = useState(false);
  const [visitCrewId, setVisitCrewId] = useState<string | null>(null);
  const [visitCrewName, setVisitCrewName] = useState<string | null>(null);
  const [showCrewModalFromUser, setShowCrewModalFromUser] = useState(false);
  const offsetX = useSharedValue(0);
  const offsetY = useSharedValue(0);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const minX = useSharedValue(-1000000);
  const maxX = useSharedValue(1000000);
  const minY = useSharedValue(-1000000);
  const maxY = useSharedValue(1000000);
  const boundsReady = useSharedValue(false);
  const initialDims = Dimensions.get('window');
  const [containerSize, setContainerSize] = useState<{ width: number; height: number }>({ width: initialDims.width, height: initialDims.height });
  const [windowRange, setWindowRange] = useState<{ rowStart: number; rowEnd: number; colStart: number; colEnd: number }>({ rowStart: 0, rowEnd: Math.min(14, getGridSize(grid) - 1), colStart: 0, colEnd: Math.min(14, getGridSize(grid) - 1) });
  
  // Phase 5: Use ref for windowRange during panning to reduce re-renders
  const windowRangeRef = useRef<{ rowStart: number; rowEnd: number; colStart: number; colEnd: number }>(windowRange);
  
  const [isMapReady, setIsMapReady] = useState<boolean>(false);
  
  // Static vs Dynamic Data Separation
  const [staticTerrainData, setStaticTerrainData] = useState<Record<string, TerrainType>>({});
  const [dynamicEntityData, setDynamicEntityData] = useState<Record<string, any>>({});
  // Phase 2: Separate entity images from entity details
  const [entityImageData, setEntityImageData] = useState<Record<string, {
    entity: EntityType;
    owner?: string;
    userId?: string;
    npcSlug?: string;
  }>>({});
  const [terrainDataLoaded, setTerrainDataLoaded] = useState<boolean>(false);
  
  // Shield status change tracking
  const [lastShieldStatus, setLastShieldStatus] = useState<boolean | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Phase 1: Panning state management
  const [isPanningJS, setIsPanningJS] = useState<boolean>(false);
  const [panningStopped, setPanningStopped] = useState<boolean>(true);
  
  // Phase 5: Sync ref to state when panning stops
  useEffect(() => {
    if (!isPanningJS && panningStopped) {
      const refRange = windowRangeRef.current;
      const stateRange = windowRange;
      
      // Check if state and ref differ
      const differs = stateRange.rowStart !== refRange.rowStart || stateRange.rowEnd !== refRange.rowEnd ||
                      stateRange.colStart !== refRange.colStart || stateRange.colEnd !== refRange.colEnd;
      
      if (differs) {
        // State and ref differ - sync state to ref (ref has latest panning data)
        setWindowRange(refRange);
        // Don't sync ref to state here - wait for state update to complete
        // The next render will have state == ref, and we can safely sync if needed
      } else {
        // State and ref are equal - safe to keep ref in sync with state
        // This handles cases where state is updated externally (not through this effect)
        windowRangeRef.current = stateRange;
      }
    }
  }, [panningStopped, isPanningJS, windowRange]);

  // Use ref for lastUpdateTime to avoid circular dependency
  const lastUpdateTimeRef = useRef(0);

  // Phase 2: Cell cache to maintain stable object references
  const cellCacheRef = useRef<Map<string, CellData>>(new Map());

  // Phase 3: Shield status cache to track previous shield status per user
  const shieldStatusCacheRef = useRef<Record<string, boolean>>({});
  
  const prevVisibleCellsCountRef = useRef<number>(0);
  
  // Update specific tile shield status without full map refresh
  const updateTileShieldStatus = useCallback(async (userId: string, currentShieldStatus: boolean) => {
    const now = Date.now();
    
    // Debounce updates to prevent excessive re-renders
    if (now - lastUpdateTimeRef.current < 500) {
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}/api/users/shield-status/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const userData = await response.json();
        const actualShieldStatus = userData.antivirusShield?.active || false;
        
        // Only update if the shield status actually changed
        if (actualShieldStatus !== currentShieldStatus) {
          lastUpdateTimeRef.current = now; // Update ref instead of state
          
          // Phase 3: Update shield status cache
          shieldStatusCacheRef.current[userId] = actualShieldStatus;
          
          setDynamicEntityData(prev => {
            const updated = { ...prev };
            let hasChanges = false;
            
            // Find and update the tile for this user
            Object.keys(updated).forEach(key => {
              const entity = updated[key];
              if (entity && entity.userId === userId && entity.owner === 'player' && entity.isShielded !== actualShieldStatus) {
                updated[key] = {
                  ...entity,
                  isShielded: actualShieldStatus
                };
                hasChanges = true;
              }
            });
            
            // Only return new object if there were actual changes
            return hasChanges ? updated : prev;
          });
        }
      }
    } catch (error) {
      console.error('Failed to update tile shield status:', error);
    }
  }, [token]); // Removed lastUpdateTime from dependencies

  // Phase 7A: Virtual Scrolling - Only render visible tiles
  const [virtualViewport, setVirtualViewport] = useState<{ 
    visibleTiles: Set<string>; 
    renderCount: number; 
    totalTiles: number 
  }>({ visibleTiles: new Set(), renderCount: 0, totalTiles: 0 });
  
  const lastVelocityRef = useRef<{ vx: number; vy: number }>({ vx: 0, vy: 0 });
  const rafIdRef = useRef<number | null>(null);
  const lastComputedPanRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lastComputeTsRef = useRef<number>(0);
  const hasCenteredOnHomeRef = useRef<boolean>(false);
  const isPanningRef = useRef<boolean>(false);
  const panStartTimeRef = useRef<number>(0);
  const panEndTimeRef = useRef<number>(0);
  
  // Convert refs to shared values to prevent worklet capture warnings
  const lastVelocity = useSharedValue<{ vx: number; vy: number }>({ vx: 0, vy: 0 });
  const rafId = useSharedValue<number | null>(null);
  const lastComputedPan = useSharedValue<{ x: number; y: number }>({ x: 0, y: 0 });
  const lastComputeTs = useSharedValue<number>(0);
  const hasCenteredOnHome = useSharedValue<boolean>(false);
  const isPanning = useSharedValue<boolean>(false);
  const panStartTime = useSharedValue<number>(0);
  const panEndTime = useSharedValue<number>(0);
  
  // Check if panning is truly complete (no more decay animation)
  const isPanningComplete = useCallback(() => {
    const timeSincePanEnd = Date.now() - panEndTime.value;
    const velocityThreshold = 0.1; // Very small velocity threshold
    
    // Consider panning complete if:
    // 1. We're not actively panning AND
    // 2. It's been more than 100ms since pan end AND
    // 3. Current velocity is very low
    const complete = !isPanning.value && 
           timeSincePanEnd > 100 && 
           Math.abs(lastVelocity.value.vx) < velocityThreshold && 
           Math.abs(lastVelocity.value.vy) < velocityThreshold;
    
    return complete;
  }, []);

  // NOTE: If you're still getting "Reading from 'value' during component render" warnings,
  // you can temporarily disable strict mode in Reanimated config to test functionality.
  // See: https://docs.swmansion.com/react-native-reanimated/docs/debugging/logger-configuration

  const scheduleCompute = (x: number, y: number, vx: number = 0, vy: number = 0) => {
    // Update last known velocity on JS thread (safe)
    lastVelocity.value = { vx, vy };
    
    // Use requestAnimationFrame instead of setTimeout for better performance
    if (rafId.value) {
      cancelAnimationFrame(rafId.value);
    }
    rafId.value = requestAnimationFrame(() => {
      computeWindow(x, y, containerSize.width, containerSize.height);
      rafId.value = null;
    });
  };

  // Force pan completion when needed (e.g., for immediate interaction)
  const forcePanCompletion = useCallback(() => {
    if (isPanning.value) {
      // Stop any ongoing pan gesture
      isPanning.value = false;
      panEndTime.value = Date.now();
      
      // Reset velocity to stop decay animation
      lastVelocity.value = { vx: 0, vy: 0 };
      
      // Force immediate window compute
      const currentX = lastComputedPan.value.x;
      const currentY = lastComputedPan.value.y;
      scheduleCompute(currentX, currentY, 0, 0);
    }
  }, []);

  // Phase 7A: Virtual Scrolling - Calculate which tiles are actually visible
  const calculateVirtualViewport = useCallback((panX: number, panY: number, width: number, height: number) => {
    if (width <= 0 || height <= 0) return;
    
    // Calculate the exact visible area in grid coordinates (no buffer)
    const gridSize = getGridSize(grid);
    const { startCol: clampedStartCol, endCol: clampedEndCol, startRow: clampedStartRow, endRow: clampedEndRow } = 
      calculateViewportFromPan(panX, panY, width, height, gridSize, 0);
    
    // Generate visible tile keys (only what's actually on screen)
    const visibleTiles = generateVisibleTileKeys(clampedStartCol, clampedEndCol, clampedStartRow, clampedEndRow);
    
    // Only update if Set contents actually changed (compare sizes and contents)
    setVirtualViewport(prev => {
      // Compare Set contents to avoid unnecessary updates
      if (prev.visibleTiles.size === visibleTiles.size) {
        let contentsMatch = true;
        for (const tile of visibleTiles) {
          if (!prev.visibleTiles.has(tile)) {
            contentsMatch = false;
            break;
          }
        }
        if (contentsMatch) {
          // Contents are identical, return previous state to avoid new Set reference
          return prev;
        }
      }
      
      // Contents changed, update state
      const totalTiles = (clampedEndRow - clampedStartRow + 1) * (clampedEndCol - clampedStartCol + 1);
      return {
        visibleTiles,
        renderCount: visibleTiles.size,
        totalTiles
      };
    });
  }, [grid]);

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

  // Phase 1: Sync Reanimated isPanning to JS state
  useAnimatedReaction(
    () => isPanning.value,
    (panning) => {
      runOnJS(setIsPanningJS)(panning);
    }
  );

  // Phase 1: Debounce panning stopped (200ms after pan ends)
  useEffect(() => {
    if (!isPanningJS) {
      const timer = setTimeout(() => {
        setPanningStopped(true);
      }, 200);
      return () => clearTimeout(timer);
    } else {
      setPanningStopped(false);
    }
  }, [isPanningJS]);

  useAnimatedReaction(
    () => {
      // Phase 7A: Fix Reanimated warning by creating new objects instead of modifying shared ones
      return { x: offsetX.value, y: offsetY.value };
    },
    (v, prev) => {
      // Only react to significant changes and when actively panning
      if (!prev || Math.abs(v.x - prev.x) > 4 || Math.abs(v.y - prev.y) > 4) {
        const cx = boundsReady.value ? Math.min(maxX.value, Math.max(minX.value, v.x)) : v.x;
        const cy = boundsReady.value ? Math.min(maxY.value, Math.max(minY.value, v.y)) : v.y;
        
        // Update shared values directly instead of calling functions that access refs
        lastComputedPan.value = { x: cx, y: cy };
        
        // Schedule compute using runOnJS but with minimal ref access
        runOnJS(scheduleCompute)(cx, cy, 0, 0);
      }
    }
  );

  const panGesture = Gesture.Pan()
    .onStart(() => {
      startX.value = offsetX.value;
      startY.value = offsetY.value;
      isPanning.value = true;
      panStartTime.value = Date.now();
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
      
      // Update shared values directly instead of calling functions that access refs
      lastComputedPan.value = { x, y };
      
      // Schedule JS-side window compute so tiles load beyond current view
      runOnJS(scheduleCompute)(x, y, g.velocityX ?? 0, g.velocityY ?? 0);
    })
    .onEnd((g) => {
      // Mark panning as ended
      isPanning.value = false;
      panEndTime.value = Date.now();
      
      if (boundsReady.value) {
        // Reduce decay animation duration for faster completion
        offsetX.value = withDecay({ 
          velocity: g.velocityX, 
          deceleration: 0.95, // Increased from 0.997 for faster stop
          clamp: [minX.value, maxX.value] 
        } as any);
        offsetY.value = withDecay({ 
          velocity: g.velocityY, 
          deceleration: 0.95, // Increased from 0.997 for faster stop
          clamp: [minY.value, maxY.value] 
        } as any);
      } else {
        offsetX.value = withDecay({ velocity: g.velocityX, deceleration: 0.95 });
        offsetY.value = withDecay({ velocity: g.velocityY, deceleration: 0.95 });
      }
      
      // Single final compute on pan end - no duplicate calls
      const finalX = boundsReady.value ? Math.min(maxX.value, Math.max(minX.value, startX.value + (g.translationX ?? 0))) : startX.value + (g.translationX ?? 0);
      const finalY = boundsReady.value ? Math.min(maxY.value, Math.max(minY.value, startY.value + (g.translationY ?? 0))) : startY.value + (g.translationY ?? 0);
      
      // Use requestAnimationFrame for smoother final positioning
      requestAnimationFrame(() => {
        runOnJS(scheduleCompute)(finalX, finalY, 0, 0);
        // Update shared value directly instead of calling function that accesses refs
        lastComputedPan.value = { x: finalX, y: finalY };
      });
    });
  const gridSize = grid.length || 50;
  const totalSize = gridSize * CELL_SIZE;
  
  // Phase 5: Two-step approach - fetch initial viewport, then full map if user not found
  // Step 1: Fetch a reasonable initial viewport based on actual pan position (0,0) and visible area
  const initialViewport = useMemo(() => {
    if (containerSize.width === 0 || containerSize.height === 0) {
      // Fallback to center if container not ready (shouldn't happen due to skip condition)
      const buffer = 15;
      const centerX = Math.floor(gridSize / 2);
      const centerY = Math.floor(gridSize / 2);
      return {
        x1: Math.max(0, centerX - buffer),
        y1: Math.max(0, centerY - buffer),
        x2: Math.min(gridSize - 1, centerX + buffer),
        y2: Math.min(gridSize - 1, centerY + buffer),
      };
    }
    
    // Calculate viewport from initial pan position (0,0) to match what's actually visible
    const buffer = 15; // Larger buffer to increase chance of finding user
    const initialPanX = 0;
    const initialPanY = 0;
    const { startCol, endCol, startRow, endRow } = calculateViewportFromPan(
      initialPanX,
      initialPanY,
      containerSize.width,
      containerSize.height,
      gridSize,
      buffer
    );
    
    return {
      x1: startCol,
      y1: startRow,
      x2: endCol,
      y2: endRow,
    };
  }, [gridSize, containerSize.width, containerSize.height]);
  
  const shouldSkipInitialQuery = containerSize.width === 0 || containerSize.height === 0;
  const { data: initialViewportData, isLoading: isLoadingInitialViewport, refetch: refetchInitialViewport } = useFetchMapViewportQuery(
    initialViewport,
    { skip: shouldSkipInitialQuery }
  );
  
  
  // Step 2: Check if user's house is in initial viewport, if not, fetch full map
  const [needsFullMap, setNeedsFullMap] = useState<boolean>(false);
  const { data: fullMapData, isLoading: isLoadingFullMap, refetch: refetchFullMap } = useFetchMapQuery(undefined, {
    skip: !needsFullMap,
  });
  
  // Determine which data to use
  const mapData = needsFullMap ? fullMapData : initialViewportData;
  const isLoading = isLoadingInitialViewport || (needsFullMap && isLoadingFullMap);
  
  // Check if user's house is in initial viewport (check once per user)
  const hasCheckedUserLocationRef = useRef<boolean>(false);
  const lastCheckedUserHandleRef = useRef<string | null>(null);
  useEffect(() => {
    // Reset check if user handle changed
    if (lastCheckedUserHandleRef.current !== currentUserHandle) {
      hasCheckedUserLocationRef.current = false;
      lastCheckedUserHandleRef.current = currentUserHandle || null;
    }
    
    if (hasCheckedUserLocationRef.current) return; // Already checked for this user
    if (!initialViewportData || !initialViewportData.grid || !currentUserHandle) return;
    if (needsFullMap) return; // Already decided we need full map
    
    hasCheckedUserLocationRef.current = true; // Mark as checked before doing the check
    
    const viewport = initialViewportData.viewport || initialViewport;
    let foundUser = false;
    
    for (let y = viewport.y1; y <= viewport.y2; y++) {
      const row = initialViewportData.grid[y];
      if (!row) continue;
      for (let x = viewport.x1; x <= viewport.x2; x++) {
        const cell = row[x];
        if (cell && cell.entity === 'house' && cell.name === currentUserHandle) {
          foundUser = true;
          break;
        }
      }
      if (foundUser) break;
    }
    
    if (!foundUser) {
      // User's house not in initial viewport, need full map
      setNeedsFullMap(true);
    }
  }, [initialViewportData, currentUserHandle, needsFullMap, initialViewport]);
  
  // Refetch function - use appropriate query's refetch
  const refetch = useCallback(() => {
    if (needsFullMap) {
      refetchFullMap();
    } else {
      refetchInitialViewport();
    }
  }, [needsFullMap, refetchFullMap, refetchInitialViewport]);
  
  // Phase 6: Viewport fetching during panning with minimal data
  // Track the last viewport we fetched to avoid duplicate requests
  const lastFetchedViewportRef = useRef<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const [panningViewportParams, setPanningViewportParams] = useState<{ x1: number; y1: number; x2: number; y2: number; minimal?: boolean } | null>(null);
  // Phase 6: Track minimal flag in ref to avoid dependency issues
  const panningViewportMinimalRef = useRef<boolean>(false);
  // Track if a viewport request is currently in flight to prevent cancelling it
  const viewportRequestInFlightRef = useRef<boolean>(false);
  const pendingViewportParamsRef = useRef<{ x1: number; y1: number; x2: number; y2: number; minimal?: boolean } | null>(null);
  
  // Phase 6: Fetch viewport data during panning with minimal flag (terrain + images only, skip details)
  const { data: panningViewportData, isLoading: isLoadingPanningViewport, error: panningViewportError } = useFetchMapViewportQuery(
    panningViewportParams!,
    { skip: !panningViewportParams || !terrainDataLoaded }
  );
  // Phase 5: Optimize shield status polling - increase interval and make viewport-aware
  // Check if there are any player tiles in the visible viewport
  // Phase 5: Use ref for windowRange during panning to reduce re-renders
  const hasVisiblePlayerTiles = useMemo(() => {
    if (!terrainDataLoaded) return false;
    
    // Check visible cells for player tiles
    if (virtualViewport.visibleTiles.size > 0) {
      for (const tileKey of virtualViewport.visibleTiles) {
        const entity = dynamicEntityData[tileKey];
        if (entity && entity.owner === 'player') {
          return true;
        }
      }
    } else {
      // Phase 5: Use ref when panning, state when not panning
      const currentWindowRange = isPanningJS ? windowRangeRef.current : windowRange;
      // Fallback: check window range
      for (let y = currentWindowRange.rowStart; y <= currentWindowRange.rowEnd; y++) {
        for (let x = currentWindowRange.colStart; x <= currentWindowRange.colEnd; x++) {
          const key = `${x},${y}`;
          const entity = dynamicEntityData[key];
          if (entity && entity.owner === 'player') {
            return true;
          }
        }
      }
    }
    return false;
  }, [terrainDataLoaded, virtualViewport.visibleTiles, dynamicEntityData, windowRange, isPanningJS]);
  
  // Phase 5: Only poll when player tiles are visible, and increase interval to 5s
  // Phase 8: Disable RTK Query polling - will use synchronized polling instead
  const { data: shieldData, refetch: refetchShieldStatus } = useGetShieldStatusQuery(undefined, {
    pollingInterval: 0, // Phase 8: Disabled - using synchronized polling
    skip: !hasVisiblePlayerTiles && !currentUserId, // Skip if no player tiles visible and no current user
  });
  
  // Get research features data (same as ResearchFeaturesList)
  const { data: researchFeatures } = useGetUserFeaturesQuery('home-defense');
  const { data: hackCrewFeatures } = useGetUserFeaturesQuery('hack-crew');
  const { data: crewStatus, isLoading: isLoadingCrewStatus } = useGetCrewStatusQuery();
  
  const { data: crewDetails, isLoading: isLoadingCrewDetails } = useGetCrewDetailsQuery(crewStatus?.crewId || '', {
    skip: !crewStatus?.crewId || !crewStatus?.isInCrew,
  });

  // Phase 8: Disable RTK Query polling - will use synchronized polling instead
  const { data: warStatusData, refetch: refetchWarStatus } = useGetWarStatusQuery(undefined, {
    skip: !crewStatus?.isInCrew,
    pollingInterval: 0, // Phase 8: Disabled - using synchronized polling
    refetchOnMountOrArgChange: true,
  });

  const { data: allianceStatusData, refetch: refetchAllianceStatus } = useGetAllianceStatusQuery(undefined, {
    skip: !crewStatus?.isInCrew,
    pollingInterval: 0, // Phase 8: Disabled - using synchronized polling
    refetchOnMountOrArgChange: true,
  });

  const warsWeDeclared = warStatusData?.warsWeDeclared || [];
  const warsDeclaredOnUs = warStatusData?.warsDeclaredOnUs || [];
  const primaryWarCrewId = warsWeDeclared[0]?.enemyCrewId || warsDeclaredOnUs[0]?.enemyCrewId || null;

  const { data: primaryWarCrewDetails } = useGetCrewDetailsQuery(primaryWarCrewId || '', {
    skip: !primaryWarCrewId,
  });

  const warCrewMemberUserIds = useMemo(() => {
    // Return empty set if no war crew ID
    if (!primaryWarCrewId) {
      return new Set<string>();
    }
    // Only use crew details if they match the current war crew ID
    if (!primaryWarCrewDetails?.crew || primaryWarCrewDetails.crew.id !== primaryWarCrewId) {
      return new Set<string>();
    }
    const memberIds = new Set<string>();
    if (primaryWarCrewDetails.crew.president?.userId) {
      memberIds.add(String(primaryWarCrewDetails.crew.president.userId));
    }
    (primaryWarCrewDetails.crew.executives || []).forEach((exec: any) => {
      if (exec.userId) {
        memberIds.add(String(exec.userId));
      }
    });
    (primaryWarCrewDetails.crew.members || []).forEach((member: any) => {
      if (member.userId) {
        memberIds.add(String(member.userId));
      }
    });
    return memberIds;
  }, [primaryWarCrewId, primaryWarCrewDetails]);

  const alliances = allianceStatusData?.alliances || [];
  // Memoize allianceCrewIds to prevent unnecessary recalculations in dependent useMemos
  // Create a stable dependency key from alliance IDs
  const allianceCrewIdsKey = useMemo(() => {
    return (alliances || []).map(a => a.alliedCrewId).join(',');
  }, [alliances]);
  const allianceCrewIds = useMemo(() => {
    return (alliances || []).map(a => a.alliedCrewId).slice(0, 10);
  }, [allianceCrewIdsKey]);
  
  const allianceCrewDetails1 = useGetCrewDetailsQuery(allianceCrewIds[0] || '', { skip: !allianceCrewIds[0] });
  const allianceCrewDetails2 = useGetCrewDetailsQuery(allianceCrewIds[1] || '', { skip: !allianceCrewIds[1] });
  const allianceCrewDetails3 = useGetCrewDetailsQuery(allianceCrewIds[2] || '', { skip: !allianceCrewIds[2] });
  const allianceCrewDetails4 = useGetCrewDetailsQuery(allianceCrewIds[3] || '', { skip: !allianceCrewIds[3] });
  const allianceCrewDetails5 = useGetCrewDetailsQuery(allianceCrewIds[4] || '', { skip: !allianceCrewIds[4] });
  const allianceCrewDetails6 = useGetCrewDetailsQuery(allianceCrewIds[5] || '', { skip: !allianceCrewIds[5] });
  const allianceCrewDetails7 = useGetCrewDetailsQuery(allianceCrewIds[6] || '', { skip: !allianceCrewIds[6] });
  const allianceCrewDetails8 = useGetCrewDetailsQuery(allianceCrewIds[7] || '', { skip: !allianceCrewIds[7] });
  const allianceCrewDetails9 = useGetCrewDetailsQuery(allianceCrewIds[8] || '', { skip: !allianceCrewIds[8] });
  const allianceCrewDetails10 = useGetCrewDetailsQuery(allianceCrewIds[9] || '', { skip: !allianceCrewIds[9] });

  // Memoize the array to prevent unnecessary recalculations
  const allianceCrewDetailsArray = useMemo(() => [
    allianceCrewDetails1.data,
    allianceCrewDetails2.data,
    allianceCrewDetails3.data,
    allianceCrewDetails4.data,
    allianceCrewDetails5.data,
    allianceCrewDetails6.data,
    allianceCrewDetails7.data,
    allianceCrewDetails8.data,
    allianceCrewDetails9.data,
    allianceCrewDetails10.data,
  ], [
    allianceCrewDetails1.data,
    allianceCrewDetails2.data,
    allianceCrewDetails3.data,
    allianceCrewDetails4.data,
    allianceCrewDetails5.data,
    allianceCrewDetails6.data,
    allianceCrewDetails7.data,
    allianceCrewDetails8.data,
    allianceCrewDetails9.data,
    allianceCrewDetails10.data,
  ]);

  const allianceCrewMemberUserIds = useMemo(() => {
    if (!allianceCrewIds || allianceCrewIds.length === 0) {
      return new Set<string>();
    }
    const allMemberIds = new Set<string>();
    allianceCrewDetailsArray.forEach((allianceCrewDetails, index) => {
      const alliedCrewId = allianceCrewIds[index];
      if (allianceCrewDetails?.crew && allianceCrewDetails.crew.id === alliedCrewId) {
        if (allianceCrewDetails.crew.president?.userId) {
          allMemberIds.add(String(allianceCrewDetails.crew.president.userId));
        }
        (allianceCrewDetails.crew.executives || []).forEach((exec: any) => {
          if (exec.userId) {
            allMemberIds.add(String(exec.userId));
          }
        });
        (allianceCrewDetails.crew.members || []).forEach((member: any) => {
          if (member.userId) {
            allMemberIds.add(String(member.userId));
          }
        });
      }
    });
    return allMemberIds;
  }, [allianceCrewIds, allianceCrewDetailsArray]);
  
  const crewMemberUserIds = useMemo(() => {
    if (!crewDetails?.crew) return new Set<string>();
    const memberIds = new Set<string>();
    if (crewDetails.crew.president?.userId) {
      memberIds.add(String(crewDetails.crew.president.userId));
    }
    (crewDetails.crew.executives || []).forEach((exec: any) => {
      if (exec.userId) {
        memberIds.add(String(exec.userId));
      }
    });
    (crewDetails.crew.members || []).forEach((member: any) => {
      if (member.userId) {
        memberIds.add(String(member.userId));
      }
    });
    return memberIds;
  }, [crewDetails]);
  
  const selectedUserId = selectedCell?.info.owner === 'player' && 
    selectedCell.info.userId && 
    selectedCell.info.name !== currentUserHandle 
    ? selectedCell.info.userId 
    : null;
  
  const { data: selectedUserCrewStatus, isLoading: isLoadingSelectedUserCrewStatus } = useGetUserCrewStatusQuery(selectedUserId ?? '', {
    skip: !selectedUserId,
  });
  
  const isSameCrewMember = useMemo(() => {
    if (!crewStatus?.isInCrew) return false;
    if (!selectedCell?.info.userId) return false;
    
    const selectedUserIdString = String(selectedCell.info.userId);
    
    if (crewMemberUserIds.has(selectedUserIdString)) {
      return true;
    }
    
    if (selectedUserCrewStatus?.isInCrew && crewStatus?.crewId && selectedUserCrewStatus?.crewId) {
      return String(crewStatus.crewId) === String(selectedUserCrewStatus.crewId);
    }
    
    return false;
  }, [crewStatus, selectedUserCrewStatus, selectedCell, crewMemberUserIds]);
  
  const shouldShowHackButton = useMemo(() => {
    if (selectedCell?.info.owner !== 'player' || !selectedCell.info.userId || selectedCell.info.name === currentUserHandle) {
      return false;
    }
    
    if (isLoadingCrewStatus) {
      return false;
    }
    
    if (crewStatus?.isInCrew) {
      if (isLoadingCrewDetails) {
        return false;
      }
      
      const selectedUserIdString = String(selectedCell.info.userId);
      
      if (crewMemberUserIds.size > 0) {
        if (crewMemberUserIds.has(selectedUserIdString)) {
          return false;
        }
      }
      
      if (isLoadingSelectedUserCrewStatus) {
        return false;
      }
      
      if (isSameCrewMember) {
        return false;
      }
      
      if (crewMemberUserIds.size === 0 && selectedUserCrewStatus === undefined) {
        return false;
      }
      
      if (selectedUserCrewStatus && selectedUserCrewStatus.isInCrew === false) {
        return true;
      }
    }
    
    return true;
  }, [selectedCell, currentUserHandle, crewStatus, isLoadingCrewStatus, isLoadingCrewDetails, isLoadingSelectedUserCrewStatus, crewMemberUserIds, isSameCrewMember, selectedUserCrewStatus]);
  
  // Find the antivirus feature from the research features
  const antivirusFeature = researchFeatures?.find(f => f.id === 'antivirus');
  
  // Find the crew-system-unlock feature from hack-crew features
  const hackCrewFeature = hackCrewFeatures?.find(f => f.id === 'crew-system-unlock');
  
  // Use local timer logic to determine if actually unlocked (same as ResearchFeaturesList)
  // Calculate remaining time to match ResearchFeaturesList logic
  const now = new Date().getTime();
  const researchCompletesAt = antivirusFeature?.researchCompletesAt ? new Date(antivirusFeature.researchCompletesAt).getTime() : 0;
  const remaining = Math.max(0, researchCompletesAt - now);
  const isActuallyUnlocked = antivirusFeature?.isUnlocked || 
    (antivirusFeature?.isResearching && remaining === 0);
  
  // Check hack crew unlock status
  const hackCrewResearchCompletesAt = hackCrewFeature?.researchCompletesAt ? new Date(hackCrewFeature.researchCompletesAt).getTime() : 0;
  const hackCrewRemaining = Math.max(0, hackCrewResearchCompletesAt - now);
  const isHackCrewUnlocked = hackCrewFeature?.isUnlocked || 
    (hackCrewFeature?.isResearching && hackCrewRemaining === 0);
  
  // Debug logging - REMOVED to fix infinite loop
  
  const isShieldActive = shieldData?.isActive || false;

  // Phase 7: Optimize shield status effect - only update tiles that actually changed
  // Trigger immediate updates for ALL users when current user's shield status changes
  useEffect(() => {
    if (lastShieldStatus !== null && lastShieldStatus !== isShieldActive && currentUserId) {
      const cache = shieldStatusCacheRef.current;
      const tilesToUpdate: Array<{ userId: string; currentStatus: boolean }> = [];
      
      // Phase 7: Collect tiles that need updates (only those that changed)
      if (dynamicEntityData) {
        Object.keys(dynamicEntityData).forEach(key => {
          const entity = dynamicEntityData[key];
          if (entity && entity.owner === 'player' && entity.userId) {
            const userId = entity.userId;
            const currentStatus = entity.isShielded || false;
            const cachedStatus = cache[userId];
            
            // Only add to update list if status changed or first time seeing this user
            if (cachedStatus === undefined || cachedStatus !== currentStatus) {
              tilesToUpdate.push({ userId, currentStatus });
            }
          }
        });
      }
      
      // Phase 7: Batch updates for multiple changed tiles
      if (tilesToUpdate.length > 0) {
        unstable_batchedUpdates(() => {
          // Update cache and trigger updates for changed tiles
          tilesToUpdate.forEach(({ userId, currentStatus }) => {
            cache[userId] = currentStatus;
            updateTileShieldStatusRef.current(userId, currentStatus);
          });
          
          // Update current user's tile
          setDynamicEntityData(prev => {
            const updated = { ...prev };
            let found = false;
            Object.keys(updated).forEach(key => {
              const entity = updated[key];
              if (entity && entity.userId === currentUserId && entity.owner === 'player') {
                updated[key] = {
                  ...entity,
                  isShielded: isShieldActive
                };
                // Phase 7: Update cache for current user
                cache[currentUserId] = isShieldActive;
                found = true;
              }
            });
            
            return updated;
          });
        });
      } else {
        // No other tiles to update, just update current user's tile
        unstable_batchedUpdates(() => {
          setDynamicEntityData(prev => {
            const updated = { ...prev };
            let found = false;
            Object.keys(updated).forEach(key => {
              const entity = updated[key];
              if (entity && entity.userId === currentUserId && entity.owner === 'player') {
                updated[key] = {
                  ...entity,
                  isShielded: isShieldActive
                };
                // Phase 7: Update cache for current user
                cache[currentUserId] = isShieldActive;
                found = true;
              }
            });
            
            return updated;
          });
        });
      }
    }
    setLastShieldStatus(isShieldActive);
  }, [isShieldActive, lastShieldStatus, currentUserId]);

  // Store the latest updateTileShieldStatus function in a ref to avoid stale closures
  const updateTileShieldStatusRef = useRef(updateTileShieldStatus);
  
  // Bug Fix: Use ref to track latest grid value to avoid stale closures in viewport merging
  // This ensures sequential viewport updates don't overwrite each other's changes
  const gridRef = useRef(grid);
  updateTileShieldStatusRef.current = updateTileShieldStatus;

  // Phase 8: Synchronized polling hook
  const useSynchronizedPolling = (intervalMs: number, callback: () => void, deps: React.DependencyList = []) => {
    useEffect(() => {
      const getTimeUntilNextSync = () => {
        const now = Date.now();
        const interval = intervalMs;
        // Calculate time until next sync point (aligned to interval boundaries)
        const timeSinceLastSync = now % interval;
        return interval - timeSinceLastSync;
      };
      
      const delay = getTimeUntilNextSync();
      let intervalId: ReturnType<typeof setInterval> | null = null;
      
      const timeout = setTimeout(() => {
        callback(); // First sync
        intervalId = setInterval(callback, intervalMs); // Subsequent syncs
      }, delay);
      
      return () => {
        clearTimeout(timeout);
        if (intervalId) {
          clearInterval(intervalId);
        }
      };
    }, [intervalMs, ...deps]); // eslint-disable-line react-hooks/exhaustive-deps
  };

  // Phase 3: Only update shield status when it actually changed
  // Phase 8: 3-second polling group (Shield status + Shield interval check)
  const checkShieldInterval = useCallback(() => {
    if (!isRefreshing) {
      // Get current dynamicEntityData without depending on it in the dependency array
      setDynamicEntityData(currentData => {
        if (currentData) {
          const cache = shieldStatusCacheRef.current;
          Object.values(currentData).forEach((entity: any) => {
            if (entity && entity.owner === 'player' && entity.userId) {
              const userId = entity.userId;
              const currentStatus = entity.isShielded || false;
              const cachedStatus = cache[userId];
              
              // Phase 3: Only update if shield status actually changed
              if (cachedStatus === undefined || cachedStatus !== currentStatus) {
                // Status changed or first time seeing this user - update cache and trigger update
                cache[userId] = currentStatus;
                // Use the ref to get the latest updateTileShieldStatus function
                // updateTileShieldStatus already has change detection, so it will only update if needed
                updateTileShieldStatusRef.current(userId, currentStatus);
              }
            }
          });
        }
        return currentData; // Return unchanged data
      });
    }
  }, [isRefreshing]);

  // Store the latest checkShieldInterval function in a ref to avoid stale closures in polling
  const checkShieldIntervalRef = useRef(checkShieldInterval);
  useEffect(() => {
    checkShieldIntervalRef.current = checkShieldInterval;
  }, [checkShieldInterval]);

  // Phase 8: Synchronized 3-second polling group
  useSynchronizedPolling(3000, () => {
    if (hasVisiblePlayerTiles || currentUserId) {
      refetchShieldStatus();
    }
    // Use ref to get latest checkShieldInterval function (avoids stale closure)
    checkShieldIntervalRef.current();
  }, [hasVisiblePlayerTiles, currentUserId]);

  // Phase 9: Check if NPCs are visible in viewport
  const hasVisibleNPCs = useMemo(() => {
    if (!terrainDataLoaded) return false;
    
    // Check visible cells for NPC tiles
    if (virtualViewport.visibleTiles.size > 0) {
      for (const tileKey of virtualViewport.visibleTiles) {
        const entity = dynamicEntityData[tileKey];
        if (entity && entity.npcSlug) {
          return true;
        }
      }
    } else {
      // Phase 5: Use ref when panning, state when not panning
      const currentWindowRange = isPanningJS ? windowRangeRef.current : windowRange;
      // Fallback: check window range
      for (let y = currentWindowRange.rowStart; y <= currentWindowRange.rowEnd; y++) {
        for (let x = currentWindowRange.colStart; x <= currentWindowRange.colEnd; x++) {
          const key = `${x},${y}`;
          const entity = dynamicEntityData[key];
          if (entity && entity.npcSlug) {
            return true;
          }
        }
      }
    }
    return false;
  }, [terrainDataLoaded, virtualViewport.visibleTiles, dynamicEntityData, windowRange, isPanningJS]);

  // Phase 9: Check if any entities (NPCs or players) are visible
  const hasVisibleEntities = useMemo(() => {
    return hasVisiblePlayerTiles || hasVisibleNPCs;
  }, [hasVisiblePlayerTiles, hasVisibleNPCs]);

  // Phase 9: Viewport refresh for entity updates (NPCs, player positions, entity changes)
  // The viewport API already includes all entity data, so we can refresh it to get updates
  const [entityUpdateViewportParams, setEntityUpdateViewportParams] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const { data: entityUpdateViewportData } = useFetchMapViewportQuery(
    entityUpdateViewportParams!,
    { 
      skip: !entityUpdateViewportParams || !terrainDataLoaded || !hasVisibleEntities,
      refetchOnMountOrArgChange: true
    }
  );

  // Phase 9: Process entity update viewport data
  // Track processed viewport with timestamp to allow reprocessing for polling updates
  const processedEntityUpdateViewportRef = useRef<{ viewportKey: string; timestamp: number } | null>(null);
  useEffect(() => {
    if (entityUpdateViewportData && entityUpdateViewportData.grid && entityUpdateViewportData.viewport) {
      const viewport = entityUpdateViewportData.viewport;
      const viewportKey = `${viewport.x1},${viewport.y1},${viewport.x2},${viewport.y2}`;
      const now = Date.now();
      
      // Phase 9: Prevent duplicate processing within same render cycle, but allow reprocessing for polling
      // Check if same viewport was processed very recently (< 1 second) to prevent infinite loops
      // This allows 10-second polling to work while preventing rapid duplicate processing
      if (processedEntityUpdateViewportRef.current?.viewportKey === viewportKey && 
          now - processedEntityUpdateViewportRef.current.timestamp < 1000) {
        return;
      }
      processedEntityUpdateViewportRef.current = { viewportKey, timestamp: now };
      
      const { terrain, entityImages, entityDetails } = separateStaticAndDynamicData(entityUpdateViewportData.grid, entityUpdateViewportData.viewport);
      
      // Phase 1: Batch state updates to reduce re-renders
      unstable_batchedUpdates(() => {
        // Update entity data (terrain already loaded, just update entities)
        setEntityImageData(prev => {
          const merged = { ...prev };
          const updatedKeys: string[] = [];
          Object.entries(entityImages).forEach(([key, value]) => {
            if (prev[key] !== value) {
              updatedKeys.push(key);
            }
            merged[key] = value;
          });
          
          // Clean up entity image cache for cells that are now empty
          const deletedKeys = cleanupEmptyCells(merged, entityUpdateViewportData.grid, viewport);
          
          return merged;
        });
        
        setDynamicEntityData(prev => {
          const merged = { ...prev };
          Object.entries(entityDetails).forEach(([key, value]) => {
            merged[key] = value;
          });
          
          // Clean up entity details cache for cells that are now empty
          cleanupEmptyCells(merged, entityUpdateViewportData.grid, viewport);
          
          return merged;
        });
        
        // Update grid data - use ref to get latest grid value to avoid stale closures
        const mergedGrid = mergeGridData(
          gridRef.current,
          entityUpdateViewportData.grid,
          viewport,
          gridSize
        );
        dispatch(setGrid(mergedGrid));
        // Bug Fix: Update gridRef immediately to prevent race conditions
        // If multiple effects run in the same cycle, they need to read the updated value
        gridRef.current = mergedGrid;
      });
      
      // Clear viewport params to allow next refresh
      setEntityUpdateViewportParams(null);
    }
  }, [entityUpdateViewportData, dispatch, gridSize]);

  // Phase 8: Synchronized 10-second polling group
  // Phase 9: Added entity updates (NPCs, player positions, entity changes) to 10s group
  useSynchronizedPolling(10000, () => {
    if (crewStatus?.isInCrew) {
      refetchWarStatus();
      refetchAllianceStatus();
    }
    
    // Phase 9: Refresh viewport data for entity updates if entities are visible
    if (hasVisibleEntities && terrainDataLoaded) {
      // Phase 5: Use ref when panning, state when not panning
      const currentWindowRange = isPanningJS ? windowRangeRef.current : windowRange;
      const currentViewport = {
        x1: currentWindowRange.colStart,
        y1: currentWindowRange.rowStart,
        x2: currentWindowRange.colEnd,
        y2: currentWindowRange.rowEnd,
      };
      setEntityUpdateViewportParams(currentViewport);
    }
  }, [crewStatus?.isInCrew, hasVisibleEntities, terrainDataLoaded, windowRange, isPanningJS]);

  // Precompute terrain style map and position style caches
  // Memoized with stable references to prevent unnecessary re-renders
  const terrainStyleMap = useMemo(() => {
    const styles = {
      water: getTerrainStyle('water'),
      mountain: getTerrainStyle('mountain'),
      forest: getTerrainStyle('forest'),
      road: getTerrainStyle('road'),
      grass: getTerrainStyle('grass'),
      dirt: getTerrainStyle('dirt'),
      plain: getTerrainStyle('plain'),
    };
    return styles;
  }, [colors, themeMode]) as Record<TerrainType, any>;

  const xPosStyles = useMemo(() => 
    Array.from({ length: gridSize }, (_, x) => ({ position: 'absolute' as const, left: x * CELL_SIZE, top: 0 })), 
    [gridSize]
  );

  const rowPosStyles = useMemo(() => 
    Array.from({ length: gridSize }, (_, y) => ({ position: 'absolute' as const, top: y * CELL_SIZE, left: 0 })), 
    [gridSize]
  );

  const yPosStyles = useMemo(() => 
    Array.from({ length: gridSize }, (_, y) => ({ position: 'absolute' as const, top: y * CELL_SIZE })), 
    [gridSize]
  );

  // Phase 2: Stabilize cell object references using cache
  const isPanningJSRef = useRef(isPanningJS);
  useEffect(() => {
    isPanningJSRef.current = isPanningJS;
  }, [isPanningJS]);
  
  const visibleCells = useMemo(() => {
    const cells: Array<{ x: number; y: number; cell: CellData }> = [];
    
    if (!terrainDataLoaded) return cells;
    
    
    // Use ref for panning state, but read data directly from state (not refs)
    // This ensures we get the latest data even after cache clears
    const currentIsPanningJS = isPanningJSRef.current;
    const currentWindowRange = currentIsPanningJS ? windowRangeRef.current : windowRange;
    
    const cache = cellCacheRef.current;
    
    // Phase 2: Cell cache to maintain stable object references
    // Bug Fix: Use entityImageData as fallback when dynamicEntityData is missing
    // This prevents entities from disappearing when panning stops before full details are loaded
    const getOrCreateCell = (x: number, y: number, terrain: TerrainType, entity: any, entityImage: any): CellData => {
      // Include entityImage in cache key to ensure proper cache invalidation
      const cacheKey = `${x},${y}-${terrain}-${entity?.entity || entityImage?.entity || 'empty'}-${entity?.owner || entityImage?.owner || ''}-${entity?.name || ''}-${entity?.userId || entityImage?.userId || ''}-${entity?.npcSlug || entityImage?.npcSlug || ''}-${entity?.npcInstanceId || entityImage?.npcInstanceId || ''}-${entity?.npcLevel || ''}-${entity?.isShielded || false}`;
      
      let cell = cache.get(cacheKey);
      
      // Check if cached cell matches current data (including entityImage fallback)
      const currentEntity = entity?.entity || entityImage?.entity || 'empty';
      const currentOwner = entity?.owner || entityImage?.owner;
      const currentUserId = entity?.userId || entityImage?.userId;
      const currentNpcSlug = entity?.npcSlug || entityImage?.npcSlug;
      const currentNpcInstanceId = entity?.npcInstanceId || entityImage?.npcInstanceId;
      
      if (!cell || 
          cell.terrain !== terrain ||
          cell.entity !== currentEntity ||
          cell.owner !== currentOwner ||
          cell.name !== entity?.name ||
          cell.userId !== currentUserId ||
          cell.npcSlug !== currentNpcSlug ||
          cell.npcInstanceId !== currentNpcInstanceId ||
          cell.npcLevel !== entity?.npcLevel ||
          cell.isShielded !== entity?.isShielded) {
        const newCell: CellData = {
          terrain,
          entity: currentEntity,
          owner: currentOwner,
          name: entity?.name,
          userId: currentUserId,
          npcSlug: currentNpcSlug,
          npcInstanceId: currentNpcInstanceId,
          npcLevel: entity?.npcLevel,
          isShielded: entity?.isShielded,
        } as any;
        
        if (cache.size >= MAX_CACHE_SIZE) {
          const firstKey = cache.keys().next().value;
          if (firstKey !== undefined) {
            cache.delete(firstKey);
          }
        }
        cache.set(cacheKey, newCell);
        cell = newCell;
      }
      
      return cell;
    };
    
    // Phase 7A: Virtual Scrolling - Only render tiles that are actually visible
    if (virtualViewport.visibleTiles.size > 0) {
      // Use virtual viewport for ultra-efficient rendering
      virtualViewport.visibleTiles.forEach(tileKey => {
        const [x, y] = tileKey.split(',').map(Number);
        // Read directly from state to avoid ref timing issues after cache clears
        const terrain = staticTerrainData[tileKey];
        const entity = dynamicEntityData[tileKey];
        // Bug Fix: Use entityImageData as fallback when dynamicEntityData is missing
        // This prevents entities from disappearing when panning stops before full details are loaded
        const entityImage = entityImageData[tileKey];
        
        if (!terrain) return;
        
        const cell = getOrCreateCell(x, y, terrain, entity, entityImage);
        cells.push({ x, y, cell });
      });
    } else {
      // Phase 5: Use ref when panning, state when not panning
      for (let y = currentWindowRange.rowStart; y <= currentWindowRange.rowEnd; y++) {
        for (let x = currentWindowRange.colStart; x <= currentWindowRange.colEnd; x++) {
          const key = `${x},${y}`;
          // Read directly from state to avoid ref timing issues after cache clears
          const terrain = staticTerrainData[key];
          const entity = dynamicEntityData[key];
          // Bug Fix: Use entityImageData as fallback when dynamicEntityData is missing
          // This prevents entities from disappearing when panning stops before full details are loaded
          const entityImage = entityImageData[key];
          
          if (!terrain) continue;
          
          const cell = getOrCreateCell(x, y, terrain, entity, entityImage);
          cells.push({ x, y, cell });
        }
      }
    }
    
    // Logging: Track visibleCells count changes (only log if count actually changed)
    if (prevVisibleCellsCountRef.current !== cells.length) {
      prevVisibleCellsCountRef.current = cells.length;
    }
    
    return cells;
  }, [virtualViewport.visibleTiles, windowRange.rowStart, windowRange.rowEnd, windowRange.colStart, windowRange.colEnd, staticTerrainData, dynamicEntityData, entityImageData, terrainDataLoaded]);



  // Bug Fix: Keep gridRef in sync with Redux state to avoid stale closures
  useEffect(() => {
    gridRef.current = grid;
  }, [grid]);

  // Separate static terrain data from dynamic entity data for optimal loading
  // Bug Fix: Support viewport filtering to only process cells within viewport bounds
  // Phase 2: Split entities into entityImages (minimal) and entityDetails (full)
  const separateStaticAndDynamicData = useCallback((gridData: any[][], viewport?: { x1: number; y1: number; x2: number; y2: number }) => {
    const terrain: Record<string, TerrainType> = {};
    const entityImages: Record<string, {
      entity: EntityType;
      owner?: string;
      userId?: string;
      npcSlug?: string;
    }> = {};
    const entityDetails: Record<string, any> = {};
    
    for (let y = 0; y < gridData.length; y++) {
      const row = gridData[y];
      if (!row) continue;
      for (let x = 0; x < row.length; x++) {
        const cell = row[x];
        if (!cell) continue;
        
        // Bug Fix: For viewport requests, only process cells within viewport bounds
        // This prevents overwriting cached terrain outside viewport with 'plain'
        if (viewport) {
          // Bug Fix: Validate viewport coordinates are valid numbers (defensive check)
          if (isValidViewport(viewport)) {
            const isInViewport = x >= viewport.x1 && x <= viewport.x2 && y >= viewport.y1 && y <= viewport.y2;
            if (!isInViewport) {
              continue; // Skip cells outside viewport to preserve cached data
            }
          }
        }
        
        const key = `${x},${y}`;
        
        // Terrain is static - load once and cache
        terrain[key] = cell.terrain;
        
        // Phase 2: Split entities into images (minimal) and details (full)
        if (cell.entity !== 'empty') {
          // EntityImages: minimal info for rendering images
          entityImages[key] = {
            entity: cell.entity,
            owner: cell.owner,
            userId: cell.userId,
            npcSlug: cell.npcSlug,
          };
          
          // EntityDetails: full info for interactions
          // Keep entity and owner in details too for backward compatibility with existing rendering code
          entityDetails[key] = {
            entity: cell.entity,
            owner: cell.owner,
            name: cell.name,
            npcLevel: cell.npcLevel,
            isShielded: cell.isShielded,
            npcInstanceId: cell.npcInstanceId,
            userId: cell.userId,
            npcSlug: cell.npcSlug,
          };
        }
      }
    }
    
    return { terrain, entityImages, entityDetails };
  }, []);

  useEffect(() => {
    dispatch(setLoading(isLoading));
    if (mapData && mapData.grid) {
      // Phase 4B: Merge new data with existing cache instead of replacing
      // This ensures cached terrain data persists across refetches
      // Bug Fix: For viewport requests, only process cells within viewport to preserve cached data outside
      // Phase 2: Now returns three layers: terrain, entityImages, entityDetails
      const { terrain, entityImages, entityDetails } = separateStaticAndDynamicData(mapData.grid, mapData.viewport);
      
      // Phase 1: Batch state updates to reduce re-renders
      unstable_batchedUpdates(() => {
        setStaticTerrainData(prev => {
          // Terrain is static - merge to preserve existing cached terrain
          // Bug Fix: For viewport requests, only terrain within viewport is merged
          return { ...prev, ...terrain };
        });
        
        // Phase 2: Populate entityImageData (minimal info for rendering)
        setEntityImageData(prev => {
          const merged = { ...prev, ...entityImages };
          
          // Phase 2: Also clear entityImageData for cells that are now empty
          // Bug Fix: Only iterate through cells that are in the viewport (if viewport provided)
          if (mapData.viewport) {
            // Viewport: use helper for efficient cleanup
            cleanupEmptyCells(merged, mapData.grid, mapData.viewport);
          } else {
            // Full map: iterate through all cells
            const cellsToCheck = getCellsToCheck(mapData.grid);
            for (const { x, y, cell } of cellsToCheck) {
              const key = `${x},${y}`;
              if (cell.entity === 'empty' && merged[key]) {
                delete merged[key];
              }
            }
          }
          
          return merged;
        });
        
        setDynamicEntityData(prev => {
          // Entities are dynamic - merge to preserve existing cached entities
          // Bug Fix #1: Also clear entity data for cells that are now empty
          // When an entity is removed (NPC defeated, house destroyed), we need to delete it from cache
          // Phase 2: Now using entityDetails instead of entities
          const merged = { ...prev, ...entityDetails };
          
          // Bug Fix: Only iterate through cells that are in the viewport (if viewport provided)
          // For full map requests, iterate all cells. For viewport requests, only viewport cells.
          if (mapData.viewport) {
            // Viewport: use helper for efficient cleanup
            cleanupEmptyCells(merged, mapData.grid, mapData.viewport);
          } else {
            // Full map: iterate through all cells
            const cellsToCheck = getCellsToCheck(mapData.grid);
            for (const { x, y, cell } of cellsToCheck) {
              const key = `${x},${y}`;
              if (cell.entity === 'empty' && merged[key]) {
                delete merged[key];
              }
            }
          }
          
          return merged;
        });
        
        setTerrainDataLoaded(true);
        
        // Bug Fix: For viewport requests, merge with existing grid instead of replacing
        // This preserves cached data outside the viewport
        if (mapData.viewport) {
          // Bug Fix: Validate viewport coordinates are valid numbers (defensive check)
          if (!isValidViewport(mapData.viewport)) {
            // Invalid viewport - treat as full map request
            dispatch(setGrid(mapData.grid));
          } else {
            // Viewport request - merge with existing grid
            // Bug Fix: Read from ref to get latest grid value, avoiding stale closures
            // This ensures sequential viewport updates don't overwrite each other's changes
            const mergedGrid = mergeGridData(
              gridRef.current,
              mapData.grid,
              mapData.viewport,
              mapData.grid.length
            );
            
            dispatch(setGrid(mergedGrid));
            // Bug Fix: Update gridRef immediately to prevent race conditions
            // If multiple effects run in the same cycle, they need to read the updated value
            gridRef.current = mergedGrid;
            // Phase 5 Fix: Initialize last fetched viewport to initial viewport bounds
            lastFetchedViewportRef.current = mapData.viewport;
          }
        } else {
          // Full map request - replace entire grid
          dispatch(setGrid(mapData.grid));
          // Bug Fix: Update gridRef immediately to prevent race conditions
          gridRef.current = mapData.grid;
          // Phase 5 Fix: Initialize last fetched viewport to full map bounds
          lastFetchedViewportRef.current = { x1: 0, y1: 0, x2: gridSize - 1, y2: gridSize - 1 };
        }
      });
    }
  }, [mapData, isLoading, dispatch, separateStaticAndDynamicData, gridSize]);
  
  // Phase 6: Process panning viewport data (minimal: terrain + images only, skip details)
  // Track processed viewport to prevent infinite loops
  const processedViewportRef = useRef<string | null>(null);
  useEffect(() => {
    // Mark request as complete (success or error)
    if (panningViewportData || panningViewportError) {
      viewportRequestInFlightRef.current = false;
      
      // If there's a pending viewport, trigger it now
      if (pendingViewportParamsRef.current) {
        const pending = pendingViewportParamsRef.current;
        pendingViewportParamsRef.current = null;
        viewportRequestInFlightRef.current = true;
        panningViewportMinimalRef.current = true;
        setPanningViewportParams(pending);
        return;
      }
    }
    
    if (panningViewportData && panningViewportData.grid && panningViewportData.viewport) {
      const viewport = panningViewportData.viewport;
      const viewportKey = `${viewport.x1},${viewport.y1},${viewport.x2},${viewport.y2}`;
      
      // Phase 6: Prevent processing the same viewport twice
      if (processedViewportRef.current === viewportKey) {
        return;
      }
      processedViewportRef.current = viewportKey;
      
      const { terrain, entityImages, entityDetails } = separateStaticAndDynamicData(panningViewportData.grid, panningViewportData.viewport);
      
      // Phase 6: Check if this is a minimal request using ref (avoids dependency issues)
      const isMinimalRequest = panningViewportMinimalRef.current;
      
      // Phase 1: Batch state updates to reduce re-renders
      unstable_batchedUpdates(() => {
        // Merge terrain data (always needed)
        setStaticTerrainData(prev => {
          const merged = { ...prev };
          Object.entries(terrain).forEach(([key, value]) => {
            merged[key] = value;
          });
          return merged;
        });
        
        // Merge entity image data (always needed for rendering)
        setEntityImageData(prev => {
          const merged = { ...prev };
          Object.entries(entityImages).forEach(([key, value]) => {
            merged[key] = value;
          });
          
          // Clean up entity image cache for cells that are now empty
          cleanupEmptyCells(merged, panningViewportData.grid, viewport);
          
          return merged;
        });
        
        // Phase 6: Only merge entity details if NOT a minimal request
        // During panning, skip entity details (names, levels, shield status) for performance
        if (!isMinimalRequest) {
          setDynamicEntityData(prev => {
            const merged = { ...prev };
            Object.entries(entityDetails).forEach(([key, value]) => {
              merged[key] = value;
            });
            
            // Clean up entity details cache for cells that are now empty
            cleanupEmptyCells(merged, panningViewportData.grid, viewport);
            
            return merged;
          });
        }
        
        // Merge grid data - use ref to get latest grid value to avoid stale closures
        // Bug #13: Calculate gridSize from ref inside effect (not from outer scope)
        const gridSize = getGridSize(gridRef.current);
        const mergedGrid = mergeGridData(
          gridRef.current,
          panningViewportData.grid,
          viewport,
          gridSize
        );
        dispatch(setGrid(mergedGrid));
        // Bug Fix: Update gridRef immediately to prevent race conditions
        // If multiple effects run in the same cycle, they need to read the updated value
        gridRef.current = mergedGrid;
      });
      
      // Update last fetched viewport (without minimal flag for comparison)
      lastFetchedViewportRef.current = { x1: viewport.x1, y1: viewport.y1, x2: viewport.x2, y2: viewport.y2 };
      
      // Clear viewport params and reset minimal flag to allow next fetch
      panningViewportMinimalRef.current = false;
      setPanningViewportParams(null);
    }
  }, [panningViewportData, panningViewportError, separateStaticAndDynamicData, dispatch]);
  
  // Phase 7: Load entity details when panning stops
  const [stoppedViewportParams, setStoppedViewportParams] = useState<{ x1: number; y1: number; x2: number; y2: number; minimal?: boolean } | null>(null);
  const { data: stoppedViewportData, isLoading: isLoadingStoppedViewport } = useFetchMapViewportQuery(
    stoppedViewportParams!,
    { skip: !stoppedViewportParams || !terrainDataLoaded || !panningStopped }
  );
  
  // Phase 7: Trigger entity details fetch when panning stops
  const lastStoppedViewportRef = useRef<string | null>(null);
  useEffect(() => {
    if (panningStopped && terrainDataLoaded && !isPanningJS) {
      // Calculate current viewport from windowRange
      const currentViewport = {
        x1: windowRange.colStart,
        y1: windowRange.rowStart,
        x2: windowRange.colEnd,
        y2: windowRange.rowEnd,
      };
      
      const viewportKey = `${currentViewport.x1},${currentViewport.y1},${currentViewport.x2},${currentViewport.y2}`;
      
      // Check if we've already fetched details for this viewport
      if (lastStoppedViewportRef.current === viewportKey) {
        return;
      }
      
      // Check if entity details are already loaded for visible tiles
      let needsDetails = false;
      for (let y = currentViewport.y1; y <= currentViewport.y2; y++) {
        for (let x = currentViewport.x1; x <= currentViewport.x2; x++) {
          const key = `${x},${y}`;
          const hasEntityImage = entityImageData[key];
          const hasEntityDetails = dynamicEntityData[key];
          
          // If we have an entity image but no details, we need to fetch details
          if (hasEntityImage && !hasEntityDetails) {
            needsDetails = true;
            break;
          }
        }
        if (needsDetails) break;
      }
      
      if (needsDetails) {
        lastStoppedViewportRef.current = viewportKey;
        // Fetch full details (minimal: false)
        setStoppedViewportParams({ ...currentViewport, minimal: false });
      }
    }
  }, [panningStopped, terrainDataLoaded, isPanningJS, windowRange, entityImageData, dynamicEntityData]);
  
  // Phase 7: Process stopped viewport data (full details only)
  // Track processed viewport to prevent infinite loops
  const processedStoppedViewportRef = useRef<string | null>(null);
  useEffect(() => {
    if (stoppedViewportData && stoppedViewportData.grid && stoppedViewportData.viewport) {
      const viewport = stoppedViewportData.viewport;
      const viewportKey = `${viewport.x1},${viewport.y1},${viewport.x2},${viewport.y2}`;
      
      // Phase 7: Prevent processing the same viewport twice
      if (processedStoppedViewportRef.current === viewportKey) {
        return;
      }
      processedStoppedViewportRef.current = viewportKey;
      
      const { terrain, entityImages, entityDetails } = separateStaticAndDynamicData(stoppedViewportData.grid, stoppedViewportData.viewport);
      
      // Phase 1: Batch state updates to reduce re-renders
      unstable_batchedUpdates(() => {
        // Phase 7: Only merge entity details (terrain and images already loaded)
        setDynamicEntityData(prev => {
          const merged = { ...prev };
          Object.entries(entityDetails).forEach(([key, value]) => {
            merged[key] = value;
          });
          return merged;
        });
        
        // Merge grid data (update entity details in grid) - use ref to get latest grid value to avoid stale closures
        const mergedGrid = mergeGridData(
          gridRef.current,
          stoppedViewportData.grid,
          viewport,
          gridSize
        );
        dispatch(setGrid(mergedGrid));
        // Bug Fix: Update gridRef immediately to prevent race conditions
        // If multiple effects run in the same cycle, they need to read the updated value
        gridRef.current = mergedGrid;
      });
      
      // Clear stopped viewport params to allow next fetch
      setStoppedViewportParams(null);
    }
  }, [stoppedViewportData, separateStaticAndDynamicData, dispatch, gridSize]);

  // Force refresh map data when returning from battle to ensure NPCs are updated
  // Phase 4B: Only clear cache when explicitly needed (restorePan = returning from battle)
  useEffect(() => {
    if (restorePan) {
      // Clear cache when returning from battle to ensure fresh data (NPCs may have been defeated)
      setStaticTerrainData({});
      setDynamicEntityData({});
      setEntityImageData({});
      setTerrainDataLoaded(false);
      refetch();
    }
  }, [restorePan, refetch]);

  const computeWindow = useCallback((panX: number, panY: number, width: number, height: number) => {
    if (width <= 0 || height <= 0) {return;}
    
    // Phase 4: Conditional throttle - 33ms during panning (30fps), 16ms when not panning (60fps)
    const now = Date.now();
    const throttleMs = isPanningJS ? 33 : 16; // 30fps during panning, 60fps when not panning
    if (now - lastComputeTs.value < throttleMs) {return;}
    lastComputeTs.value = now;
    
    // Skip tiny pan changes to reduce churn
    const lx = lastComputedPan.value.x;
    const ly = lastComputedPan.value.y;
    if (Math.abs(panX - lx) < PAN_CHANGE_THRESHOLD && Math.abs(panY - ly) < PAN_CHANGE_THRESHOLD) {
      return;
    }
    lastComputedPan.value = { x: panX, y: panY };
    
    // Phase 7A: Virtual Scrolling - Calculate exact visible tiles (no buffer)
    calculateVirtualViewport(panX, panY, width, height);
    
    // Simplified buffer calculation - removed complex velocity math
    const baseBuffer = PAN_BUFFER;
    const { startCol, endCol, startRow, endRow } = calculateViewportFromPan(panX, panY, width, height, gridSize, baseBuffer);
    
    // Phase 5: Use ref for windowRange during panning, state when not panning
    const newWindowRange = { rowStart: startRow, rowEnd: endRow, colStart: startCol, colEnd: endCol };
    
    if (isPanningJS) {
      // Phase 5: During panning, update ref only (no state update to reduce re-renders)
      const prevRange = windowRangeRef.current;
      const same = prevRange.rowStart === startRow && prevRange.rowEnd === endRow && prevRange.colStart === startCol && prevRange.colEnd === endCol;
      if (!same) {
        // Reduced small shift threshold from 2 to 1 for more responsive updates
        const smallShift =
          Math.abs(prevRange.rowStart - startRow) < 1 &&
          Math.abs(prevRange.rowEnd - endRow) < 1 &&
          Math.abs(prevRange.colStart - startCol) < 1 &&
          Math.abs(prevRange.colEnd - endCol) < 1;
        if (!smallShift) {
          windowRangeRef.current = newWindowRange;
          
          // Phase 6: Trigger viewport fetch with minimal flag if we've moved significantly outside the last fetched viewport
          const newViewport = { x1: startCol, y1: startRow, x2: endCol, y2: endRow, minimal: true };
          if (shouldFetchViewport(newViewport, lastFetchedViewportRef.current)) {
            triggerViewportFetch(newViewport, panningViewportMinimalRef, setPanningViewportParams, viewportRequestInFlightRef, pendingViewportParamsRef);
          }
        }
      }
    } else {
      // Phase 5: When not panning, update state (triggers re-render for visual updates)
      setWindowRange(prev => {
        const same = prev.rowStart === startRow && prev.rowEnd === endRow && prev.colStart === startCol && prev.colEnd === endCol;
        if (same) return prev;
        // Reduced small shift threshold from 2 to 1 for more responsive updates
        const smallShift =
          Math.abs(prev.rowStart - startRow) < 1 &&
          Math.abs(prev.rowEnd - endRow) < 1 &&
          Math.abs(prev.colStart - startCol) < 1 &&
          Math.abs(prev.colEnd - endCol) < 1;
        if (smallShift) return prev;
        
        // Phase 5: Keep ref in sync with state
        windowRangeRef.current = newWindowRange;
        
        // Phase 6: Trigger viewport fetch with minimal flag if we've moved significantly outside the last fetched viewport
        const newViewport = { x1: startCol, y1: startRow, x2: endCol, y2: endRow, minimal: true };
        if (shouldFetchViewport(newViewport, lastFetchedViewportRef.current)) {
          triggerViewportFetch(newViewport, panningViewportMinimalRef, setPanningViewportParams, viewportRequestInFlightRef, pendingViewportParamsRef);
        }
        
        return newWindowRange;
      });
    }
  }, [gridSize, calculateVirtualViewport, isPanningJS]);

  // Restore pan position if provided (now safe, computeWindow is defined)
  // Track restored position to prevent re-restoring when user pans
  const restoredPanRef = useRef<{ x: number; y: number } | null>(null);
  
  // Track bounds ready state in JS to trigger effect when bounds become ready
  const [boundsReadyJS, setBoundsReadyJS] = useState(false);
  useAnimatedReaction(
    () => boundsReady.value,
    (ready) => {
      if (ready) {
        runOnJS(setBoundsReadyJS)(true);
      }
    }
  );
  
  useEffect(() => {
    if (restorePan && containerSize.width > 0 && containerSize.height > 0 && boundsReadyJS) {
      // Only restore if this is a new restorePan value (not already restored)
      const restoreKey = `${restorePan.x},${restorePan.y}`;
      const lastRestoredKey = restoredPanRef.current ? `${restoredPanRef.current.x},${restoredPanRef.current.y}` : null;
      
      if (restoreKey === lastRestoredKey) {
        // Already restored this position - don't restore again
        return;
      }
      
      // Validate grid coordinates are within bounds
      const gridSize = getGridSize(grid);
      if (restorePan.x < 0 || restorePan.x >= gridSize || restorePan.y < 0 || restorePan.y >= gridSize) {
        return;
      }
      
      // Convert grid coordinates to pan coordinates (center the cell on screen)
      const { x: targetX, y: targetY } = gridToPanCoordinates(restorePan.x, restorePan.y, containerSize.width, containerSize.height);
      
      // Clamp to valid pan bounds (read SharedValues directly)
      const clampedX = Math.min(maxX.value, Math.max(minX.value, targetX));
      const clampedY = Math.min(maxY.value, Math.max(minY.value, targetY));
      
      offsetX.value = clampedX;
      offsetY.value = clampedY;
      lastComputedPan.value = { x: clampedX, y: clampedY };
      
      // Mark this position as restored
      restoredPanRef.current = { x: restorePan.x, y: restorePan.y };
      
      // Force tile loading by properly calculating the new window range
      requestAnimationFrame(() => {
        // First compute the window at the restored position
        computeWindow(clampedX, clampedY, containerSize.width, containerSize.height);
        
        // Calculate the correct window range for the restored position
        const { startCol, endCol, startRow, endRow } = calculateViewportFromPan(
          clampedX, 
          clampedY, 
          containerSize.width, 
          containerSize.height, 
          gridSize, 
          0
        );
        
        // Force tile loading by setting the correct window range
        setWindowRange({
          rowStart: startRow,
          rowEnd: endRow,
          colStart: startCol,
          colEnd: endCol
        });
      });
    } else if (!restorePan) {
      // Clear restored ref when restorePan is cleared (user navigated away)
      restoredPanRef.current = null;
    }
  }, [restorePan, containerSize.width, containerSize.height, computeWindow, grid, boundsReadyJS]);

  useEffect(() => {
    // Only compute initial window after bounds are ready and container is set
    if (containerSize.width > 0 && containerSize.height > 0) {
      // Use a ref to track if we've done initial compute to avoid Reanimated warnings
      const checkBoundsAndCompute = () => {
        if (boundsReady.value) {
          computeWindow(lastComputedPan.value.x, lastComputedPan.value.y, containerSize.width, containerSize.height);
        }
      };
      
      // Check immediately and also set up a small delay to ensure bounds are set
      checkBoundsAndCompute();
      const timeoutId = setTimeout(() => {
        checkBoundsAndCompute();
        setIsMapReady(true); // Mark map as ready after initial compute
      }, 100);
      
      return () => {
        clearTimeout(timeoutId);
        if (rafId.value != null) {
          cancelAnimationFrame(rafId.value);
          rafId.value = null;
        }
        // Reset pan state on cleanup
        isPanning.value = false;
      };
    }
  }, [containerSize.width, containerSize.height, computeWindow]);

  const onContainerLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setContainerSize({ width, height });
    // Don't call computeWindow here - let the useEffect handle it after bounds are ready
  }, []);

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
      // Don't reset pan position if we're returning from battle with a specific restore position
      if (!restorePan) {
        const clamped = {
          x: Math.min(bounds.maxX, Math.max(bounds.minX, lastComputedPan.value.x)),
          y: Math.min(bounds.maxY, Math.max(bounds.minY, lastComputedPan.value.y)),
        };
        offsetX.value = clamped.x;
        offsetY.value = clamped.y;
        lastComputedPan.value = clamped;
        computeWindow(clamped.x, clamped.y, containerSize.width, containerSize.height);
      }
      // Bounds are now set; attempt centering on user's home
      if (!restorePan && !hasCenteredOnHome.value && currentUserHandle) {
        // Inline center-on-home logic to avoid using computeWindow before declaration
        const size = grid.length;
        if (size) {
          let homeX: number | null = null;
          let homeY: number | null = null;
          for (let y = 0; y < size; y++) {
            const row = grid[y];
            if (!row) continue;
            for (let x = 0; x < row.length; x++) {
              const cell = row[x] as any;
              if (cell && cell.entity === 'house' && cell.name === currentUserHandle) {
                homeX = x; homeY = y; break;
              }
            }
            if (homeX != null) break;
          }
          if (homeX != null && homeY != null) {
            const { x: targetX, y: targetY } = gridToPanCoordinates(homeX, homeY, containerSize.width, containerSize.height);
            const cx = Math.min(maxX.value, Math.max(minX.value, targetX));
            const cy = Math.min(maxY.value, Math.max(minY.value, targetY));
            offsetX.value = cx;
            offsetY.value = cy;
            lastComputedPan.value = { x: cx, y: cy };
            computeWindow(cx, cy, containerSize.width, containerSize.height);
            hasCenteredOnHome.value = true;
          }
        }
      }
    }
  }, [containerSize.width, containerSize.height, totalSize, minX, maxX, minY, maxY, offsetX, offsetY, grid, currentUserHandle, restorePan]);

  // Center on current user's home on initial entry (only if not returning from battle with restorePan)
  useEffect(() => {
    if (!boundsReady.value) return;
    if (restorePan) return; // respect return-from-battle view
    if (hasCenteredOnHome.value) return;
    if (!currentUserHandle) return;
    const size = grid.length;
    if (!size) return;
    let homeX: number | null = null;
    let homeY: number | null = null;
    for (let y = 0; y < size; y++) {
      const row = grid[y];
      if (!row) continue;
      for (let x = 0; x < row.length; x++) {
        const cell = row[x];
        if (cell && cell.entity === 'house' && cell.name === currentUserHandle) {
          homeX = x; homeY = y; break;
        }
      }
      if (homeX != null) break;
    }
    if (homeX == null || homeY == null) return;
    const targetX = (containerSize.width / 2) - MARGIN_SIZE - ((homeX + 0.5) * CELL_SIZE);
    const targetY = (containerSize.height / 2) - MARGIN_SIZE - ((homeY + 0.5) * CELL_SIZE);
    const cx = Math.min(maxX.value, Math.max(minX.value, targetX));
    const cy = Math.min(maxY.value, Math.max(minY.value, targetY));
    offsetX.value = cx;
    offsetY.value = cy;
    lastComputedPan.value = { x: cx, y: cy };
    computeWindow(cx, cy, containerSize.width, containerSize.height);
    hasCenteredOnHome.value = true;
  }, [grid, currentUserHandle, restorePan, containerSize.width, containerSize.height, minX, maxX, boundsReady, computeWindow, offsetX, offsetY]);

  const handleCellPress = useCallback(async (x: number, y: number, cellData: CellData) => {
    // Allow clicking even while panning - this provides immediate feedback
    // The modal will still work, and the pan will continue if user keeps dragging
    
    // If clicking on another player, fetch their current shield status
    if (cellData.owner === 'player' && cellData.userId && cellData.name !== currentUserHandle) {
      try {
        const response = await fetch(`${API_URL}/api/users/shield-status/${cellData.userId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        if (response.ok) {
          const userData = await response.json();
          const updatedCellData = {
            ...cellData,
            isShielded: userData.antivirusShield?.active || false
          };
          setSelectedCell({x, y, info: updatedCellData});
          return;
        }
      } catch (error) {
        console.error('Failed to fetch shield status:', error);
      }
    }
    
    setSelectedCell({x, y, info: cellData});
  }, [currentUserHandle, token]);

  const centerOnUserHome = useCallback(() => {
    if (!currentUserHandle || !grid.length) return;
    
    let homeX: number | null = null;
    let homeY: number | null = null;
    
    for (let y = 0; y < grid.length; y++) {
      const row = grid[y];
      if (!row) continue;
      for (let x = 0; x < row.length; x++) {
        const cell = row[x] as any;
        if (cell && cell.entity === 'house' && cell.name === currentUserHandle) {
          homeX = x; 
          homeY = y; 
          break;
        }
      }
      if (homeX != null) break;
    }
    
    if (homeX != null && homeY != null) {
      const targetX = (containerSize.width / 2) - MARGIN_SIZE - ((homeX + 0.5) * CELL_SIZE);
      const targetY = (containerSize.height / 2) - MARGIN_SIZE - ((homeY + 0.5) * CELL_SIZE);
      const cx = Math.min(maxX.value, Math.max(minX.value, targetX));
      const cy = Math.min(maxY.value, Math.max(minY.value, targetY));
      
      offsetX.value = cx;
      offsetY.value = cy;
      lastComputedPan.value = { x: cx, y: cy };
      computeWindow(cx, cy, containerSize.width, containerSize.height);
    }
  }, [currentUserHandle, grid, containerSize.width, containerSize.height, maxX, maxY, minX, minY, offsetX, offsetY, computeWindow]);

  const handleAntivirusPress = useCallback(() => {
    // Only show modal if antivirus feature is unlocked (including timer-based unlock)
    if (isActuallyUnlocked) {
      setShowAntivirusModal(true);
    }
  }, [isActuallyUnlocked]);

  const handleAntivirusClose = useCallback(() => {
    setShowAntivirusModal(false);
  }, []);

  const isInCrew = crewStatus?.isInCrew || false;

  useEffect(() => {
    if (isInCrew && showCrewOnboardingModal) {
      setShowCrewOnboardingModal(false);
      setShowCrewModal(true);
    } else if (!isInCrew && showCrewModal) {
      setShowCrewModal(false);
      setShowCrewOnboardingModal(false);
    }
  }, [isInCrew, showCrewOnboardingModal, showCrewModal]);

  const handleHackCrewPress = useCallback(() => {
    if (isHackCrewUnlocked) {
      if (isInCrew) {
        setShowCrewOnboardingModal(false);
        setShowCrewModal(true);
      } else {
        setShowCrewModal(false);
        setShowCrewOnboardingModal(true);
      }
    }
  }, [isHackCrewUnlocked, isInCrew]);

  const handleCrewClose = useCallback(() => {
    setShowCrewModal(false);
    if (showCrewModalFromUser) {
      setShowCrewModalFromUser(false);
    }
  }, [showCrewModalFromUser]);

  const handleCrewOnboardingClose = useCallback(() => {
    setShowCrewOnboardingModal(false);
  }, []);

  const handleVisitingProfileClose = useCallback(() => {
    setShowVisitingProfileModal(false);
    if (visitingProfileCloseTimeoutRef.current) {
      clearTimeout(visitingProfileCloseTimeoutRef.current);
    }
    visitingProfileCloseTimeoutRef.current = setTimeout(() => {
      setVisitingProfileUserId(null);
      visitingProfileCloseTimeoutRef.current = null;
    }, 300);
  }, []);

  useEffect(() => {
    return () => {
      if (visitingProfileCloseTimeoutRef.current) {
        clearTimeout(visitingProfileCloseTimeoutRef.current);
        visitingProfileCloseTimeoutRef.current = null;
      }
      if (visitCrewCloseTimeoutRef.current) {
        clearTimeout(visitCrewCloseTimeoutRef.current);
        visitCrewCloseTimeoutRef.current = null;
      }
    };
  }, []);

  const handleViewCrewPress = useCallback(() => {
    if (!selectedUserCrewStatus?.isInCrew || !selectedUserCrewStatus.crewId) {
      return;
    }

    if (visitCrewCloseTimeoutRef.current) {
      clearTimeout(visitCrewCloseTimeoutRef.current);
      visitCrewCloseTimeoutRef.current = null;
    }

    const selectedUserCrewId = selectedUserCrewStatus.crewId;
    const currentUserCrewId = crewStatus?.crewId;

    if (currentUserCrewId && selectedUserCrewId === currentUserCrewId) {
      setShowCrewModalFromUser(true);
      setShowCrewModal(true);
    } else {
      setVisitCrewId(selectedUserCrewStatus.crewId);
      setVisitCrewName(null);
      setShowVisitCrewModal(true);
    }
  }, [selectedUserCrewStatus, crewStatus]);

  const handleVisitCrewClose = useCallback(() => {
    setShowVisitCrewModal(false);
    if (visitCrewCloseTimeoutRef.current) {
      clearTimeout(visitCrewCloseTimeoutRef.current);
    }
    visitCrewCloseTimeoutRef.current = setTimeout(() => {
      setVisitCrewId(null);
      setVisitCrewName(null);
      visitCrewCloseTimeoutRef.current = null;
    }, 300);
  }, []);

  const renderInfoPanel = useCallback(() => {
    if (!selectedCell) {return null;}

    return (
      <TouchableOpacity
        style={styles.infoPanelOverlay}
        activeOpacity={1}
        onPress={() => setSelectedCell(null)}
      >
        <TouchableOpacity
          style={[styles.infoPanel, { backgroundColor: colors.background, borderColor: colors.matrix }]}
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
        >
          <ScrollView
            style={styles.infoPanelScrollView}
            contentContainerStyle={styles.infoPanelContent}
            showsVerticalScrollIndicator={true}
          >
            <Text style={[styles.infoPanelTitle, { color: colors.secondary }]}>
              Cell Information
            </Text>
            
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.text.secondary }]}>Grid:</Text>
              <Text style={[styles.infoValue, { color: colors.text.primary }]}>
                ({selectedCell.x}, {selectedCell.y})
              </Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.text.secondary }]}>Terrain:</Text>
              <Text style={[styles.infoValue, { color: colors.text.primary }]}>
                {selectedCell.info.terrain.toUpperCase()}
              </Text>
            </View>
            
            {selectedCell.info.entity !== 'empty' && (
              <>
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: colors.text.secondary }]}>Entity:</Text>
                  <Text style={[styles.infoValue, { color: colors.matrix }]}>
                    {selectedCell.info.name || 'UNKNOWN'}
                  </Text>
                </View>
                
                {selectedCell.info.owner !== 'player' && selectedCell.info.npcLevel && (
                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: colors.text.secondary }]}>Level:</Text>
                    <Text style={[styles.infoValue, { color: colors.text.primary }]}>
                      {selectedCell.info.npcLevel}
                    </Text>
                  </View>
                )}
                
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: colors.text.secondary }]}>Status:</Text>
                  <Text style={[
                    styles.infoValue,
                    { color: selectedCell.info.owner === 'player' && selectedCell.info.name !== currentUserHandle ? colors.error : 
                      selectedCell.info.owner === 'player' ? colors.success : colors.error }
                  ]}>
                    {selectedCell.info.owner === 'player' && selectedCell.info.name !== currentUserHandle ? 'HOSTILE' : 
                    selectedCell.info.owner === 'player' ? 'FRIENDLY' : 'HOSTILE'}
                  </Text>
                </View>
                
                {selectedCell.info.owner === 'player' && selectedCell.info.isShielded && (
                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: colors.text.secondary }]}>Shield:</Text>
                    <Text style={[styles.infoValue, { color: colors.success }]}>ACTIVE</Text>
                  </View>
                )}
                
                <View style={styles.buttonContainer}>
                  {selectedCell.info.owner !== 'player' && selectedCell.info.npcSlug && (
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: colors.matrix, borderColor: colors.matrix }]}
                      onPress={() => {
                        (globalThis as any).pendingNpcSlug = selectedCell.info.npcSlug;
                        (globalThis as any).pendingNpcInstanceId = selectedCell.info.npcInstanceId;
                        (globalThis as any).pendingMapPan = {
                          x: selectedCell.x,
                          y: selectedCell.y,
                        };
                        onClose();
                      }}
                    >
                      <Text style={[styles.actionButtonText, { color: colors.background }]}>
                        Hack Entity
                      </Text>
                    </TouchableOpacity>
                  )}
                  
                  {shouldShowHackButton && (
                    <TouchableOpacity
                      style={[
                        styles.actionButton,
                        { 
                          backgroundColor: selectedCell.info.isShielded ? colors.buttonDisabled : colors.matrix,
                          borderColor: colors.matrix,
                          opacity: selectedCell.info.isShielded ? 0.6 : 1
                        }
                      ]}
                      onPress={() => {
                        if (selectedCell.info.isShielded) {
                          return;
                        }
                        (globalThis as any).pendingDefenderUserId = selectedCell.info.userId;
                        (globalThis as any).pendingMapPan = {
                          x: selectedCell.x,
                          y: selectedCell.y,
                        };
                        onClose();
                      }}
                      disabled={selectedCell.info.isShielded}
                    >
                      <Text style={[
                        styles.actionButtonText,
                        { color: selectedCell.info.isShielded ? colors.text.secondary : colors.background }
                      ]}>
                        {selectedCell.info.isShielded ? 'Shielded User' : 'Hack User'}
                      </Text>
                    </TouchableOpacity>
                  )}
                  
                  {selectedCell.info.owner === 'player' && 
                   selectedCell.info.userId && (
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: colors.matrix, borderColor: colors.matrix }]}
                      onPress={() => {
                        if (visitingProfileCloseTimeoutRef.current) {
                          clearTimeout(visitingProfileCloseTimeoutRef.current);
                          visitingProfileCloseTimeoutRef.current = null;
                        }
                        setVisitingProfileUserId(selectedCell.info.userId || null);
                        setShowVisitingProfileModal(true);
                      }}
                    >
                      <Text style={[styles.actionButtonText, { color: colors.background }]}>
                        View Profile
                      </Text>
                    </TouchableOpacity>
                  )}
                  
                  {selectedCell.info.owner === 'player' && 
                   selectedCell.info.userId && 
                   selectedCell.info.name !== currentUserHandle &&
                   selectedUserCrewStatus?.isInCrew && 
                   selectedUserCrewStatus.crewId && (
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: colors.matrix, borderColor: colors.matrix }]}
                      onPress={handleViewCrewPress}
                    >
                      <Text style={[styles.actionButtonText, { color: colors.background }]}>
                        View Crew
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </>
            )}
            
            <TouchableOpacity
              style={[styles.closeButton, { borderColor: colors.matrix }]}
              onPress={() => setSelectedCell(null)}
            >
              <Text style={[styles.closeButtonText, { color: colors.secondary }]}>Close</Text>
            </TouchableOpacity>
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  }, [selectedCell, styles, colors, currentUserHandle, onClose, selectedUserCrewStatus, handleViewCrewPress, shouldShowHackButton]);

  if (loading || !isMapReady || !terrainDataLoaded) {
    return <View style={styles.container}><LoadingSpinner /></View>;
  }

  return (
    <View style={styles.container} onLayout={onContainerLayout}>
      <CloseButton onPress={onClose} />

      <Pressable style={styles.navigationButton} onPress={centerOnUserHome}>
        <Image source={require('../assets/images/navigationIcon.png')} style={styles.navigationIcon} resizeMode="contain" />
      </Pressable>

        <CollapsibleToolbar
          onAntivirusPress={handleAntivirusPress}
          isAntivirusUnlocked={isActuallyUnlocked}
          onHackCrewPress={handleHackCrewPress}
          isHackCrewUnlocked={isHackCrewUnlocked}
          isInCrew={isInCrew}
        />

      <AntivirusModal
        visible={showAntivirusModal}
        onClose={handleAntivirusClose}
      />

      <CrewModal
        visible={showCrewModal}
        onClose={handleCrewClose}
      />

      <CrewOnboardingModal
        visible={showCrewOnboardingModal}
        onClose={handleCrewOnboardingClose}
      />

      {visitingProfileUserId && (
        <VisitingProfileModal
          visible={showVisitingProfileModal}
          onClose={handleVisitingProfileClose}
          userId={visitingProfileUserId}
        />
      )}

      {visitCrewId && (
        <VisitCrewModal
          visible={showVisitCrewModal}
          onClose={handleVisitCrewClose}
          crewId={visitCrewId}
          crewName={visitCrewName || undefined}
        />
      )}

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
            {visibleCells.map((assignment, i) => {
              const { x, y, cell } = assignment;
              const key = `${x},${y}`;
              const terrain = staticTerrainData[key];
              const entityImage = entityImageData[key];
              
              // Phase 3: Conditional rendering based on panning state
              if (isPanningJS) {
                // During panning: render simplified tile (terrain + image only, no interactions)
                return (
                  <PanningPoolTile
                    key={`${x}-${y}`}
                    x={x}
                    y={y}
                    terrain={terrain || cell.terrain}
                    entityImage={entityImage}
                    xStyle={xPosStyles[x]}
                    yStyle={yPosStyles[y]}
                    terrainStyleMap={terrainStyleMap}
                    currentUserId={currentUserId}
                    isShieldActive={isShieldActive}
                    styles={styles}
                  />
                );
              } else {
                // When not panning: render full tile with all details and interactions
                const selected = !!(selectedCell && selectedCell.x === x && selectedCell.y === y);
                const isCrewMember = !!(cell.owner === 'player' && 
                                     cell.userId && 
                                     crewMemberUserIds.has(String(cell.userId)));
                const isWarCrewMember = !!(cell.owner === 'player' && 
                                       cell.userId && 
                                       warCrewMemberUserIds.has(String(cell.userId)));
                // Only show yellow border for allies, not our own crew members
                const isAllianceCrewMember = !!(cell.owner === 'player' && 
                                             cell.userId && 
                                             !isCrewMember && // Exclude our own crew members
                                             allianceCrewMemberUserIds.has(String(cell.userId)));
                return (
                  <PoolTile
                    key={`${x}-${y}`}
                    x={x}
                    y={y}
                    cell={cell}
                    selected={selected}
                    onPress={handleCellPress}
                    xStyle={xPosStyles[x]}
                    yStyle={yPosStyles[y]}
                    terrainStyleMap={terrainStyleMap}
                    currentUserHandle={currentUserHandle}
                    colors={colors}
                    themeMode={themeMode}
                    styles={styles}
                    dynamicEntityData={dynamicEntityData}
                    isShieldActive={isShieldActive}
                    isCrewMember={isCrewMember}
                    isWarCrewMember={isWarCrewMember}
                    isAllianceCrewMember={isAllianceCrewMember}
                  />
                );
              }
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
  currentUserHandle?: string | null;
  colors: ReturnType<typeof useThemeColors>;
  themeMode: 'light' | 'dark';
  styles: any;
  dynamicEntityData: Record<string, any>;
  isShieldActive: boolean;
  isCrewMember?: boolean;
  isWarCrewMember?: boolean;
  isAllianceCrewMember?: boolean;
};

type PoolTileProps = {
  x: number;
  y: number;
  cell: CellData;
  selected: boolean;
  onPress: (x: number, y: number, cell: CellData) => void;
  xStyle: any;
  yStyle: any;
  terrainStyleMap: Record<TerrainType, any>;
  currentUserHandle?: string | null;
  colors: ReturnType<typeof useThemeColors>;
  themeMode: 'light' | 'dark';
  styles: any;
  dynamicEntityData: Record<string, any>;
  isShieldActive: boolean;
  isCrewMember?: boolean;
  isWarCrewMember?: boolean;
  isAllianceCrewMember?: boolean;
};const getStyles = (colors: ReturnType<typeof useThemeColors>, themeMode: 'light' | 'dark') => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  dragContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  grid: {
    backgroundColor: themeMode === 'light' ? 'rgba(26, 77, 51, 0.05)' : 'rgba(26, 77, 51, 0.1)',
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderWidth: 1,
    borderColor: themeMode === 'light' ? 'rgba(0, 100, 0, 0.2)' : 'rgba(0, 255, 65, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: themeMode === 'light' ? 'rgba(26, 77, 51, 0.02)' : 'rgba(26, 77, 51, 0.02)',
  },
  selectedCell: {
    backgroundColor: themeMode === 'light' ? 'rgba(0, 100, 0, 0.15)' : 'rgba(0, 255, 65, 0.1)',
    borderColor: themeMode === 'light' ? 'rgba(0, 100, 0, 0.4)' : 'rgba(0, 255, 65, 0.3)',
  },
  crewMemberCell: {
    borderWidth: 3,
    borderColor: 'white',
  },
  warCrewMemberCell: {
    borderWidth: 3,
    borderColor: 'red',
  },
  allianceCrewMemberCell: {
    borderWidth: 3,
    borderColor: '#FFD700',
  },
  cellContent: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  plainTerrain: {
    backgroundColor: themeMode === 'light' ? 'rgba(26, 77, 51, 0.08)' : 'rgba(26, 77, 51, 0.05)',
    borderColor: themeMode === 'light' ? 'rgba(0, 100, 0, 0.2)' : 'rgba(0, 255, 65, 0.1)',
  },
  waterTerrain: {
    backgroundColor: themeMode === 'light' ? 'rgba(12, 132, 231, 0.44)' : 'rgba(33, 150, 243, 0.1)',
    borderColor: themeMode === 'light' ? 'rgba(33, 150, 243, 0.3)' : 'rgba(33, 150, 243, 0.2)',
  },
  roadTerrain: {
    backgroundColor: themeMode === 'light' ? 'rgba(202, 155, 13, 0.63)' : 'rgba(255, 193, 7, 0.29)',
    borderColor: themeMode === 'light' ? 'rgba(255, 193, 7, 0.3)' : 'rgba(255, 193, 7, 0.2)',
  },
  grassTerrain: {
    backgroundColor: themeMode === 'light' ? 'rgba(76, 175, 80, 0.25)' : 'rgba(19, 232, 26, 0.08)',
    borderColor: themeMode === 'light' ? 'rgba(76, 175, 80, 0.4)' : 'rgba(76, 175, 80, 0.25)',
  },
  dirtTerrain: {
    backgroundColor: themeMode === 'light' ? 'rgba(160, 82, 45, 0.12)' : 'rgba(160, 82, 45, 0.09)',
    borderColor: themeMode === 'light' ? 'rgba(160, 82, 45, 0.25)' : 'rgba(160, 82, 45, 0.15)',
  },
  mountainTerrain: {
    backgroundColor: themeMode === 'light' ? 'rgba(158, 158, 158, 0.54)' : 'rgba(158, 158, 158, 0.1)',
    borderColor: themeMode === 'light' ? 'rgba(158, 158, 158, 0.3)' : 'rgba(158, 158, 158, 0.2)',
  },
  forestTerrain: {
    backgroundColor: themeMode === 'light' ? 'rgba(76, 175, 79, 0.42)' : 'rgba(4, 75, 7, 0.45)',
    borderColor: themeMode === 'light' ? 'rgba(76, 175, 80, 0.3)' : 'rgba(76, 175, 80, 0.2)',
  },
  backButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  backButtonText: {
    color: colors.background,
    fontSize: 24,
    fontWeight: 'bold',
  },
  hackButton: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: colors.matrix,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  hackButtonText: {
    color: colors.matrix,
    fontSize: 14,
    fontWeight: 'bold',
  },
  coordsDisplay: {
    position: 'absolute',
    top: 20,
    left: 20,
    backgroundColor: themeMode === 'light' ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.8)',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.matrix,
    zIndex: 1,
  },
  coordsText: {
    color: colors.matrix,
    fontSize: 14,
    fontFamily: 'monospace',
  },
  entityName: {
    color: colors.matrix,
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 8,
  },
  entityDetails: {
    color: themeMode === 'light' ? 'rgba(0, 100, 0, 0.8)' : 'rgba(0, 255, 65, 0.7)',
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
  userHouseBg: {
    backgroundColor: themeMode === 'light' ? 'rgba(52, 140, 255, 0.4)' : 'rgba(52, 140, 255, 0.35)',
  },
  otherUserHouseBg: {
    backgroundColor: themeMode === 'light' ? 'rgba(128, 128, 128, 0.4)' : 'rgba(128, 128, 128, 0.35)',
  },
  enemyHouseBg: {
    backgroundColor: themeMode === 'light' ? 'rgba(204, 85, 0, 0.4)' : 'rgba(204, 85, 0, 0.35)',
  },
  otherUserHouse: {
    backgroundColor: themeMode === 'light' ? 'rgba(128, 128, 128, 0.4)' : 'rgba(128, 128, 128, 0.35)',
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
    color: themeMode === 'light' ? 'white' : colors.matrix,
  },
  enemyLabel: {
    color: 'white',
  },
  npcLevelContainer: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: themeMode === 'light' ? 'rgba(255, 255, 255, 0.9)' : 'rgba(64, 167, 4, 0.9)',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 2,
    minWidth: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  npcLevelText: {
    color: 'black',
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  npcLevelModalText: {
    color: themeMode === 'light' ? '#ff6b35' : '#ff6b35',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  playerEntity: {
    backgroundColor: themeMode === 'light' ? 'rgba(0, 100, 0, 0.15)' : 'rgba(0, 255, 65, 0.1)',
  },
  enemyEntity: {
    backgroundColor: themeMode === 'light' ? 'rgba(255, 65, 65, 0.15)' : 'rgba(255, 65, 65, 0.1)',
  },
  infoPanelOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  infoPanel: {
    padding: SIZING.spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    minWidth: 380,
    maxWidth: 450,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  infoPanelScrollView: {
    width: '100%',
  },
  infoPanelContent: {
    width: '100%',
    alignItems: 'center',
    paddingBottom: SIZING.spacing.xs,
  },
  infoPanelTitle: {
    fontSize: SIZING.font.body,
    fontWeight: 'bold',
    marginBottom: SIZING.spacing.sm,
    textAlign: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: SIZING.spacing.xs,
    paddingHorizontal: SIZING.spacing.xs,
  },
  infoLabel: {
    fontSize: SIZING.font.body,
    fontWeight: '600',
  },
  infoValue: {
    fontSize: SIZING.font.body,
    fontWeight: '500',
  },
  buttonContainer: {
    width: '100%',
    marginTop: SIZING.spacing.sm,
    marginBottom: SIZING.spacing.sm,
    gap: SIZING.spacing.xs,
  },
  actionButton: {
    paddingHorizontal: SIZING.spacing.md,
    paddingVertical: SIZING.spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: SIZING.spacing.xs,
    minWidth: 180,
  },
  actionButtonText: {
    fontSize: SIZING.font.body,
    fontWeight: '600',
  },
  closeButton: {
    paddingHorizontal: SIZING.spacing.md,
    paddingVertical: SIZING.spacing.xs,
    borderRadius: 6,
    borderWidth: 1,
    minWidth: 100,
    alignItems: 'center',
    marginTop: SIZING.spacing.xs,
  },
  closeButtonText: {
    fontSize: SIZING.font.body,
    fontWeight: '600',
  },
  terrainText: {
    color: themeMode === 'light' ? 'rgba(0, 0, 0, 0.8)' : 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    marginBottom: 5,
  },
  entityText: {
    color: colors.matrix,
    fontSize: 14,
  },

  statusText: {
    fontSize: 14,
    marginTop: 5,
  },
  friendlyText: {
    color: colors.matrix,
  },
  hostileText: {
    color: themeMode === 'light' ? '#cc0000' : '#ff4141',
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

  terrainSymbol: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  waterSymbol: {
    color: themeMode === 'light' ? 'rgba(33, 150, 243, 0.9)' : 'rgba(33, 150, 243, 0.8)',
  },
  mountainSymbol: {
    color: themeMode === 'light' ? 'rgba(158, 158, 158, 0.9)' : 'rgba(158, 158, 158, 0.8)',
  },
  forestSymbol: {
    color: themeMode === 'light' ? 'rgba(76, 175, 80, 0.9)' : 'rgba(76, 175, 80, 0.8)',
  },
  roadSymbol: {
    color: themeMode === 'light' ? 'rgba(255, 193, 7, 0.9)' : 'rgba(255, 193, 7, 0.9)',
  },
  friendlySymbol: {
    color: colors.matrix,
  },
  hostileSymbol: {
    color: themeMode === 'light' ? '#cc0000' : '#ff4141',
  },
  closeSymbol: {
    color: colors.matrix,
    fontSize: 24,
    fontWeight: 'bold',
  },
  entitySymbol: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  playerSymbol: {
    color: themeMode === 'light' ? '#0066cc' : '#00ffff',
    fontSize: 24,
  },
  marginWrapper: {
    backgroundColor: themeMode === 'light' ? 'rgba(139, 0, 0, 0.08)' : 'rgba(139, 0, 0, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridArea: {
    backgroundColor: colors.background,
  },
  scrollContainer: {
    // width/height are set dynamically on container View
  },
  navigationButton: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  navigationIcon: {
    width: 24,
    height: 24,
  },
  hackButtonDisabled: {
    opacity: 0.5,
    borderColor: themeMode === 'light' ? 'rgba(128, 128, 128, 0.5)' : 'rgba(128, 128, 128, 0.3)',
  },
  hackButtonTextDisabled: {
    color: themeMode === 'light' ? 'rgba(128, 128, 128, 0.8)' : 'rgba(128, 128, 128, 0.6)',
  },
  shieldedText: {
    color: themeMode === 'light' ? '#4CAF50' : '#66BB6A',
    fontWeight: 'bold',
  },
});