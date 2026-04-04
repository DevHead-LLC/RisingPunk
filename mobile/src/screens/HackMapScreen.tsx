import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import { View, Text, StyleSheet, LayoutChangeEvent, Pressable, Image, Dimensions, TouchableOpacity, ScrollView, Alert, unstable_batchedUpdates, Modal, AppState } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withDecay, runOnJS, useAnimatedReaction } from 'react-native-reanimated';
import { CloseButton } from '../components/common/CloseButton';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { CollapsibleToolbar } from '../components/hackMap/CollapsibleToolbar';
import { AntivirusModal } from '../components/hackMap/AntivirusModal';
import { CrewOnboardingModal } from '../components/hackMap/CrewOnboardingModal';
import { CrewModal } from '../components/hackMap/CrewModal';
import { CrewBackupBanner } from '../components/turf/CrewBackupBanner';
import { VisitingProfileModal } from '../components/hackMap/VisitingProfileModal';
import { VisitCrewModal } from '../components/hackMap/VisitCrewModal';
import { WorldChatIconButton } from '../components/hackMap/WorldChatIconButton';
import { WorldChatModal } from '../components/hackMap/WorldChatModal';
import { MessagesIconButton } from '../components/messages/MessagesIconButton';
import { MessagesModal } from '../components/messages/MessagesModal';
import { JumpToModal } from '../components/hackMap/JumpToModal';
import { SearchUserIconButton } from '../components/hackMap/SearchUserIconButton';
import { SearchUserModal } from '../components/hackMap/SearchUserModal';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { useGetConversationsQuery, useBlockUserMutation } from '../store/api/privateMessagesApi';
import { refreshUserDataSilent } from '../store/slices/authSlice';
import { setGrid, setMapGridSize, setLoading, clearPlayerCellsByUserIds } from '../store/slices/mapSlice';
import {
  mapApi,
  useFetchMapQuery,
  useFetchMapViewportQuery,
  useGetMyMapPositionQuery,
  useLazyGetMyMapPositionQuery,
  useCompleteProbeMutation,
  useLaunchProbeMutation,
  useGetActiveProbesQuery,
  useCancelProbeMutation,
  useSendMapChatMessageMutation,
  useMovePropertyMutation,
} from '../store/api/mapApi';
import { useGetActiveAttackMarchesQuery, useCancelOutboundAttackMarchMutation } from '../store/api/attackApi';
import { AttackMarchAnimationLayer } from '../components/hackMap/AttackMarchAnimationLayer';
import { outboundProgressTForAttackMarch } from '../components/hackMap/attackMarchMapFrame';
import { useGetShieldStatusQuery } from '../store/api/antivirusApi';
import { useGetUserFeaturesQuery } from '../store/api/researchFeaturesApi';
import { useGetCrewStatusQuery, useGetUserCrewStatusQuery, useGetCrewDetailsQuery, useGetWarStatusQuery, useGetAllianceStatusQuery, useSendCrewChatMessageMutation } from '../store/api/authApi';
import { API_URL } from '../config';
import { VISITING_PROFILE_CLOSE_DELAY_MS } from '../constants/visitingProfileTiming';
import { computePanBounds } from '../utils/mapPanBounds';
import { CellData, TerrainType, EntityType } from '../types/map';
import { useThemeColors } from '../hooks/useThemeColors';
import { useTheme } from '../context/ThemeContext';
import { SIZING } from '../styles/theme';
import { trackHackmapVisited } from '../services/analyticsService';
import { buildMapLocationShareMessage } from '../../../shared/mapLocationShareMessage';
import { MOVE_PROPERTY_COST } from '../../../shared/movePropertyCost';
import { getCurrentBalance } from '../store/slices/balanceSlice';

const CELL_SIZE = 75;
const MARGIN_SIZE = 80;

/** Max probes in flight per user (outbound or return). */
const MAX_PROBES = 2;

/**
 * TurfScreen → HackMap from world-chat shared location: pan only after this delay so
 * center-on-home / my-position / viewport effects can finish first (see in-progress-4 notes).
 */
const PENDING_CHAT_NAV_DELAY_MS = 1500;

/** Target info for one probe (shared with complete API). */
type ProbeTarget = {
  targetX: number;
  targetY: number;
  targetOwner: 'player' | 'npc';
  targetUserId?: string;
  targetNpcSlug?: string;
  targetNpcInstanceId?: string;
};

/** One probe in flight: target + animation state. sentByUserId = owner (sending user); modal/cancel only for owner. */
type ProbeEntry = ProbeTarget & {
  id: string;
  /** User id of the sender; modal with time + cancel only shown when this equals current user. */
  sentByUserId?: string;
  /** Start position for other users' probes (from server); our probes use myPositionData. */
  fromX?: number;
  fromY?: number;
  /** Server-provided launch time for other users' probes; our probes use probeDataRef.startTime. */
  launchedAt?: number;
  phase: 'outbound' | 'returning';
  progress: number;
  remainingSec: number;
  /** Server-provided when phase is 'returning'; used by layer to animate return. */
  returnEndAt?: number;
  returnDurationSec?: number;
};

// Constants for viewport fetching and panning
const VIEWPORT_FETCH_THRESHOLD = 1; // Cells to move before triggering viewport fetch (1 = request as soon as we leave last fetch)
const PAN_BUFFER = 12; // Buffer in cells for window range (larger = prefetch more so next pan is often cached)
const PAN_CHANGE_THRESHOLD = 4; // Minimum pan change in pixels to trigger update
const MAX_CACHE_SIZE = 1000; // Maximum number of cached cell objects
const PANNING_STOPPED_DEBOUNCE_MS = 200; // Debounce time for panning stopped detection
/** Max press duration (ms) to count as a tap; longer presses are ignored. See tile-tap-reliability.md. */
const TILE_TAP_MAX_DURATION_MS = 500;
/**
 * NPC level-based images (hackMap/npc/). Use the image for the range that contains the NPC's level.
 * Level ranges and assets:
 *   1–5   → level_1-5_npc.png   (current NPCs in this range use this)
 *   6–10  → level_6-10_npc.png  (current NPCs only go to 8; levels 6–8 use this)
 *   11–15 → level_11-15_npc.png (for future NPC level expansion)
 *   16–20 → level_16-20_npc.png (for future NPC level expansion)
 *   21–25 → level_21-25_npc.png (for future NPC level expansion)
 *   26–30 → level_26-30.png     (for future NPC level expansion; filename has no _npc suffix)
 * When advancing NPC levels beyond 8, add or adjust ranges and ensure the correct asset is used per range.
 */
const getNpcImageForLevel = (npcLevel: number | undefined): number => {
  if (npcLevel == null) {
    return require('../assets/images/hackMap/npc/level_1-5_npc.png');
  }
  if (npcLevel <= 5) return require('../assets/images/hackMap/npc/level_1-5_npc.png');
  if (npcLevel <= 10) return require('../assets/images/hackMap/npc/level_6-10_npc.png');
  if (npcLevel <= 15) return require('../assets/images/hackMap/npc/level_11-15_npc.png');
  if (npcLevel <= 20) return require('../assets/images/hackMap/npc/level_16-20_npc.png');
  if (npcLevel <= 25) return require('../assets/images/hackMap/npc/level_21-25_npc.png');
  return require('../assets/images/hackMap/npc/level_26-30.png');
};

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
  const { v, isViewportSized } = getViewportSizing(viewport, grid);
  if (!v) return deletedKeys;
  for (let y = v.y1; y <= v.y2; y++) {
    const rowIdx = isViewportSized ? y - v.y1 : y;
    const row = grid[rowIdx];
    if (!row) continue;
    for (let x = v.x1; x <= v.x2; x++) {
      const colIdx = isViewportSized ? x - v.x1 : x;
      const cell = row[colIdx];
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
 * Returns array of {x, y, cell} objects either from viewport or full grid.
 * Bugbot: When viewport is provided and grid is viewport-sized (local indices), use rowIdx/colIdx so we don't assume global indices.
 */
const getCellsToCheck = (
  grid: any[][],
  viewport?: { x1: number; y1: number; x2: number; y2: number }
): Array<{ x: number; y: number; cell: any }> => {
  const cells: Array<{ x: number; y: number; cell: any }> = [];

  if (viewport) {
    const { v, isViewportSized } = getViewportSizing(viewport, grid);
    if (!v) return cells;
    for (let y = v.y1; y <= v.y2; y++) {
      const rowIdx = isViewportSized ? y - v.y1 : y;
      const row = grid[rowIdx];
      if (!row) continue;
      for (let x = v.x1; x <= v.x2; x++) {
        const colIdx = isViewportSized ? x - v.x1 : x;
        const cell = row[colIdx];
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

/** Empty cell used when allocating new rows (Bugbot: sparse merge avoids 500×500 copy). */
const EMPTY_CELL = { terrain: 'plain' as TerrainType, entity: 'empty' as EntityType };

/**
 * Merge grid data from new grid into current grid for a specific viewport.
 * Returns a sparse grid: only viewport rows are allocated/copied to avoid 250K copy on each pan (Bugbot).
 * Supports (1) viewport-sized newGrid; (2) full-size newGrid.
 * Bugbot: Use effective size >= currentGrid.length so we never discard rows when gridSize is stale or wrong.
 * Sparse contract: result has length effectiveGridSize but only rows in [v.y1, v.y2] are allocated; other rows are currentGrid[y] ?? null. Any code that indexes by y must null-check the row (e.g. if (!row) continue).
 */
const mergeGridData = (
  currentGrid: any[][],
  newGrid: any[][],
  viewport: { x1: number; y1: number; x2: number; y2: number },
  gridSize: number
): any[][] => {
  const { v, isViewportSized } = getViewportSizing(viewport, newGrid);
  if (!v) return currentGrid;

  const effectiveGridSize = Math.max(gridSize, currentGrid.length || 0);
  // Bugbot: Only warn when API gridSize is larger than current grid (stale client); skip when gridSize < currentGrid.length (e.g. 50×50 map with 500-row initial sparse grid) to avoid console noise on every pan.
  if (gridSize > (currentGrid.length || 0)) {
    console.warn('[mergeGridData] gridSize', gridSize, 'larger than currentGrid.length', currentGrid.length, '; using', effectiveGridSize);
  }

  // Sparse result: length effectiveGridSize, only viewport rows allocated; others preserve currentGrid reference or null.
  // Bugbot: New row column count must be gridSize (map width), not effectiveGridSize (row count); 50×50 map would otherwise get 500-column rows and ~450 wasted EMPTY_CELL per new row.
  const mergedGrid: any[][] = Array.from({ length: effectiveGridSize }, (_, y) => {
    if (y >= v.y1 && y <= v.y2) {
      const existingRow = currentGrid[y];
      return existingRow
        ? [...existingRow]
        : Array.from({ length: gridSize }, () => ({ ...EMPTY_CELL }));
    }
    return currentGrid[y] ?? null;
  });

  for (let y = v.y1; y <= v.y2; y++) {
    const row = mergedGrid[y];
    if (!row) continue;
    for (let x = v.x1; x <= v.x2; x++) {
      const cell = isViewportSized
        ? newGrid[y - v.y1]?.[x - v.x1]
        : newGrid[y]?.[x];
      if (cell) {
        row[x] = row[x] ? { ...row[x], ...cell } : { ...EMPTY_CELL, ...cell };
      }
    }
  }
  return mergedGrid;
};

/**
 * Get grid size from grid array with fallback
 * @param grid - Grid array
 * @param fallback - Fallback size if grid is empty (default: 500)
 * @returns Grid size
 */
const getGridSize = (grid: any[][] | null | undefined, fallback: number = 500): number => {
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

/** Normalize viewport so x1<=x2 and y1<=y2 (Bugbot: avoid wrong viewportH/viewportW and indexing when bounds reversed). */
const normalizeViewport = (viewport: { x1: number; y1: number; x2: number; y2: number }): { x1: number; y1: number; x2: number; y2: number } => ({
  x1: Math.min(viewport.x1, viewport.x2),
  y1: Math.min(viewport.y1, viewport.y2),
  x2: Math.max(viewport.x1, viewport.x2),
  y2: Math.max(viewport.y1, viewport.y2),
});

/** Bugbot: Single source of truth for viewport normalization + viewportH/viewportW + isViewportSized; used by cleanupEmptyCells, getCellsToCheck, mergeGridData, separateStaticAndDynamicData, and initial-viewport user search. */
const getViewportSizing = (
  viewport: { x1: number; y1: number; x2: number; y2: number } | undefined,
  grid: any[][]
): { v: { x1: number; y1: number; x2: number; y2: number } | undefined; viewportH: number; viewportW: number; isViewportSized: boolean } => {
  if (!viewport) return { v: undefined, viewportH: 0, viewportW: 0, isViewportSized: false };
  const v = normalizeViewport(viewport);
  const viewportH = v.y2 - v.y1 + 1;
  const viewportW = v.x2 - v.x1 + 1;
  // Bugbot: Use first non-null row's length so sparse grids (grid[0] null) don't wrongly set isViewportSized false.
  const gridW = grid.find((r): r is any[] => r != null && Array.isArray(r))?.length ?? 0;
  const isViewportSized = grid.length === viewportH && gridW === viewportW;
  return { v, viewportH, viewportW, isViewportSized };
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
 * Union two viewports and clamp to grid (so one request can cover multiple queued areas)
 */
const unionViewports = (
  a: { x1: number; y1: number; x2: number; y2: number },
  b: { x1: number; y1: number; x2: number; y2: number },
  gridSize: number
): { x1: number; y1: number; x2: number; y2: number } => {
  return {
    x1: Math.max(0, Math.min(a.x1, b.x1)),
    y1: Math.max(0, Math.min(a.y1, b.y1)),
    x2: Math.min(gridSize - 1, Math.max(a.x2, b.x2)),
    y2: Math.min(gridSize - 1, Math.max(a.y2, b.y2)),
  };
};

/**
 * Trigger viewport fetch with minimal flag
 * Prevents new requests while one is in flight; when queueing, unions with existing pending to cover more area in one request
 * @param gridSize - Grid size for clamping union
 */
const triggerViewportFetch = (
  newViewport: { x1: number; y1: number; x2: number; y2: number; minimal?: boolean },
  panningViewportMinimalRef: React.MutableRefObject<boolean>,
  setPanningViewportParams: React.Dispatch<React.SetStateAction<{ x1: number; y1: number; x2: number; y2: number; minimal?: boolean } | null>>,
  viewportRequestInFlightRef: React.MutableRefObject<boolean>,
  pendingViewportParamsRef: React.MutableRefObject<{ x1: number; y1: number; x2: number; y2: number; minimal?: boolean } | null>,
  gridSize: number
): void => {
  if (viewportRequestInFlightRef.current) {
    // Request in flight: union with existing pending so one request covers more area (reduces black regions)
    const prev = pendingViewportParamsRef.current;
    const merged = prev
      ? { ...unionViewports(prev, newViewport, gridSize), minimal: (newViewport.minimal ?? true) && (prev.minimal ?? true) }
      : newViewport;
    pendingViewportParamsRef.current = merged;
    return;
  }

  viewportRequestInFlightRef.current = true;
  panningViewportMinimalRef.current = newViewport.minimal ?? true;
  setPanningViewportParams(newViewport);
};

type Props = {
  onClose: () => void;
  restorePan?: { x: number; y: number };
  /** TurfScreen: after opening map from world chat, pan to this cell once. */
  pendingNavigateToCell?: { x: number; y: number } | null;
  onPendingNavigateConsumed?: () => void;
  /**
   * TurfScreen: monotonic token — when incremented after closing replay (Messages → Watch battle), open this
   * screen's MessagesModal (separate from TurfScreen's modal).
   */
  openMessagesAfterReplayToken?: number;
  /** TurfScreen: Battle Report `BTL|` → replay mode on {@link BattleGridScreen} (same as turf Messages). */
  onWatchBattle?: (battleId: string) => void;
};

function getShareLabelForCell(info: CellData): string {
  if (info.entity === 'empty') {
    return info.terrain.toUpperCase();
  }
  const name = (info.name || '').trim();
  if (name) return name;
  return info.terrain.toUpperCase();
}

/**
 * Shared memo comparison function for Tile and PoolTile components
 * Uses fast path (cell reference equality) with deep comparison fallback
 */
// Phase 1c: displayName/displayShielded so tile re-renders when minimal→full updates (same cell ref, label changes)
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
  dynamicEntityData: Record<string, any>;
  displayName?: string | undefined;
  displayShielded?: boolean;
  tapHandledByGesture?: boolean;
}>(prevProps: T, nextProps: T): boolean => {
  if (prevProps.cell === nextProps.cell) {
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
      nextProps.dynamicEntityData[`${nextProps.x},${nextProps.y}`]?.isShielded &&
      prevProps.displayName === nextProps.displayName &&
      prevProps.displayShielded === nextProps.displayShielded &&
      prevProps.tapHandledByGesture === nextProps.tapHandledByGesture
    );
  }
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
    nextProps.dynamicEntityData[`${nextProps.x},${nextProps.y}`]?.isShielded &&
    prevProps.displayName === nextProps.displayName &&
    prevProps.displayShielded === nextProps.displayShielded &&
    prevProps.tapHandledByGesture === nextProps.tapHandledByGesture
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
    npcLevel?: number;
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
    prevProps.entityImage?.npcLevel === nextProps.entityImage?.npcLevel &&
    prevProps.currentUserId === nextProps.currentUserId &&
    prevProps.isShieldActive === nextProps.isShieldActive
  );
};

/** Probe animation updates (per frame); stored in ref to avoid 60fps parent re-renders. */
type ProbeUpdate = { id: string; progress: number; remainingSec: number; phase: 'outbound' | 'returning' };

type ProbeAnimationLayerProps = {
  probes: ProbeEntry[];
  setProbes: React.Dispatch<React.SetStateAction<ProbeEntry[]>>;
  myPositionData: { x: number; y: number } | undefined;
  currentUserId: string | null | undefined;
  completeProbeMutation: ReturnType<typeof useCompleteProbeMutation>[0];
  probeFollowModeRef: React.MutableRefObject<boolean>;
  followProbeIdRef: React.MutableRefObject<string | null>;
  containerSizeRef: React.MutableRefObject<{ width: number; height: number }>;
  offsetX: Animated.SharedValue<number>;
  offsetY: Animated.SharedValue<number>;
  boundsReady: Animated.SharedValue<boolean>;
  minX: Animated.SharedValue<number>;
  maxX: Animated.SharedValue<number>;
  minY: Animated.SharedValue<number>;
  maxY: Animated.SharedValue<number>;
  scheduleComputeRef: React.MutableRefObject<(tx: number, ty: number, vx: number, vy: number) => void>;
  onFollowProbe: (probeId: string) => void;
  onCloseModal: () => void;
  onProbeCompleteFailed: (probeId: string) => void;
  onProbeRemovedAfterReturn: (probeId: string) => void;
  onFollowProbeDisplayUpdate: (data: { remainingSec: number; phase: 'outbound' | 'returning' }) => void;
  cancelProbeRef: React.MutableRefObject<(() => void) | null>;
  cancelProbeMutation: (args: { probeId: string }) => void;
  colors: ReturnType<typeof useThemeColors>;
  styles: ReturnType<typeof getStyles>;
  animatedMapStyle: Record<string, unknown>;
};

/** Tappable wrapper for the probe icon; hit area matches probe image size. */
const ProbeTapTarget: React.FC<{
  probeId: string;
  onFollowProbe: (probeId: string) => void;
  hitLeft: number;
  hitTop: number;
  hitSize: number;
  children: React.ReactNode;
}> = ({ probeId, onFollowProbe, hitLeft, hitTop, hitSize, children }) => (
  <View
    pointerEvents="box-none"
    style={{
      position: 'absolute',
      left: hitLeft,
      top: hitTop,
      width: hitSize,
      height: hitSize,
      justifyContent: 'center',
      alignItems: 'center',
    }}
  >
    <Pressable
      style={{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' }}
      onPress={() => onFollowProbe(probeId)}
    >
      {children}
    </Pressable>
  </View>
);

/**
 * Owns the probe animation loop and renders probe overlay + follow modal.
 * Updates only this layer at 60fps (probeUpdatesRef + setFrame), so HackMapScreen does not re-render every frame.
 */
const ProbeAnimationLayer: React.FC<ProbeAnimationLayerProps> = ({
  probes,
  setProbes,
  myPositionData,
  currentUserId,
  completeProbeMutation,
  probeFollowModeRef,
  followProbeIdRef,
  containerSizeRef,
  offsetX,
  offsetY,
  boundsReady,
  minX,
  maxX,
  minY,
  maxY,
  scheduleComputeRef,
  onFollowProbe,
  onCloseModal,
  onProbeCompleteFailed,
  onProbeRemovedAfterReturn,
  onFollowProbeDisplayUpdate,
  cancelProbeRef,
  cancelProbeMutation,
  colors,
  styles,
  animatedMapStyle,
}) => {
  const probesRef = useRef<ProbeEntry[]>([]);
  const probeDataRef = useRef<Map<string, {
    startTime: number;
    durationSec: number;
    returnStartTime?: number;
    returnStartProgress?: number;
    returnDuration?: number;
    completing: boolean;
    /** When progress first reached 1; we delay /complete by a short buffer so server travel-time check passes. */
    reachedTargetAt?: number;
  }>>(new Map());
  const startedAnimationRef = useRef<Set<string>>(new Set());
  const probeAnimationFrameRef = useRef<number | null>(null);
  const probeUpdatesRef = useRef<ProbeUpdate[]>([]);
  /** Ref to the tick function so we can restart the loop when app returns from background (rAF pauses when app is backgrounded). */
  const tickRef = useRef<(() => void) | null>(null);
  const [, setFrame] = useState(0);
  /** Last display values sent to parent; only notify when ceil(remainingSec) or phase changes so parent does not re-render at 60fps. */
  const lastFollowDisplayRef = useRef<{ ceilSec: number; phase: 'outbound' | 'returning' } | null>(null);

  useEffect(() => {
    probesRef.current = probes;
  }, [probes]);

  // When app returns to foreground, restart the animation loop (requestAnimationFrame does not run while app is backgrounded).
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active') return;
      if (probesRef.current.length === 0) return;
      const tick = tickRef.current;
      if (!tick) return;
      if (probeAnimationFrameRef.current != null) {
        cancelAnimationFrame(probeAnimationFrameRef.current);
        probeAnimationFrameRef.current = null;
      }
      probeAnimationFrameRef.current = requestAnimationFrame(tick);
    });
    return () => sub?.remove();
  }, []);

  useEffect(() => {
    if (probes.length === 0) {
      probeDataRef.current.clear();
      startedAnimationRef.current.clear();
      return;
    }

    const current = probesRef.current;
    const ux = myPositionData?.x ?? 0;
    const uy = myPositionData?.y ?? 0;

    current.forEach((probe) => {
      const tx = probe.targetX;
      const ty = probe.targetY;
      const isServerProbe = probe.launchedAt != null && probe.fromX != null && probe.fromY != null;
      const startX = isServerProbe ? probe.fromX! : ux;
      const startY = isServerProbe ? probe.fromY! : uy;
      if (!startedAnimationRef.current.has(probe.id)) {
        if (!isServerProbe && !myPositionData) return;
        startedAnimationRef.current.add(probe.id);
        const distanceTiles = Math.sqrt((tx - startX) ** 2 + (ty - startY) ** 2);
        const durationSec = Math.max(2, distanceTiles * 2);
        const data: {
          startTime: number;
          durationSec: number;
          completing: boolean;
          returnStartTime?: number;
          returnDuration?: number;
        } = {
          startTime: isServerProbe ? probe.launchedAt! : Date.now(),
          durationSec,
          completing: false,
        };
        if (probe.phase === 'returning' && probe.returnEndAt != null && probe.returnDurationSec != null) {
          data.returnStartTime = probe.returnEndAt - probe.returnDurationSec * 1000;
          data.returnDuration = probe.returnDurationSec;
        }
        probeDataRef.current.set(probe.id, data);
      } else if (probe.phase === 'returning' && probe.returnEndAt != null && probe.returnDurationSec != null) {
        const data = probeDataRef.current.get(probe.id);
        if (data && data.returnStartTime == null) {
          data.returnStartTime = probe.returnEndAt - probe.returnDurationSec * 1000;
          data.returnDuration = probe.returnDurationSec;
        }
      }
    });

    const tick = () => {
      const now = Date.now();
      const currentProbes = probesRef.current;
      if (currentProbes.length === 0) {
        probeAnimationFrameRef.current = null;
        return;
      }

      const updates: ProbeUpdate[] = [];
      let followProbeContentX: number | null = null;
      let followProbeContentY: number | null = null;

      for (const probe of currentProbes) {
        const data = probeDataRef.current.get(probe.id);
        if (!data) continue;

        let progress: number;
        let remainingSec: number;
        const phase = probe.phase;

        if (phase === 'returning') {
          data.completing = false;
          const returnStartTime = data.returnStartTime ?? now;
          const returnDuration = data.returnDuration ?? data.durationSec;
          const returnStartProgress = data.returnStartProgress ?? 1;
          const returnElapsed = (now - returnStartTime) / 1000;
          const t = Math.min(1, returnDuration > 0 ? returnElapsed / returnDuration : 1);
          progress = returnStartProgress * (1 - t);
          remainingSec = Math.max(0, returnDuration - returnElapsed);
        } else {
          const elapsed = (now - data.startTime) / 1000;
          progress = Math.min(1, elapsed / data.durationSec);
          remainingSec = Math.max(0, data.durationSec * (1 - progress));
        }

        updates.push({ id: probe.id, progress, remainingSec, phase });

        const isServerProbe = probe.launchedAt != null && probe.fromX != null && probe.fromY != null;
        const originX = isServerProbe ? probe.fromX! : ux;
        const originY = isServerProbe ? probe.fromY! : uy;
        const startX = MARGIN_SIZE + (originX + 0.5) * CELL_SIZE;
        const startY = MARGIN_SIZE + (originY + 0.5) * CELL_SIZE;
        const endX = MARGIN_SIZE + (probe.targetX + 0.5) * CELL_SIZE;
        const endY = MARGIN_SIZE + (probe.targetY + 0.5) * CELL_SIZE;
        const dx = endX - startX;
        const dy = endY - startY;
        const lineProgress = progress;
        const probeContentX = startX + dx * lineProgress;
        const probeContentY = startY + dy * lineProgress;
        if (followProbeIdRef.current === probe.id) {
          followProbeContentX = probeContentX;
          followProbeContentY = probeContentY;
        }
      }

      probeUpdatesRef.current = updates;
      setFrame((f) => f + 1);

      const fid = followProbeIdRef.current;
      if (fid) {
        const followed = currentProbes.find((p) => p.id === fid);
        if (followed?.sentByUserId === currentUserId) {
          const fu = updates.find((x) => x.id === fid);
          if (fu) {
            const ceilSec = Math.ceil(fu.remainingSec);
            const last = lastFollowDisplayRef.current;
            if (last == null || last.ceilSec !== ceilSec || last.phase !== fu.phase) {
              lastFollowDisplayRef.current = { ceilSec, phase: fu.phase };
              onFollowProbeDisplayUpdate({ remainingSec: fu.remainingSec, phase: fu.phase });
            }
          }
        }
      } else {
        lastFollowDisplayRef.current = null;
      }

      const container = containerSizeRef.current;
      if (probeFollowModeRef.current && followProbeContentX != null && followProbeContentY != null && container.width > 0 && container.height > 0) {
        let tx = container.width / 2 - followProbeContentX;
        let ty = container.height / 2 - followProbeContentY;
        if (boundsReady.value) {
          tx = Math.min(maxX.value, Math.max(minX.value, tx));
          ty = Math.min(maxY.value, Math.max(minY.value, ty));
        }
        offsetX.value = tx;
        offsetY.value = ty;
        scheduleComputeRef.current(tx, ty, 0, 0);
      }

      const toRemove: string[] = [];

      for (const probe of currentProbes) {
        const data = probeDataRef.current.get(probe.id);
        if (!data) continue;
        const u = updates.find((x) => x.id === probe.id);
        if (!u) continue;
        const { progress, phase } = u;

        if (phase === 'returning') {
          if (progress <= 0) {
            toRemove.push(probe.id);
            if (followProbeIdRef.current === probe.id) {
              onCloseModal();
            }
          }
        } else if (progress >= 1) {
          const isOwner = probe.sentByUserId === currentUserId;
          if (isOwner && !data.completing) {
            const reachedAt = data.reachedTargetAt ?? now;
            if (data.reachedTargetAt == null) data.reachedTargetAt = reachedAt;
            const bufferMs = 400;
            if (now - reachedAt < bufferMs) continue;
            data.completing = true;
            completeProbeMutation({
              probeId: probe.id,
              targetOwner: probe.targetOwner,
              targetUserId: probe.targetUserId,
              targetNpcSlug: probe.targetNpcSlug,
              targetX: probe.targetX,
              targetY: probe.targetY,
            })
              .unwrap()
              .then(() => {
                data.returnStartTime = Date.now();
                data.returnStartProgress = 1;
                data.returnDuration = data.durationSec;
                setProbes((prev) =>
                  prev.map((p) => (p.id === probe.id ? { ...p, phase: 'returning' as const, remainingSec: data.durationSec } : p))
                );
              })
              .catch((err: any) => {
                data.completing = false;
                probeDataRef.current.delete(probe.id);
                startedAnimationRef.current.delete(probe.id);
                setProbes((prev) => prev.filter((p) => p.id !== probe.id));
                const serverMsg = err?.data?.error ?? '';
                const serverAlreadyHandled =
                  serverMsg === 'Probe already completed' || serverMsg === 'Probe completion already in progress';
                if (!serverAlreadyHandled) {
                  onProbeCompleteFailed(probe.id);
                  cancelProbeMutation({ probeId: probe.id });
                }
                if (followProbeIdRef.current === probe.id) {
                  onCloseModal();
                }
                // No alert; cleanup only. When serverAlreadyHandled, do not cancel — observers keep return phase.
              });
          }
        }
      }

      if (toRemove.length > 0) {
        toRemove.forEach((id) => {
          probeDataRef.current.delete(id);
          startedAnimationRef.current.delete(id);
          onProbeRemovedAfterReturn(id);
        });
        setProbes((prev) => {
          const next = prev.filter((p) => !toRemove.includes(p.id));
          return next.length === prev.length ? prev : next;
        });
      }

      probeAnimationFrameRef.current = requestAnimationFrame(tick);
    };

    tickRef.current = tick;
    probeAnimationFrameRef.current = requestAnimationFrame(tick);
    return () => {
      if (probeAnimationFrameRef.current != null) {
        cancelAnimationFrame(probeAnimationFrameRef.current);
        probeAnimationFrameRef.current = null;
      }
    };
  }, [probes, myPositionData, currentUserId, completeProbeMutation, setProbes, onFollowProbeDisplayUpdate, onCloseModal, onProbeCompleteFailed, onProbeRemovedAfterReturn, cancelProbeMutation]);

  const handleProbeCancel = useCallback(() => {
    const fid = followProbeIdRef.current;
    if (fid == null) return;
    const probe = probesRef.current.find((p) => p.id === fid);
    if (!probe || probe.sentByUserId !== currentUserId) return;
    const data = probeDataRef.current.get(probe.id);
    if (!data) return;
    cancelProbeMutation({ probeId: fid });
    const u = probeUpdatesRef.current.find((x) => x.id === probe.id);
    const returnStartProgress = u ? u.progress : probe.progress;
    const returnDuration = returnStartProgress * data.durationSec;
    data.returnStartTime = Date.now();
    data.returnStartProgress = returnStartProgress;
    data.returnDuration = returnDuration;
    setProbes((prev) =>
      prev.map((p) => (p.id === fid ? { ...p, phase: 'returning' as const, remainingSec: returnDuration } : p))
    );
  }, [currentUserId, setProbes, cancelProbeMutation]);

  useEffect(() => {
    cancelProbeRef.current = handleProbeCancel;
    return () => {
      cancelProbeRef.current = null;
    };
  }, [handleProbeCancel, cancelProbeRef]);

  if (probes.length === 0) {
    return null;
  }

  const updates = probeUpdatesRef.current;
  const ux = myPositionData?.x ?? 0;
  const uy = myPositionData?.y ?? 0;

  return (
    <>
      <Animated.View
        style={[StyleSheet.absoluteFill, animatedMapStyle as any, { zIndex: 10, elevation: 10 }]}
        pointerEvents="box-none"
      >
        {probes.map((probe) => {
          const upd = updates.find((x) => x.id === probe.id);
          const progress = upd ? upd.progress : probe.progress;
          const tx = probe.targetX;
          const ty = probe.targetY;
          const originX = probe.fromX != null && probe.fromY != null ? probe.fromX : ux;
          const originY = probe.fromX != null && probe.fromY != null ? probe.fromY : uy;
          const startX = MARGIN_SIZE + (originX + 0.5) * CELL_SIZE;
          const startY = MARGIN_SIZE + (originY + 0.5) * CELL_SIZE;
          const endX = MARGIN_SIZE + (tx + 0.5) * CELL_SIZE;
          const endY = MARGIN_SIZE + (ty + 0.5) * CELL_SIZE;
          const dx = endX - startX;
          const dy = endY - startY;
          const length = Math.sqrt(dx * dx + dy * dy) || 1;
          const angle = Math.atan2(dy, dx);
          const PROBE_SIZE = 100;
          const lineProgress = progress;
          const px = startX + dx * lineProgress - PROBE_SIZE / 2;
          const py = startY + dy * lineProgress - PROBE_SIZE / 2;
          const hitSize = PROBE_SIZE;
          const hitLeft = px;
          const hitTop = py;
          return (
            <View key={probe.id} pointerEvents="box-none" style={[StyleSheet.absoluteFill, { left: 0, top: 0, right: 0, bottom: 0 }]}>
              <View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  left: startX,
                  top: startY,
                  width: length,
                  height: 1,
                  borderWidth: 1,
                  borderStyle: 'dashed',
                  borderColor: colors.matrix ?? '#00ff00',
                  borderRadius: 0.5,
                  opacity: 0.8,
                  transform: [{ translateX: -length / 2 }, { rotate: `${angle}rad` }, { translateX: length / 2 }],
                }}
              />
              <ProbeTapTarget probeId={probe.id} onFollowProbe={onFollowProbe} hitLeft={hitLeft} hitTop={hitTop} hitSize={hitSize}>
                <Image
                  source={require('../assets/images/hackMap/probe.png')}
                  style={{ width: PROBE_SIZE, height: PROBE_SIZE }}
                  resizeMode="contain"
                />
              </ProbeTapTarget>
            </View>
          );
        })}
      </Animated.View>
    </>
  );
};

export const HackMapScreen: React.FC<Props> = ({
  onClose,
  restorePan,
  pendingNavigateToCell,
  onPendingNavigateConsumed,
  openMessagesAfterReplayToken = 0,
  onWatchBattle,
}) => {
  const dispatch = useAppDispatch();
  const grid = useAppSelector((state) => state.map.grid);
  const mapGridSize = useAppSelector((state) => state.map.mapGridSize);
  const loading = useAppSelector((state) => state.map.loading);
  const currentUserHandle = useAppSelector((state) => state.auth.user?.handle);
  const currentUserId = useAppSelector((state) => state.auth.user?._id);
  const currentUserIsAdmin = useAppSelector((state) => state.auth.user?.isAdmin === true);
  const currentBalanceDisplay = useAppSelector(getCurrentBalance);
  const token = useAppSelector((state) => state.auth.token);
  const hackRigUnlocked = useAppSelector((state) => state.auth.user?.unlockedFeatures?.hackRig === true);
  const colors = useThemeColors();
  const { themeMode } = useTheme();

  // Track first visit to HackMap
  useEffect(() => {
    if (currentUserId) {
      trackHackmapVisited(currentUserId);
    }
  }, [currentUserId]);

  // Refetch user silently on mount so World Chat icon (gated by hackRig) shows without app refresh after unlock
  useEffect(() => {
    dispatch(refreshUserDataSilent());
  }, [dispatch]);

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

  const Tile: React.FC<TileProps> = React.memo(({ x, y, cell, selected, onPress, xStyle, terrainStyleMap, currentUserHandle, colors, themeMode, styles, dynamicEntityData, isShieldActive, isCrewMember, isWarCrewMember, isAllianceCrewMember, displayName, displayShielded, tapHandledByGesture }) => {
    const key = `${x},${y}`;
    const dynamicEntity = dynamicEntityData[key];
    const isShielded = displayShielded ?? dynamicEntity?.isShielded ?? (cell as any).isShielded;
    const pressStartTimeRef = useRef<number>(0);
    const pressStartCoordsRef = useRef<{ x: number; y: number } | null>(null);
    const nameForStyle = displayName ?? cell.name;
    const houseBgStyle = cell.entity === 'house'
      ? (cell.owner === 'player'
          ? (nameForStyle === currentUserHandle ? styles.userHouseBg : styles.otherUserHouseBg)
          : styles.enemyHouseBg)
      : null;

    const handlePress = useCallback(() => {
      const now = Date.now();
      const startTime = pressStartTimeRef.current;
      const startCoords = pressStartCoordsRef.current;
      if (startTime > 0 && now - startTime < TILE_TAP_MAX_DURATION_MS && startCoords) {
        onPress(x, y, cell);
      }
      pressStartTimeRef.current = 0;
      pressStartCoordsRef.current = null;
    }, [x, y, cell, onPress]);

    const showShield = cell.owner === 'player' && ((nameForStyle === currentUserHandle && isShieldActive) || isShielded);
    const imageSource = cell.entity === 'house'
      ? (cell.owner === 'player'
          ? (showShield ? require('../assets/images/hackMap/shielded.png') : require('../assets/images/home.png'))
          : getNpcImageForLevel(cell.npcLevel))
      : null;

    const cellContent = (
      <View style={[styles.cellContent, terrainStyleMap[cell.terrain], houseBgStyle]}>
        {cell.entity !== 'house' && getTerrainIcon(cell.terrain)}
        {cell.entity === 'house' && (
          <>
            <Image
              source={imageSource!}
              style={styles.playerHomeIcon}
              resizeMode="contain"
            />
            <View style={styles.entityLabelContainer} pointerEvents="none">
              <Text
                style={[styles.entityLabel, cell.owner === 'player' ? styles.playerLabel : styles.enemyLabel]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {(cell.owner === 'player' && (displayName ?? cell.name) === currentUserHandle ? 'YOU' : ((displayName ?? cell.name ?? '').trim() || (cell.owner === 'player' ? 'Player' : 'NPC')))}
              </Text>
            </View>
            {cell.owner !== 'player' && cell.npcLevel && (
              <View style={styles.npcLevelContainer} pointerEvents="none">
                <Text style={styles.npcLevelText}>{cell.npcLevel}</Text>
              </View>
            )}
          </>
        )}
      </View>
    );

    const cellStyle = [
      styles.cell,
      xStyle,
      selected && styles.selectedCell,
      isWarCrewMember && styles.warCrewMemberCell,
      !isWarCrewMember && isAllianceCrewMember && styles.allianceCrewMemberCell,
      !isWarCrewMember && !isAllianceCrewMember && isCrewMember && styles.crewMemberCell,
    ];
    // Single tap handler: gesture layer (Gesture.Tap) handles map taps; avoid dual Pressable handler (Bugbot).
    if (tapHandledByGesture) {
      return <View style={cellStyle}>{cellContent}</View>;
    }
    return (
      <Pressable
        style={cellStyle}
        hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
        onPress={handlePress}
        onPressIn={(e) => {
          pressStartTimeRef.current = Date.now();
          pressStartCoordsRef.current = { x: e.nativeEvent.locationX, y: e.nativeEvent.locationY };
        }}
        onPressOut={(e) => {
          const startTime = pressStartTimeRef.current;
          const startCoords = pressStartCoordsRef.current;
          if (startTime > 0 && startCoords) {
            const moved = Math.abs(e.nativeEvent.locationX - startCoords.x) > 5 || Math.abs(e.nativeEvent.locationY - startCoords.y) > 5;
            if (moved) {
              pressStartTimeRef.current = 0;
              pressStartCoordsRef.current = null;
            }
          }
        }}
      >
        {cellContent}
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
      npcLevel?: number;
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
                <Image
                  source={getNpcImageForLevel(entityImage.npcLevel)}
                  style={styles.playerHomeIcon}
                  resizeMode="contain"
                />
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
      npcLevel?: number;
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

  const PoolTile: React.FC<PoolTileProps> = React.memo(({ x, y, cell, selected, onPress, xStyle, yStyle, terrainStyleMap, currentUserHandle, colors, themeMode, styles, dynamicEntityData, isShieldActive, isCrewMember, isWarCrewMember, isAllianceCrewMember, displayName, displayShielded }) => {
    return (
      <View style={[yStyle]}>
        <Tile x={x} y={y} cell={cell} selected={selected} onPress={onPress} xStyle={xStyle} terrainStyleMap={terrainStyleMap} currentUserHandle={currentUserHandle} colors={colors} themeMode={themeMode} styles={styles} dynamicEntityData={dynamicEntityData} isShieldActive={isShieldActive} isCrewMember={isCrewMember} isWarCrewMember={isWarCrewMember} isAllianceCrewMember={isAllianceCrewMember} displayName={displayName} displayShielded={displayShielded} tapHandledByGesture />
      </View>
    );
  }, tileMemoComparison);

  const [selectedCell, setSelectedCell] = useState<{x: number, y: number, info: CellData} | null>(null);
  const [showAntivirusModal, setShowAntivirusModal] = useState(false);
  const [showJumpToModal, setShowJumpToModal] = useState(false);
  const [showSearchUserModal, setShowSearchUserModal] = useState(false);
  const [showCrewModal, setShowCrewModal] = useState(false);
  const [crewModalInitialCategory, setCrewModalInitialCategory] = useState<'backup-requests' | null>(null);
  const [crewModalFocusBackupKey, setCrewModalFocusBackupKey] = useState(0);
  const [showCrewOnboardingModal, setShowCrewOnboardingModal] = useState(false);
  const [showVisitingProfileModal, setShowVisitingProfileModal] = useState(false);
  const [visitingProfileUserId, setVisitingProfileUserId] = useState<string | null>(null);
  const visitingProfileCloseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const visitCrewCloseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const [showVisitCrewModal, setShowVisitCrewModal] = useState(false);
  const [visitCrewId, setVisitCrewId] = useState<string | null>(null);
  const [visitCrewName, setVisitCrewName] = useState<string | null>(null);
  const [showCrewModalFromUser, setShowCrewModalFromUser] = useState(false);
  const [showWorldChatModal, setShowWorldChatModal] = useState(false);
  const [showMessagesModal, setShowMessagesModal] = useState(false);
  const [messagesOpenToUser, setMessagesOpenToUser] = useState<{ userId: string; username: string } | null>(null);
  /** Up to MAX_PROBES probes in flight; each has id, target, phase, progress, remainingSec. */
  const [probes, setProbes] = useState<ProbeEntry[]>([]);
  /** Which probe (id) is shown in the follow modal and centered when in follow mode. */
  const [followProbeId, setFollowProbeId] = useState<string | null>(null);
  /** Owner hack expedition modal (tap **outbound** or **returning** march on map). */
  const [marchOwnerModalId, setMarchOwnerModalId] = useState<string | null>(null);
  const [marchModalTimeTick, setMarchModalTimeTick] = useState(0);
  const [showProbeFollowModal, setShowProbeFollowModal] = useState(false);
  /** Live remainingSec/phase for the followed probe (updated by ProbeAnimationLayer each tick when modal open). */
  const [followProbeDisplay, setFollowProbeDisplay] = useState<{ remainingSec: number; phase: 'outbound' | 'returning' } | null>(null);
  const probeFollowModeRef = useRef<boolean>(false);
  const followProbeIdRef = useRef<string | null>(null);
  const cancelProbeRef = useRef<(() => void) | null>(null);
  const handleProbeFollowModalCloseRef = useRef<(() => void) | null>(null);
  const [completeProbeMutation] = useCompleteProbeMutation();
  const [launchProbeMutation] = useLaunchProbeMutation();
  const [cancelProbeMutation] = useCancelProbeMutation();
  const [movePropertyMutation] = useMovePropertyMutation();
  const { data: activeProbesData } = useGetActiveProbesQuery(undefined, {
    pollingInterval: 3000,
  });
  const { data: activeAttackMarchesData } = useGetActiveAttackMarchesQuery(undefined, {
    skip: !token,
    pollingInterval: 3000,
  });
  const [cancelOutboundAttackMarch, { isLoading: isCancellingOutboundMarch }] =
    useCancelOutboundAttackMarchMutation();
  /** Prior `/api/attack/active` snapshot — detect resolving→returning / NPC march removal → invalidate Map (ghost NPC fix). */
  const prevActiveAttackMarchesForMapInvRef = useRef<
    Array<{ marchId: string; state: string; defenderNpcInstanceId?: string }>
  >([]);
  useEffect(() => {
    const next = activeAttackMarchesData?.marches ?? [];
    const prev = prevActiveAttackMarchesForMapInvRef.current;

    if (prev.length > 0) {
      const nextById = new Map(next.map((m) => [m.marchId, m]));
      let shouldInvalidate = false;

      for (const p of prev) {
        if (p.state !== 'resolving') continue;
        const n = nextById.get(p.marchId);
        if (!n || n.state === 'returning') {
          shouldInvalidate = true;
          break;
        }
      }

      if (!shouldInvalidate) {
        for (const p of prev) {
          if (nextById.has(p.marchId)) continue;
          const inst = p.defenderNpcInstanceId;
          const npcTarget = typeof inst === 'string' && inst.trim() !== '';
          if (
            npcTarget &&
            (p.state === 'outbound' || p.state === 'arrived' || p.state === 'queued')
          ) {
            shouldInvalidate = true;
            break;
          }
        }
      }

      if (shouldInvalidate) {
        dispatch(mapApi.util.invalidateTags(['Map']));
      }
    }

    prevActiveAttackMarchesForMapInvRef.current = next;
  }, [activeAttackMarchesData?.marches, dispatch]);
  /** Probe ids for which /complete failed; exclude from display so we don't re-init and retry in a loop until server TTL. */
  const [failedProbeIds, setFailedProbeIds] = useState<Set<string>>(() => new Set());
  /** Probe ids we removed from local state because return finished; server may still have them for one poll cycle. Exclude from displayProbes so ghost doesn't render or count toward MAX_PROBES. */
  const [returnCompletedProbeIds, setReturnCompletedProbeIds] = useState<Set<string>>(() => new Set());
  /** Prune failedProbeIds and returnCompletedProbeIds when server no longer has those probes (single effect, single serverIds). */
  useEffect(() => {
    const serverIds = new Set((activeProbesData?.probes ?? []).map((p) => p.id));
    setFailedProbeIds((prev) => {
      let changed = false;
      const next = new Set(prev);
      next.forEach((id) => {
        if (!serverIds.has(id)) {
          next.delete(id);
          changed = true;
        }
      });
      return changed ? next : prev;
    });
    setReturnCompletedProbeIds((prev) => {
      let changed = false;
      const next = new Set(prev);
      next.forEach((id) => {
        if (!serverIds.has(id)) {
          next.delete(id);
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [activeProbesData?.probes]);
  const displayProbes = useMemo((): ProbeEntry[] => {
    const ours = probes;
    const serverProbes = (activeProbesData?.probes ?? []).filter((sp) => !failedProbeIds.has(sp.id));
    const ourIds = new Set(ours.map((p) => p.id));
    const others = serverProbes
      .filter((sp) => !ourIds.has(sp.id) && !returnCompletedProbeIds.has(sp.id))
      .map(
        (sp): ProbeEntry => ({
          id: sp.id,
          sentByUserId: sp.sentByUserId,
          fromX: sp.fromX,
          fromY: sp.fromY,
          launchedAt: sp.launchedAt,
          targetX: sp.targetX,
          targetY: sp.targetY,
          targetOwner: sp.targetOwner,
          targetUserId: sp.targetUserId,
          targetNpcSlug: sp.targetNpcSlug,
          targetNpcInstanceId: sp.targetNpcInstanceId,
          phase: sp.phase ?? 'outbound',
          progress: 0,
          remainingSec: 0,
          returnEndAt: sp.returnEndAt,
          returnDurationSec: sp.returnDurationSec,
        })
      );
    return [...ours, ...others];
  }, [probes, activeProbesData?.probes, failedProbeIds, returnCompletedProbeIds]);
  const { data: conversationsData } = useGetConversationsQuery(undefined, {
    skip: !token,
    pollingInterval: token ? 10000 : 0, // 10s for badge; MessagesModal polls at 2s when open
  });
  const messagesUnreadCount = (conversationsData?.conversations ?? []).reduce((s, c) => s + c.unreadCount, 0);
  const handleOpenMessagesToUser = useCallback((userId: string, username: string) => {
    setMessagesOpenToUser({ userId, username });
    setShowMessagesModal(true);
  }, []);
  const handleOpenMessagesFromProfile = useCallback((userId: string, username: string) => {
    setShowVisitingProfileModal(false);
    if (visitingProfileCloseTimeoutRef.current) {
      clearTimeout(visitingProfileCloseTimeoutRef.current);
    }
    visitingProfileCloseTimeoutRef.current = setTimeout(() => {
      setVisitingProfileUserId(null);
      visitingProfileCloseTimeoutRef.current = null;
      setMessagesOpenToUser({ userId, username });
      setShowMessagesModal(true);
    }, VISITING_PROFILE_CLOSE_DELAY_MS);
  }, []);
  const handleCloseMessagesModal = useCallback(() => {
    setShowMessagesModal(false);
    setMessagesOpenToUser(null);
  }, []);

  const handleWatchBattleFromMessages = useCallback(
    (replayBattleId: string) => {
      const id = String(replayBattleId ?? '').trim();
      if (!id) return;
      setShowMessagesModal(false);
      setMessagesOpenToUser(null);
      onWatchBattle?.(id);
    },
    [onWatchBattle]
  );

  const openMessagesAfterReplayHandledRef = useRef(0);
  useEffect(() => {
    const t = openMessagesAfterReplayToken;
    if (t <= 0 || t <= openMessagesAfterReplayHandledRef.current) return;
    openMessagesAfterReplayHandledRef.current = t;
    setShowMessagesModal(true);
  }, [openMessagesAfterReplayToken]);

  useEffect(() => {
    if (!marchOwnerModalId) return;
    const id = setInterval(() => setMarchModalTimeTick((n) => n + 1), 500);
    return () => clearInterval(id);
  }, [marchOwnerModalId]);

  useEffect(() => {
    if (!marchOwnerModalId) return;
    const list = activeAttackMarchesData?.marches ?? [];
    if (!list.some((m) => m.marchId === marchOwnerModalId)) {
      setMarchOwnerModalId(null);
    }
  }, [activeAttackMarchesData?.marches, marchOwnerModalId]);

  const handleOwnerMarchPress = useCallback((marchId: string) => {
    setMarchOwnerModalId(marchId);
  }, []);

  const handleMarchOwnerModalClose = useCallback(() => {
    setMarchOwnerModalId(null);
  }, []);

  const handleCancelOutboundMarch = useCallback(async () => {
    if (!marchOwnerModalId) return;
    const list = activeAttackMarchesData?.marches ?? [];
    const march = list.find((m) => m.marchId === marchOwnerModalId);
    const nowMs = Date.now();
    const outboundProgressT = march != null ? outboundProgressTForAttackMarch(march, nowMs) : null;
    if (march == null || outboundProgressT == null) {
      Alert.alert('Cancel failed', 'Could not read march timing from the map. Try again in a moment.');
      return;
    }
    try {
      await cancelOutboundAttackMarch({
        marchId: marchOwnerModalId,
        clientNowMs: nowMs,
        outboundProgressT,
      }).unwrap();
      setMarchOwnerModalId(null);
    } catch (e: unknown) {
      const body = (e as { data?: { error?: string } })?.data?.error;
      Alert.alert('Cancel failed', body != null ? String(body) : 'Unknown error');
    }
  }, [marchOwnerModalId, cancelOutboundAttackMarch, activeAttackMarchesData?.marches]);

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
  const containerSizeRef = useRef(containerSize);
  containerSizeRef.current = containerSize;
  const authoritativeGridSize = mapGridSize ?? getGridSize(grid);
  const [windowRange, setWindowRange] = useState<{ rowStart: number; rowEnd: number; colStart: number; colEnd: number }>({ rowStart: 0, rowEnd: Math.min(14, authoritativeGridSize - 1), colStart: 0, colEnd: Math.min(14, authoritativeGridSize - 1) });
  
  // Phase 5: Use ref for windowRange during panning to reduce re-renders
  const windowRangeRef = useRef<{ rowStart: number; rowEnd: number; colStart: number; colEnd: number }>(windowRange);
  
  const [isMapReady, setIsMapReady] = useState<boolean>(false);
  
  // Static vs Dynamic Data Separation
  const [staticTerrainData, setStaticTerrainData] = useState<Record<string, TerrainType>>({});
  const [dynamicEntityData, setDynamicEntityData] = useState<Record<string, any>>({});
  // Phase 2: Separate entity images from entity details (npcLevel used for level-based NPC image)
  const [entityImageData, setEntityImageData] = useState<Record<string, {
    entity: EntityType;
    owner?: string;
    userId?: string;
    npcSlug?: string;
    npcLevel?: number;
  }>>({});
  const [terrainDataLoaded, setTerrainDataLoaded] = useState<boolean>(false);
  
  // Shield status change tracking
  const [lastShieldStatus, setLastShieldStatus] = useState<boolean | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Phase 1: Panning state management
  const [isPanningJS, setIsPanningJS] = useState<boolean>(false);
  const [panningStopped, setPanningStopped] = useState<boolean>(true);
  
  // Phase 5: Sync ref to state when panning stops (deferred to next frame to smooth view correction)
  useEffect(() => {
    if (!isPanningJS && panningStopped) {
      const refRange = windowRangeRef.current;
      const stateRange = windowRange;
      
      const differs = stateRange.rowStart !== refRange.rowStart || stateRange.rowEnd !== refRange.rowEnd ||
                      stateRange.colStart !== refRange.colStart || stateRange.colEnd !== refRange.colEnd;
      
      if (differs) {
        // Defer sync to next animation frame so the "correct" view doesn't jump in the same tick as tile load
        const raf = requestAnimationFrame(() => {
          setWindowRange(refRange);
        });
        return () => cancelAnimationFrame(raf);
      } else {
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
  /** Cached user house position from my-position API for locator and initial center (user-position-and-locator.md) */
  const userMapPositionRef = useRef<{ x: number; y: number } | null>(null);
  const isPanningRef = useRef<boolean>(false);
  const panStartTimeRef = useRef<number>(0);
  const panEndTimeRef = useRef<number>(0);
  
  // Convert refs to shared values to prevent worklet capture warnings
  const lastVelocity = useSharedValue<{ vx: number; vy: number }>({ vx: 0, vy: 0 });
  const rafId = useSharedValue<number | null>(null);
  const panEndRafIdRef = useRef<number | null>(null);
  const restorePanRafIdRef = useRef<number | null>(null);
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
  const scheduleComputeRef = useRef(scheduleCompute);
  scheduleComputeRef.current = scheduleCompute;

  // Pan-end deferred compute: run in rAF so we can cancel on unmount (Bugbot).
  const panEndSchedule = useCallback((finalX: number, finalY: number) => {
    if (panEndRafIdRef.current != null) {
      cancelAnimationFrame(panEndRafIdRef.current);
      panEndRafIdRef.current = null;
    }
    panEndRafIdRef.current = requestAnimationFrame(() => {
      panEndRafIdRef.current = null;
      scheduleCompute(finalX, finalY, 0, 0);
      lastComputedPan.value = { x: finalX, y: finalY };
    });
  }, [scheduleCompute, lastComputedPan]);

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
  // Bugbot: Use authoritative mapGridSize for viewport clamping; getGridSize(grid) returns grid.length which is 500 for 50×50 sparse grid, causing wrong bounds (0-499 instead of 0-49).
  const calculateVirtualViewport = useCallback((panX: number, panY: number, width: number, height: number) => {
    if (width <= 0 || height <= 0) return;
    
    const gridSize = mapGridSize ?? getGridSize(grid);
    const { startCol: clampedStartCol, endCol: clampedEndCol, startRow: clampedStartRow, endRow: clampedEndRow } = 
      calculateViewportFromPan(panX, panY, width, height, gridSize, 0);
    
    // Generate visible tile keys (only what's actually on screen)
    const visibleTiles = generateVisibleTileKeys(clampedStartCol, clampedEndCol, clampedStartRow, clampedEndRow);
    
    // Only update if Set contents actually changed (compare sizes and contents)
    setVirtualViewport(prev => {
      // Compare Set contents to avoid unnecessary updates
      if (prev.visibleTiles.size === visibleTiles.size) {
        let contentsMatch = true;
        for (const tile of Array.from(visibleTiles)) {
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
  }, [grid, mapGridSize]);

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

  const clearProbeFollowOnPanStart = useCallback(() => {
    handleProbeFollowModalCloseRef.current?.();
  }, []);

  const panGesture = Gesture.Pan()
    .minDistance(10)
    .onStart(() => {
      'worklet';
      runOnJS(clearProbeFollowOnPanStart)();
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
      
      // Single final compute on pan end - no duplicate calls (rAF in JS so we can cancel on unmount; Bugbot).
      const finalX = boundsReady.value ? Math.min(maxX.value, Math.max(minX.value, startX.value + (g.translationX ?? 0))) : startX.value + (g.translationX ?? 0);
      const finalY = boundsReady.value ? Math.min(maxY.value, Math.max(minY.value, startY.value + (g.translationY ?? 0))) : startY.value + (g.translationY ?? 0);
      runOnJS(panEndSchedule)(finalX, finalY);
    });
  // Bugbot: Use server-provided mapGridSize for bounds when set; else grid.length inflates pan for 50×50 (initial grid is 500 rows).
  const gridSize = mapGridSize ?? (grid?.length ? grid.length : 500);
  const gridSizeRef = useRef(gridSize);
  gridSizeRef.current = gridSize;
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
    const grid = initialViewportData.grid;
    const { v, isViewportSized } = getViewportSizing(viewport, grid);
    if (!v) return;
    let foundUser = false;

    for (let y = v.y1; y <= v.y2; y++) {
      const rowIdx = isViewportSized ? y - v.y1 : y;
      const row = grid[rowIdx];
      if (!row) continue;
      for (let x = v.x1; x <= v.x2; x++) {
        const colIdx = isViewportSized ? x - v.x1 : x;
        const cell = row[colIdx];
        if (cell && cell.entity === 'house' && cell.name === currentUserHandle) {
          foundUser = true;
          break;
        }
      }
      if (foundUser) break;
    }
    
    // Viewport-only initial load: do not fetch full map when user is outside initial viewport.
    // Show first viewport immediately; location/center for users outside viewport will be addressed in Phase 2 (my-position API).
    // if (!foundUser) setNeedsFullMap(true); // Disabled for viewport-only first paint (taskItems/ios/hackMap/mapPerformance/viewport-only-initial-load.md)
  }, [initialViewportData, currentUserHandle, needsFullMap, initialViewport]);
  
  // Refetch function - use appropriate query's refetch
  const refetch = useCallback(() => {
    if (needsFullMap) {
      refetchFullMap();
    } else {
      refetchInitialViewport();
    }
  }, [needsFullMap, refetchFullMap, refetchInitialViewport]);

  // My-position API: reliable (x,y) for user's house for initial center and locator (user-position-and-locator.md)
  // Single grid scan: when user's house is in grid we get (x,y) for probe/locator and skip my-position API (Bugbot: avoid duplicate scan).
  const gridDerivedUserPosition = useMemo((): { x: number; y: number } | null => {
    if (!grid?.length || !currentUserHandle) return null;
    for (let y = 0; y < grid.length; y++) {
      const row = grid[y];
      if (!row) continue;
      for (let x = 0; x < row.length; x++) {
        const cell = row[x] as any;
        if (cell?.entity === 'house' && cell?.name === currentUserHandle) return { x, y };
      }
    }
    return null;
  }, [grid, currentUserHandle]);
  const userHouseInGrid = gridDerivedUserPosition !== null;
  const shouldFetchMyPosition = !restorePan && !!currentUserHandle && terrainDataLoaded && !userHouseInGrid;
  const { data: myPositionData, error: myPositionError, isLoading: myPositionLoading } = useGetMyMapPositionQuery(undefined, { skip: !shouldFetchMyPosition });
  const [triggerGetMyMapPosition] = useLazyGetMyMapPositionQuery();
  /** Single source for "current user position": API when fetched, else grid when house in grid, else last known (e.g. after background). Probe and animation use this. */
  const effectiveMyPosition = myPositionData ?? gridDerivedUserPosition ?? null;
  const lastKnownPositionRef = useRef<{ x: number; y: number } | null>(null);
  if (effectiveMyPosition) lastKnownPositionRef.current = effectiveMyPosition;
  /** For probe and animation: always have position when we have grid (from API or grid-derived); fallback to last known after resume. */
  const positionForProbe = effectiveMyPosition ?? lastKnownPositionRef.current;

  // Refetch my-position when app returns to foreground so we have fresh position after background.
  const appStateRef = useRef(AppState.currentState);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      const wasBackgroundOrInactive = appStateRef.current.match(/inactive|background/);
      appStateRef.current = nextState;
      if (wasBackgroundOrInactive && nextState === 'active' && shouldFetchMyPosition) {
        triggerGetMyMapPosition();
      }
    });
    return () => sub?.remove();
  }, [shouldFetchMyPosition, triggerGetMyMapPosition]);

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
  // Allow query to run when restorePan is set even if terrainDataLoaded is false (returning from battle)
  const shouldSkipPanningViewport = !panningViewportParams || (!terrainDataLoaded && !restorePan);
  const { data: panningViewportData, isLoading: isLoadingPanningViewport, error: panningViewportError } = useFetchMapViewportQuery(
    panningViewportParams!,
    { skip: shouldSkipPanningViewport }
  );

  // Phase 5: Optimize shield status polling - increase interval and make viewport-aware
  // Check if there are any player tiles in the visible viewport
  // Phase 5: Use ref for windowRange during panning to reduce re-renders
  const hasVisiblePlayerTiles = useMemo(() => {
    if (!terrainDataLoaded) return false;
    
    // Check visible cells for player tiles
    if (virtualViewport.visibleTiles.size > 0) {
      for (const tileKey of Array.from(virtualViewport.visibleTiles)) {
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

  useEffect(() => {
    followProbeIdRef.current = followProbeId;
  }, [followProbeId]);

  // Close follow modal if the followed probe was removed (e.g. returned home).
  // Use displayProbes (merged local + server) so viewers' follow isn't cleared: their probe is in displayProbes, not in local probes.
  useEffect(() => {
    if (followProbeId && showProbeFollowModal && !displayProbes.some((p) => p.id === followProbeId)) {
      setShowProbeFollowModal(false);
      setFollowProbeId(null);
      setFollowProbeDisplay(null);
      probeFollowModeRef.current = false;
      followProbeIdRef.current = null;
    }
  }, [followProbeId, showProbeFollowModal, displayProbes]);

  // Activate follow mode for any probe (owner or viewer). Modal/cancel only render for owner (IIFE below).
  // Viewers: map pans to probe; to exit follow, tap on the map (handleTapAtViewCoords → handleProbeFollowModalClose).
  const handleProbeFollow = useCallback((probeId: string) => {
    setFollowProbeId(probeId);
    setShowProbeFollowModal(true);
    followProbeIdRef.current = probeId;
    probeFollowModeRef.current = true;
  }, []);

  const handleProbeFollowModalClose = useCallback(() => {
    setShowProbeFollowModal(false);
    setFollowProbeId(null);
    setFollowProbeDisplay(null);
    probeFollowModeRef.current = false;
    followProbeIdRef.current = null;
  }, []);

  useEffect(() => {
    handleProbeFollowModalCloseRef.current = handleProbeFollowModalClose;
    return () => {
      handleProbeFollowModalCloseRef.current = null;
    };
  }, [handleProbeFollowModalClose]);

  const onProbeCompleteFailed = useCallback((probeId: string) => {
    setFailedProbeIds((prev) => {
      const next = new Set(prev);
      next.add(probeId);
      return next;
    });
  }, []);

  const onProbeRemovedAfterReturn = useCallback((probeId: string) => {
    setReturnCompletedProbeIds((prev) => new Set(prev).add(probeId));
  }, []);

  const cancelProbeMutationSafe = useCallback(
    (args: { probeId: string }) => {
      cancelProbeMutation(args).catch(() => {});
    },
    [cancelProbeMutation]
  );

  const { data: crewStatus, isLoading: isLoadingCrewStatus } = useGetCrewStatusQuery();
  const [sendMapChatMessage] = useSendMapChatMessageMutation();
  const [sendCrewChatMessage] = useSendCrewChatMessageMutation();

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
      for (const tileKey of Array.from(virtualViewport.visibleTiles)) {
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
        
        // Update grid data - use response gridSize for merge (Bugbot: same pattern as mapData/panning/stopped so we use authoritative size, not stale component gridSize).
        const fullGridSize = entityUpdateViewportData.gridSize ?? getGridSize(gridRef.current) ?? 500;
        const mergedGrid = mergeGridData(
          gridRef.current,
          entityUpdateViewportData.grid,
          viewport,
          fullGridSize
        );
        dispatch(setGrid(mergedGrid));
        if (entityUpdateViewportData.gridSize != null) dispatch(setMapGridSize(entityUpdateViewportData.gridSize));
        // Bug Fix: Update gridRef immediately to prevent race conditions
        // If multiple effects run in the same cycle, they need to read the updated value
        gridRef.current = mergedGrid;
      });
      
      // Clear viewport params to allow next refresh
      setEntityUpdateViewportParams(null);
    }
  }, [entityUpdateViewportData, dispatch]);

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
    
    
    // Use ref for panning state and for range when panning just stopped (avoids one frame of stale range/jump)
    const currentIsPanningJS = isPanningJSRef.current;
    const useRefForRange = currentIsPanningJS || panningStopped;
    const currentWindowRange = useRefForRange ? windowRangeRef.current : windowRange;
    
    const cache = cellCacheRef.current;
    
    // Phase 2: Cell cache to maintain stable object references
    // Phase 1c: Cache key excludes name and isShielded so minimal→full transition reuses same ref (reduces image blink).
    // When full details arrive we update the cached cell's name/isShielded in place so the tile can re-render for label only.
    const getOrCreateCell = (x: number, y: number, terrain: TerrainType, entity: any, entityImage: any): CellData => {
      const currentEntity = entity?.entity || entityImage?.entity || 'empty';
      const currentOwner = entity?.owner || entityImage?.owner;
      const currentUserId = entity?.userId || entityImage?.userId;
      const currentNpcSlug = entity?.npcSlug || entityImage?.npcSlug;
      const currentNpcInstanceId = entity?.npcInstanceId || entityImage?.npcInstanceId;
      // Fallback to entityImage.npcLevel so minimal (panning) requests show correct NPC level image (Bugbot).
      const currentNpcLevel = entity?.npcLevel ?? entityImage?.npcLevel;
      const cacheKey = `${x},${y}-${terrain}-${currentEntity}-${currentOwner || ''}-${currentUserId || ''}-${currentNpcSlug || ''}-${currentNpcInstanceId || ''}-${currentNpcLevel ?? ''}`;
      
      let cell = cache.get(cacheKey);
      
      if (!cell ||
          cell.terrain !== terrain ||
          cell.entity !== currentEntity ||
          cell.owner !== currentOwner ||
          cell.userId !== currentUserId ||
          cell.npcSlug !== currentNpcSlug ||
          cell.npcInstanceId !== currentNpcInstanceId ||
          cell.npcLevel !== currentNpcLevel) {
        const newCell: CellData = {
          terrain,
          entity: currentEntity,
          owner: currentOwner,
          name: entity?.name,
          userId: currentUserId,
          npcSlug: currentNpcSlug,
          npcInstanceId: currentNpcInstanceId,
          npcLevel: currentNpcLevel,
          isShielded: entity?.isShielded,
        } as any;
        if (cache.size >= MAX_CACHE_SIZE) {
          const firstKey = cache.keys().next().value;
          if (firstKey !== undefined) cache.delete(firstKey);
        }
        cache.set(cacheKey, newCell);
        cell = newCell;
      } else {
        // Phase 1c: Update name and isShielded in place when full details arrive (same ref → less image blink)
        const name = entity?.name;
        const isShielded = entity?.isShielded;
        if ((cell as any).name !== name || (cell as any).isShielded !== isShielded) {
          (cell as any).name = name;
          (cell as any).isShielded = isShielded;
        }
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
    
    if (prevVisibleCellsCountRef.current !== cells.length) {
      prevVisibleCellsCountRef.current = cells.length;
    }

    return cells;
  }, [virtualViewport.visibleTiles, windowRange.rowStart, windowRange.rowEnd, windowRange.colStart, windowRange.colEnd, staticTerrainData, dynamicEntityData, entityImageData, terrainDataLoaded, panningStopped]);



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
      /** Same as entityDetails — needed so "Hack Entity" sends defenderNpcInstanceId before full details load. */
      npcInstanceId?: string;
      npcLevel?: number;
    }> = {};
    const entityDetails: Record<string, any> = {};
    const { v, isViewportSized } = getViewportSizing(viewport, gridData);
    for (let y = 0; y < gridData.length; y++) {
      const row = gridData[y];
      if (!row) continue;
      for (let x = 0; x < row.length; x++) {
        const cell = row[x];
        if (!cell) continue;
        const globalX = isViewportSized && v ? v.x1 + x : x;
        const globalY = isViewportSized && v ? v.y1 + y : y;
        // Bugbot: Explicit viewport-bounds filter so we never key/write cells outside viewport when viewport is provided (guards against isViewportSized heuristic wrong for viewport-sized grid).
        if (v && (globalX < v.x1 || globalX > v.x2 || globalY < v.y1 || globalY > v.y2)) continue;
        const key = `${globalX},${globalY}`;
        terrain[key] = cell.terrain;
        if (cell.entity !== 'empty') {
          entityImages[key] = {
            entity: cell.entity,
            owner: cell.owner,
            userId: cell.userId,
            npcSlug: cell.npcSlug,
            npcInstanceId: cell.npcInstanceId,
            npcLevel: cell.npcLevel,
          };
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
            dispatch(setGrid(mapData.grid));
          } else {
            // Viewport request - merge with existing grid. Use full map gridSize (from API), not viewport row count.
            // Bugbot: If server omits gridSize, never use grid.length (viewport-sized = 25); use ref length or 500.
            const fullGridSize = mapData.gridSize ?? getGridSize(gridRef.current) ?? 500;
            const mergedGrid = mergeGridData(
              gridRef.current,
              mapData.grid,
              mapData.viewport,
              fullGridSize
            );
            
            dispatch(setGrid(mergedGrid));
            if (mapData.gridSize != null) dispatch(setMapGridSize(mapData.gridSize));
            // Bug Fix: Update gridRef immediately to prevent race conditions
            // If multiple effects run in the same cycle, they need to read the updated value
            gridRef.current = mergedGrid;
            // Phase 5 Fix: Initialize last fetched viewport to initial viewport bounds
            lastFetchedViewportRef.current = mapData.viewport;
          }
        } else {
          // Full map request - replace entire grid
          dispatch(setGrid(mapData.grid));
          if (mapData.gridSize != null) dispatch(setMapGridSize(mapData.gridSize));
          // Bug Fix: Update gridRef immediately to prevent race conditions
          gridRef.current = mapData.grid;
          // Phase 5 Fix: Initialize last fetched viewport to full map bounds. Bugbot: use gridSizeRef.current for fallback so when server omits gridSize we don't use stale closure value (gridSize omitted from deps to avoid double-processing).
          const fullMapSize = mapData.gridSize ?? gridSizeRef.current ?? 500;
          lastFetchedViewportRef.current = { x1: 0, y1: 0, x2: fullMapSize - 1, y2: fullMapSize - 1 };
        }
      });
    }
  // Bugbot: Omit gridSize from deps to avoid double-processing; effect dispatches setMapGridSize so gridSize changes and would re-trigger. Fallback uses gridSizeRef.current so server-omitted gridSize gets fresh value.
  }, [mapData, isLoading, dispatch, separateStaticAndDynamicData]);
  
  // Phase 6: Process panning viewport data (minimal: terrain + images only, skip details)
  // Track processed viewport to prevent infinite loops
  const processedViewportRef = useRef<string | null>(null);
  useEffect(() => {
    // Mark request as complete (success or error)
    if (panningViewportData || panningViewportError) {
      viewportRequestInFlightRef.current = false;
    }
    
    // Process current data first before handling pending requests
    // This ensures non-minimal restorePan data isn't discarded when a panning request is pending
    if (panningViewportData && panningViewportData.grid && panningViewportData.viewport) {
      const viewport = panningViewportData.viewport;
      const viewportKey = `${viewport.x1},${viewport.y1},${viewport.x2},${viewport.y2}`;

      // Phase 6: Prevent processing the same viewport twice
      if (processedViewportRef.current === viewportKey) {
        // Still handle pending requests even if this viewport was already processed
        if (pendingViewportParamsRef.current) {
          const pending = pendingViewportParamsRef.current;
          pendingViewportParamsRef.current = null;
          viewportRequestInFlightRef.current = true;
          panningViewportMinimalRef.current = pending.minimal ?? true;
          setPanningViewportParams(pending);
        }
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
        const fullGridSize = panningViewportData.gridSize ?? getGridSize(gridRef.current) ?? 500;
        const mergedGrid = mergeGridData(
          gridRef.current,
          panningViewportData.grid,
          viewport,
          fullGridSize
        );
        dispatch(setGrid(mergedGrid));
        if (panningViewportData.gridSize != null) dispatch(setMapGridSize(panningViewportData.gridSize));
        // Bug Fix: Update gridRef immediately to prevent race conditions
        // If multiple effects run in the same cycle, they need to read the updated value
        gridRef.current = mergedGrid;
        
        // Set terrainDataLoaded to true when processing restorePan viewport (non-minimal request)
        // This ensures the map loads properly when returning from battle prep
        if (!isMinimalRequest) {
          setTerrainDataLoaded(true);
        }
      });
      
      // Update last fetched viewport (without minimal flag for comparison)
      lastFetchedViewportRef.current = { x1: viewport.x1, y1: viewport.y1, x2: viewport.x2, y2: viewport.y2 };

      // Clear viewport params and reset minimal flag to allow next fetch
      panningViewportMinimalRef.current = false;
      setPanningViewportParams(null);
    }

    // Handle pending requests after processing current data (success only; on error don't retry to avoid infinite loop — Bugbot).
    // Skip if pending is the same as the viewport we just merged (avoid redundant re-fetch)
    if (panningViewportData && pendingViewportParamsRef.current) {
      const pending = pendingViewportParamsRef.current;
      const justMerged = panningViewportData.viewport;
      const sameViewport = justMerged &&
        pending.x1 === justMerged.x1 && pending.y1 === justMerged.y1 &&
        pending.x2 === justMerged.x2 && pending.y2 === justMerged.y2;
      pendingViewportParamsRef.current = null;
      if (!sameViewport) {
        viewportRequestInFlightRef.current = true;
        panningViewportMinimalRef.current = pending.minimal ?? true;
        setPanningViewportParams(pending);
      }
    }
    // On error: only clear pending if it was the same viewport that failed (avoid retry loop).
    // If user panned to B while A was loading and A failed, keep pending and fetch B (Bugbot).
    if (panningViewportError && pendingViewportParamsRef.current) {
      const pending = pendingViewportParamsRef.current;
      const failedSameAsPending = panningViewportParams &&
        pending.x1 === panningViewportParams.x1 && pending.y1 === panningViewportParams.y1 &&
        pending.x2 === panningViewportParams.x2 && pending.y2 === panningViewportParams.y2;
      pendingViewportParamsRef.current = null;
      if (!failedSameAsPending) {
        viewportRequestInFlightRef.current = true;
        panningViewportMinimalRef.current = pending.minimal ?? true;
        setPanningViewportParams(pending);
      }
    }
  }, [panningViewportData, panningViewportError, panningViewportParams, separateStaticAndDynamicData, dispatch]);

  // Phase 7: Load entity details when panning stops
  const [stoppedViewportParams, setStoppedViewportParams] = useState<{ x1: number; y1: number; x2: number; y2: number; minimal?: boolean } | null>(null);
  const { data: stoppedViewportData, isLoading: isLoadingStoppedViewport } = useFetchMapViewportQuery(
    stoppedViewportParams!,
    { skip: !stoppedViewportParams || !terrainDataLoaded || !panningStopped }
  );
  
  // Phase 7: Trigger entity details fetch when panning stops
  // Also fill missing terrain when panning stops (fixes black areas that never loaded during pan)
  const lastStoppedViewportRef = useRef<string | null>(null);
  useEffect(() => {
    if (panningStopped && terrainDataLoaded && !isPanningJS) {
      // Use ref so we have the viewport that was active during pan (sync effect may not have run yet)
      const range = windowRangeRef.current;
      const currentViewport = {
        x1: range.colStart,
        y1: range.rowStart,
        x2: range.colEnd,
        y2: range.rowEnd,
      };
      
      const viewportKey = `${currentViewport.x1},${currentViewport.y1},${currentViewport.x2},${currentViewport.y2}`;
      
      // Check if any visible cell is missing terrain (causes black areas)
      let hasMissingTerrain = false;
      for (let y = currentViewport.y1; y <= currentViewport.y2; y++) {
        for (let x = currentViewport.x1; x <= currentViewport.x2; x++) {
          if (!staticTerrainData[`${x},${y}`]) {
            hasMissingTerrain = true;
            break;
          }
        }
        if (hasMissingTerrain) break;
      }
      if (hasMissingTerrain) {
        const params = { ...currentViewport, minimal: false };
        if (viewportRequestInFlightRef.current) {
          pendingViewportParamsRef.current = params;
        } else {
          viewportRequestInFlightRef.current = true;
          panningViewportMinimalRef.current = false;
          setPanningViewportParams(params);
        }
        // Full fetch (minimal: false) includes details; skip separate stoppedViewportParams for this viewport
        return;
      }
      
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
  }, [panningStopped, terrainDataLoaded, isPanningJS, windowRange, staticTerrainData, entityImageData, dynamicEntityData]);
  
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
        const fullGridSize = stoppedViewportData.gridSize ?? getGridSize(gridRef.current) ?? 500;
        const mergedGrid = mergeGridData(
          gridRef.current,
          stoppedViewportData.grid,
          viewport,
          fullGridSize
        );
        dispatch(setGrid(mergedGrid));
        if (stoppedViewportData.gridSize != null) dispatch(setMapGridSize(stoppedViewportData.gridSize));
        // Bug Fix: Update gridRef immediately to prevent race conditions
        // If multiple effects run in the same cycle, they need to read the updated value
        gridRef.current = mergedGrid;
      });
      
      // Clear stopped viewport params to allow next fetch
      setStoppedViewportParams(null);
    }
  }, [stoppedViewportData, separateStaticAndDynamicData, dispatch]);

  // Force refresh map data when returning from battle to ensure NPCs are updated
  // Phase 4B: Only clear cache when explicitly needed (restorePan = returning from battle)
  useEffect(() => {
    if (restorePan && containerSize.width > 0 && containerSize.height > 0) {
      const restoreKey = `${restorePan.x},${restorePan.y}`;
      
      // Prevent processing the same restorePan viewport multiple times
      if (processedRestorePanViewportRef.current === restoreKey) {
        return;
      }
      processedRestorePanViewportRef.current = restoreKey;
      
      // Calculate viewport around restorePan location instead of clearing everything
      const buffer = 15;
      const gridSize = mapGridSize ?? getGridSize(grid);
      
      // Convert restorePan grid coordinates to pan coordinates to calculate correct viewport
      const { x: panX, y: panY } = gridToPanCoordinates(
        restorePan.x,
        restorePan.y,
        containerSize.width,
        containerSize.height
      );
      
      const restoreViewport = calculateViewportFromPan(
        panX,
        panY,
        containerSize.width,
        containerSize.height,
        gridSize,
        buffer
      );
      
      // Fetch viewport at restorePan location instead of initial viewport
      // Mark request as in flight to prevent panning from overwriting restorePan request
      // If a panning request is already in flight, store restorePan as pending
      if (viewportRequestInFlightRef.current) {
        pendingViewportParamsRef.current = {
          x1: restoreViewport.startCol,
          y1: restoreViewport.startRow,
          x2: restoreViewport.endCol,
          y2: restoreViewport.endRow,
          minimal: false
        };
      } else {
        // Reset minimal flag to ensure restorePan request is processed as non-minimal
        // This prevents terrainDataLoaded from being incorrectly skipped
        // Only set when starting a new request to avoid race condition with in-flight requests
        panningViewportMinimalRef.current = false;
        viewportRequestInFlightRef.current = true;
        setPanningViewportParams({
          x1: restoreViewport.startCol,
          y1: restoreViewport.startRow,
          x2: restoreViewport.endCol,
          y2: restoreViewport.endRow,
          minimal: false
        });
      }
      
      // Clear cache for the restorePan area only (not everything)
      // This ensures fresh data for NPCs that may have been defeated
      setStaticTerrainData({});
      setDynamicEntityData({});
      setEntityImageData({});
      setTerrainDataLoaded(false);
    } else if (!restorePan) {
      // Clear processed ref when restorePan is cleared
      processedRestorePanViewportRef.current = null;
    }
  }, [restorePan, containerSize.width, containerSize.height, grid]);

  const computeWindow = useCallback((panX: number, panY: number, width: number, height: number) => {
    if (width <= 0 || height <= 0) { return; }

    // Phase 4: Conditional throttle - 33ms during panning (30fps), 16ms when not panning (60fps)
    const now = Date.now();
    const throttleMs = isPanningJS ? 33 : 16; // 30fps during panning, 60fps when not panning
    if (now - lastComputeTs.value < throttleMs) {
      return;
    }
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
          const shouldFetch = shouldFetchViewport(newViewport, lastFetchedViewportRef.current);
          if (shouldFetch) {
            triggerViewportFetch(newViewport, panningViewportMinimalRef, setPanningViewportParams, viewportRequestInFlightRef, pendingViewportParamsRef, gridSize);
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
        const shouldFetch = shouldFetchViewport(newViewport, lastFetchedViewportRef.current);
        if (shouldFetch) {
          triggerViewportFetch(newViewport, panningViewportMinimalRef, setPanningViewportParams, viewportRequestInFlightRef, pendingViewportParamsRef, gridSize);
        }
        return newWindowRange;
      });
    }
  }, [gridSize, calculateVirtualViewport, isPanningJS]);

  // Restore pan position if provided (now safe, computeWindow is defined)
  // Track restored position to prevent re-restoring when user pans
  const restoredPanRef = useRef<{ x: number; y: number } | null>(null);
  const processedRestorePanViewportRef = useRef<string | null>(null);
  
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
      
      // Validate grid coordinates against authoritative map size (Bugbot: grid.length is 500 for 50×50 sparse grid; use mapGridSize so coords like (100,100) are rejected on 50×50).
      const boundsSize = mapGridSize ?? getGridSize(grid);
      if (!grid || restorePan.x < 0 || restorePan.x >= boundsSize || restorePan.y < 0 || restorePan.y >= boundsSize) {
        return;
      }
      
      // Convert grid coordinates to pan coordinates (center the cell on screen)
      const { x: targetX, y: targetY } = gridToPanCoordinates(restorePan.x, restorePan.y, containerSize.width, containerSize.height);
      
      // Clamp to valid pan bounds (read SharedValues directly)
      const clampedX = Math.min(maxX.value, Math.max(minX.value, targetX));
      const clampedY = Math.min(maxY.value, Math.max(minY.value, targetY));
      
      offsetX.value = clampedX;
      offsetY.value = clampedY;
      
      // Mark this position as restored
      restoredPanRef.current = { x: restorePan.x, y: restorePan.y };
      
      // Force tile loading by properly calculating the new window range
      // Reset throttle timestamp to ensure computeWindow runs immediately
      lastComputeTs.value = 0;
      
      // Calculate the correct window range for the restored position
      const { startCol, endCol, startRow, endRow } = calculateViewportFromPan(
        clampedX, 
        clampedY, 
        containerSize.width, 
        containerSize.height, 
        gridSize, 
        PAN_BUFFER
      );
      
      // Calculate virtual viewport for visible tiles
      calculateVirtualViewport(clampedX, clampedY, containerSize.width, containerSize.height);
      
      // Force window range update immediately (bypass computeWindow throttling)
      const newWindowRange = { rowStart: startRow, rowEnd: endRow, colStart: startCol, colEnd: endCol };
      windowRangeRef.current = newWindowRange;
      setWindowRange(newWindowRange);
      
      // Update lastComputedPan after setting window range to ensure computeWindow can run if needed
      lastComputedPan.value = { x: clampedX, y: clampedY };
      
      // Force computeWindow to run to trigger any additional updates (viewport fetch, etc.); cancel on cleanup (Bugbot).
      if (restorePanRafIdRef.current != null) {
        cancelAnimationFrame(restorePanRafIdRef.current);
        restorePanRafIdRef.current = null;
      }
      restorePanRafIdRef.current = requestAnimationFrame(() => {
        restorePanRafIdRef.current = null;
        computeWindow(clampedX, clampedY, containerSize.width, containerSize.height);
      });
    } else if (!restorePan) {
      // Clear restored ref when restorePan is cleared (user navigated away)
      restoredPanRef.current = null;
    }
    return () => {
      if (restorePanRafIdRef.current != null) {
        cancelAnimationFrame(restorePanRafIdRef.current);
        restorePanRafIdRef.current = null;
      }
    };
  }, [restorePan, containerSize.width, containerSize.height, computeWindow, grid, mapGridSize, boundsReadyJS, gridSize, calculateVirtualViewport]);

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
        if (panEndRafIdRef.current != null) {
          cancelAnimationFrame(panEndRafIdRef.current);
          panEndRafIdRef.current = null;
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
        // Bugbot: Use authoritative map size for iteration; grid.length is 500 for 50×50 sparse grid (unnecessary 500 rows + wrong viewport).
        const size = mapGridSize ?? getGridSize(grid);
        if (size && grid) {
          let homeX: number | null = null;
          let homeY: number | null = null;
          for (let y = 0; y < size; y++) {
            const row = grid[y];
            if (!row) continue;
            for (let x = 0; x < size; x++) {
              const cell = row[x] as any;
              if (cell && cell.entity === 'house' && cell.name === currentUserHandle) {
                homeX = x; homeY = y; break;
              }
            }
            if (homeX != null) break;
          }
          if (homeX != null && homeY != null) {
            userMapPositionRef.current = { x: homeX, y: homeY };
            const { x: targetX, y: targetY } = gridToPanCoordinates(homeX, homeY, containerSize.width, containerSize.height);
            const cx = Math.min(maxX.value, Math.max(minX.value, targetX));
            const cy = Math.min(maxY.value, Math.max(minY.value, targetY));
            offsetX.value = cx;
            offsetY.value = cy;
            // Bypass computeWindow so pan-delta skip doesn't prevent window range update (Bugbot: same as restorePan).
            const gridSizeBounds = mapGridSize ?? getGridSize(grid);
            const { startCol, endCol, startRow, endRow } = calculateViewportFromPan(cx, cy, containerSize.width, containerSize.height, gridSizeBounds, PAN_BUFFER);
            calculateVirtualViewport(cx, cy, containerSize.width, containerSize.height);
            const newRange = { rowStart: startRow, rowEnd: endRow, colStart: startCol, colEnd: endCol };
            windowRangeRef.current = newRange;
            setWindowRange(newRange);
            lastComputedPan.value = { x: cx, y: cy };
            hasCenteredOnHome.value = true;
          }
        }
      }
    }
  }, [containerSize.width, containerSize.height, totalSize, minX, maxX, minY, maxY, offsetX, offsetY, grid, mapGridSize, currentUserHandle, restorePan, calculateVirtualViewport]);

  // Center on user's home from my-position API when data arrives (user-position-and-locator.md)
  useEffect(() => {
    if (!myPositionData) return;
    if (restorePan) return;
    if (hasCenteredOnHome.value) return;
    if (!boundsReadyJS || containerSize.width <= 0 || containerSize.height <= 0) return;
    const { x, y } = myPositionData;
    userMapPositionRef.current = { x, y };
    const { x: targetX, y: targetY } = gridToPanCoordinates(x, y, containerSize.width, containerSize.height);
    const cx = Math.min(maxX.value, Math.max(minX.value, targetX));
    const cy = Math.min(maxY.value, Math.max(minY.value, targetY));
    offsetX.value = cx;
    offsetY.value = cy;
    // Bypass computeWindow so pan-delta skip doesn't prevent window range update (Bugbot: same as restorePan).
    const gridSize = mapGridSize ?? getGridSize(grid);
    const { startCol, endCol, startRow, endRow } = calculateViewportFromPan(cx, cy, containerSize.width, containerSize.height, gridSize, PAN_BUFFER);
    calculateVirtualViewport(cx, cy, containerSize.width, containerSize.height);
    const newRange = { rowStart: startRow, rowEnd: endRow, colStart: startCol, colEnd: endCol };
    windowRangeRef.current = newRange;
    setWindowRange(newRange);
    lastComputedPan.value = { x: cx, y: cy };
    hasCenteredOnHome.value = true;
    const buffer = 15;
    const restoreViewport = calculateViewportFromPan(cx, cy, containerSize.width, containerSize.height, gridSize, buffer);
    if (viewportRequestInFlightRef.current) {
      pendingViewportParamsRef.current = {
        x1: restoreViewport.startCol,
        y1: restoreViewport.startRow,
        x2: restoreViewport.endCol,
        y2: restoreViewport.endRow,
        minimal: false,
      };
    } else {
      panningViewportMinimalRef.current = false;
      viewportRequestInFlightRef.current = true;
      setPanningViewportParams({
        x1: restoreViewport.startCol,
        y1: restoreViewport.startRow,
        x2: restoreViewport.endCol,
        y2: restoreViewport.endRow,
        minimal: false,
      });
    }
  }, [myPositionData, restorePan, boundsReadyJS, containerSize.width, containerSize.height, grid, mapGridSize, minX, maxX, minY, maxY, offsetX, offsetY, calculateVirtualViewport]);

  // Center on current user's home on initial entry (only if not returning from battle with restorePan)
  // Fallback when my-position API not available or user's house is in initial viewport (grid-scan)
  useEffect(() => {
    if (!boundsReady.value) return;
    if (restorePan) return; // respect return-from-battle view
    if (hasCenteredOnHome.value) return;
    if (!currentUserHandle) return;
    // Bugbot: Use authoritative map size for iteration; grid.length is 500 for 50×50 sparse grid.
    const size = mapGridSize ?? getGridSize(grid);
    if (!size || !grid) return;
    let homeX: number | null = null;
    let homeY: number | null = null;
    for (let y = 0; y < size; y++) {
      const row = grid[y];
      if (!row) continue;
      for (let x = 0; x < size; x++) {
        const cell = row[x];
        if (cell && cell.entity === 'house' && cell.name === currentUserHandle) {
          homeX = x; homeY = y; break;
        }
      }
      if (homeX != null) break;
    }
    if (homeX == null || homeY == null) return;
    userMapPositionRef.current = { x: homeX, y: homeY };
    const targetX = (containerSize.width / 2) - MARGIN_SIZE - ((homeX + 0.5) * CELL_SIZE);
    const targetY = (containerSize.height / 2) - MARGIN_SIZE - ((homeY + 0.5) * CELL_SIZE);
    const cx = Math.min(maxX.value, Math.max(minX.value, targetX));
    const cy = Math.min(maxY.value, Math.max(minY.value, targetY));
    offsetX.value = cx;
    offsetY.value = cy;
    // Bypass computeWindow so pan-delta skip doesn't prevent window range update (Bugbot: same as restorePan).
    const gridSizeEntry = mapGridSize ?? getGridSize(grid);
    const { startCol, endCol, startRow, endRow } = calculateViewportFromPan(cx, cy, containerSize.width, containerSize.height, gridSizeEntry, PAN_BUFFER);
    calculateVirtualViewport(cx, cy, containerSize.width, containerSize.height);
    const newRange = { rowStart: startRow, rowEnd: endRow, colStart: startCol, colEnd: endCol };
    windowRangeRef.current = newRange;
    setWindowRange(newRange);
    lastComputedPan.value = { x: cx, y: cy };
    hasCenteredOnHome.value = true;
  }, [grid, mapGridSize, currentUserHandle, restorePan, containerSize.width, containerSize.height, minX, maxX, boundsReady, offsetX, offsetY, calculateVirtualViewport]);

  // When handle changes (e.g. after profile update), reset center flag and cached position so we re-center on home when fresh map data arrives.
  const prevHandleRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    const prev = prevHandleRef.current;
    prevHandleRef.current = currentUserHandle ?? undefined;
    if (prev !== undefined && prev !== (currentUserHandle ?? undefined)) {
      hasCenteredOnHome.value = false;
      userMapPositionRef.current = null;
    }
  }, [currentUserHandle]);

  const handleCellPressRef = useRef<((x: number, y: number, cellData: CellData) => Promise<void>) | null>(null);
  const lastPressTimeRef = useRef<number>(0);
  const lastPressCoordsRef = useRef<{ x: number; y: number } | null>(null);
  const PRESS_DEBOUNCE_MS = 300;
  const DOUBLE_PRESS_THRESHOLD_MS = 500;
  const abortControllerRef = useRef<AbortController | null>(null);
  const mapViewRef = useRef<Animated.View>(null);
  const mapViewWindowRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const isMountedRef = useRef<boolean>(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const handleCellPress = useCallback(async (x: number, y: number, cellData: CellData) => {
    // Security: Validate coordinates
    // y represents row index, validate against number of rows
    if (y < 0 || !grid || y >= grid.length) {
      return;
    }
    // x represents column index, validate against number of columns in that row
    const row = grid[y];
    if (!row || x < 0 || x >= row.length) {
      return;
    }
    
    // Security: Validate cellData structure
    if (!cellData || typeof cellData !== 'object') {
      return;
    }
    if (typeof cellData.terrain !== 'string' || typeof cellData.entity !== 'string') {
      return;
    }
    
    const now = Date.now();
    const lastPress = lastPressTimeRef.current;
    const lastCoords = lastPressCoordsRef.current;
    
    // Tap is delivered from gesture layer (Race(Tap, Pan)); Tap only wins for short taps.
    // Do not gate on isPanningJS: it lags behind the gesture (useAnimatedReaction → setState),
    // so taps right after pan (or after user-position center) were incorrectly dropped. See tile-tap-reliability.md.
    
    // Debounce: ignore if pressed too soon after last press (but only if same coordinates)
    if (lastCoords && lastCoords.x === x && lastCoords.y === y && now - lastPress < PRESS_DEBOUNCE_MS) {
      return;
    }
    
    // Prevent double-clicks from same location
    if (lastCoords && lastCoords.x === x && lastCoords.y === y && now - lastPress < DOUBLE_PRESS_THRESHOLD_MS) {
      return;
    }
    
    lastPressTimeRef.current = now;
    lastPressCoordsRef.current = { x, y };
    
    // If clicking on another player, fetch their current shield status
    if (cellData.owner === 'player' && cellData.userId && cellData.name !== currentUserHandle) {
      // Security: Validate userId
      const userId = cellData.userId;
      if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
        setSelectedCell({x, y, info: cellData});
        return;
      }
      
      // Security: Validate token
      if (!token || typeof token !== 'string') {
        setSelectedCell({x, y, info: cellData});
        return;
      }
      
      // Performance: Cancel previous request if new one starts
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();
      
      try {
        const response = await fetch(`${API_URL}/api/users/shield-status/${userId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          signal: abortControllerRef.current.signal,
        });
        
        // Security: Validate API response
        if (!response.ok) {
          setSelectedCell({x, y, info: cellData});
          return;
        }
        
        const userData = await response.json();
        if (!userData || typeof userData !== 'object') {
          setSelectedCell({x, y, info: cellData});
          return;
        }
        
        const updatedCellData = {
          ...cellData,
          isShielded: userData.antivirusShield?.active || false
        };
        setSelectedCell({x, y, info: updatedCellData});
        return;
      } catch (error: any) {
        if (error.name === 'AbortError') {
          return;
        }
        console.error('Failed to fetch shield status:', error);
        setSelectedCell({x, y, info: cellData});
        return;
      }
    }
    
    setSelectedCell({x, y, info: cellData});
  }, [currentUserHandle, token, grid]);

  // Store handler in ref for stable reference
  handleCellPressRef.current = handleCellPress;

  // Tap-at-view coords: use absolute tap position + map view's window position so we get correct cell (e.x/e.y are unreliable when the view has transform). See tile-tap-reliability.md.
  // Measure map in window at tap time so we don't rely on stale onLayout; Reanimated transform can move the view without firing onLayout.
  // Tap off-probe (on map/cell) cancels follow mode so the map stops following the probe.
  const handleTapAtViewCoords = useCallback((absoluteX: number, absoluteY: number) => {
    const viewRef = mapViewRef.current;
    if (!viewRef) return;
    viewRef.measureInWindow((wx, wy) => {
      if (!isMountedRef.current) return;
      mapViewWindowRef.current = { x: wx, y: wy };
      // (wx, wy) is the view's rendered top-left (after translate); so view-local tap = (absolute - window).
      // Grid content starts at (MARGIN_SIZE, MARGIN_SIZE) in view; do NOT subtract pan offset — it's already in (wx, wy).
      const viewX = absoluteX - wx;
      const viewY = absoluteY - wy;
      const contentX = viewX - MARGIN_SIZE;
      const contentY = viewY - MARGIN_SIZE;
      const col = Math.floor(contentX / CELL_SIZE);
      const row = Math.floor(contentY / CELL_SIZE);
      if (row < 0 || !grid || row >= grid.length) return;
      const rowData = grid[row];
      if (!rowData || col < 0 || col >= rowData.length) return;
      const cell = rowData[col] as CellData;
      if (!cell) return;
      if (!isMountedRef.current) return;
      // Tapping on the map (off the probe) cancels follow so the map stops following the probe.
      if (followProbeIdRef.current) {
        handleProbeFollowModalClose();
      }
      const handler = handleCellPressRef.current;
      if (!handler) return;
      handler(col, row, cell);
    });
  }, [grid, handleProbeFollowModalClose]);

  const tapGesture = useMemo(
    () =>
      Gesture.Tap()
        .maxDistance(9)
        .maxDuration(400)
        .onEnd((e) => {
          'worklet';
          runOnJS(handleTapAtViewCoords)(e.absoluteX, e.absoluteY);
        }),
    [handleTapAtViewCoords]
  );

  const combinedMapGesture = useMemo(
    () => Gesture.Race(tapGesture, panGesture),
    [tapGesture, panGesture]
  );

  // Locator: pan to user's house using cached position or my-position API (user-position-and-locator.md)
  const centerOnUserHome = useCallback(() => {
    if (!currentUserHandle) return;
    const doPanTo = (pos: { x: number; y: number }) => {
      userMapPositionRef.current = pos;
      const { x: targetX, y: targetY } = gridToPanCoordinates(pos.x, pos.y, containerSize.width, containerSize.height);
      const cx = Math.min(maxX.value, Math.max(minX.value, targetX));
      const cy = Math.min(maxY.value, Math.max(minY.value, targetY));
      offsetX.value = cx;
      offsetY.value = cy;
      // Bypass computeWindow so pan-delta skip doesn't prevent window range update (Bugbot: same as restorePan).
      const gridSize = mapGridSize ?? getGridSize(grid);
      const { startCol, endCol, startRow, endRow } = calculateViewportFromPan(cx, cy, containerSize.width, containerSize.height, gridSize, PAN_BUFFER);
      calculateVirtualViewport(cx, cy, containerSize.width, containerSize.height);
      const newRange = { rowStart: startRow, rowEnd: endRow, colStart: startCol, colEnd: endCol };
      windowRangeRef.current = newRange;
      setWindowRange(newRange);
      lastComputedPan.value = { x: cx, y: cy };
      const vp = { startCol, endCol, startRow, endRow };
      if (viewportRequestInFlightRef.current) {
        pendingViewportParamsRef.current = { x1: vp.startCol, y1: vp.startRow, x2: vp.endCol, y2: vp.endRow, minimal: false };
      } else {
        panningViewportMinimalRef.current = false;
        viewportRequestInFlightRef.current = true;
        setPanningViewportParams({ x1: vp.startCol, y1: vp.startRow, x2: vp.endCol, y2: vp.endRow, minimal: false });
      }
    };
    if (userMapPositionRef.current) {
      doPanTo(userMapPositionRef.current);
      return;
    }
    triggerGetMyMapPosition()
      .unwrap()
      .then((payload) => doPanTo(payload))
      .catch(() => {});
  }, [currentUserHandle, containerSize.width, containerSize.height, grid, mapGridSize, minX, maxX, minY, maxY, offsetX, offsetY, calculateVirtualViewport, triggerGetMyMapPosition]);

  // Jump To: pan map to grid coordinates (0–499)
  const jumpToGridPosition = useCallback(
    (gridX: number, gridY: number) => {
      const gridSize = mapGridSize ?? getGridSize(grid);
      if (!grid || gridX < 0 || gridX >= gridSize || gridY < 0 || gridY >= gridSize) return;
      const { x: targetX, y: targetY } = gridToPanCoordinates(
        gridX,
        gridY,
        containerSize.width,
        containerSize.height
      );
      const cx = Math.min(maxX.value, Math.max(minX.value, targetX));
      const cy = Math.min(maxY.value, Math.max(minY.value, targetY));
      offsetX.value = cx;
      offsetY.value = cy;
      const { startCol, endCol, startRow, endRow } = calculateViewportFromPan(
        cx,
        cy,
        containerSize.width,
        containerSize.height,
        gridSize,
        PAN_BUFFER
      );
      calculateVirtualViewport(cx, cy, containerSize.width, containerSize.height);
      const newRange = { rowStart: startRow, rowEnd: endRow, colStart: startCol, colEnd: endCol };
      windowRangeRef.current = newRange;
      setWindowRange(newRange);
      lastComputedPan.value = { x: cx, y: cy };
      const vp = { startCol, endCol, startRow, endRow };
      if (viewportRequestInFlightRef.current) {
        pendingViewportParamsRef.current = {
          x1: vp.startCol,
          y1: vp.startRow,
          x2: vp.endCol,
          y2: vp.endRow,
          minimal: false,
        };
      } else {
        panningViewportMinimalRef.current = false;
        viewportRequestInFlightRef.current = true;
        setPanningViewportParams({
          x1: vp.startCol,
          y1: vp.startRow,
          x2: vp.endCol,
          y2: vp.endRow,
          minimal: false,
        });
      }
    },
    [
      containerSize.width,
      containerSize.height,
      grid,
      mapGridSize,
      minX,
      maxX,
      minY,
      maxY,
      offsetX,
      offsetY,
      calculateVirtualViewport,
      setWindowRange,
      setPanningViewportParams,
    ]
  );

  useEffect(() => {
    if (!pendingNavigateToCell) return;
    if (containerSize.width <= 0 || containerSize.height <= 0) return;
    const { x, y } = pendingNavigateToCell;
    const gridSize = mapGridSize ?? getGridSize(grid);
    if (!grid || x < 0 || x >= gridSize || y < 0 || y >= gridSize) return;

    const t = setTimeout(() => {
      jumpToGridPosition(x, y);
      hasCenteredOnHome.value = true;
      onPendingNavigateConsumed?.();
    }, PENDING_CHAT_NAV_DELAY_MS);

    return () => clearTimeout(t);
  }, [
    pendingNavigateToCell,
    containerSize.width,
    containerSize.height,
    grid,
    mapGridSize,
    jumpToGridPosition,
    onPendingNavigateConsumed,
  ]);

  const handleNavigateFromChatToCell = useCallback(
    (target: { mapName: string; x: number; y: number }) => {
      if (target.mapName !== 'main') return;
      // Invalidate Turf → map pending nav timer so a delayed jump cannot override this tap.
      onPendingNavigateConsumed?.();
      jumpToGridPosition(target.x, target.y);
      setShowWorldChatModal(false);
    },
    [jumpToGridPosition, onPendingNavigateConsumed]
  );

  const handleCrewChatNavigateToCell = useCallback(
    (target: { mapName: string; x: number; y: number }) => {
      if (target.mapName !== 'main') return;
      onPendingNavigateConsumed?.();
      jumpToGridPosition(target.x, target.y);
      setShowCrewModal(false);
    },
    [jumpToGridPosition, onPendingNavigateConsumed]
  );

  /** Messages modal (same map): pan immediately; unlike Turf → map there is no pending delay. */
  const handleMessagesNavigateToMapCell = useCallback(
    (target: { mapName: string; x: number; y: number }) => {
      if (target.mapName !== 'main') return;
      onPendingNavigateConsumed?.();
      jumpToGridPosition(target.x, target.y);
      setShowMessagesModal(false);
    },
    [jumpToGridPosition, onPendingNavigateConsumed]
  );

  const handleShareLocationPress = useCallback(() => {
    if (!selectedCell) return;
    const { x, y, info } = selectedCell;
    const label = getShareLabelForCell(info);
    const messageBody = buildMapLocationShareMessage('main', x, y, label);

    const sendGlobal = () => {
      sendMapChatMessage({ mapName: 'main', message: messageBody })
        .unwrap()
        .then(() => {
          Alert.alert('Sent', 'Location shared to World Chat.');
        })
        .catch((err: any) => {
          const msg = err?.data?.error ?? err?.message ?? 'Could not send message.';
          Alert.alert('Share location', String(msg));
        });
    };

    const sendCrew = () => {
      const crewId = crewStatus?.crewId;
      if (!crewId) {
        Alert.alert('Share location', 'Join a crew to share there.');
        return;
      }
      sendCrewChatMessage({ crewId: String(crewId), message: messageBody })
        .unwrap()
        .then(() => {
          Alert.alert('Sent', 'Location shared to crew chat.');
        })
        .catch((err: any) => {
          const msg = err?.data?.error ?? err?.message ?? 'Could not send message.';
          Alert.alert('Share location', String(msg));
        });
    };

    const canGlobal = hackRigUnlocked;
    const canCrew = !!(crewStatus?.isInCrew && crewStatus.crewId);

    if (!canGlobal && !canCrew) {
      Alert.alert(
        'Share location',
        'Unlock World Chat from the Hack Rig, or join a crew to share to crew chat.'
      );
      return;
    }

    const buttons: {
      text: string;
      style?: 'cancel' | 'default' | 'destructive';
      onPress?: () => void;
    }[] = [{ text: 'Cancel', style: 'cancel' }];
    if (canGlobal) {
      buttons.push({ text: 'Global', onPress: sendGlobal });
    }
    if (canCrew) {
      buttons.push({ text: 'Crew', onPress: sendCrew });
    }
    Alert.alert('Share location', 'Choose a chat', buttons);
  }, [
    selectedCell,
    sendMapChatMessage,
    sendCrewChatMessage,
    crewStatus?.crewId,
    crewStatus?.isInCrew,
    hackRigUnlocked,
  ]);

  const handleMovePropertyPress = useCallback(() => {
    if (!selectedCell) return;
    if (!effectiveMyPosition) {
      Alert.alert(
        'Move property',
        'Could not determine your home location. Wait for the map to finish loading and try again.'
      );
      return;
    }
    const { x, y, info } = selectedCell;
    const terr = info.terrain;
    if (terr === 'water' || terr === 'mountain' || terr === 'road') {
      Alert.alert('Move property', 'You cannot move to water, mountain, or road tiles.');
      return;
    }
    if (info.entity !== 'empty') {
      Alert.alert('Move property', 'Choose an empty tile.');
      return;
    }
    if (effectiveMyPosition.x === x && effectiveMyPosition.y === y) {
      Alert.alert('Move property', 'Your home is already at this tile.');
      return;
    }
    if (currentBalanceDisplay < MOVE_PROPERTY_COST) {
      Alert.alert(
        'Move property',
        `You need at least $${MOVE_PROPERTY_COST.toLocaleString()} to move. Current balance is too low.`
      );
      return;
    }
    const costLabel = `$${MOVE_PROPERTY_COST.toLocaleString()}`;
    Alert.alert(
      'Move property',
      `Move your home to (${x}, ${y}) for ${costLabel}? Your balance will be charged immediately.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Move',
          onPress: () => {
            movePropertyMutation({ x, y })
              .unwrap()
              .then(() => {
                dispatch(refreshUserDataSilent());
                refetch();
                triggerGetMyMapPosition();
                setSelectedCell(null);
              })
              .catch((err: any) => {
                const msg = err?.data?.error ?? err?.message ?? 'Could not move property.';
                Alert.alert('Move property', String(msg));
              });
          },
        },
      ]
    );
  }, [
    selectedCell,
    effectiveMyPosition,
    currentBalanceDisplay,
    movePropertyMutation,
    dispatch,
    refetch,
    triggerGetMyMapPosition,
  ]);

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
    setCrewModalInitialCategory(null);
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
    }, VISITING_PROFILE_CLOSE_DELAY_MS);
  }, []);

  const [blockUserMutation] = useBlockUserMutation();
  const handleBlockUser = useCallback((userId: string) => {
    blockUserMutation(userId);
    handleVisitingProfileClose();
  }, [blockUserMutation, handleVisitingProfileClose]);

  const handleVisitingProfileUserNotFound = useCallback((userId: string) => {
    const normalizedTarget = String(userId ?? '').trim();
    if (!normalizedTarget) return;
    dispatch(clearPlayerCellsByUserIds([normalizedTarget]));
    setDynamicEntityData((prev) => {
      const next = { ...prev };
      Object.entries(prev).forEach(([key, val]) => {
        const stored = (val as any)?.userId;
        if (String(stored ?? '').trim() === normalizedTarget) delete next[key];
      });
      return next;
    });
    setEntityImageData((prev) => {
      const next = { ...prev };
      Object.entries(prev).forEach(([key, val]) => {
        const stored = val?.userId;
        if (String(stored ?? '').trim() === normalizedTarget) delete next[key];
      });
      return next;
    });
    setSelectedCell((prev) =>
      prev?.info?.userId != null && String(prev.info.userId).trim() === normalizedTarget ? null : prev
    );
    handleVisitingProfileClose();
  }, [dispatch, handleVisitingProfileClose]);

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
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
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
          style={[styles.infoPanel, { backgroundColor: colors.background, borderColor: colors.matrix, position: 'relative' }]}
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
        >
          <Pressable
            style={styles.shareLocationCorner}
            onPress={handleShareLocationPress}
            accessibilityLabel="Share location to chat"
            accessibilityRole="button"
            hitSlop={10}
          >
            <Image
              source={require('../assets/images/hackMap/shareLocation.png')}
              style={styles.shareLocationCornerImage}
              resizeMode="contain"
            />
          </Pressable>
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

            {selectedCell.info.entity === 'empty' &&
              effectiveMyPosition &&
              selectedCell.info.terrain !== 'water' &&
              selectedCell.info.terrain !== 'mountain' &&
              selectedCell.info.terrain !== 'road' &&
              (selectedCell.x !== effectiveMyPosition.x || selectedCell.y !== effectiveMyPosition.y) && (
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    {
                      backgroundColor:
                        currentBalanceDisplay >= MOVE_PROPERTY_COST ? colors.matrix : colors.buttonDisabled,
                      borderColor: colors.matrix,
                      opacity: currentBalanceDisplay >= MOVE_PROPERTY_COST ? 1 : 0.75,
                    },
                  ]}
                  onPress={handleMovePropertyPress}
                  accessibilityLabel="Move home to this tile"
                  accessibilityRole="button"
                >
                  <Text
                    style={[
                      styles.actionButtonText,
                      {
                        color:
                          currentBalanceDisplay >= MOVE_PROPERTY_COST ? colors.background : colors.text.secondary,
                      },
                    ]}
                  >
                    Move home here (${MOVE_PROPERTY_COST.toLocaleString()})
                  </Text>
                </TouchableOpacity>
              </View>
            )}
            
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
                        const normalizedUserId = selectedCell.info.userId != null ? String(selectedCell.info.userId).trim() : '';
                        if (normalizedUserId) {
                          setVisitingProfileUserId(normalizedUserId);
                          setShowVisitingProfileModal(true);
                        }
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
                  {(() => {
                    const probeUnlocked = (researchFeatures as any[] | undefined)?.some((f: any) => f.id === 'probe' && f.isUnlocked);
                    const isTargetSelf = selectedCell.info.owner === 'player' && selectedCell.info.name === currentUserHandle;
                    const canProbePlayer = selectedCell.info.owner === 'player' && selectedCell.info.userId && !isTargetSelf && !selectedCell.info.isShielded;
                    const canProbeNpc = selectedCell.info.owner !== 'player' && selectedCell.info.npcSlug;
                    const showProbe = probeUnlocked && (canProbePlayer || canProbeNpc);
                    if (!showProbe) return null;
                    return (
                      <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: colors.matrix, borderColor: colors.matrix }]}
                        onPress={() => {
                          const ourProbeCount = displayProbes.filter((p) => p.sentByUserId === currentUserId).length;
                          if (ourProbeCount >= MAX_PROBES) {
                            Alert.alert('Probes', 'Maximum 2 probes at a time.');
                            return;
                          }
                          const position = positionForProbe;
                          if (!position) return;
                          const id = `probe-${currentUserId ?? ''}-${Date.now()}-${selectedCell.x}-${selectedCell.y}`;
                          const targetOwner = selectedCell.info.owner === 'player' ? 'player' : 'npc';
                          const now = Date.now();
                          const entry: ProbeEntry = {
                            id,
                            sentByUserId: currentUserId ?? undefined,
                            fromX: position.x,
                            fromY: position.y,
                            launchedAt: now,
                            targetX: selectedCell.x,
                            targetY: selectedCell.y,
                            targetOwner,
                            targetUserId: selectedCell.info.userId != null ? String(selectedCell.info.userId) : undefined,
                            targetNpcSlug: selectedCell.info.npcSlug ?? undefined,
                            targetNpcInstanceId: selectedCell.info.npcInstanceId ?? undefined,
                            phase: 'outbound',
                            progress: 0,
                            remainingSec: 0,
                          };
                          setProbes((prev) => [...prev, entry]);
                          setSelectedCell(null);
                          launchProbeMutation({
                            probeId: id,
                            fromX: position.x,
                            fromY: position.y,
                            targetX: selectedCell.x,
                            targetY: selectedCell.y,
                            targetOwner,
                            targetUserId: entry.targetUserId,
                            targetNpcSlug: entry.targetNpcSlug,
                            targetNpcInstanceId: entry.targetNpcInstanceId,
                          })
                            .unwrap()
                            .catch((err: any) => {
                              setProbes((prev) => prev.filter((p) => p.id !== id));
                              const msg = err?.data?.error ?? err?.message ?? 'Probe launch failed.';
                              Alert.alert('Probe', msg);
                            });
                        }}
                      >
                        <Text style={[styles.actionButtonText, { color: colors.background }]}>
                          Probe
                        </Text>
                      </TouchableOpacity>
                    );
                  })()}
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
  }, [selectedCell, styles, colors, currentUserHandle, onClose, selectedUserCrewStatus, handleViewCrewPress, shouldShowHackButton, researchFeatures, probes, displayProbes, positionForProbe, currentUserId, launchProbeMutation, handleShareLocationPress, effectiveMyPosition, currentBalanceDisplay, handleMovePropertyPress]);

  if (loading || !isMapReady || !terrainDataLoaded) {
    return <View style={styles.container}><LoadingSpinner /></View>;
  }

  return (
    <View style={styles.container} onLayout={onContainerLayout}>
      <CrewBackupBanner
        canShowBanner={!showProbeFollowModal}
        onPressOpenCrewToBackup={() => {
          setCrewModalInitialCategory('backup-requests');
          setCrewModalFocusBackupKey((k) => k + 1);
          setShowCrewModal(true);
        }}
      />
      <CloseButton onPress={onClose} />

      <View style={styles.topCenterIconsWrapper} pointerEvents="box-none">
        {hackRigUnlocked && (
          <WorldChatIconButton inline onPress={() => setShowWorldChatModal(true)} />
        )}
        <MessagesIconButton
          inline
          onPress={() => setShowMessagesModal(true)}
          unreadCount={messagesUnreadCount}
        />
        <SearchUserIconButton inline onPress={() => setShowSearchUserModal(true)} />
      </View>
      <WorldChatModal
        visible={showWorldChatModal}
        onClose={() => setShowWorldChatModal(false)}
        mapName="main"
        onNavigateToMapCell={handleNavigateFromChatToCell}
      />

      <View style={styles.navigationButtonRow}>
        <Pressable style={styles.navigationButton} onPress={centerOnUserHome}>
          <Image source={require('../assets/images/navigationIcon.png')} style={styles.navigationIcon} resizeMode="contain" />
        </Pressable>
        <Pressable style={styles.navigationButton} onPress={() => setShowJumpToModal(true)}>
          <Image source={require('../assets/images/hackMap/jumpTo.png')} style={styles.navigationIcon} resizeMode="contain" />
        </Pressable>
      </View>

      <JumpToModal
        visible={showJumpToModal}
        onClose={() => setShowJumpToModal(false)}
        onJump={jumpToGridPosition}
      />

      <SearchUserModal
        visible={showSearchUserModal}
        onClose={() => setShowSearchUserModal(false)}
        onUserFound={(userId) => {
          setShowSearchUserModal(false);
          setVisitingProfileUserId(userId);
          setShowVisitingProfileModal(true);
        }}
        isAdmin={currentUserIsAdmin}
      />

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
        initialCategory={crewModalInitialCategory}
        focusInitialCategoryKey={crewModalInitialCategory === 'backup-requests' ? crewModalFocusBackupKey : undefined}
        onNavigateToMapCell={handleCrewChatNavigateToCell}
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
          onUserNotFound={handleVisitingProfileUserNotFound}
          onOpenMessages={handleOpenMessagesFromProfile}
          onBlockUser={handleBlockUser}
        />
      )}

      <MessagesModal
        visible={showMessagesModal}
        onClose={handleCloseMessagesModal}
        openToUserId={messagesOpenToUser?.userId ?? null}
        openToUsername={messagesOpenToUser?.username ?? null}
        onNavigateToMapCell={handleMessagesNavigateToMapCell}
        onWatchBattle={onWatchBattle ? handleWatchBattleFromMessages : undefined}
      />

      {visitCrewId && (
        <VisitCrewModal
          visible={showVisitCrewModal}
          onClose={handleVisitCrewClose}
          crewId={visitCrewId}
          crewName={visitCrewName || undefined}
        />
      )}

      {renderInfoPanel()}

      <View style={{ width: totalSize + (MARGIN_SIZE * 2), height: totalSize + (MARGIN_SIZE * 2) }}>
        <View style={StyleSheet.absoluteFill}>
          <GestureDetector gesture={combinedMapGesture}>
          <Animated.View
            ref={mapViewRef}
            style={[
              styles.marginWrapper,
              { width: totalSize + (MARGIN_SIZE * 2), height: totalSize + (MARGIN_SIZE * 2) },
              animatedMapStyle as any,
            ]}
            onLayout={() => {
              mapViewRef.current?.measureInWindow((x, y) => {
                mapViewWindowRef.current = { x, y };
              });
            }}
          >
            <View style={[styles.gridArea, { width: totalSize, height: totalSize }]}>
            {visibleCells.map((assignment) => {
              const { x, y, cell } = assignment;
              const selected = !!(selectedCell && selectedCell.x === x && selectedCell.y === y);
              const isCrewMember = !!(cell.owner === 'player' && cell.userId && crewMemberUserIds.has(String(cell.userId)));
              const isWarCrewMember = !!(cell.owner === 'player' && cell.userId && warCrewMemberUserIds.has(String(cell.userId)));
              const isAllianceCrewMember = !!(cell.owner === 'player' && cell.userId && !isCrewMember && allianceCrewMemberUserIds.has(String(cell.userId)));
              if (isPanningJS) {
                const entityImage = cell.entity !== 'empty' ? { entity: cell.entity, owner: cell.owner, userId: cell.userId, npcSlug: cell.npcSlug, npcLevel: cell.npcLevel } : undefined;
                return (
                  <PanningPoolTile
                    key={`${x}-${y}`}
                    x={x}
                    y={y}
                    terrain={cell.terrain}
                    entityImage={entityImage}
                    xStyle={xPosStyles[x]}
                    yStyle={yPosStyles[y]}
                    terrainStyleMap={terrainStyleMap}
                    currentUserId={currentUserId}
                    isShieldActive={isShieldActive}
                    styles={styles}
                  />
                );
              }
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
                  displayName={cell.name}
                  displayShielded={cell.isShielded}
                />
              );
            })}
          </View>
          </Animated.View>
        </GestureDetector>
        </View>
        {/*
          Attack march overlay sits above the gesture map (sibling, not inside GestureDetector) so tapping
          the icon does not also trigger Gesture.Tap → handleTapAtViewCoords → tile modal — same pattern as
          ProbeAnimationLayer (Bugbot / probe tap-through fix).
        */}
        <AttackMarchAnimationLayer
          marches={activeAttackMarchesData?.marches ?? []}
          colors={colors}
          animatedMapStyle={animatedMapStyle as any}
          currentUserId={currentUserId}
          onOwnerMarchPress={handleOwnerMarchPress}
        />
        <ProbeAnimationLayer
          probes={displayProbes}
          setProbes={setProbes}
          myPositionData={positionForProbe ?? undefined}
          currentUserId={currentUserId}
          completeProbeMutation={completeProbeMutation}
          probeFollowModeRef={probeFollowModeRef}
          followProbeIdRef={followProbeIdRef}
          containerSizeRef={containerSizeRef}
          offsetX={offsetX}
          offsetY={offsetY}
          boundsReady={boundsReady}
          minX={minX}
          maxX={maxX}
          minY={minY}
          maxY={maxY}
          scheduleComputeRef={scheduleComputeRef}
          onFollowProbe={handleProbeFollow}
          onCloseModal={handleProbeFollowModalClose}
          onProbeCompleteFailed={onProbeCompleteFailed}
          onProbeRemovedAfterReturn={onProbeRemovedAfterReturn}
          onFollowProbeDisplayUpdate={setFollowProbeDisplay}
          cancelProbeRef={cancelProbeRef}
          cancelProbeMutation={cancelProbeMutationSafe}
          colors={colors}
          styles={styles}
          animatedMapStyle={animatedMapStyle}
        />
      </View>

      {showProbeFollowModal && followProbeId && (() => {
        const followedProbe = displayProbes.find((p) => p.id === followProbeId);
        if (!followedProbe) return null;
        const isOwner = followedProbe.sentByUserId === currentUserId;
        if (!isOwner) return null;
        const display = followProbeDisplay ?? { remainingSec: followedProbe.remainingSec, phase: followedProbe.phase };
        return (
          <Modal visible transparent animationType="fade" onRequestClose={handleProbeFollowModalClose} supportedOrientations={['landscape-left', 'landscape-right']}>
            <View
              style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.35)' }]}
              pointerEvents="box-none"
            >
              <Pressable style={{ flex: 1, width: '100%', justifyContent: 'center', alignItems: 'center' }} onPress={handleProbeFollowModalClose}>
                <Pressable
                  style={{
                    padding: 12,
                    borderRadius: 8,
                    maxWidth: 200,
                    backgroundColor: colors.surface ? `${colors.surface}E6` : 'rgba(28,28,30,0.92)',
                  }}
                  onPress={(e) => e.stopPropagation()}
                >
                  <Text style={[styles.npcLevelModalText, { color: colors.text.primary, fontSize: 14 }]}>
                    {display.phase === 'returning' ? 'Returning to base' : 'Probe en route'}
                  </Text>
                  <Text style={[styles.npcLevelModalText, { color: colors.secondary, marginTop: 6, fontSize: 13 }]}>
                    {display.phase === 'returning' ? 'Time to base' : 'Time to target'}: {Math.ceil(display.remainingSec)}s
                  </Text>
                  {display.phase === 'outbound' && (
                    <TouchableOpacity style={[styles.actionButton, { marginTop: 8, paddingVertical: 6, backgroundColor: colors.error ?? '#c00' }]} onPress={() => cancelProbeRef.current?.()}>
                      <Text style={[styles.actionButtonText, { color: colors.background, fontSize: 13 }]}>Cancel</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={[styles.closeButton, { marginTop: 8, paddingVertical: 6 }]} onPress={handleProbeFollowModalClose}>
                    <Text style={[styles.closeButtonText, { color: colors.secondary, fontSize: 13 }]}>Close</Text>
                  </TouchableOpacity>
                </Pressable>
              </Pressable>
            </View>
          </Modal>
        );
      })()}

      {marchOwnerModalId != null &&
        (() => {
          void marchModalTimeTick;
          const followedMarch = (activeAttackMarchesData?.marches ?? []).find(
            (m) => m.marchId === marchOwnerModalId
          );
          if (!followedMarch || String(followedMarch.attackerId) !== String(currentUserId ?? '')) {
            return null;
          }
          const phase = followedMarch.state;
          const departMs = Date.parse(followedMarch.departAt);
          const arriveMs = Date.parse(followedMarch.arriveAt);
          const retEndMs =
            followedMarch.returnArriveAt != null ? Date.parse(String(followedMarch.returnArriveAt)) : NaN;
          const outboundRemainingSec =
            phase === 'outbound' && Number.isFinite(departMs) && Number.isFinite(arriveMs)
              ? Math.max(0, (arriveMs - Date.now()) / 1000)
              : null;
          const returnRemainingSec =
            phase === 'returning' && Number.isFinite(retEndMs)
              ? Math.max(0, (retEndMs - Date.now()) / 1000)
              : null;
          const showCancel = phase === 'outbound';
          const title =
            phase === 'returning'
              ? 'Returning home'
              : phase === 'outbound'
                ? 'Hack expedition en route'
                : 'Hack expedition';
          return (
            <Modal
              visible
              transparent
              animationType="fade"
              onRequestClose={handleMarchOwnerModalClose}
              supportedOrientations={['landscape-left', 'landscape-right']}
            >
              <View
                style={[
                  StyleSheet.absoluteFill,
                  { justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.35)' },
                ]}
                pointerEvents="box-none"
              >
                <Pressable
                  style={{ flex: 1, width: '100%', justifyContent: 'center', alignItems: 'center' }}
                  onPress={handleMarchOwnerModalClose}
                >
                  <Pressable
                    style={{
                      padding: 12,
                      borderRadius: 8,
                      maxWidth: 260,
                      backgroundColor: colors.surface ? `${colors.surface}E6` : 'rgba(28,28,30,0.92)',
                    }}
                    onPress={(e) => e.stopPropagation()}
                  >
                    <Text style={[styles.npcLevelModalText, { color: colors.text.primary, fontSize: 14 }]}>
                      {title}
                    </Text>
                    {phase === 'outbound' ? (
                      outboundRemainingSec != null ? (
                        <Text style={[styles.npcLevelModalText, { color: colors.secondary, marginTop: 6, fontSize: 13 }]}>
                          Time to target: {Math.ceil(outboundRemainingSec)}s
                        </Text>
                      ) : (
                        <Text style={[styles.npcLevelModalText, { color: colors.text.secondary, marginTop: 6, fontSize: 12 }]}>
                          Cancel orders your army to march home from its current position at the same pace
                          as the outbound leg. Bots return to barracks when the army arrives.
                        </Text>
                      )
                    ) : phase === 'returning' ? (
                      <>
                        {returnRemainingSec != null ? (
                          <Text style={[styles.npcLevelModalText, { color: colors.secondary, marginTop: 6, fontSize: 13 }]}>
                            Time to home: {Math.ceil(returnRemainingSec)}s
                          </Text>
                        ) : (
                          <Text style={[styles.npcLevelModalText, { color: colors.text.secondary, marginTop: 6, fontSize: 12 }]}>
                            Marching back to your turf.
                          </Text>
                        )}
                        <Text style={[styles.npcLevelModalText, { color: colors.text.secondary, marginTop: 8, fontSize: 11 }]}>
                          Committed bots stay out of Digital Barracks and full home defense until this return
                          finishes. You cannot start another hack expedition until then.
                        </Text>
                      </>
                    ) : (
                      <Text style={[styles.npcLevelModalText, { color: colors.text.secondary, marginTop: 6, fontSize: 12 }]}>
                        Expedition status updated — close to continue.
                      </Text>
                    )}
                    {showCancel ? (
                      <TouchableOpacity
                        style={[
                          styles.actionButton,
                          {
                            marginTop: 8,
                            paddingVertical: 6,
                            backgroundColor: colors.error ?? '#c00',
                            opacity: isCancellingOutboundMarch ? 0.6 : 1,
                          },
                        ]}
                        onPress={handleCancelOutboundMarch}
                        disabled={isCancellingOutboundMarch}
                      >
                        <Text style={[styles.actionButtonText, { color: colors.background, fontSize: 13 }]}>
                          {isCancellingOutboundMarch ? 'Cancelling…' : 'Cancel expedition'}
                        </Text>
                      </TouchableOpacity>
                    ) : null}
                    <TouchableOpacity
                      style={[styles.closeButton, { marginTop: 8, paddingVertical: 6 }]}
                      onPress={handleMarchOwnerModalClose}
                    >
                      <Text style={[styles.closeButtonText, { color: colors.secondary, fontSize: 13 }]}>Close</Text>
                    </TouchableOpacity>
                  </Pressable>
                </Pressable>
              </View>
            </Modal>
          );
        })()}
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
  displayName?: string | undefined;
  displayShielded?: boolean;
  /** When true, tap is handled by parent Gesture.Tap (map); no Pressable so no dual handlers (Bugbot). */
  tapHandledByGesture?: boolean;
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
  displayName?: string | undefined;
  displayShielded?: boolean;
};

const getStyles = (colors: ReturnType<typeof useThemeColors>, themeMode: 'light' | 'dark') => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topCenterIconsWrapper: {
    position: 'absolute',
    top: SIZING.spacing.lg,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    zIndex: 10002,
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
  shareLocationCorner: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    zIndex: 4,
    padding: 4,
  },
  shareLocationCornerImage: {
    width: 52,
    height: 52,
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
  navigationButtonRow: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    flexDirection: 'row',
    gap: 8,
    zIndex: 1,
  },
  navigationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
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