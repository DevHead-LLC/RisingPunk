import { useState, useEffect } from 'react'
import './Level35Promotion.css'
import { FaTrophy, FaTshirt, FaCoins, FaUsers } from 'react-icons/fa'

function Level35Promotion() {
  const [timeRemaining, setTimeRemaining] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 })
  const [spotsRemaining, setSpotsRemaining] = useState(10) // 10/10 available

  // Calculate time remaining until January 31, 11:59:59 PM
  const calculateTimeRemaining = () => {
    const now = new Date()
    
    // Get January 31 of current year (month 0 = January)
    const currentYear = now.getFullYear()
    let targetDate = new Date(Date.UTC(currentYear, 0, 31, 23, 59, 59, 999))
    
    // If we've passed January 31 this year, use next year
    if (now > targetDate) {
      targetDate = new Date(Date.UTC(currentYear + 1, 0, 31, 23, 59, 59, 999))
    }
    
    // Calculate difference in milliseconds
    const diff = targetDate - now
    
    if (diff <= 0) {
      // Past the deadline
      return { days: 0, hours: 0, minutes: 0, seconds: 0 }
    }
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((diff % (1000 * 60)) / 1000)
    
    return { days, hours, minutes, seconds }
  }

  useEffect(() => {
    // Calculate initial time
    setTimeRemaining(calculateTimeRemaining())
    
    // Update every second
    const interval = setInterval(() => {
      const remaining = calculateTimeRemaining()
      setTimeRemaining(remaining)
    }, 1000)
    
    return () => clearInterval(interval)
  }, [])

  const formatTime = (value) => {
    return value.toString().padStart(2, '0')
  }

  return (
    <section className="level35-promotion">
      <div className="promotion-container">
        <div className="promotion-badge">Milestone Challenge</div>
        
        <div className="promotion-header">
          <FaTrophy className="promotion-icon" />
          <h2 className="promotion-title">Level 35 Achievement Reward</h2>
        </div>
        
        <div className="promotion-rewards">
          <div className="reward-item">
            <FaCoins className="reward-icon reward-icon-coins" />
            <div className="reward-content">
              <span className="reward-amount">$1,000,000</span>
              <span className="reward-label">In-Game Balance</span>
            </div>
          </div>
          <div className="reward-divider">+</div>
          <div className="reward-item">
            <FaTshirt className="reward-icon reward-icon-shirt" />
            <div className="reward-content">
              <span className="reward-amount">Free</span>
              <span className="reward-label">RisingPunk Shirt</span>
            </div>
          </div>
        </div>
        
        <div className="promotion-timer-wrapper">
          <div className="promotion-timer-label">
            <span>Time Remaining Until January 31</span>
          </div>
          <div className="promotion-timer">
            <div className="timer-segment">
              <div className="timer-value">{formatTime(timeRemaining.days)}</div>
              <div className="timer-label">Days</div>
            </div>
            <div className="timer-separator">:</div>
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
        
        <div className="promotion-availability">
          <div className="availability-header">
            <FaUsers className="availability-icon" />
            <span className="availability-label">Spots Available</span>
            <span className="availability-count">{spotsRemaining}/10</span>
          </div>
          <div className="availability-bar">
            <div 
              className="availability-fill" 
              style={{ width: `${(spotsRemaining / 10) * 100}%` }}
            />
          </div>
          <div className="availability-note">
            {spotsRemaining === 1 
              ? '⚡ Only 1 spot remaining!' 
              : spotsRemaining <= 3 
                ? `🔥 ${spotsRemaining} spots left - Race to level 35!` 
                : spotsRemaining <= 7
                  ? `⚡ ${spotsRemaining} spots available`
                  : 'All 10 spots available - Start your journey!'}
          </div>
        </div>
        
        <div className="promotion-requirements">
          <h3 className="requirements-title">How to Qualify</h3>
          <div className="requirements-list">
            <div className="requirement-item">
              <div className="requirement-number">1</div>
              <div className="requirement-text">Reach Level 35 in your account</div>
            </div>
            <div className="requirement-item">
              <div className="requirement-number">2</div>
              <div className="requirement-text">Be among the first 10 players to achieve this milestone</div>
            </div>
            <div className="requirement-item">
              <div className="requirement-number">3</div>
              <div className="requirement-text">
                Message <a href="mailto:support@risingpunk.com" className="support-link">support@risingpunk.com</a> with your username/handle and proof of level 35
              </div>
            </div>
          </div>
        </div>
        
        <div className="promotion-cta">
          <a 
            href="#ready-to-dominate"
            className="promotion-cta-button"
          >
            Claim Your Spot
          </a>
        </div>
        
        <div className="promotion-footer">
          <p className="promotion-disclaimer">
            Promotion ends January 31, 11:59:59 PM. First 10 players to reach Level 35 will receive both rewards.
          </p>
        </div>
      </div>
    </section>
  )
}

export default Level35Promotion
