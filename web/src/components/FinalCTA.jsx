import './FinalCTA.css'
import { useScrollAnimation } from '../hooks/useScrollAnimation'
import { useLocation } from 'react-router-dom'
import { FaApple } from 'react-icons/fa'
import { SiGoogleplay } from 'react-icons/si'

function FinalCTA() {
  const [ref, isVisible] = useScrollAnimation()
  const location = useLocation()
  const isOffersPage = location.pathname === '/offers'

  const handleDownloadClick = (platform) => {
    // Track download click in GA4
    if (window.gtag) {
      const eventName = platform === 'ios' ? 'clicked_ios_download' : 'clicked_android_download'
      window.gtag('event', eventName, {
        event_category: 'engagement',
        event_label: 'final_cta_download',
        value: 1
      })
    }
  }
  
  return (
    <section id="ready-to-dominate" className="final-cta section">
      <div className="container">
        <div className={`cta-content ${isVisible ? 'fade-in' : ''}`} ref={ref}>
          <h2 className="cta-headline">Ready to Dominate the Economy?</h2>
          <p className="cta-subheadline">Join players building their empire right now</p>
          <div className="cta-buttons">
            <a 
              href="https://apps.apple.com/us/app/risingpunk/id6749834469"
              className="cta-button cta-primary"
              aria-label="Play Now on App Store"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => handleDownloadClick('ios')}
            >
              <FaApple className="cta-icon" />
              <span>Play Now</span>
            </a>
            <a 
              href="https://play.google.com/store/apps/details?id=com.devheadllc.risingpunk&pcampaignid=web_share"
              className="cta-button cta-primary"
              aria-label="Play Now on Google Play"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => handleDownloadClick('android')}
            >
              <SiGoogleplay className="cta-icon" />
              <span>Play Now</span>
            </a>
          </div>
          {!isOffersPage && (
            <a href="/offers" className="cta-offers-link">
              Also available: Limited Time Offers
            </a>
          )}
        </div>
      </div>
    </section>
  )
}

export default FinalCTA
