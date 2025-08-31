import { Router, Request, Response } from 'express';

const router = Router();

router.get('/privacy-policy', (_req: Request, res: Response) => {

  res.setHeader('Content-Type', 'text/html');
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Privacy Policy - RisingPunk</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.7;
            color: #2c3e50;
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
            min-height: 100vh;
            padding: 40px 20px;
        }
        
        .container {
            max-width: 900px;
            margin: 0 auto;
            background: white;
            border-radius: 16px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px;
            text-align: center;
        }
        
        .header h1 {
            font-size: 2.5rem;
            font-weight: 700;
            margin-bottom: 10px;
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        }
        
        .header .date {
            font-size: 1.1rem;
            opacity: 0.9;
            font-weight: 300;
        }
        
        .content {
            padding: 50px 40px;
        }
        
        h2 {
            color: #34495e;
            font-size: 1.5rem;
            font-weight: 600;
            margin: 40px 0 20px 0;
            padding: 15px 0;
            border-bottom: 3px solid #e8f4fd;
            position: relative;
        }
        
        h2::before {
            content: '';
            position: absolute;
            left: 0;
            bottom: -3px;
            width: 60px;
            height: 3px;
            background: linear-gradient(90deg, #667eea, #764ba2);
        }
        
        p {
            margin-bottom: 20px;
            font-size: 1.05rem;
            color: #555;
        }
        
        .info-item {
            background: #f8f9fa;
            border-left: 4px solid #667eea;
            padding: 15px 20px;
            margin: 15px 0;
            border-radius: 0 8px 8px 0;
        }
        
        .info-item strong {
            color: #2c3e50;
            font-weight: 600;
            display: block;
            margin-bottom: 8px;
        }
        
        .info-item span {
            color: #555;
            line-height: 1.6;
        }
        
        .bullet-list {
            margin: 20px 0;
            padding-left: 20px;
        }
        
        .bullet-list li {
            margin-bottom: 12px;
            color: #555;
            position: relative;
        }
        
        .bullet-list li::before {
            content: '•';
            color: #667eea;
            font-weight: bold;
            position: absolute;
            left: -20px;
        }
        
        .contact-info {
            background: linear-gradient(135deg, #e8f4fd 0%, #d1ecf1 100%);
            border-radius: 12px;
            padding: 25px;
            margin: 30px 0;
            text-align: center;
            border: 1px solid #bee5eb;
        }
        
        .contact-info strong {
            color: #2c3e50;
            font-size: 1.1rem;
        }
        
        .contact-info a {
            color: #667eea;
            text-decoration: none;
            font-weight: 600;
        }
        
        .contact-info a:hover {
            text-decoration: underline;
        }
        
        @media (max-width: 768px) {
            .container {
                margin: 20px;
                border-radius: 12px;
            }
            
            .header, .content {
                padding: 30px 25px;
            }
            
            .header h1 {
                font-size: 2rem;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Privacy Policy</h1>
            <div class="date">Effective Date: August 30, 2025</div>
        </div>
        
        <div class="content">
            <h2>Data Controller</h2>
            <p>DevHead LLC<br>
            3801 E. Windsong Dr., Phoenix, AZ 85048, USA<br>
            support@risingpunk.com (forwarded and hosted through Google Workspace)</p>
            
            <h2>Information We Collect</h2>
            <p><strong>Email address</strong> – required to create and manage the account.</p>
            <p><strong>Handle/username</strong> – chosen by you for in‑game display.</p>
            <p><strong>Password</strong> – stored only as a bcrypt hash.</p>
            <p><strong>Server logs</strong> – IP address, device ID, and usage data retained for 30 days to detect fraud and maintain security.</p>
            
            <h2>Legal Bases</h2>
            <p><strong>Performance of a contract</strong> – operating and maintaining your game account.</p>
            <p><strong>Legitimate interests</strong> – securing the service and preventing fraud.</p>
            
            <h2>How We Use Information</h2>
            <ul class="bullet-list">
                <li>Authenticate and manage accounts.</li>
                <li>Send essential service messages or support replies.</li>
                <li>Protect the service against fraud or abuse.</li>
            </ul>
            <p>We do not sell personal data.</p>
            
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
            <ul class="bullet-list">
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
            <div class="contact-info">
                <strong>support@risingpunk.com</strong><br>
                DevHead LLC, 3801 E. Windsong Dr., Phoenix, AZ 85048, USA
            </div>
        </div>
    </div>
</body>
</html>
  `);
});

router.get('/terms-of-service', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Terms of Service - RisingPunk</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.7;
            color: #2c3e50;
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
            min-height: 100vh;
            padding: 40px 20px;
        }
        
        .container {
            max-width: 900px;
            margin: 0 auto;
            background: white;
            border-radius: 16px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px;
            text-align: center;
        }
        
        .header h1 {
            font-size: 2.5rem;
            font-weight: 700;
            margin-bottom: 10px;
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        }
        
        .header .date {
            font-size: 1.1rem;
            opacity: 0.9;
            font-weight: 300;
        }
        
        .content {
            padding: 50px 40px;
        }
        
        h2 {
            color: #34495e;
            font-size: 1.5rem;
            font-weight: 600;
            margin: 40px 0 20px 0;
            padding: 15px 0;
            border-bottom: 3px solid #e8f4fd;
            position: relative;
        }
        
        h2::before {
            content: '';
            position: absolute;
            left: 0;
            bottom: -3px;
            width: 60px;
            height: 3px;
            background: linear-gradient(90deg, #667eea, #764ba2);
        }
        
        p {
            margin-bottom: 20px;
            font-size: 1.05rem;
            color: #555;
        }
        
        .info-item {
            background: #f8f9fa;
            border-left: 4px solid #667eea;
            padding: 15px 20px;
            margin: 15px 0;
            border-radius: 0 8px 8px 0;
        }
        
        .info-item strong {
            color: #2c3e50;
            font-weight: 600;
            display: block;
            margin-bottom: 8px;
        }
        
        .info-item span {
            color: #555;
            line-height: 1.6;
        }
        
        .bullet-list {
            margin: 20px 0;
            padding-left: 20px;
        }
        
        .bullet-list li {
            margin-bottom: 12px;
            color: #555;
            position: relative;
        }
        
        .bullet-list li::before {
            content: '•';
            color: #667eea;
            font-weight: bold;
            position: absolute;
            left: -20px;
        }
        
        .contact-info {
            background: linear-gradient(135deg, #e8f4fd 0%, #d1ecf1 100%);
            border-radius: 12px;
            padding: 25px;
            margin: 30px 0;
            text-align: center;
            border: 1px solid #bee5eb;
        }
        
        .contact-info strong {
            color: #2c3e50;
            font-size: 1.1rem;
        }
        
        .contact-info a {
            color: #667eea;
            text-decoration: none;
            font-weight: 600;
        }
        
        .contact-info a:hover {
            text-decoration: underline;
        }
        
        @media (max-width: 768px) {
            .container {
                margin: 20px;
                border-radius: 12px;
            }
            
            .header, .content {
                padding: 30px 25px;
            }
            
            .header h1 {
                font-size: 2rem;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Terms of Service</h1>
            <div class="date">Effective Date: August 30, 2025</div>
        </div>
        
        <div class="content">
            <h2>Acceptance of Terms</h2>
            <p>Downloading or using RisingPunk constitutes agreement to these Terms and the Privacy Policy. If you do not agree, do not use the app.</p>
            
            <h2>Eligibility</h2>
            <p>You must be 16 years or older to create an account.</p>
            
            <h2>Account Registration and Security</h2>
            <ul class="bullet-list">
                <li>Provide a valid email and choose a handle.</li>
                <li>You are responsible for safeguarding your password.</li>
                <li>We may suspend or terminate accounts for violations or security concerns.</li>
            </ul>
            
            <h2>User Conduct</h2>
            <p>You agree not to:</p>
            <ul class="bullet-list">
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
            <ul class="bullet-list">
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
            <div class="contact-info">
                <strong>support@risingpunk.com</strong><br>
                DevHead LLC, 3801 E. Windsong Dr., Phoenix, AZ 85048, USA
            </div>
        </div>
    </div>
</body>
</html>
  `);
});

export default router;
