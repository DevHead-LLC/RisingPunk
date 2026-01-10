import './Footer.css'

function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-content">
          <div className="footer-column">
            <h4 className="footer-heading">Legal</h4>
            <ul className="footer-links">
              <li><a href="/documents/privacy-policy">Privacy Policy</a></li>
              <li><a href="/documents/terms-of-service">Terms of Service</a></li>
            </ul>
          </div>
          <div className="footer-column">
            <h4 className="footer-heading">Contact</h4>
            <p className="footer-text">support@risingpunk.com</p>
            <p className="footer-text">DevHead LLC</p>
            <p className="footer-text">Phoenix, AZ</p>
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
