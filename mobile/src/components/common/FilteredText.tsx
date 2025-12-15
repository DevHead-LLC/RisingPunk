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
 * Recursively converts React children to a string without adding commas
 * Handles strings, numbers, arrays, and nested structures
 */
function childrenToString(children: React.ReactNode): string {
  if (children == null) {
    return '';
  }
  
  // Handle boolean values - React treats false, true, null, undefined as rendering nothing
  if (typeof children === 'boolean') {
    return '';
  }
  
  if (typeof children === 'string') {
    return children;
  }
  
  if (typeof children === 'number') {
    return String(children);
  }
  
  if (Array.isArray(children)) {
    // Join array elements without commas - just concatenate them
    return children.map(child => childrenToString(child)).join('');
  }
  
  // For React elements or other objects, try to extract text content
  // This handles cases like <Text>Hello</Text> or other React elements
  if (typeof children === 'object' && 'props' in children && children.props) {
    return childrenToString(children.props.children);
  }
  
  // Fallback to string conversion for other types
  return String(children);
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
  // Convert children to string for filtering (handles arrays correctly)
  const textContent = childrenToString(children);
  const displayText = enableFiltering ? filterBadWords(textContent) : textContent;

  return <Text {...props}>{displayText}</Text>;
};
