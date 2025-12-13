/**
 * FilteredText - Reusable Text component that displays filtered text
 * Use this component to display user-generated content that should be filtered
 * (e.g., usernames, messages, crew names, etc.)
 */

import React from 'react';
import { Text, TextProps } from 'react-native';
import { filterBadWords } from '../../utils/contentModeration';

export interface FilteredTextProps extends TextProps {
  /**
   * The text content to display (will be filtered)
   */
  children: React.ReactNode;
  /**
   * If true, filtering is applied. Defaults to true.
   * Set to false to disable filtering
   */
  enableFiltering?: boolean;
}

/**
 * A Text component that automatically filters bad words when displaying content.
 * Use this for displaying user-generated content like messages, usernames, etc.
 */
export const FilteredText: React.FC<FilteredTextProps> = ({
  children,
  enableFiltering = true,
  ...props
}) => {
  // Convert children to string for filtering
  const textContent = typeof children === 'string' ? children : String(children || '');
  const displayText = enableFiltering ? filterBadWords(textContent) : textContent;

  return <Text {...props}>{displayText}</Text>;
};
