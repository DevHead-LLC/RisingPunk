import './Hero.css'
import logo from '../assets/images/RisingPunkLogo.png'
import loginImage from '../assets/images/login.png'
import { FaApple } from 'react-icons/fa'
import { SiGoogleplay } from 'react-icons/si'

function Hero() {
  return (
    <section className="hero">
      <div className="hero-container">
        <div className="hero-logo">
          <img src={logo} alt="RisingPunk Logo" className="logo-image" />
        </div>
        <div className="hero-content">
          <div className="hero-text">
            <h1 className="hero-title">
              Earn money... or be a <span className="accent">Punk?!</span>
            </h1>
            <p className="hero-subtitle">
              A competitive MMO where strategic financial thinking meets cyber warfare
            </p>
            <p className="hero-value-prop">
              One currency. No diamonds. No gems. Just strategy.
            </p>
            <div className="hero-cta">
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
