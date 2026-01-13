import Hero from '../components/Hero'
import DailyCountdownOffer from '../components/DailyCountdownOffer'
import GameplayLoops from '../components/GameplayLoops'
import SocialFeatures from '../components/SocialFeatures'
import GameplayVideo from '../components/GameplayVideo'
import Level35Promotion from '../components/Level35Promotion'
import FinalCTA from '../components/FinalCTA'
import Footer from '../components/Footer'

function Home() {
  return (
    <>
      <Hero />
      <GameplayLoops />
      <SocialFeatures />
      <DailyCountdownOffer />
      <GameplayVideo />
      <Level35Promotion />
      <FinalCTA />
      <Footer />
    </>
  )
}

export default Home
