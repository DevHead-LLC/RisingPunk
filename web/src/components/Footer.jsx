import './Footer.css'
import { SiFacebook, SiDiscord } from 'react-icons/si'

function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-content">
          <div className="footer-column">
            <h4 className="footer-heading">About</h4>
            <ul className="footer-links">
              <li><a href="/about">Our Story</a></li>
              <li><a href="/features">Features</a></li>
              <li><a href="/documents/privacy-policy">Privacy Policy</a></li>
              <li><a href="/documents/terms-of-service">Terms of Service</a></li>
            </ul>
          </div>
          <div className="footer-column">
            <h4 className="footer-heading">Contact</h4>
            <p className="footer-text">support@risingpunk.com</p>
            <p className="footer-text">DevHead LLC</p>
            <p className="footer-text">Phoenix, AZ</p>
            <div className="social-links">
              <a 
                href="https://www.facebook.com/profile.php?id=61583073342425"
                className="social-link"
                aria-label="Visit RisingPunk on Facebook"
                target="_blank"
                rel="noopener noreferrer"
              >
                <SiFacebook className="social-icon" />
                <span>Facebook</span>
              </a>
              <a 
                href="https://discord.gg/44vdf7yX"
                className="social-link"
                aria-label="Join RisingPunk Discord Server"
                target="_blank"
                rel="noopener noreferrer"
              >
                <SiDiscord className="social-icon" />
                <span>Discord</span>
              </a>
            </div>
          </div>
          <div className="footer-column">
            <h4 className="footer-heading">Copyright</h4>
            <p className="footer-text">© 2025 DevHead LLC</p>
            <p className="footer-text">All rights reserved</p>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
