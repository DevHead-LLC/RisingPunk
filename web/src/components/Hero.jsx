import './Hero.css'
import { FaApple } from 'react-icons/fa'
import { SiGoogleplay } from 'react-icons/si'
import { trackDownloadClick } from '../utils/trackDownloadClick'
import { useState, useEffect } from 'react'

// Import all circle animation images
import risingPunkLogo from '../assets/circle-animation/RisingPunkLogo.png'
import navigationIcon from '../assets/circle-animation/navigationIcon.png'
import profile from '../assets/circle-animation/profile.png'
import profileFemale from '../assets/circle-animation/profile-female.png'
import activatedShield from '../assets/circle-animation/activatedShield.png'
import hackCrewActive from '../assets/circle-animation/hackCrewActive.png'
import slide1 from '../assets/circle-animation/slide1.png'
import slide2 from '../assets/circle-animation/slide2.png'
import slide3 from '../assets/circle-animation/slide3.png'
import slide4 from '../assets/circle-animation/slide4.png'
import slide5 from '../assets/circle-animation/slide5.png'
import slide6 from '../assets/circle-animation/slide6.png'
import slide7 from '../assets/circle-animation/slide7.png'
import slide8 from '../assets/circle-animation/slide8.png'
import slide9 from '../assets/circle-animation/slide9.png'
import slide10 from '../assets/circle-animation/slide10.png'
import slide11 from '../assets/circle-animation/slide11.png'
import slide12 from '../assets/circle-animation/slide12.png'
import slide13 from '../assets/circle-animation/slide13.png'
import slide14 from '../assets/circle-animation/slide14.png'

const CIRCLE_IMAGES = [
  risingPunkLogo,
  navigationIcon,
  profile,
  profileFemale,
  activatedShield,
  hackCrewActive,
  slide1,
  slide2,
  slide3,
  slide4,
  slide5,
  slide6,
  slide7,
  slide8,
  slide9,
  slide10,
  slide11,
  slide12,
  slide13,
  slide14,
]

function Hero() {
  // Create a randomly shuffled array of image indices once at mount
  const [shuffledIndices] = useState(() => {
    const indices = Array.from({ length: CIRCLE_IMAGES.length }, (_, i) => i)
    // Fisher-Yates shuffle
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]]
    }
    return indices
  })

  // Track which position in the shuffled array each orbiting element is using
  // Each starts at a different offset (0, 1, 2, 3) but will cycle through the entire array
  const [arrayPositions, setArrayPositions] = useState([0, 1, 2, 3])

  useEffect(() => {
    // Animation duration is 12 seconds (from CSS)
    const ANIMATION_DURATION = 12000
    
    // Animation delays from CSS: 0s, -3s, -6s, -9s
    // So each element completes its first cycle at: 12s, 9s, 6s, 3s respectively
    const initialDelays = [12000, 9000, 6000, 3000]
    
    const timeouts = []
    const intervals = []
    
    // Set up initial timeouts to sync with when each element completes its first cycle
    for (let i = 0; i < 4; i++) {
      const initialTimeout = setTimeout(() => {
        // First update when this element completes its first cycle
        setArrayPositions(prev => {
          const newPositions = [...prev]
          // Increment position in shuffled array, wrapping to 0 when reaching the end
          newPositions[i] = (prev[i] + 1) % shuffledIndices.length
          return newPositions
        })
        
        // Then set up interval for subsequent cycles
        const interval = setInterval(() => {
          setArrayPositions(prev => {
            const newPositions = [...prev]
            // Move to next position in shuffled array sequentially, wrapping around
            newPositions[i] = (prev[i] + 1) % shuffledIndices.length
            return newPositions
          })
        }, ANIMATION_DURATION)
        
        intervals.push(interval)
      }, initialDelays[i])
      
      timeouts.push(initialTimeout)
    }

    return () => {
      timeouts.forEach(timeout => clearTimeout(timeout))
      intervals.forEach(interval => clearInterval(interval))
    }
  }, [shuffledIndices.length])

  const handleDownloadClick = (platform) => {
    trackDownloadClick(platform, 'hero_download')
  }

  return (
    <section className="hero">
      <div className="hero-container">
        <div className="hero-content">
          <div className="hero-text">
            <div className="hero-free-badge">100% Free to Play</div>
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
                onClick={() => handleDownloadClick('ios')}
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
                onClick={() => handleDownloadClick('android')}
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
            <div className="hero-visual-content">
              <div className="visual-grid"></div>
              <div className="visual-elements">
                <img 
                  src={CIRCLE_IMAGES[shuffledIndices[arrayPositions[0]]]} 
                  alt="" 
                  className="visual-element visual-element-1"
                />
                <img 
                  src={CIRCLE_IMAGES[shuffledIndices[arrayPositions[1]]]} 
                  alt="" 
                  className="visual-element visual-element-2"
                />
                <img 
                  src={CIRCLE_IMAGES[shuffledIndices[arrayPositions[2]]]} 
                  alt="" 
                  className="visual-element visual-element-3"
                />
                <img 
                  src={CIRCLE_IMAGES[shuffledIndices[arrayPositions[3]]]} 
                  alt="" 
                  className="visual-element visual-element-4"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Hero
