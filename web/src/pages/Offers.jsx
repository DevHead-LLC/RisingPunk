import Header from '../components/Header'
import Footer from '../components/Footer'
import DailyCountdownOffer from '../components/DailyCountdownOffer'
import Level35Promotion from '../components/Level35Promotion'
import FinalCTA from '../components/FinalCTA'
import './Offers.css'
import { FaArrowLeft } from 'react-icons/fa'
import { Link } from 'react-router-dom'

function Offers() {
  return (
    <>
      <Header />
      <div className="offers-page">
        <div className="offers-hero">
          <div className="container">
            <Link to="/" className="breadcrumb-link">
              <FaArrowLeft /> Home
            </Link>
            <div className="offers-hero-content">
              <div className="offers-urgency-badge">⚡ Limited Time</div>
              <h1 className="offers-title">Claim Your <span className="offers-title-accent">Exclusive Rewards</span></h1>
              <p className="offers-subtitle">Up to $1,100,000 in-game balance + exclusive merch for early players</p>
              <div className="offers-value-stack">
                <div className="value-item">
                  <span className="value-icon">💰</span>
                  <span className="value-text">$1,100,000+ Total Value</span>
                </div>
                <div className="value-item">
                  <span className="value-icon">🎁</span>
                  <span className="value-text">Free RisingPunk Shirt</span>
                </div>
                <div className="value-item">
                  <span className="value-icon">⚡</span>
                  <span className="value-text">Limited Spots Available</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <Level35Promotion />
        <DailyCountdownOffer />
        
        <FinalCTA />
      </div>
      <Footer />
    </>
  )
}

export default Offers
