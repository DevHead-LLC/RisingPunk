import './WhyRisingPunk.css'
import { useScrollAnimation } from '../hooks/useScrollAnimation'

function WhyRisingPunk() {
  const [ref, isVisible] = useScrollAnimation()
  
  const differentiators = [
    {
      id: 1,
      icon: '⚔️',
      title: 'Hacker Warfare & Bot Battles',
      description: 'Build powerful hacking bots, infiltrate networks, and wage cyber warfare in strategic player-vs-player battles.',
      accent: 'pink',
      isFeatured: true
    },
    {
      id: 2,
      icon: '💰',
      title: 'Financial Empire Strategy',
      description: 'Build wealth through smart investments and passive income. Become a tycoon and master real financial concepts as you play.',
      accent: 'green'
    },
    {
      id: 3,
      icon: '🎯',
      title: 'Strategic Depth & Risk',
      description: 'Every decision matters. Protect your assets or lose them to skilled hackers. Strategy beats shortcuts.',
      accent: 'blue'
    },
    {
      id: 4,
      icon: '📊',
      title: 'Learn Real Skills',
      description: 'Master income statements, balance sheets, and investment strategies that apply to your real life.',
      accent: 'pink'
    },
    {
      id: 5,
      icon: '👥',
      iconSecondary: '💬',
      title: 'Hack Crews',
      description: 'Create or join Hack Crews to team up with other players. Coordinate strategies and dominate the economy together using real-time in-game chat.',
      accent: 'blue'
    },
    {
      id: 6,
      icon: '⚡',
      title: 'PvP Battles',
      description: 'Challenge other players in head-to-head combat. Test your strategy against real opponents and climb the leaderboards.',
      accent: 'pink'
    }
  ]

  return (
    <section className="why-risingpunk section">
      <div className="container">
        <div className={`why-content ${isVisible ? 'fade-in' : ''}`} ref={ref}>
          <h2 className="why-title">Why RisingPunk?</h2>
          <div className="why-grid">
            {differentiators.map((item) => (
              <div key={item.id} className={`why-card why-card-${item.accent} ${item.isFeatured ? 'why-card-featured' : ''}`}>
                <div className="why-icon">
                  {item.icon}
                  {item.iconSecondary && <span className="why-icon-secondary">{item.iconSecondary}</span>}
                </div>
                <h3 className="why-card-title">{item.title}</h3>
                <p className="why-card-description">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

export default WhyRisingPunk
