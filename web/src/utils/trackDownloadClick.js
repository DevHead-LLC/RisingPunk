/**
 * Track download button click in GA4
 * @param {string} platform - 'ios' or 'android'
 * @param {string} label - Event label to identify button location (e.g., 'hero_download', 'header_download', 'final_cta_download')
 */
export function trackDownloadClick(platform, label) {
  if (window.gtag) {
    const eventName = platform === 'ios' ? 'clicked_ios_download' : 'clicked_android_download'
    window.gtag('event', eventName, {
      event_category: 'engagement',
      event_label: label,
      value: 1
    })
  }
}
