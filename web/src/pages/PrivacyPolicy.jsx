import Header from '../components/Header'
import Footer from '../components/Footer'
import { renderPrivacyPolicySections, getPrivacyPolicyEffectiveDate } from '../utils/documentRenderers'
import './Document.css'

function PrivacyPolicy() {
  return (
    <>
      <Header />
      <div className="document-page">
        <div className="container">
          <div className="document-header">
            <h1>Privacy Policy</h1>
            <p className="document-date">Effective Date: {getPrivacyPolicyEffectiveDate()}</p>
          </div>
          <div className="document-content">
            {renderPrivacyPolicySections()}
          </div>
        </div>
      </div>
      <Footer />
    </>
  )
}

export default PrivacyPolicy
