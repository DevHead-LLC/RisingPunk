import Header from '../components/Header'
import Footer from '../components/Footer'
import Level50CountdownOffer from '../components/Level50CountdownOffer'
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
              <p className="offers-subtitle">Reach Level 50 by March 31, 2026 for a custom shirt + $2,000,000 in-game balance. Must be 18+ to claim.</p>
              <div className="offers-value-stack">
                <div className="value-item">
                  <span className="value-icon">💰</span>
                  <span className="value-text">$2,000,000 In-Game Balance</span>
                </div>
                <div className="value-item">
                  <span className="value-icon">🎁</span>
                  <span className="value-text">Custom RisingPunk Shirt</span>
                </div>
                <div className="value-item">
                  <span className="value-icon">⚡</span>
                  <span className="value-text">Level 50 by March 31, 2026</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <Level50CountdownOffer />

        <FinalCTA />
      </div>
      <Footer />
    </>
  )
}

export default Offers
