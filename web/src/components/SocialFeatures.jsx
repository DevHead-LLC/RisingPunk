import './SocialFeatures.css'
import { useScrollAnimation } from '../hooks/useScrollAnimation'
import { Link } from 'react-router-dom'

function SocialFeatures() {
  const [ref, isVisible] = useScrollAnimation()
  
  return (
    <section className="social-features section">
      <div className="container">
        <div className={`social-content ${isVisible ? 'fade-in' : ''}`} ref={ref}>
          <h2 className="social-title">Play Together, Compete Together</h2>
          <p className="social-subtitle">Join forces with other players and build your empire</p>
          
          <div className="social-features-grid">
            <div className="social-feature-card">
              <h3 className="feature-card-title">Hack Crews</h3>
              <p className="feature-card-text">
                Create or join Hack Crews to team up with other players. Coordinate strategies and dominate the economy together.
              </p>
            </div>
            
            <div className="social-feature-card">
              <h3 className="feature-card-title">In-Game Chat</h3>
              <p className="feature-card-text">
                Communicate with your crew members using real-time text chat. Plan attacks, share strategies, and build your community.
              </p>
            </div>
            
            <div className="social-feature-card">
              <h3 className="feature-card-title">Player Profiles</h3>
              <p className="feature-card-text">
                View detailed profiles of other players. Check battle statistics, compare progress, and see who's dominating the economy.
              </p>
            </div>
            
            <div className="social-feature-card">
              <h3 className="feature-card-title">PvP Battles</h3>
              <p className="feature-card-text">
                Challenge other players in head-to-head combat. Test your strategy against real opponents and climb the leaderboards.
              </p>
            </div>
          </div>
          
          <div className="social-cta">
            <Link to="/features" className="features-link">
              View All Features →
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

export default SocialFeatures
