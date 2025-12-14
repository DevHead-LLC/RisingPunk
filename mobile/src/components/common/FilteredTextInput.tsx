/**
 * FilteredTextInput - Reusable TextInput component that automatically filters bad words
 * This component wraps React Native's TextInput and applies content moderation
 * in real-time as the user types, providing immediate visual feedback.
 */

import React, { useCallback } from 'react';
import { TextInput, TextInputProps } from 'react-native';
import { filterBadWords } from '../../utils/contentModeration';

export interface FilteredTextInputProps extends TextInputProps {
  /**
   * If true, filtering is applied. Defaults to true.
   * Set to false to disable filtering (useful for passwords, etc.)
   */
  enableFiltering?: boolean;
}

/**
 * A TextInput component that automatically filters bad words in real-time.
 * The filtering happens on the onChangeText callback, so users see asterisks
 * immediately as they type offensive words.
 */
export const FilteredTextInput = React.forwardRef<TextInput, FilteredTextInputProps>(
  ({ onChangeText, enableFiltering = true, ...props }, ref) => {
    const handleChangeText = useCallback(
      (text: string) => {
        if (onChangeText) {
          if (enableFiltering) {
            const filtered = filterBadWords(text);
            onChangeText(filtered);
          } else {
            onChangeText(text);
          }
        }
      },
      [onChangeText, enableFiltering]
    );

    return <TextInput ref={ref} {...props} onChangeText={handleChangeText} />;
  }
);

FilteredTextInput.displayName = 'FilteredTextInput';
