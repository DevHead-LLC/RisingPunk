import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Features from './pages/Features'
import Offers from './pages/Offers'
import PrivacyPolicy from './pages/PrivacyPolicy'
import TermsOfService from './pages/TermsOfService'
import './App.css'

function App() {
  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/offers" element={<Offers />} />
        <Route path="/features" element={<Features />} />
        <Route path="/documents/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/documents/terms-of-service" element={<TermsOfService />} />
      </Routes>
    </div>
  )
}

export default App
