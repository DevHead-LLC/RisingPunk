import Header from '../components/Header'
import Footer from '../components/Footer'
import './Document.css'

function TermsOfService() {
  return (
    <>
      <Header />
      <div className="document-page">
        <div className="container">
          <div className="document-header">
            <h1>Terms of Service</h1>
            <p className="document-date">Effective Date: August 30, 2025</p>
          </div>
          <div className="document-content">
            <h2>Acceptance of Terms</h2>
            <p>Downloading or using RisingPunk constitutes agreement to these Terms and the Privacy Policy. If you do not agree, do not use the app.</p>

            <h2>Eligibility</h2>
            <p>You must be 16 years or older to create an account.</p>

            <h2>Account Registration and Security</h2>
            <ul>
              <li>Provide a valid email and choose a handle.</li>
              <li>Verify your email address to ensure account security and enable password recovery.</li>
              <li>You are responsible for safeguarding your password.</li>
              <li>Unverified accounts may have limited functionality and may be unrecoverable if locked.</li>
              <li>We may suspend or terminate accounts for violations or security concerns.</li>
            </ul>

            <h2>User Conduct</h2>
            <p>You agree not to:</p>
            <ul>
              <li>Engage in cheating, fraud, or exploitation of bugs.</li>
              <li>Harass or impersonate others.</li>
              <li>Use the service for illegal or unauthorized purposes.</li>
            </ul>

            <h2>Intellectual Property</h2>
            <p>All content and code are owned by DevHead LLC. We grant you a limited, non‑transferable license for personal entertainment.</p>

            <h2>Purchases and Ads</h2>
            <p>The game currently contains no in‑app purchases or advertising. Terms will be updated if this changes.</p>

            <h2>Suspension and Termination</h2>
            <p>We may suspend or terminate accounts at our discretion. If this occurs, data associated with the account may be retained for 30 days to allow an appeal via support@risingpunk.com. After that period, data is deleted.</p>

            <h2>Dispute Resolution and Governing Law</h2>
            <ul>
              <li>These Terms are governed by the laws of Arizona, USA.</li>
              <li>Binding arbitration in Phoenix, AZ, under the American Arbitration Association rules resolves any dispute, except that claims under small‑claims court or injunctions for intellectual property may be brought in court.</li>
              <li>You waive the right to participate in class actions or class‑wide arbitration.</li>
            </ul>

            <h2>Disclaimer of Warranties</h2>
            <p>The service is provided "as is" without warranties of any kind.</p>

            <h2>Limitation of Liability</h2>
            <p>To the maximum extent permitted by law, DevHead LLC is not liable for indirect, incidental, or consequential damages. Total liability will not exceed the amount you paid (if any) in the past 12 months.</p>

            <h2>Changes to Terms</h2>
            <p>We may modify these Terms. Continued use after changes constitutes acceptance. Updates will be posted in‑app and/or via email.</p>

            <h2>Contact</h2>
            <div className="contact-info">
              <p><strong>support@risingpunk.com</strong></p>
              <p>DevHead LLC, 3801 E. Windsong Dr., Phoenix, AZ 85048, USA</p>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  )
}

export default TermsOfService
