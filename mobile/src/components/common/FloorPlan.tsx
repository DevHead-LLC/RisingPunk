import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useGetRentalHousingIncomeQuery } from '../../store/api/rentalHousingApi';
import { formatCurrencyThousandths } from '../../utils/currencyUtils';
import type { RemodelRoomType } from '../../store/api/authApi';

export type RoomRemodelTier = {
  roomLevel: number;
  cost: number;
  constructionTimeMinutes: number;
  minPropertyLevel: number;
};

interface FloorPlanProps {
  propertyId: number;
  /** When set and property level >= 3, show Remodel button for rooms below max level */
  propertyLevel?: number;
  /** When set, show room level badge and Remodel callback for upgradable rooms */
  onRemodel?: (room: RemodelRoomType) => void;
  /** When set for this property, show "Remodeling..." for the room in progress */
  activeRemodelRoom?: string | null;
  /** ISO date string when the active remodel completes (for countdown and speedup) */
  activeRemodelCompletesAt?: string | null;
  /** When true, render only the Garage room (for Garage tab). When false, render Main Floor rooms only. */
  showGarage?: boolean;
  /** Max room remodel level from server. When provided with roomRemodelLevels, used for gating. */
  maxRoomLevel?: number;
  /** Room remodel tiers from server. When provided with maxRoomLevel, used for min-property-level gating. */
  roomRemodelLevels?: RoomRemodelTier[];
}

function formatRemodelTimeLeft(remainingSec: number): string {
  const m = Math.floor(remainingSec / 60);
  const s = Math.floor(remainingSec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export const FloorPlan: React.FC<FloorPlanProps> = ({
  propertyId,
  propertyLevel = 0,
  onRemodel,
  activeRemodelRoom,
  activeRemodelCompletesAt,
  showGarage = false,
  maxRoomLevel,
  roomRemodelLevels,
}) => {
  const colors = useThemeColors();
  const { data: rentalIncome, isLoading } = useGetRentalHousingIncomeQuery();
  const [now, setNow] = useState(() => Date.now());

  const completesAtMs = activeRemodelCompletesAt ? new Date(activeRemodelCompletesAt).getTime() : 0;
  useEffect(() => {
    if (!activeRemodelRoom || !completesAtMs) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [activeRemodelRoom, completesAtMs]);

  const remainingSec = activeRemodelRoom && completesAtMs ? Math.max(0, (completesAtMs - now) / 1000) : 0;
  const timeUp = remainingSec <= 0;
  const timeLabel = timeUp ? 'Complete! Tap to finish.' : `${formatRemodelTimeLeft(remainingSec)} left`;
  const actionButtonLabel = timeUp ? 'Complete' : 'Speedup';

  const propertyData = rentalIncome?.propertyBreakdown.find(p => p.propertyId === propertyId);
  const roomValues = propertyData?.roomValues;
  const roomLevels = propertyData?.roomLevels;
  const hasRemodelCallback = Boolean(onRemodel);
  const hasRemodelConfig = maxRoomLevel != null && roomRemodelLevels?.length;
  const canShowRemodelForRoom = (roomLevel: number, isGarage: boolean) => {
    if (!hasRemodelCallback || !hasRemodelConfig || maxRoomLevel == null || roomLevel >= maxRoomLevel) return false;
    if (isGarage && propertyLevel < 7) return false;
    const nextLevel = roomLevel + 1;
    const tier = roomRemodelLevels!.find((r) => r.roomLevel === nextLevel);
    const minProp = tier?.minPropertyLevel;
    return minProp != null && propertyLevel >= minProp;
  };

  if (showGarage) {
    const garageLevel = roomLevels?.garage ?? 1;
    const garageValue = roomValues?.garage ?? 0;
    return (
      <View style={styles.garageOnlyContainer}>
        <View style={[styles.roomLabel, { backgroundColor: colors.secondary }]}>
          <Text style={styles.roomText}>Garage</Text>
          <View style={styles.roomLevelRow}>
            <Text style={styles.roomLevelBadge}>Lv. {garageLevel}</Text>
            {canShowRemodelForRoom(garageLevel, true) && !activeRemodelRoom && (
              <TouchableOpacity onPress={() => onRemodel!('garage')} style={styles.remodelButton}>
                <Text style={styles.remodelButtonText}>↑ Remodel</Text>
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.roomValue}>
            {isLoading ? '+$0.00' : formatCurrencyThousandths(garageValue)}
          </Text>
          {activeRemodelRoom === 'garage' && onRemodel && (
            <View style={styles.remodelingRow}>
              <Text style={styles.remodelingText}>Remodeling... {timeLabel}</Text>
              <TouchableOpacity onPress={() => onRemodel('garage')} style={styles.remodelButton}>
                <Text style={styles.remodelButtonText}>{actionButtonLabel}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.floorPlan}>
      {/* Main outer border */}
      <View style={[styles.outerBorder, { borderColor: colors.matrix }]} />
      
      {/* Left side - stacked colored boxes */}
      {/* Bathroom - top left */}
      <View style={[styles.room, styles.bathroom, { backgroundColor: colors.primary + '30' }]}>
        <View style={[styles.roomLabel, { backgroundColor: colors.primary }]}>
          <Text style={styles.roomText}>Bathroom</Text>
          <View style={styles.roomLevelRow}>
            <Text style={styles.roomLevelBadge}>Lv. {roomLevels?.bathroom ?? 1}</Text>
            {canShowRemodelForRoom(roomLevels?.bathroom ?? 1, false) && !activeRemodelRoom && (
              <TouchableOpacity onPress={() => onRemodel!('bathroom')} style={styles.remodelButton}>
                <Text style={styles.remodelButtonText}>↑ Remodel</Text>
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.roomValue}>
            {isLoading ? '+$0.010' : formatCurrencyThousandths(roomValues?.bathroom ?? 0)}
          </Text>
          {activeRemodelRoom === 'bathroom' && onRemodel && (
            <View style={styles.remodelingRow}>
              <Text style={styles.remodelingText}>Remodeling... {timeLabel}</Text>
              <TouchableOpacity onPress={() => onRemodel('bathroom')} style={styles.remodelButton}>
                <Text style={styles.remodelButtonText}>{actionButtonLabel}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
      
      {/* Entrance - middle left */}
      <View style={[styles.room, styles.entrance, { backgroundColor: colors.secondary + '30' }]}>
        <View style={[styles.roomLabel, { backgroundColor: colors.secondary }]}>
          <Text style={styles.roomText}>Entrance</Text>
        </View>
      </View>
      
      {/* Kitchen - bottom left */}
      <View style={[styles.room, styles.kitchen, { backgroundColor: colors.primary + '30' }]}>
        <View style={[styles.roomLabel, { backgroundColor: colors.primary }]}>
          <Text style={styles.roomText}>Kitchen</Text>
          <View style={styles.roomLevelRow}>
            <Text style={styles.roomLevelBadge}>Lv. {roomLevels?.kitchen ?? 1}</Text>
            {canShowRemodelForRoom(roomLevels?.kitchen ?? 1, false) && !activeRemodelRoom && (
              <TouchableOpacity onPress={() => onRemodel!('kitchen')} style={styles.remodelButton}>
                <Text style={styles.remodelButtonText}>↑ Remodel</Text>
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.roomValue}>
            {isLoading ? '+$0.010' : formatCurrencyThousandths(roomValues?.kitchen ?? 0)}
          </Text>
          {activeRemodelRoom === 'kitchen' && onRemodel && (
            <View style={styles.remodelingRow}>
              <Text style={styles.remodelingText}>Remodeling... {timeLabel}</Text>
              <TouchableOpacity onPress={() => onRemodel('kitchen')} style={styles.remodelButton}>
                <Text style={styles.remodelButtonText}>{actionButtonLabel}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
      
      {/* Right side - stacked colored boxes */}
      {/* Bedroom - top right */}
      <View style={[styles.room, styles.bedroom, { backgroundColor: colors.primary + '20' }]}>
        <View style={[styles.roomLabel, { backgroundColor: colors.primary }]}>
          <Text style={styles.roomText}>Bedroom</Text>
          <View style={styles.roomLevelRow}>
            <Text style={styles.roomLevelBadge}>Lv. {roomLevels?.bedroom ?? 1}</Text>
            {canShowRemodelForRoom(roomLevels?.bedroom ?? 1, false) && !activeRemodelRoom && (
              <TouchableOpacity onPress={() => onRemodel!('bedroom')} style={styles.remodelButton}>
                <Text style={styles.remodelButtonText}>↑ Remodel</Text>
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.roomValue}>
            {isLoading ? '+$0.020' : formatCurrencyThousandths(roomValues?.bedroom ?? 0)}
          </Text>
          {activeRemodelRoom === 'bedroom' && onRemodel && (
            <View style={styles.remodelingRow}>
              <Text style={styles.remodelingText}>Remodeling... {timeLabel}</Text>
              <TouchableOpacity onPress={() => onRemodel('bedroom')} style={styles.remodelButton}>
                <Text style={styles.remodelButtonText}>{actionButtonLabel}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
      
      {/* Living Room - bottom right */}
      <View style={[styles.room, styles.livingRoom, { backgroundColor: colors.secondary + '20' }]}>
        <View style={[styles.roomLabel, { backgroundColor: colors.secondary }]}>
          <Text style={styles.roomText}>Living Room</Text>
          <View style={styles.roomLevelRow}>
            <Text style={styles.roomLevelBadge}>Lv. {roomLevels?.livingRoom ?? 1}</Text>
            {canShowRemodelForRoom(roomLevels?.livingRoom ?? 1, false) && !activeRemodelRoom && (
              <TouchableOpacity onPress={() => onRemodel!('livingRoom')} style={styles.remodelButton}>
                <Text style={styles.remodelButtonText}>↑ Remodel</Text>
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.roomValue}>
            {isLoading ? '+$0.020' : formatCurrencyThousandths(roomValues?.livingRoom ?? 0)}
          </Text>
          {activeRemodelRoom === 'livingRoom' && onRemodel && (
            <View style={styles.remodelingRow}>
              <Text style={styles.remodelingText}>Remodeling... {timeLabel}</Text>
              <TouchableOpacity onPress={() => onRemodel('livingRoom')} style={styles.remodelButton}>
                <Text style={styles.remodelButtonText}>{actionButtonLabel}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  garageOnlyContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floorPlan: {
    width: 1200,
    height: 900,
    position: 'relative',
    backgroundColor: 'transparent',
  },
  outerBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 3,
    borderStyle: 'solid',
    borderRadius: 8,
  },
  room: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bathroom: {
    top: 20,
    left: 20,
    width: 380,
    height: 280,
  },
  entrance: {
    top: 320,
    left: 20,
    width: 380,
    height: 280,
  },
  kitchen: {
    top: 620,
    left: 20,
    width: 380,
    height: 260,
  },
  bedroom: {
    top: 20,
    right: 20,
    width: 780,
    height: 430,
  },
  livingRoom: {
    bottom: 20,
    right: 20,
    width: 780,
    height: 430,
  },
  roomLabel: {
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    minWidth: 140,
  },
  roomText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  roomLevelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  roomLevelBadge: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.95)',
    backgroundColor: 'rgba(0,0,0,0.35)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: 'hidden',
  },
  roomValue: {
    fontSize: 16,
    color: '#00ff00',
    textAlign: 'center',
    marginTop: 8,
  },
  remodelButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  remodelButtonText: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '600',
  },
  remodelingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 6,
  },
  remodelingText: {
    fontSize: 12,
    color: '#ff0',
    flex: 1,
  },
});
