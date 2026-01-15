import './Hero.css'
import loginImage from '../assets/images/login.png'
import { FaApple } from 'react-icons/fa'
import { SiGoogleplay } from 'react-icons/si'

function Hero() {
  return (
    <section className="hero">
      <div className="hero-container">
        <div className="hero-content">
          <div className="hero-text">
            <h1 className="hero-title">
              Outsmart. Outinvest. <span className="accent">Outplay.</span>
            </h1>
            <p className="hero-subtitle">
              The only MMO where financial strategy beats spending. Build wealth, defend it, dominate.
            </p>
            <div className="hero-trust-signals">
              <span className="trust-badge">✓ Hack. Build. Dominate.</span>
              <span className="trust-badge">✓ Strategic Warfare</span>
              <span className="trust-badge">✓ Financial Mastery</span>
              <span className="trust-badge">✓ Fair Competition</span>
            </div>
            <div className="hero-cta">
              <a 
                href="https://apps.apple.com/us/app/risingpunk/id6749834469"
                className="cta-button cta-primary"
                aria-label="Start Playing on App Store"
                target="_blank"
                rel="noopener noreferrer"
              >
                <FaApple className="cta-icon" />
                <span>Start Playing</span>
              </a>
              <a 
                href="https://play.google.com/store/apps/details?id=com.devheadllc.risingpunk&pcampaignid=web_share"
                className="cta-button cta-primary"
                aria-label="Start Playing on Google Play"
                target="_blank"
                rel="noopener noreferrer"
              >
                <SiGoogleplay className="cta-icon" />
                <span>Start Playing</span>
              </a>
            </div>
            <a href="/offers" className="hero-offers-link">
              Want exclusive rewards? View Offers →
            </a>
          </div>
          <div className="hero-visual">
            <div className="hero-image-wrapper">
              <img 
                src={loginImage} 
                alt="RisingPunk gameplay preview" 
                className="hero-gameplay-image"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Hero
