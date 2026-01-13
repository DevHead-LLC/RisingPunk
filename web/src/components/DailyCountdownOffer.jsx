import { useState, useEffect } from 'react'
import './DailyCountdownOffer.css'
import { FaClock, FaGift, FaCheckCircle, FaDownload, FaUserPlus, FaEnvelope } from 'react-icons/fa'

function DailyCountdownOffer() {
  const [timeRemaining, setTimeRemaining] = useState({ hours: 0, minutes: 0, seconds: 0 })
  // Spots remaining - resets to 3 daily at midnight UTC
  // To manually decrement when sign-ups occur, update the initial value here or modify the reset logic
  const [spotsRemaining, setSpotsRemaining] = useState(3) // Start with 3/5 remaining

  // Calculate time remaining until midnight UTC
  const calculateTimeRemaining = () => {
    const now = new Date()
    
    // Get current UTC time components
    const currentYear = now.getUTCFullYear()
    const currentMonth = now.getUTCMonth()
    const currentDate = now.getUTCDate()
    const currentHours = now.getUTCHours()
    const currentMinutes = now.getUTCMinutes()
    const currentSeconds = now.getUTCSeconds()
    const currentMilliseconds = now.getUTCMilliseconds()
    
    // Get today's midnight UTC (start of current day in UTC)
    const todayMidnightUTC = new Date(Date.UTC(
      currentYear,
      currentMonth,
      currentDate,
      0, 0, 0, 0
    ))
    
    // Get tomorrow's midnight UTC (end of today, start of tomorrow)
    const tomorrowMidnightUTC = new Date(Date.UTC(
      currentYear,
      currentMonth,
      currentDate + 1,
      0, 0, 0, 0
    ))
    
    // Calculate difference in milliseconds
    const diff = tomorrowMidnightUTC - now
    
    if (diff <= 0) {
      // Shouldn't happen, but fallback
      return { hours: 23, minutes: 59, seconds: 59 }
    }
    
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((diff % (1000 * 60)) / 1000)
    
    return { hours, minutes, seconds }
  }

  useEffect(() => {
    let lastResetDate = null
    
    // Calculate initial time and check if we need to reset
    const updateTimer = () => {
      const now = new Date()
      // Get current UTC date as YYYY-MM-DD string
      const currentDate = now.toISOString().split('T')[0]
      
      // Reset spots when date changes (at midnight UTC)
      if (lastResetDate !== currentDate) {
        lastResetDate = currentDate
        setSpotsRemaining(3)
      }
      
      const remaining = calculateTimeRemaining()
      setTimeRemaining(remaining)
    }
    
    // Initial calculation
    updateTimer()
    
    // Update every second
    const interval = setInterval(updateTimer, 1000)
    
    return () => clearInterval(interval)
  }, [])

  const formatTime = (value) => {
    return value.toString().padStart(2, '0')
  }

  return (
    <section className="daily-countdown-offer">
      <div className="countdown-container">
        <div className="countdown-badge">Limited Time Offer</div>
        
        <div className="countdown-header">
          <FaGift className="countdown-icon" />
          <h2 className="countdown-title">Early Adopter Package</h2>
        </div>
        
        <div className="countdown-reward">
          <span className="reward-amount">$100,000</span>
          <span className="reward-label">In-Game Balance</span>
        </div>
        
        <div className="countdown-timer-wrapper">
          <div className="countdown-label">
            <FaClock className="timer-icon" />
            <span>Time Remaining Today</span>
          </div>
          <div className="countdown-timer">
            <div className="timer-segment">
              <div className="timer-value">{formatTime(timeRemaining.hours)}</div>
              <div className="timer-label">Hours</div>
            </div>
            <div className="timer-separator">:</div>
            <div className="timer-segment">
              <div className="timer-value">{formatTime(timeRemaining.minutes)}</div>
              <div className="timer-label">Minutes</div>
            </div>
            <div className="timer-separator">:</div>
            <div className="timer-segment">
              <div className="timer-value">{formatTime(timeRemaining.seconds)}</div>
              <div className="timer-label">Seconds</div>
            </div>
          </div>
        </div>
        
        <div className="countdown-availability">
          <div className="availability-header">
            <span className="availability-label">Spots Remaining</span>
            <span className="availability-count">{spotsRemaining}/5</span>
          </div>
          <div className="availability-bar">
            <div 
              className="availability-fill" 
              style={{ width: `${(spotsRemaining / 5) * 100}%` }}
            />
          </div>
          <div className="availability-note">
            {spotsRemaining === 1 
              ? '⚠️ Only 1 spot left!' 
              : spotsRemaining <= 3 
                ? `⚡ ${spotsRemaining} spots available - Act fast!` 
                : 'Limited availability'}
          </div>
        </div>
        
        <div className="countdown-steps">
          <h3 className="steps-title">How to Claim Your Reward</h3>
          <div className="steps-list">
            <div className="step-item">
              <div className="step-icon-wrapper">
                <FaDownload className="step-icon" />
              </div>
              <div className="step-content">
                <div className="step-number">1</div>
                <div className="step-text">Download the app</div>
              </div>
            </div>
            <div className="step-item">
              <div className="step-icon-wrapper">
                <FaUserPlus className="step-icon" />
              </div>
              <div className="step-content">
                <div className="step-number">2</div>
                <div className="step-text">Create your account</div>
              </div>
            </div>
            <div className="step-item">
              <div className="step-icon-wrapper">
                <FaEnvelope className="step-icon" />
              </div>
              <div className="step-content">
                <div className="step-number">3</div>
                <div className="step-text">
                  Message <a href="mailto:support@risingpunk.com" className="support-link">support@risingpunk.com</a> with your username/handle
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="countdown-cta">
          <a 
            href="#ready-to-dominate"
            className="countdown-cta-button-single"
          >
            Claim Your Spot
          </a>
        </div>
        
        <div className="countdown-footer">
          <p className="countdown-disclaimer">
            Offer resets daily at 12:00 AM UTC. First 5 eligible sign-ups each day receive the Early Adopter Package.
          </p>
        </div>
      </div>
    </section>
  )
}

export default DailyCountdownOffer
