import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import { View, Text, StyleSheet, LayoutChangeEvent, Pressable, Image, Dimensions, TouchableOpacity, ScrollView } from 'react-native';
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
import { useFetchMapQuery } from '../store/api/mapApi';
import { useGetShieldStatusQuery } from '../store/api/antivirusApi';
import { useGetUserFeaturesQuery } from '../store/api/researchFeaturesApi';
import { useGetCrewStatusQuery, useGetUserCrewStatusQuery, useGetCrewDetailsQuery, useGetWarStatusQuery, useGetAllianceStatusQuery } from '../store/api/authApi';
import { API_URL } from '../config';
import { computePanBounds } from '../utils/mapPanBounds';
import { CellData, TerrainType, EntityType } from '../types/map';
import { useThemeColors } from '../hooks/useThemeColors';
import { useTheme } from '../context/ThemeContext';
import { SIZING } from '../styles/theme';

const CELL_SIZE = 55;
const MARGIN_SIZE = 80;




type Props = {
  onClose: () => void;
  restorePan?: { x: number; y: number };
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
    const houseBgStyle = cell.entity === 'house'
      ? (cell.owner === 'player'
          ? (cell.name === currentUserHandle ? styles.userHouseBg : styles.otherUserHouseBg)
          : styles.enemyHouseBg)
      : null;
    
    // Check for shield status in both grid data and dynamic entity data
    const key = `${x},${y}`;
    const dynamicEntity = dynamicEntityData[key];
    const isShielded = dynamicEntity?.isShielded ?? (cell as any).isShielded;
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
  }, (prevProps, nextProps) => {
    // Custom comparison to prevent unnecessary re-renders
    // Only re-render if essential props change
    return (
      prevProps.x === nextProps.x &&
      prevProps.y === nextProps.y &&
      prevProps.selected === nextProps.selected &&
      prevProps.cell === nextProps.cell &&
      prevProps.currentUserHandle === nextProps.currentUserHandle &&
      prevProps.isShieldActive === nextProps.isShieldActive &&
      prevProps.isCrewMember === nextProps.isCrewMember &&
      prevProps.isWarCrewMember === nextProps.isWarCrewMember &&
      prevProps.isAllianceCrewMember === nextProps.isAllianceCrewMember &&
      // Only check dynamicEntityData for this specific tile
      prevProps.dynamicEntityData[`${prevProps.x},${prevProps.y}`]?.isShielded === 
      nextProps.dynamicEntityData[`${nextProps.x},${nextProps.y}`]?.isShielded
    );
  });

  const PoolTile: React.FC<PoolTileProps> = React.memo(({ x, y, cell, selected, onPress, xStyle, yStyle, terrainStyleMap, currentUserHandle, colors, themeMode, styles, dynamicEntityData, isShieldActive, isCrewMember, isWarCrewMember, isAllianceCrewMember }) => {
    return (
      <View style={[yStyle]}>
        <Tile x={x} y={y} cell={cell} selected={selected} onPress={onPress} xStyle={xStyle} terrainStyleMap={terrainStyleMap} currentUserHandle={currentUserHandle} colors={colors} themeMode={themeMode} styles={styles} dynamicEntityData={dynamicEntityData} isShieldActive={isShieldActive} isCrewMember={isCrewMember} isWarCrewMember={isWarCrewMember} isAllianceCrewMember={isAllianceCrewMember} />
      </View>
    );
  }, (prevProps, nextProps) => {
    // Custom comparison for PoolTile - only re-render if essential props change
    return (
      prevProps.x === nextProps.x &&
      prevProps.y === nextProps.y &&
      prevProps.selected === nextProps.selected &&
      prevProps.cell === nextProps.cell &&
      prevProps.currentUserHandle === nextProps.currentUserHandle &&
      prevProps.isShieldActive === nextProps.isShieldActive &&
      prevProps.isCrewMember === nextProps.isCrewMember &&
      prevProps.isWarCrewMember === nextProps.isWarCrewMember &&
      prevProps.isAllianceCrewMember === nextProps.isAllianceCrewMember &&
      // Only check dynamicEntityData for this specific tile
      prevProps.dynamicEntityData[`${prevProps.x},${prevProps.y}`]?.isShielded === 
      nextProps.dynamicEntityData[`${nextProps.x},${nextProps.y}`]?.isShielded
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
  const visitingProfileCloseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const visitCrewCloseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
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
  const [windowRange, setWindowRange] = useState<{ rowStart: number; rowEnd: number; colStart: number; colEnd: number }>({ rowStart: 0, rowEnd: Math.min(14, (grid.length || 50) - 1), colStart: 0, colEnd: Math.min(14, (grid.length || 50) - 1) });
  const [isMapReady, setIsMapReady] = useState<boolean>(false);
  
  // Static vs Dynamic Data Separation
  const [staticTerrainData, setStaticTerrainData] = useState<Record<string, TerrainType>>({});
  const [dynamicEntityData, setDynamicEntityData] = useState<Record<string, any>>({});
  const [terrainDataLoaded, setTerrainDataLoaded] = useState<boolean>(false);
  
  // Shield status change tracking
  const [lastShieldStatus, setLastShieldStatus] = useState<boolean | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Use ref for lastUpdateTime to avoid circular dependency
  const lastUpdateTimeRef = useRef(0);
  
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
    
    // Calculate the exact visible area in grid coordinates
    const gridLeft = panX + MARGIN_SIZE;
    const gridTop = panY + MARGIN_SIZE;
    
    // Convert screen coordinates to grid coordinates
    const startCol = Math.floor((-gridLeft) / CELL_SIZE);
    const endCol = Math.ceil((width - gridLeft) / CELL_SIZE);
    const startRow = Math.floor((-gridTop) / CELL_SIZE);
    const endRow = Math.ceil((height - gridTop) / CELL_SIZE);
    
    // Clamp to grid bounds
    const gridSize = grid.length || 50;
    const clampedStartCol = Math.max(0, startCol);
    const clampedEndCol = Math.min(gridSize - 1, endCol);
    const clampedStartRow = Math.max(0, startRow);
    const clampedEndRow = Math.min(gridSize - 1, endRow);
    
    // Generate visible tile keys (only what's actually on screen)
    const visibleTiles = new Set<string>();
    for (let y = clampedStartRow; y <= clampedEndRow; y++) {
      for (let x = clampedStartCol; x <= clampedEndCol; x++) {
        visibleTiles.add(`${x},${y}`);
      }
    }
    
    // Update virtual viewport state
    const totalTiles = (clampedEndRow - clampedStartRow + 1) * (clampedEndCol - clampedStartCol + 1);
    setVirtualViewport(prev => ({
      visibleTiles,
      renderCount: visibleTiles.size,
      totalTiles
    }));
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
  const { data: mapData, isLoading, refetch } = useFetchMapQuery();
  const { data: shieldData } = useGetShieldStatusQuery(undefined, {
    pollingInterval: 1000, // Poll every second for real-time updates
  });
  
  // Get research features data (same as ResearchFeaturesList)
  const { data: researchFeatures } = useGetUserFeaturesQuery('home-defense');
  const { data: hackCrewFeatures } = useGetUserFeaturesQuery('hack-crew');
  const { data: crewStatus, isLoading: isLoadingCrewStatus } = useGetCrewStatusQuery();
  
  const { data: crewDetails, isLoading: isLoadingCrewDetails } = useGetCrewDetailsQuery(crewStatus?.crewId || '', {
    skip: !crewStatus?.crewId || !crewStatus?.isInCrew,
  });

  const { data: warStatusData, refetch: refetchWarStatus } = useGetWarStatusQuery(undefined, {
    skip: !crewStatus?.isInCrew,
    pollingInterval: 3000,
    refetchOnMountOrArgChange: true,
  });

  const { data: allianceStatusData, refetch: refetchAllianceStatus } = useGetAllianceStatusQuery(undefined, {
    skip: !crewStatus?.isInCrew,
    pollingInterval: 3000,
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

  // Trigger immediate updates for ALL users when current user's shield status changes
  useEffect(() => {
    if (lastShieldStatus !== null && lastShieldStatus !== isShieldActive && currentUserId) {
      
      // First, immediately update ALL visible player tiles with fresh shield status
      if (dynamicEntityData) {
        Object.keys(dynamicEntityData).forEach(key => {
          const entity = dynamicEntityData[key];
          if (entity && entity.owner === 'player' && entity.userId) {
            // Update other users' tiles immediately
            updateTileShieldStatus(entity.userId, entity.isShielded || false);
          }
        });
      }
      
      // Then update the current user's tile
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
            found = true;
          }
        });
        
        return updated;
      });
    }
    setLastShieldStatus(isShieldActive);
  }, [isShieldActive, lastShieldStatus, currentUserId]);

  // Store the latest updateTileShieldStatus function in a ref to avoid stale closures
  const updateTileShieldStatusRef = useRef(updateTileShieldStatus);
  updateTileShieldStatusRef.current = updateTileShieldStatus;

  // Add frequent check for shield status changes on visible tiles
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isRefreshing) {
        // Get current dynamicEntityData without depending on it in the dependency array
        setDynamicEntityData(currentData => {
          if (currentData) {
            Object.values(currentData).forEach((entity: any) => {
              if (entity && entity.owner === 'player' && entity.userId) {
                // Use the ref to get the latest updateTileShieldStatus function
                updateTileShieldStatusRef.current(entity.userId, entity.isShielded || false);
              }
            });
          }
          return currentData; // Return unchanged data
        });
      }
    }, 3000); // Check every 3 seconds to reduce re-renders while maintaining responsiveness

    return () => clearInterval(interval);
  }, [isRefreshing]); // Only depend on isRefreshing, use ref for latest function

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

  const visibleCells = useMemo(() => {
    const cells: Array<{ x: number; y: number; cell: CellData }> = [];
    
    // Only compute if terrain data is loaded
    if (!terrainDataLoaded) return cells;
    
    // Phase 7A: Virtual Scrolling - Only render tiles that are actually visible
    if (virtualViewport.visibleTiles.size > 0) {
      // Use virtual viewport for ultra-efficient rendering
      virtualViewport.visibleTiles.forEach(tileKey => {
        const [x, y] = tileKey.split(',').map(Number);
        const terrain = staticTerrainData[tileKey];
        const entity = dynamicEntityData[tileKey];
        
        if (!terrain) return;
        
        // Create cell data by combining static terrain with dynamic entities
        const cell: CellData = {
          terrain,
          entity: entity?.entity || 'empty',
          owner: entity?.owner,
          name: entity?.name,
          userId: entity?.userId,
          npcSlug: entity?.npcSlug,
          npcInstanceId: entity?.npcInstanceId,
          npcLevel: entity?.npcLevel,
          isShielded: entity?.isShielded,
        } as any;
        
        cells.push({ x, y, cell });
      });
    } else {
      // Fallback to original logic if virtual viewport not ready
      for (let y = windowRange.rowStart; y <= windowRange.rowEnd; y++) {
        for (let x = windowRange.colStart; x <= windowRange.colEnd; x++) {
          const key = `${x},${y}`;
          const terrain = staticTerrainData[key];
          const entity = dynamicEntityData[key];
          
          if (!terrain) continue;
          
          // Create cell data by combining static terrain with dynamic entities
          const cell: CellData = {
            terrain,
            entity: entity?.entity || 'empty',
            owner: entity?.owner,
            name: entity?.name,
            userId: entity?.userId,
            npcSlug: entity?.npcSlug,
            npcInstanceId: entity?.npcInstanceId,
            npcLevel: entity?.npcLevel,
          } as any;
          
          cells.push({ x, y, cell });
        }
      }
    }
    
    return cells;
  }, [virtualViewport.visibleTiles, virtualViewport.visibleTiles.size, windowRange.rowStart, windowRange.rowEnd, windowRange.colStart, windowRange.colEnd, staticTerrainData, dynamicEntityData, terrainDataLoaded]);



  // Separate static terrain data from dynamic entity data for optimal loading
  const separateStaticAndDynamicData = useCallback((gridData: any[][]) => {
    const terrain: Record<string, TerrainType> = {};
    const entities: Record<string, any> = {};
    
    for (let y = 0; y < gridData.length; y++) {
      const row = gridData[y];
      if (!row) continue;
      for (let x = 0; x < row.length; x++) {
        const cell = row[x];
        if (!cell) continue;
        
        const key = `${x},${y}`;
        
        // Terrain is static - load once and cache
        terrain[key] = cell.terrain;
        
        // Entities are dynamic - only load what's needed
        if (cell.entity !== 'empty') {
          entities[key] = {
            entity: cell.entity,
            owner: cell.owner,
            name: cell.name,
            userId: cell.userId,
            npcSlug: cell.npcSlug,
            npcInstanceId: cell.npcInstanceId,
            npcLevel: cell.npcLevel,
            isShielded: cell.isShielded,
          };
        }
      }
    }
    
    return { terrain, entities };
  }, []);

  useEffect(() => {
    dispatch(setLoading(isLoading));
    if (mapData && mapData.grid) {
      // Separate static and dynamic data
      const { terrain, entities } = separateStaticAndDynamicData(mapData.grid);
      setStaticTerrainData(terrain);
      setDynamicEntityData(entities);
      setTerrainDataLoaded(true);
      
      dispatch(setGrid(mapData.grid));
    }
  }, [mapData, isLoading, dispatch, separateStaticAndDynamicData]);

  // Update only dynamic entity data (NPCs, houses, etc.) without full grid refresh
  const updateEntityData = useCallback((updates: Record<string, any>) => {
    setDynamicEntityData(prev => ({
      ...prev,
      ...updates
    }));
  }, []);

  // Force refresh map data when returning from battle to ensure NPCs are updated
  useEffect(() => {
    if (restorePan) {
      refetch();
    }
  }, [restorePan, refetch]);

  const computeWindow = useCallback((panX: number, panY: number, width: number, height: number) => {
    if (width <= 0 || height <= 0) {return;}
    
    // Reduce throttle from 40ms to 16ms for 60fps responsiveness
    const now = Date.now();
    if (now - lastComputeTs.value < 16) {return;} // 60fps throttle
    lastComputeTs.value = now;
    
    // Skip tiny pan changes to reduce churn
    const lx = lastComputedPan.value.x;
    const ly = lastComputedPan.value.y;
    if (Math.abs(panX - lx) < 4 && Math.abs(panY - ly) < 4) { // Reduced from 8 to 4 for precision
      return;
    }
    lastComputedPan.value = { x: panX, y: panY };
    
    // Phase 7A: Virtual Scrolling - Calculate exact visible tiles (no buffer)
    calculateVirtualViewport(panX, panY, width, height);
    
    // Simplified buffer calculation - removed complex velocity math
    const baseBuffer = 8; // Reduced from 12 for better performance
    const gridLeft = panX + MARGIN_SIZE;
    const gridTop = panY + MARGIN_SIZE;
    const baseStartCol = Math.floor((-gridLeft) / CELL_SIZE);
    const baseEndCol = Math.ceil((width - gridLeft) / CELL_SIZE);
    const baseStartRow = Math.floor((-gridTop) / CELL_SIZE);
    const baseEndRow = Math.ceil((height - gridTop) / CELL_SIZE);
    const startCol = Math.max(0, baseStartCol - baseBuffer);
    const endCol = Math.min(gridSize - 1, baseEndCol + baseBuffer);
    const startRow = Math.max(0, baseStartRow - baseBuffer);
    const endRow = Math.min(gridSize - 1, baseEndRow + baseBuffer);
    
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
      return { rowStart: startRow, rowEnd: endRow, colStart: startCol, colEnd: endCol };
    });
  }, [gridSize, calculateVirtualViewport]);

  // Restore pan position if provided (now safe, computeWindow is defined)
  useEffect(() => {
    if (restorePan && containerSize.width > 0 && containerSize.height > 0 && boundsReady.value) {
      // Validate grid coordinates are within bounds
      const gridSize = grid.length || 50;
      if (restorePan.x < 0 || restorePan.x >= gridSize || restorePan.y < 0 || restorePan.y >= gridSize) {
        return;
      }
      
      // Convert grid coordinates to pan coordinates (center the cell on screen)
      const targetX = (containerSize.width / 2) - MARGIN_SIZE - ((restorePan.x + 0.5) * CELL_SIZE);
      const targetY = (containerSize.height / 2) - MARGIN_SIZE - ((restorePan.y + 0.5) * CELL_SIZE);
      
      // Clamp to valid pan bounds
      const clampedX = Math.min(maxX.value, Math.max(minX.value, targetX));
      const clampedY = Math.min(maxY.value, Math.max(minY.value, targetY));
      
      offsetX.value = clampedX;
      offsetY.value = clampedY;
      lastComputedPan.value = { x: clampedX, y: clampedY };
      
      // Force tile loading by properly calculating the new window range
      requestAnimationFrame(() => {
        // First compute the window at the restored position
        computeWindow(clampedX, clampedY, containerSize.width, containerSize.height);
        
        // Calculate the correct window range for the restored position
        const gridLeft = clampedX + MARGIN_SIZE;
        const gridTop = clampedY + MARGIN_SIZE;
        const startCol = Math.max(0, Math.floor((-gridLeft) / CELL_SIZE));
        const endCol = Math.min(gridSize - 1, Math.ceil((containerSize.width - gridLeft) / CELL_SIZE));
        const startRow = Math.max(0, Math.floor((-gridTop) / CELL_SIZE));
        const endRow = Math.min(gridSize - 1, Math.ceil((containerSize.height - gridTop) / CELL_SIZE));
        
        // Force tile loading by setting the correct window range
        setWindowRange({
          rowStart: startRow,
          rowEnd: endRow,
          colStart: startCol,
          colEnd: endCol
        });
      });
    }
  }, [restorePan, containerSize.width, containerSize.height, computeWindow, offsetX, offsetY, maxX, maxY, grid]);

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
            const targetX = (containerSize.width / 2) - MARGIN_SIZE - ((homeX + 0.5) * CELL_SIZE);
            const targetY = (containerSize.height / 2) - MARGIN_SIZE - ((homeY + 0.5) * CELL_SIZE);
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
                        setVisitingProfileUserId(selectedCell.info.userId);
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
              const selected = !!(selectedCell && selectedCell.x === x && selectedCell.y === y);
              const isCrewMember = cell.owner === 'player' && 
                                   cell.userId && 
                                   crewMemberUserIds.has(String(cell.userId));
              const isWarCrewMember = cell.owner === 'player' && 
                                     cell.userId && 
                                     warCrewMemberUserIds.has(String(cell.userId));
              // Only show yellow border for allies, not our own crew members
              const isAllianceCrewMember = cell.owner === 'player' && 
                                           cell.userId && 
                                           !isCrewMember && // Exclude our own crew members
                                           allianceCrewMemberUserIds.has(String(cell.userId));
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