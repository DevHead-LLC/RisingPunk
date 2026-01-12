import { Link } from 'react-router-dom'
import './Header.css'

function Header() {
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
      </div>
    </header>
  )
}

export default Header
