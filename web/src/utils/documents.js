/**
 * Document utilities for web application
 * Imports from shared documents source
 */

// For now, we'll fetch from the API to ensure consistency
// In the future, we could import directly from shared/documents.ts if we set up a monorepo structure

export async function getPrivacyPolicy() {
  try {
    const response = await fetch('/api/documents/privacy-policy');
    const html = await response.text();
    return html;
  } catch (error) {
    console.error('Error fetching privacy policy:', error);
    return null;
  }
}

export async function getTermsOfService() {
  try {
    const response = await fetch('/api/documents/terms-of-service');
    const html = await response.text();
    return html;
  } catch (error) {
    console.error('Error fetching terms of service:', error);
    return null;
  }
}

// For React components, we'll use the document data directly
// Import from shared location (adjust path as needed for your setup)
export const DOCUMENTS_DATA = {
  privacyPolicy: {
    effectiveDate: 'January 15, 2026',
    // We'll fetch from API or use static data
  },
  termsOfService: {
    effectiveDate: 'January 15, 2026',
  }
};
