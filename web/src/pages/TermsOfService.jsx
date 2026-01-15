import Header from '../components/Header'
import Footer from '../components/Footer'
import { renderTermsOfServiceSections, getTermsOfServiceEffectiveDate } from '../utils/documentRenderers'
import './Document.css'

function TermsOfService() {
  return (
    <>
      <Header />
      <div className="document-page">
        <div className="container">
          <div className="document-header">
            <h1>Terms of Service</h1>
            <p className="document-date">Effective Date: {getTermsOfServiceEffectiveDate()}</p>
          </div>
          <div className="document-content">
            {renderTermsOfServiceSections()}
          </div>
        </div>
      </div>
      <Footer />
    </>
  )
}

export default TermsOfService
