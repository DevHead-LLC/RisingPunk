/**
 * @file BattleBattalion.tsx
 * @description Battalion visualization component with shapes, health bars, and bot type indicators
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Battalion } from '../../types/battle';

interface Props {
  battalion: Battalion;
  position: { x: number; y: number };
  size?: number;
  showHealthBar?: boolean;
}

const BOT_TYPE_LABELS: Record<string, string> = {
  phreak: 'Ph',
  breacher: 'Br',
  guardian: 'Gn',
};

export const BattleBattalion = React.memo(({
  battalion,
  position,
  size = 30, // Shrunk by 25%
  showHealthBar = true,
}: Props) => {
  // Health percentage
  const healthPercentage = battalion.maxHealth > 0 ? (battalion.currentHealth / battalion.maxHealth) * 100 : 0;

  // Border color by side
  const borderColor = battalion.isUser ? '#4717F6' : '#FF4141';

  // Shape style
  const getShapeStyle = () => {
    const base = {
      width: size,
      height: size,
      left: position.x - size / 2,
      top: position.y - size / 2,
      borderWidth: 3,
      borderColor,
      backgroundColor: 'transparent',
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      position: 'absolute' as const,
    };
    switch (battalion.type) {
      case 'guardian':
        return { ...base, borderRadius: size / 2 };
      case 'breacher':
        return { ...base, borderRadius: 6 };
      case 'phreak':
        return { ...base, borderRadius: 0, transform: [{ rotate: '45deg' }] };
      default:
        return base;
    }
  };

  // Health bar color
  const getHealthBarColor = () => {
    if (healthPercentage > 60) {return '#4CAF50';}
    if (healthPercentage > 30) {return '#FF9800';}
    return '#F44336';
  };

  // Bot type label (2 chars)
  const botTypeLabel = BOT_TYPE_LABELS[battalion.type] || '';
  // For phreaks, rotate number back but NOT the background
  const quantityTextStyle = battalion.type === 'phreak' ? [styles.quantityText, { fontSize: 12 }, { transform: [{ rotate: '-45deg' }] }] : [styles.quantityText, { fontSize: 12 }];
  const botTypeLabelStyle = [styles.botTypeText, { color: borderColor, fontSize: 11 }];
  // Mark label (always Mk I for now)
  const markLabel = 'Mk I';
  const markLabelStyle = [styles.markText, { color: borderColor, fontSize: 11 }];

  // Calculate health bar and label row Y offsets to match diamond tip clearance for all shapes
  const healthBarOffset = size / 2 + 15; // 6px above the top tip
  const labelRowOffset = size / 2 + 10;  // 6px below the bottom tip

  return (
    <View style={styles.container}>
      {/* Shape with quantity in center */}
      <View style={getShapeStyle()}>
        <View style={styles.quantityBackground}>
          <Text style={quantityTextStyle}>{battalion.quantity}</Text>
        </View>
      </View>
      {/* Health bar, just above the shape, clears diamond tip */}
      {showHealthBar && (
        <View style={[
          styles.healthBarContainer,
          {
            left: position.x - (size + 10) / 2,
            top: position.y - healthBarOffset,
            width: size + 10,
          },
        ]}>
          <View style={styles.healthBarBackground}>
            <View
              style={[
                styles.healthBarFill,
                {
                  width: `${healthPercentage}%`,
                  backgroundColor: getHealthBarColor(),
                },
              ]}
            />
          </View>
        </View>
      )}
      {/* Bot type and Mark label on the same line, just below the shape */}
      <View style={[
        styles.labelRow,
        {
          left: position.x - size / 2 - 2,
          top: position.y + labelRowOffset,
        },
      ]}>
        <Text style={botTypeLabelStyle}>{botTypeLabel}</Text>
        <View style={{ width: 12 }} />
        <Text style={markLabelStyle}>{markLabel}</Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  healthBarContainer: {
    position: 'absolute',
    alignItems: 'flex-start',
    height: 4,
  },
  healthBarBackground: {
    width: '100%',
    height: 4,
    backgroundColor: '#333',
    borderRadius: 3,
    overflow: 'hidden',
  },
  healthBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  quantityBackground: {
    backgroundColor: '#000',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  quantityText: {
    color: '#FFF',
    fontWeight: 'bold',
    textAlign: 'center',
    backgroundColor: 'transparent',
    zIndex: 2,
  },
  labelRow: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
  },
  botTypeText: {
    fontWeight: 'bold',
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  markText: {
    fontWeight: 'bold',
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
});
