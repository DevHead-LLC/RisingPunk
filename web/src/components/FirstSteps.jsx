import './FirstSteps.css'
import { useScrollAnimation } from '../hooks/useScrollAnimation'

function FirstSteps() {
  const [ref, isVisible] = useScrollAnimation()
  
  const steps = [
    {
      id: 1,
      time: '30 seconds',
      title: 'Create Your Account',
      description: 'Quick sign-up, no barriers',
      icon: '👤'
    },
    {
      id: 2,
      time: '2 minutes',
      title: 'Build Bots & Free Your Hack Rig',
      description: 'Assemble your first hacking bots and unlock your hack rig to start attacking and defending',
      icon: '⚔️'
    },
    {
      id: 3,
      time: '1 minute',
      title: 'Assess Your Path & View Financials',
      description: 'Review your financial statements, complete guided tasks, and explore your turf to plan your strategy',
      icon: '📊'
    },
    {
      id: 4,
      time: 'instant',
      title: 'See Your Actions Take Effect',
      description: 'Watch your bots in action, see resources flow, and experience the immediate impact of your decisions',
      icon: '⚡'
    },
    {
      id: 5,
      time: 'your choice',
      title: 'Choose Your Strategy',
      description: 'Focus on leveling up to earn $100k for your first property, or dominate through strategic attacks and bot warfare',
      icon: '🎯'
    }
  ]

  return (
    <section className="first-steps section">
      <div className="container">
        <div className={`first-steps-content ${isVisible ? 'fade-in' : ''}`} ref={ref}>
          <h2 className="first-steps-title">What to Expect in Your First 5 Minutes</h2>
          <div className="steps-list">
            {steps.map((step) => (
              <div key={step.id} className="step-item">
                <div className="step-header">
                  <span className="step-icon">{step.icon}</span>
                  <div className="step-info">
                    <div className="step-time">{step.time}</div>
                    <h3 className="step-title">{step.title}</h3>
                  </div>
                </div>
                <p className="step-description">{step.description}</p>
              </div>
            ))}
          </div>
          <p className="first-steps-cta">Start building your hacker empire in under 5 minutes.</p>
        </div>
      </div>
    </section>
  )
}

export default FirstSteps
