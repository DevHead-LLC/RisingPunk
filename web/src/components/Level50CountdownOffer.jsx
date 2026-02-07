import { useState, useEffect } from 'react'
import './Level50CountdownOffer.css'
import { FaClock, FaTshirt, FaCoins } from 'react-icons/fa'

const DEADLINE = new Date(Date.UTC(2026, 2, 31, 23, 59, 59, 999)) // March 31, 2026 end of day UTC

function Level50CountdownOffer() {
  const [timeRemaining, setTimeRemaining] = useState(null)
  const [ended, setEnded] = useState(false)

  useEffect(() => {
    const calculate = () => {
      const now = new Date()
      const diff = DEADLINE - now
      if (diff <= 0) {
        setEnded(true)
        setTimeRemaining(null)
        return
      }
      setTimeRemaining({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      })
    }
    calculate()
    const interval = setInterval(calculate, 1000)
    return () => clearInterval(interval)
  }, [])

  const format = (n) => String(n).padStart(2, '0')

  if (ended) {
    return (
      <section className="level50-offer level50-offer--ended">
        <div className="level50-container">
          <div className="level50-ended-badge">Event Ended</div>
          <h2 className="level50-ended-title">Level 50 Challenge has ended</h2>
          <p className="level50-ended-text">
            Thanks for playing. If you reached Level 50 by March 31, 2026, contact{' '}
            <a href="mailto:support@risingpunk.com" className="level50-support-link">support@risingpunk.com</a> with your account handle to claim your prize.
          </p>
        </div>
      </section>
    )
  }

  return (
    <section className="level50-offer">
      <div className="level50-container">
        <div className="level50-badge">Limited Time</div>
        <h2 className="level50-title">Reach Level 50 by March 31, 2026</h2>
        <p className="level50-subtitle">Custom shirt + $2,000,000 in-game balance. Must be 18+ to claim.</p>

        <div className="level50-rewards">
          <div className="level50-reward-item">
            <FaTshirt className="level50-reward-icon" />
            <span>Custom Shirt</span>
          </div>
          <div className="level50-reward-item">
            <FaCoins className="level50-reward-icon" />
            <span>$2,000,000 In-Game Balance</span>
          </div>
        </div>

        <div className="level50-timer-wrap">
          <div className="level50-timer-label">
            <FaClock className="level50-timer-icon" />
            <span>Time left to reach Level 50</span>
          </div>
          {timeRemaining && (
            <div className="level50-timer">
              <div className="level50-timer-seg">
                <div className="level50-timer-val">{format(timeRemaining.days)}</div>
                <div className="level50-timer-lbl">Days</div>
              </div>
              <div className="level50-timer-sep">:</div>
              <div className="level50-timer-seg">
                <div className="level50-timer-val">{format(timeRemaining.hours)}</div>
                <div className="level50-timer-lbl">Hours</div>
              </div>
              <div className="level50-timer-sep">:</div>
              <div className="level50-timer-seg">
                <div className="level50-timer-val">{format(timeRemaining.minutes)}</div>
                <div className="level50-timer-lbl">Min</div>
              </div>
              <div className="level50-timer-sep">:</div>
              <div className="level50-timer-seg">
                <div className="level50-timer-val">{format(timeRemaining.seconds)}</div>
                <div className="level50-timer-lbl">Sec</div>
              </div>
            </div>
          )}
        </div>

        <div className="level50-steps">
          <h3 className="level50-steps-title">How to claim</h3>
          <ol className="level50-steps-list">
            <li>Reach Level 50 in the app by March 31, 2026.</li>
            <li>You must be 18 or older to claim prizes.</li>
            <li>Email <a href="mailto:support@risingpunk.com" className="level50-support-link">support@risingpunk.com</a> with your account handle/username to claim your custom shirt and in-game balance.</li>
          </ol>
        </div>

        <div className="level50-cta">
          <a href="#ready-to-dominate" className="level50-cta-btn">Get the app & start leveling</a>
        </div>

        <p className="level50-disclaimer">Offer ends March 31, 2026 at 11:59 PM UTC. Prizes subject to eligibility. Contact support with your username to claim.</p>
      </div>
    </section>
  )
}

export default Level50CountdownOffer
