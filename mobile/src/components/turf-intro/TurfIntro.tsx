import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { useAppDispatch } from '../../store/hooks';
import { setShowTurfIntro } from '../../store/slices/authSlice';
import { TurfIntroText } from './TurfIntroText';

type TurfIntroProps = {
  onComplete: () => void;
  onSkip: () => void;
  horizontalScrollRef?: React.RefObject<any>;
  onStepChange?: (currentStep: 'home' | 'barracks' | 'research' | 'investment1' | 'wallet' | 'profile') => void;
};

export const TurfIntro: React.FC<TurfIntroProps> = ({ onComplete, onSkip, horizontalScrollRef, onStepChange }) => {
  const dispatch = useAppDispatch();
  const [currentStep, setCurrentStep] = useState<'home' | 'barracks' | 'research' | 'investment1' | 'wallet' | 'profile'>('home');

  // Center the view on the Home location when intro starts
  useEffect(() => {
    if (horizontalScrollRef?.current) {
      const SCREEN_WIDTH = Dimensions.get('window').width;
      const CONTENT_WIDTH = 2000;
      const CENTER_X = (CONTENT_WIDTH - SCREEN_WIDTH) / 2;
      
      // Use the new panTo method that works on both platforms
      if (horizontalScrollRef.current.panTo) {
        horizontalScrollRef.current.panTo(CENTER_X, 0, true);
      } else if (horizontalScrollRef.current.horizontalScrollRef?.current) {
        // Fallback to scrollTo for iOS
        horizontalScrollRef.current.horizontalScrollRef.current.scrollTo({
          x: CENTER_X,
          y: 0,
          animated: true,
        });
      }
    }
  }, [horizontalScrollRef]);

  // Notify parent of step changes
  useEffect(() => {
    if (onStepChange) {
      onStepChange(currentStep);
    }
  }, [currentStep, onStepChange]);

  const handleContinue = useCallback(() => {
    if (currentStep === 'home') {
      // Move to Digital Barracks step
      setCurrentStep('barracks');
      
      // Adjust pan position to show Digital Barracks in the overlay window
      if (horizontalScrollRef?.current) {
        const SCREEN_WIDTH = Dimensions.get('window').width;
        const CONTENT_WIDTH = 2000;
        // Move right to show Digital Barracks (which is at right: 25%)
        // Reduced offset to better center in the overlay window
        const BARRACKS_X = (CONTENT_WIDTH - SCREEN_WIDTH) / 2 + 275; // Adjusted from 400 to 200
        
        if (horizontalScrollRef.current.panTo) {
          horizontalScrollRef.current.panTo(BARRACKS_X, 0, true);
        } else if (horizontalScrollRef.current.horizontalScrollRef?.current) {
          horizontalScrollRef.current.horizontalScrollRef.current.scrollTo({
            x: BARRACKS_X,
            y: 0,
            animated: true,
          });
        }
      }
    } else if (currentStep === 'barracks') {
      // Move to Research Center step
      setCurrentStep('research');
      
      // Adjust pan position to show Research Center in the overlay window
      if (horizontalScrollRef?.current) {
        const SCREEN_WIDTH = Dimensions.get('window').width;
        const CONTENT_WIDTH = 2000;
        // Move to show Research Center (positioned below Home and Digital Barracks)
        const RESEARCH_X = (CONTENT_WIDTH - SCREEN_WIDTH) / 2 + 135; // Keep same horizontal position
        const RESEARCH_Y = 300; // Move down by 350 pixels
        
        if (horizontalScrollRef.current.panTo) {
          horizontalScrollRef.current.panTo(RESEARCH_X, RESEARCH_Y, true);
        } else if (horizontalScrollRef.current.horizontalScrollRef?.current) {
          horizontalScrollRef.current.horizontalScrollRef.current.scrollTo({
            x: RESEARCH_X,
            y: RESEARCH_Y,
            animated: true,
          });
        }
      }
    } else if (currentStep === 'research') {
      // Move to Investment Property 1 step
      setCurrentStep('investment1');
      
      // Adjust pan position to show Investment Property 1 in the overlay window
      if (horizontalScrollRef?.current) {
        const SCREEN_WIDTH = Dimensions.get('window').width;
        const CONTENT_WIDTH = 2000;
        // Move to show Investment Property 1 (below Research Center, to the left)
        const INVESTMENT_X = (CONTENT_WIDTH - SCREEN_WIDTH) / 2 - 390; // Move left from center
        const INVESTMENT_Y = 725; // Move further down from Research Center
        
        if (horizontalScrollRef.current.panTo) {
          horizontalScrollRef.current.panTo(INVESTMENT_X, INVESTMENT_Y, true);
        } else if (horizontalScrollRef.current.horizontalScrollRef?.current) {
          horizontalScrollRef.current.horizontalScrollRef.current.scrollTo({
            x: INVESTMENT_X,
            y: INVESTMENT_Y,
            animated: true,
          });
        }
      }
    } else if (currentStep === 'investment1') {
      // Move to Wallet step (centered on Home but highlighting top-left wallet)
      setCurrentStep('wallet');
      
      // Return to Home center position but adjust overlay to highlight wallet
      if (horizontalScrollRef?.current) {
        const SCREEN_WIDTH = Dimensions.get('window').width;
        const CONTENT_WIDTH = 2000;
        const CENTER_X = (CONTENT_WIDTH - SCREEN_WIDTH) / 2;
        
        if (horizontalScrollRef.current.panTo) {
          horizontalScrollRef.current.panTo(CENTER_X, 0, true);
        } else if (horizontalScrollRef.current.horizontalScrollRef?.current) {
          horizontalScrollRef.current.horizontalScrollRef.current.scrollTo({
            x: CENTER_X,
            y: 0,
            animated: true,
          });
        }
      }
    } else if (currentStep === 'wallet') {
      // Move to Profile step (centered on Home but highlighting top-right profile)
      setCurrentStep('profile');
      
      // Keep Home center position but adjust overlay to highlight profile in top-right
      if (horizontalScrollRef?.current) {
        const SCREEN_WIDTH = Dimensions.get('window').width;
        const CONTENT_WIDTH = 2000;
        const CENTER_X = (CONTENT_WIDTH - SCREEN_WIDTH) / 2;
        
        if (horizontalScrollRef.current.panTo) {
          horizontalScrollRef.current.panTo(CENTER_X, 0, true);
        } else if (horizontalScrollRef.current.horizontalScrollRef?.current) {
          horizontalScrollRef.current.horizontalScrollRef.current.scrollTo({
            x: CENTER_X,
            y: 0,
            animated: true,
          });
        }
      }
    } else {
      // Complete the intro
      dispatch(setShowTurfIntro(false));
      onComplete();
    }
  }, [currentStep, horizontalScrollRef, dispatch, onComplete]);

  const handleSkip = useCallback(() => {
    dispatch(setShowTurfIntro(false));
    onSkip();
  }, [dispatch, onSkip]);

  const getIntroText = () => {
    if (currentStep === 'home') {
      return "This is your Home on your Turf. It's where you can build a digital bot army and access your hack rig to see other players and new enemies on a map.";
    } else if (currentStep === 'barracks') {
      return "This is your Digital Barracks, where the bots you build live. View individual bot types and details, see various Mark levels, and the quantity you have of each as a percentage of your overall digital army.";
    } else if (currentStep === 'research') {
      return "This is where you can build your Research Center. Here you can unlock new technologies, upgrade bot abilities, enhance your cash flow, and more!";
    } else if (currentStep === 'investment1') {
      return "Develop your investment properties to claim your passive income!";
    } else if (currentStep === 'wallet') {
      return "This is your Wallet Balance. Track your earnings from battles, investments, and other activities. Build your wealth to unlock more opportunities!";
    } else {
      return "This is your profile. Adjust game settings, track your level progress, adjust lighting colors, and more!";
    }
  };

  const getButtonText = () => {
    if (currentStep === 'home') {
      return 'Continue';
    } else if (currentStep === 'barracks') {
      return 'Continue';
    } else if (currentStep === 'research') {
      return 'Continue';
    } else if (currentStep === 'investment1') {
      return 'Continue';
    } else if (currentStep === 'wallet') {
      return 'Continue';
    } else {
      return 'Complete';
    }
  };

  return (
    <View style={styles.container}>
      {/* Text overlay */}
      <TurfIntroText 
        text={getIntroText()}
        onComplete={handleContinue}
        onSkip={handleSkip}
        buttonText={getButtonText()}
        centerText={currentStep === 'wallet' || currentStep === 'profile'}
        showSkipButton={currentStep !== 'profile'}
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
});
