import React, { useCallback, useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { useAppDispatch } from '../../store/hooks';
import { setShowTurfIntro } from '../../store/slices/authSlice';
import { TurfIntroText } from './TurfIntroText';

type TurfIntroProps = {
  onComplete: () => void;
  onSkip: () => void;
  horizontalScrollRef?: React.RefObject<any>;
};

export const TurfIntro: React.FC<TurfIntroProps> = ({ onComplete, onSkip, horizontalScrollRef }) => {
  const dispatch = useAppDispatch();

  // Center the view on the Home and Digital Barracks locations when intro starts
  useEffect(() => {
    if (horizontalScrollRef?.current) {
      const SCREEN_WIDTH = Dimensions.get('window').width;
      const CONTENT_WIDTH = 2000;
      const CENTER_X = (CONTENT_WIDTH - SCREEN_WIDTH) / 2;
      
      // Use the exact same centering logic as when closing profile
      horizontalScrollRef.current.scrollTo({
        x: CENTER_X,
        y: 0,
        animated: true,
      });
    }
  }, [horizontalScrollRef]);

  const handleComplete = useCallback(() => {
    dispatch(setShowTurfIntro(false));
    onComplete();
  }, [dispatch, onComplete]);

  const handleSkip = useCallback(() => {
    dispatch(setShowTurfIntro(false));
    onSkip();
  }, [dispatch, onSkip]);

  return (
    <View style={styles.container}>
      {/* Overlay sections covering everything except Home Location */}
      <View style={styles.overlayTop} />
      <View style={styles.overlayLeft} />
      <View style={styles.overlayRight} />
      <View style={styles.overlayBottom} />
      
      {/* Text overlay */}
      <TurfIntroText 
        text="This is your Home on your Turf. It's where you can build a digital bot army and access your hack rig to see other players and new enemies on a map."
        onComplete={handleComplete}
        onSkip={handleSkip}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
          overlayTop: {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '25%',
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          zIndex: 1001,
        },
        overlayLeft: {
          position: 'absolute',
          left: 0,
          height: '100%',
          width: '25%',
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          zIndex: 1001,
        },
        overlayRight: {
          position: 'absolute',
          right: 0,
          height: '100%',
          width: '54%',
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          zIndex: 1001,
        },
        overlayBottom: {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '30%',
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          zIndex: 1001,
        },
});
