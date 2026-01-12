import Header from '../components/Header'
import Footer from '../components/Footer'
import './Features.css'

function Features() {
  return (
    <>
      <Header />
      <div className="features-page">
        <div className="container">
          <div className="features-header">
            <h1>RisingPunk Features</h1>
            <p className="features-intro">
              A comprehensive guide to everything you can do in RisingPunk
            </p>
          </div>

          <section className="feature-section">
            <h2 className="section-title">Account and Access</h2>
            <ul className="features-list">
              <li>Create an account using any email and password</li>
              <li>Log in with Google Sign In</li>
              <li>Select and customize your handle (username)</li>
              <li>Guided onboarding experience for new players</li>
            </ul>
          </section>

          <section className="feature-section">
            <h2 className="section-title">Core Gameplay</h2>
            <ul className="features-list">
              <li>Manage a digital Turf that serves as the main hub</li>
              <li>View wallet balance and in game financial data</li>
              <li>Earn in game currency through passive income over time</li>
              <li>Spend money on upgrades, bots, and research</li>
              <li>Progress through player levels as you advance</li>
              <li>Navigate between Main Floor and Garage views in your Home</li>
            </ul>
          </section>

          <section className="feature-section">
            <h2 className="section-title">Bot Army and Combat</h2>
            <ul className="features-list">
              <li>Build bots through Bot Assembly</li>
              <li>View and manage bot quantities and stats in the Digital Barracks</li>
              <li>Engage in automated battles against NPCs</li>
              <li>Engage in PvP battles against other users after unlocking the Hack Map</li>
              <li>Organize bots into multiple battalions (A, B, and C - C unlocked through research)</li>
              <li>Assign different bot types to different battalions for strategic combat</li>
              <li>Lose bots and money through combat as part of normal gameplay</li>
              <li>Activate antivirus shields to temporarily prevent attacks (with cooldown periods)</li>
              <li>Check shield status before initiating battles</li>
            </ul>
          </section>

          <section className="feature-section">
            <h2 className="section-title">Progression and Unlocks</h2>
            <ul className="features-list">
              <li>Complete the initial NPC battle to reclaim the Hack Rig</li>
              <li>Unlock the Hack Map after regaining control of the rig</li>
              <li>Locate your position on the map and target NPCs or other players</li>
              <li>Face progressively tougher NPC enemies</li>
              <li>Guided task completion via UI</li>
            </ul>
          </section>

          <section className="feature-section">
            <h2 className="section-title">Research System</h2>
            <ul className="features-list">
              <li>Build the Research Center on the Turf</li>
              <li>Unlock research categories through gameplay conditions</li>
              <li>Improve bot strength, defense, and hacking abilities</li>
              <li>Unlock antivirus shielding to temporarily prevent attacks</li>
              <li>Unlock Hack Crews through research progression</li>
              <li>Unlock additional battalions for hack battles through research</li>
            </ul>
          </section>

          <section className="feature-section">
            <h2 className="section-title">Financial Systems</h2>
            <ul className="features-list">
              <li>Build investment properties</li>
              <li>Increase passive income per second through room upgrades</li>
              <li>View detailed financial statements with Income Statement, Balance Sheet, and Cash Flows tabs</li>
              <li>Track rental housing income and financial tiers</li>
              <li>Choose between investing in income growth or hacking power</li>
            </ul>
          </section>

          <section className="feature-section">
            <h2 className="section-title">Social and PvP Features</h2>
            <ul className="features-list">
              <li>Create or join Hack Crews once unlocked</li>
              <li>Chat with crew members using in game text chat</li>
              <li>View your own profile and other users' profiles</li>
              <li>View battle related statistics on profiles</li>
              <li>Report other users through profile reporting tools</li>
              <li>Manage crew information including name, identifier, and language settings</li>
              <li>Recruit new members and manage applications</li>
              <li>View crew rankings and leaderboards</li>
              <li>Create and edit crew rules</li>
              <li>Use internal and external message boards for crew communication</li>
              <li>Form alliances with other crews (maximum of 2 alliances)</li>
              <li>Declare war on other crews and manage war status</li>
              <li>Gift money to all crew members</li>
              <li>Manage crew hierarchy with president, executives, and members</li>
              <li>Choose a successor when resigning as president</li>
              <li>View crew awards and achievements</li>
            </ul>
          </section>

          <section className="feature-section">
            <h2 className="section-title">Quality of Life Features</h2>
            <ul className="features-list">
              <li>Use speedups to reduce certain wait times</li>
              <li>Switch between light mode and dark mode</li>
              <li>Update profile avatar and username</li>
              <li>Locate yourself faster on the Hack Map</li>
            </ul>
          </section>

          <section className="feature-section">
            <h2 className="section-title">Monetization and Compliance</h2>
            <ul className="features-list">
              <li>No gambling mechanics</li>
              <li>No required in app purchases for gameplay</li>
            </ul>
          </section>
        </div>
      </div>
      <Footer />
    </>
  )
}

export default Features
