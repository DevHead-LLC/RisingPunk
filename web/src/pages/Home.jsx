import Header from '../components/Header'
import Hero from '../components/Hero'
import MailchimpSignup from '../components/MailchimpSignup'
import WhyRisingPunk from '../components/WhyRisingPunk'
import FirstSteps from '../components/FirstSteps'
import GameplayVideo from '../components/GameplayVideo'
import FinalCTA from '../components/FinalCTA'
import Footer from '../components/Footer'

function Home() {
  return (
    <>
      <Header />
      <Hero />
      <WhyRisingPunk />
      <MailchimpSignup />
      <FirstSteps />
      <GameplayVideo />
      <FinalCTA />
      <Footer />
    </>
  )
}

export default Home
