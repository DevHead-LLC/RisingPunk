import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, Platform } from 'react-native';
import { useThemeColors } from '../../hooks/useThemeColors';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface SlideTextOverlayProps {
  narrative: string;
  message: string;
  style?: 'typewriter' | 'caption' | 'hybrid';
  position?: 'top' | 'bottom' | 'center';
  slideNumber: number;
}

export const SlideTextOverlay: React.FC<SlideTextOverlayProps> = ({
  narrative,
  message,
  style = 'hybrid',
  position = 'bottom',
  slideNumber,
}) => {
  const colors = useThemeColors();
  const [displayedLines, setDisplayedLines] = useState<string[]>([]);
  const [showCaption, setShowCaption] = useState(false);
  const fullTextRef = useRef<string>('');
  const currentCharIndex = useRef(0);
  const currentLineIndex = useRef(0);
  const linesRef = useRef<string[]>([]);
  const captionOpacity = useRef(new Animated.Value(0)).current;
  const captionSlideY = useRef(new Animated.Value(20)).current;
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const captionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentSlideRef = useRef<number>(slideNumber);

  const CHARS_PER_SECOND = 20;
  const CHAR_DELAY_MS = 1000 / CHARS_PER_SECOND;
  const MAX_LINES = 3;
  const FADE_DELAY_AFTER_COMPLETE = 1500;
  const FADE_DELAY_BETWEEN_LINES = 400;

  const getMaxLineWidth = () => {
    const containerWidth = SCREEN_WIDTH * 0.6;
    const padding = 12;
    return containerWidth - padding;
  };

  const measureTextWidth = (text: string): number => {
    const fontSize = 18;
    const fontWeight = 600;
    const avgCharWidth = fontSize * 0.55;
    return text.length * avgCharWidth;
  };

  useEffect(() => {
    if (!narrative) return;
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    if (captionTimeoutRef.current) {
      clearTimeout(captionTimeoutRef.current);
      captionTimeoutRef.current = null;
    }
    
    currentSlideRef.current = slideNumber;
    fullTextRef.current = narrative.trim().replace(/\s+/g, ' ').replace(/\n/g, ' ');
    currentCharIndex.current = 0;
    currentLineIndex.current = 0;
    linesRef.current = [];
    setDisplayedLines([]);
    setShowCaption(false);
    captionOpacity.setValue(0);
    captionSlideY.setValue(20);

    const typeChars = () => {
      if (currentSlideRef.current !== slideNumber) {
        return;
      }
      
      if (currentCharIndex.current < fullTextRef.current.length) {
        const char = fullTextRef.current[currentCharIndex.current];
        const currentLine = linesRef.current[currentLineIndex.current] || '';
        const isSpace = char === ' ';
        const isPeriod = char === '.';
        const isQuestionMark = char === '?';
        const needsPause = isPeriod || isQuestionMark;
        const maxWidth = getMaxLineWidth();
        
        let newLine = currentLine + char;
        const testWidth = measureTextWidth(newLine);
        
        if (isSpace) {
          const nextWordStart = currentCharIndex.current + 1;
          let nextWord = '';
          let nextCharIndex = nextWordStart;
          while (nextCharIndex < fullTextRef.current.length && fullTextRef.current[nextCharIndex] !== ' ') {
            nextWord += fullTextRef.current[nextCharIndex];
            nextCharIndex += 1;
          }
          
          const currentLineWithoutTrailingSpace = currentLine.trim();
          const testWidthWithNextWord = measureTextWidth(currentLineWithoutTrailingSpace + ' ' + nextWord);
          
          if (testWidthWithNextWord > maxWidth && currentLineWithoutTrailingSpace.length > 0) {
            currentLineIndex.current += 1;
            if (currentLineIndex.current >= MAX_LINES) {
              linesRef.current.shift();
              currentLineIndex.current = MAX_LINES - 1;
            }
            linesRef.current[currentLineIndex.current - 1] = currentLineWithoutTrailingSpace;
            linesRef.current[currentLineIndex.current] = '';
          } else {
            linesRef.current[currentLineIndex.current] = newLine;
          }
        } else {
          if (testWidth > maxWidth && currentLine.length > 0) {
            const lastSpaceIndex = currentLine.lastIndexOf(' ');
            if (lastSpaceIndex >= 0) {
              const textBeforeLastSpace = currentLine.substring(0, lastSpaceIndex);
              const textAfterLastSpace = currentLine.substring(lastSpaceIndex + 1) + char;
              
              currentLineIndex.current += 1;
              if (currentLineIndex.current >= MAX_LINES) {
                linesRef.current.shift();
                currentLineIndex.current = MAX_LINES - 1;
              }
              linesRef.current[currentLineIndex.current - 1] = textBeforeLastSpace;
              linesRef.current[currentLineIndex.current] = textAfterLastSpace;
            } else {
              linesRef.current[currentLineIndex.current] = newLine;
            }
          } else {
            linesRef.current[currentLineIndex.current] = newLine;
          }
        }
        
        setDisplayedLines([...linesRef.current]);
        currentCharIndex.current += 1;
        
        const delay = needsPause ? 1500 : CHAR_DELAY_MS;
        typingTimeoutRef.current = setTimeout(typeChars, delay);
      } else {
        captionTimeoutRef.current = setTimeout(() => {
          if (currentSlideRef.current !== slideNumber) {
            return;
          }
          setShowCaption(true);
          Animated.parallel([
            Animated.timing(captionOpacity, {
              toValue: 1,
              duration: 500,
              useNativeDriver: true,
            }),
            Animated.timing(captionSlideY, {
              toValue: 0,
              duration: 500,
              useNativeDriver: true,
            }),
          ]).start();
        }, FADE_DELAY_AFTER_COMPLETE);
      }
    };

    typeChars();
    
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      if (captionTimeoutRef.current) {
        clearTimeout(captionTimeoutRef.current);
        captionTimeoutRef.current = null;
      }
    };
  }, [narrative, message, slideNumber]);

  const renderNarrativeLines = () => {
    if (showCaption) return null;
    if (displayedLines.length === 0) return null;

    const visibleLines = displayedLines.slice(-MAX_LINES);

    return (
      <View style={styles.narrativeContainer}>
        {visibleLines.map((line, index) => (
          <View
            key={`line-${index}-${line.substring(0, 15)}`}
            style={[
              styles.lineContainer,
              {
                marginBottom: index < visibleLines.length - 1 ? 8 : 0,
              },
            ]}
          >
            <Text style={styles.narrativeText}>
              {line}
            </Text>
          </View>
        ))}
      </View>
    );
  };

  const renderCaption = () => {
    if (!showCaption || !message) return null;

    return (
      <Animated.View
        style={[
          styles.messageContainer,
          {
            opacity: captionOpacity,
            transform: [{ translateY: captionSlideY }],
            backgroundColor: colors.background + 'E6',
            borderColor: colors.matrix,
          },
        ]}
      >
        <Text style={[styles.messageText, { color: colors.matrix }]}>
          {message}
        </Text>
      </Animated.View>
    );
  };

  if (!narrative) {
    return null;
  }

  return (
    <>
      <View style={styles.narrativeWrapper}>
        {renderNarrativeLines()}
      </View>
      <View style={styles.captionWrapper}>
        {renderCaption()}
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  narrativeWrapper: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    zIndex: 10000,
    alignItems: 'center',
    justifyContent: 'flex-end',
    pointerEvents: 'none',
    minHeight: 60,
  },
  narrativeContainer: {
    width: SCREEN_WIDTH * 0.6,
    maxWidth: SCREEN_WIDTH * 0.6,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  lineContainer: {
    width: '100%',
  },
  narrativeText: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
    textAlign: 'center',
    color: '#4A9EFF',
    textShadowColor: '#000000',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
    includeFontPadding: false,
    backgroundColor: '#000000',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 4,
  },
  captionWrapper: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    zIndex: 10001,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  messageContainer: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  messageText: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
});
