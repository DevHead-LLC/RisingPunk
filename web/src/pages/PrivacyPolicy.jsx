import Header from '../components/Header'
import Footer from '../components/Footer'
import './Document.css'

function PrivacyPolicy() {
  return (
    <>
      <Header />
      <div className="document-page">
        <div className="container">
          <div className="document-header">
            <h1>Privacy Policy</h1>
            <p className="document-date">Effective Date: August 30, 2025</p>
          </div>
          <div className="document-content">
            <h2>Data Controller</h2>
            <p>
              DevHead LLC<br />
              3801 E. Windsong Dr., Phoenix, AZ 85048, USA<br />
              support@risingpunk.com (forwarded and hosted through Google Workspace)
            </p>

            <h2>Information We Collect</h2>
            <p><strong>Email address</strong> – required to create and manage the account. Email addresses are verified through a secure verification process to ensure account security and enable password recovery.</p>
            <p><strong>Email verification status</strong> – we track whether your email has been verified to provide appropriate account security features.</p>
            <p><strong>Handle/username</strong> – chosen by you for in‑game display.</p>
            <p><strong>Password</strong> – stored only as a bcrypt hash.</p>
            <p><strong>Server logs</strong> – IP address, device ID, and usage data retained for 30 days to detect fraud and maintain security.</p>

            <h2>Legal Bases</h2>
            <p><strong>Performance of a contract</strong> – operating and maintaining your game account.</p>
            <p><strong>Legitimate interests</strong> – securing the service and preventing fraud.</p>

            <h2>How We Use Information</h2>
            <ul>
              <li>Authenticate and manage accounts.</li>
              <li>Send essential service messages or support replies.</li>
              <li>Send email verification links and password recovery emails.</li>
              <li>Protect the service against fraud or abuse.</li>
            </ul>
            <p>We do not sell personal data.</p>

            <h2>Email Verification and Account Security</h2>
            <p><strong>Email verification is required</strong> for account security and password recovery. Unverified accounts may be subject to the following limitations:</p>
            <ul>
              <li>Password recovery may not be available for unverified accounts.</li>
              <li>Unverified accounts that become locked may be unrecoverable and subject to deletion.</li>
              <li>We will attempt to notify users of verification requirements through in-app notifications.</li>
            </ul>
            <p><strong>Verification emails</strong> contain secure tokens that expire within 72 hours. You can request new verification emails as needed from your account settings.</p>

            <h2>Third‑Party Processors</h2>
            <p><strong>Amazon Web Services (Elastic Beanstalk/EC2)</strong> – application hosting (USA).</p>
            <p><strong>MongoDB Atlas</strong> – database hosting (USA clusters).</p>
            <p><strong>Apple</strong> – app distribution and optional diagnostic data under Apple's own policy.</p>
            <p><strong>Google Workspace</strong> – handles support@risingpunk.com email forwarding.</p>
            <p>Each processor operates under a written data‑processing agreement.</p>

            <h2>International Data Transfers</h2>
            <p>Data is stored on servers in the United States. For EU/UK users, transfers rely on Standard Contractual Clauses or equivalent lawful mechanisms.</p>

            <h2>Data Retention</h2>
            <p><strong>Active accounts:</strong> retained until you delete or remain inactive for 12 months, after which they are scheduled for deletion.</p>
            <p><strong>User‑initiated deletion:</strong> removed immediately from active systems and purged from backups within 30 days.</p>
            <p><strong>Server logs:</strong> automatically deleted after 30 days.</p>

            <h2>Your Rights</h2>
            <p>Contact support@risingpunk.com to:</p>
            <ul>
              <li>Access a copy of your email and handle.</li>
              <li>Rectify or update them.</li>
              <li>Delete your account (or request restriction/objection).</li>
              <li>Receive data in a portable format (JSON/CSV).</li>
            </ul>
            <p>We respond within one month. EU/UK users may lodge a complaint with a supervisory authority (e.g., the ICO).</p>

            <h2>Security</h2>
            <p>Passwords are hashed; email addresses are encrypted at rest. We use HTTPS/TLS and role‑based access controls, but no method is 100% secure.</p>

            <h2>Data Breach Response</h2>
            <p>On discovering a personal‑data breach, we will notify affected users and regulators within 72 hours, outlining the incident and remedial steps.</p>

            <h2>Children's Privacy</h2>
            <p>RisingPunk is intended for users 16+. We do not knowingly collect data from younger children; any such data will be deleted.</p>

            <h2>Changes to This Policy</h2>
            <p>Material updates will be posted in‑app and/or via email with a revised effective date.</p>

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

export default PrivacyPolicy
