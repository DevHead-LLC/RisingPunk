import { Link } from 'react-router-dom'
import { FaApple } from 'react-icons/fa'
import { SiGoogleplay } from 'react-icons/si'
import './Header.css'
import { trackDownloadClick } from '../utils/trackDownloadClick'

function Header() {
  const handleDownloadClick = (platform) => {
    trackDownloadClick(platform, 'header_download')
  }

  return (
    <header className="site-header">
      <div className="header-container">
        <Link to="/" className="header-logo-link">
          <div className="header-logo-wrapper">
            <img 
              src="/RisingPunkLogo.png" 
              alt="RisingPunk Logo" 
              className="header-logo-image"
            />
            <div className="brand-name brand-name-header">
              <span className="brand-rising">
                <span className="brand-ri">Ri</span>
                <span className="brand-dollar">$</span>
                <span className="brand-ing">ing</span>
              </span>
              <span className="brand-punk">Punk</span>
            </div>
          </div>
        </Link>
        <div className="header-download-links">
          <a 
            href="https://apps.apple.com/us/app/risingpunk/id6749834469"
            className="header-download-link"
            aria-label="Download on App Store"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => handleDownloadClick('ios')}
          >
            <FaApple className="header-download-icon" />
          </a>
          <a 
            href="https://play.google.com/store/apps/details?id=com.devheadllc.risingpunk&pcampaignid=web_share"
            className="header-download-link"
            aria-label="Download on Google Play"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => handleDownloadClick('android')}
          >
            <SiGoogleplay className="header-download-icon" />
          </a>
        </div>
      </div>
    </header>
  )
}

export default Header
