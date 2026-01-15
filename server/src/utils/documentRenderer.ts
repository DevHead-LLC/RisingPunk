import { DOCUMENTS } from '../data/documents';

/**
 * Renders Privacy Policy as HTML for API endpoint
 */
export function renderPrivacyPolicyHTML(): string {
  const doc = DOCUMENTS.privacyPolicy;
  let html = '';

  doc.sections.forEach((section) => {
    html += `<h2>${section.title}</h2>`;
    
    // Special handling for Contact section
    if (section.title === 'Contact') {
      html += `<div class="contact-info">
                <strong>${escapeHtml(section.content || '')}</strong><br>
                ${escapeHtml(section.address || '')}
              </div>`;
      return;
    }
    
    if (section.content) {
      // Handle multi-line content with bullet points
      const lines = section.content.split('\n');
      let inList = false;
      lines.forEach((line) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('•')) {
          // Convert bullet points to list items
          if (!inList) {
            html += '<ul class="bullet-list">';
            inList = true;
          }
          html += `<li>${escapeHtml(trimmed.substring(1).trim())}</li>`;
        } else if (trimmed) {
          if (inList) {
            html += '</ul>';
            inList = false;
          }
          html += `<p>${escapeHtml(trimmed)}</p>`;
        }
      });
      if (inList) {
        html += '</ul>';
      }
    }
    
    if (section.items) {
      // Check if first item is a string to determine array type
      const firstItem = section.items[0];
      if (Array.isArray(section.items) && firstItem && typeof firstItem === 'string') {
        // Simple string array
        html += '<ul class="bullet-list">';
        (section.items as string[]).forEach((item) => {
          html += `<li>${escapeHtml(item)}</li>`;
        });
        html += '</ul>';
      } else {
        // Array of objects with label/text
        section.items.forEach((item: any) => {
          if (item && typeof item === 'object' && 'label' in item && 'text' in item) {
            html += `<p><strong>${escapeHtml(String(item.label))}</strong> – ${escapeHtml(String(item.text))}</p>`;
          } else if (typeof item === 'string') {
            html += `<p>${escapeHtml(item)}</p>`;
          }
        });
      }
    }
    
    if (section.note) {
      html += `<p>${escapeHtml(section.note)}</p>`;
    }
  });

  return html;
}

/**
 * Renders Terms of Service as HTML for API endpoint
 */
export function renderTermsOfServiceHTML(): string {
  const doc = DOCUMENTS.termsOfService;
  let html = '';

  doc.sections.forEach((section) => {
    html += `<h2>${section.title}</h2>`;
    
    // Special handling for Contact section
    if (section.title === 'Contact') {
      html += `<div class="contact-info">
                <strong>${escapeHtml(section.content || '')}</strong><br>
                ${escapeHtml(section.address || '')}
              </div>`;
      return;
    }
    
    if (section.content) {
      // Handle multi-line content with bullet points
      const lines = section.content.split('\n');
      let inList = false;
      lines.forEach((line) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('•')) {
          // Convert bullet points to list items
          if (!inList) {
            html += '<ul class="bullet-list">';
            inList = true;
          }
          html += `<li>${escapeHtml(trimmed.substring(1).trim())}</li>`;
        } else if (trimmed) {
          if (inList) {
            html += '</ul>';
            inList = false;
          }
          html += `<p>${escapeHtml(trimmed)}</p>`;
        }
      });
      if (inList) {
        html += '</ul>';
      }
    }
    
    if (section.items) {
      html += '<ul class="bullet-list">';
      section.items.forEach((item) => {
        html += `<li>${escapeHtml(item)}</li>`;
      });
      html += '</ul>';
    }
  });

  return html;
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * Get effective date for Privacy Policy
 */
export function getPrivacyPolicyEffectiveDate(): string {
  return DOCUMENTS.privacyPolicy.effectiveDate;
}

/**
 * Get effective date for Terms of Service
 */
export function getTermsOfServiceEffectiveDate(): string {
  return DOCUMENTS.termsOfService.effectiveDate;
}
