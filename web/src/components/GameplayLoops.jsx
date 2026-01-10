import './GameplayLoops.css'
import { useScrollAnimation } from '../hooks/useScrollAnimation'
import propertyImage from '../assets/images/property.png'
import battleImage from '../assets/images/battle.png'
import researchImage from '../assets/images/research.png'

function GameplayLoops() {
  const [ref, isVisible] = useScrollAnimation()
  
  const imageMap = {
    property: propertyImage,
    battle: battleImage,
    research: researchImage
  }
  
  const loops = [
    {
      id: 1,
      headline: "Build. Invest. Grow.",
      benefit: "Create passive income streams through rental properties and smart investments",
      hook: "Stability buys time. Time buys advantage.",
      visual: "property"
    },
    {
      id: 2,
      headline: "Attack. Defend. Dominate.",
      benefit: "Hack other players, build powerful bots, and defend your assets",
      hook: "Every bot costs money. Every bot can be lost forever.",
      visual: "battle"
    },
    {
      id: 3,
      headline: "Research. Specialize. Win.",
      benefit: "Unlock powerful upgrades, but choose wisely - specialization matters",
      hook: "You cannot master everything. Choose your path.",
      visual: "research"
    }
  ]

  return (
    <section className="gameplay-loops section">
      <div className="container">
        <div className={`loops-grid ${isVisible ? 'fade-in' : ''}`} ref={ref}>
          {loops.map((loop) => (
            <div key={loop.id} className="loop-card">
              <div className="loop-visual">
                <img 
                  src={imageMap[loop.visual]} 
                  alt={loop.headline}
                  className="loop-image"
                />
              </div>
              <h3 className="loop-headline">{loop.headline}</h3>
              <p className="loop-benefit">{loop.benefit}</p>
              <p className="loop-hook">{loop.hook}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default GameplayLoops
