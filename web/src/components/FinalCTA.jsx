import './FinalCTA.css'
import { useScrollAnimation } from '../hooks/useScrollAnimation'
import { FaApple } from 'react-icons/fa'
import { SiGoogleplay } from 'react-icons/si'

function FinalCTA() {
  const [ref, isVisible] = useScrollAnimation()
  
  return (
    <section id="ready-to-dominate" className="final-cta section">
      <div className="container">
        <div className={`cta-content ${isVisible ? 'fade-in' : ''}`} ref={ref}>
          <h2 className="cta-headline">Ready to Dominate the Economy?</h2>
          <p className="cta-subheadline">Join players building their empire right now</p>
          <div className="cta-buttons">
            <a 
              href="https://apps.apple.com/us/app/risingpunk/id6749834469"
              className="cta-button cta-app-store"
              aria-label="Download on App Store"
              target="_blank"
              rel="noopener noreferrer"
            >
              <FaApple className="cta-icon" />
              <span>Download on App Store</span>
            </a>
            <a 
              href="https://play.google.com/store/apps/details?id=com.devheadllc.risingpunk&pcampaignid=web_share"
              className="cta-button cta-google-play"
              aria-label="Get it on Google Play"
              target="_blank"
              rel="noopener noreferrer"
            >
              <SiGoogleplay className="cta-icon" />
              <span>Get it on Google Play</span>
            </a>
          </div>
          <div className="trust-signals">
            <p className="trust-text">Free to play</p>
          </div>
        </div>
      </div>
    </section>
  )
}

export default FinalCTA
