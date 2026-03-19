/**
 * React Native renderers for Privacy Policy and Terms of Service
 * Uses shared document data structure
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SIZING } from '../styles/theme';
import { DOCUMENTS } from '../../../shared/documents';

/**
 * Renders Privacy Policy sections as React Native elements
 */
export function renderPrivacyPolicySections(colors: any) {
  const doc = DOCUMENTS.privacyPolicy;
  
  return doc.sections.map((section, index) => {
    if (section.title === 'Contact') {
      return (
        <View key={index} style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
            {section.title}
          </Text>
          <View style={[styles.contactInfo, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '33' }]}>
            <Text style={[styles.contactText, { color: colors.text.primary }]}>
              {section.content}
            </Text>
            <Text style={[styles.contactEmail, { color: colors.primary }]}>
              {section.address}
            </Text>
          </View>
        </View>
      );
    }

    // Process content with bullet points
    const contentElements: React.ReactNode[] = [];
    if (section.content) {
      const lines = section.content.split('\n');
      let currentList: string[] = [];
      
      lines.forEach((line, lineIndex) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('•')) {
          currentList.push(trimmed.substring(1).trim());
        } else if (trimmed) {
          if (currentList.length > 0) {
            contentElements.push(
              <View key={`list-${lineIndex}`} style={styles.bulletList}>
                {currentList.map((item, i) => (
                  <Text key={i} style={[styles.bulletItem, { color: colors.text.secondary }]}>
                    • {item}
                  </Text>
                ))}
              </View>
            );
            currentList = [];
          }
          contentElements.push(
            <Text key={lineIndex} style={[styles.paragraph, { color: colors.text.secondary }]}>
              {trimmed}
            </Text>
          );
        }
      });
      
      if (currentList.length > 0) {
        contentElements.push(
          <View key="list-final" style={styles.bulletList}>
            {currentList.map((item, i) => (
              <Text key={i} style={[styles.bulletItem, { color: colors.text.secondary }]}>
                • {item}
              </Text>
            ))}
          </View>
        );
      }
    }

    return (
      <View key={index} style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
          {section.title}
        </Text>
        {contentElements.length > 0 && <View>{contentElements}</View>}
        {section.items && (
          <>
            {Array.isArray(section.items) && typeof section.items[0] === 'string' ? (
              <View style={styles.bulletList}>
                {(section.items as string[]).map((item, itemIndex) => {
                  if (typeof item === 'string') {
                    return (
                      <Text key={itemIndex} style={[styles.bulletItem, { color: colors.text.secondary }]}>
                        • {item}
                      </Text>
                    );
                  }
                  return null;
                })}
              </View>
            ) : (
              section.items.map((item: any, itemIndex: number) => {
                if (item.label && item.text) {
                  return (
                    <Text key={itemIndex} style={[styles.paragraph, { color: colors.text.secondary }]}>
                      <Text style={styles.boldText}>{item.label}</Text> – {item.text}
                    </Text>
                  );
                }
                return null;
              })
            )}
          </>
        )}
        {section.note && (
          <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
            {section.note}
          </Text>
        )}
      </View>
    );
  });
}

/**
 * Renders Terms of Service sections as React Native elements
 */
export function renderTermsOfServiceSections(colors: any) {
  const doc = DOCUMENTS.termsOfService;
  
  return doc.sections.map((section: { title: string; content?: string; address?: string; items?: string[]; note?: string }, index) => {
    if (section.title === 'Contact') {
      return (
        <View key={index} style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
            {section.title}
          </Text>
          <View style={[styles.contactInfo, { backgroundColor: colors.matrix + '1A', borderColor: colors.matrix }]}>
            <Text style={[styles.contactText, { color: colors.text.primary }]}>
              <Text style={styles.boldText}>{section.content}</Text>
            </Text>
            <Text style={[styles.contactText, { color: colors.text.secondary }]}>
              {section.address}
            </Text>
          </View>
        </View>
      );
    }

    // Process content with bullet points
    const contentElements: React.ReactNode[] = [];
    if (section.content) {
      const lines = section.content.split('\n');
      let currentList: string[] = [];
      
      lines.forEach((line, lineIndex) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('•')) {
          currentList.push(trimmed.substring(1).trim());
        } else if (trimmed) {
          if (currentList.length > 0) {
            contentElements.push(
              <View key={`list-${lineIndex}`} style={styles.bulletList}>
                {currentList.map((item, i) => (
                  <Text key={i} style={[styles.bulletItem, { color: colors.text.secondary }]}>
                    • {item}
                  </Text>
                ))}
              </View>
            );
            currentList = [];
          }
          contentElements.push(
            <Text key={lineIndex} style={[styles.paragraph, { color: colors.text.secondary }]}>
              {trimmed}
            </Text>
          );
        }
      });
      
      if (currentList.length > 0) {
        contentElements.push(
          <View key="list-final" style={styles.bulletList}>
            {currentList.map((item, i) => (
              <Text key={i} style={[styles.bulletItem, { color: colors.text.secondary }]}>
                • {item}
              </Text>
            ))}
          </View>
        );
      }
    }

    return (
      <View key={index} style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
          {section.title}
        </Text>
        {contentElements.length > 0 && <View>{contentElements}</View>}
        {section.items && (
          <View style={styles.bulletList}>
            {section.items.map((item, itemIndex) => (
              <Text key={itemIndex} style={[styles.bulletItem, { color: colors.text.secondary }]}>
                • {item}
              </Text>
            ))}
          </View>
        )}
        {section.note && (
          <Text style={[styles.paragraph, { color: colors.text.secondary }]}>
            {section.note}
          </Text>
        )}
      </View>
    );
  });
}

export function getPrivacyPolicyEffectiveDate(): string {
  return DOCUMENTS.privacyPolicy.effectiveDate;
}

export function getTermsOfServiceEffectiveDate(): string {
  return DOCUMENTS.termsOfService.effectiveDate;
}

const styles = StyleSheet.create({
  section: {
    marginBottom: SIZING.spacing.lg,
  },
  sectionTitle: {
    fontSize: SIZING.font.h2,
    fontWeight: 'bold',
    marginBottom: SIZING.spacing.sm,
  },
  paragraph: {
    fontSize: SIZING.font.body,
    lineHeight: SIZING.font.body + 4,
    marginBottom: SIZING.spacing.sm,
  },
  bulletList: {
    marginLeft: SIZING.spacing.sm,
  },
  bulletItem: {
    fontSize: SIZING.font.body,
    lineHeight: SIZING.font.body + 4,
    marginBottom: SIZING.spacing.xs,
  },
  contactInfo: {
    padding: SIZING.spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  contactText: {
    fontSize: SIZING.font.body,
    fontWeight: '600',
    marginBottom: SIZING.spacing.xs,
    textAlign: 'center',
  },
  contactEmail: {
    fontSize: SIZING.font.body,
    fontWeight: '600',
  },
  boldText: {
    fontWeight: 'bold',
  },
});
