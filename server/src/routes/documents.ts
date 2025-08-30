import { Router, Request, Response } from 'express';

const router = Router();

router.get('/privacy-policy', (_req: Request, res: Response) => {
  const privacyPolicy = `
# Privacy Policy

**Effective Date:** August 30, 2025

## 1. Information We Collect

**Email address & username/handle:** Provided during account registration.

**Password:** Stored as a bcrypt hash; we never keep raw passwords.

**Usage data:** Basic log data (e.g., IP address, device type) for security and analytics.

We do not request real names, location data, contacts, camera, or microphone access.

## 2. How We Use the Information

- Create and manage accounts, authenticate users, and operate core app features.
- Communicate with users regarding updates or support requests.
- Protect against fraud and misuse.

## 3. Data Sharing

We do not sell personal data.

Data may be shared with trusted service providers (hosting, analytics) solely to operate the service, under agreements requiring confidentiality and security.

## 4. Data Retention

Personal data is kept while the account remains active.

Users can delete their data by deleting their account within the app or contacting us (support@risingpunk.com).

Deleted accounts are permanently removed from our active databases within a reasonable time frame.

## 5. Security

Passwords are hashed with bcrypt.

We employ industry-standard measures (such as HTTPS) to protect data in transit and at rest.

No method of transmission or storage is 100% secure, so we cannot guarantee absolute security.

## 6. Children's Privacy

RisingPunk is not directed to children under 13, and we do not knowingly collect data from them.

If we learn that we have collected such data, we will delete it promptly.

## 7. User Rights

Users may request access, correction, or deletion of their data via in‑app settings or by contacting support@risingpunk.com.

## 8. Changes to This Policy

We may update this policy periodically. Material changes will be posted on this page with a new effective date.

## 9. Contact Us

Questions or requests can be sent to support@risingpunk.com.
  `.trim();

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
            <h2>1. Information We Collect</h2>
            
            <div class="info-item">
                <strong>Email address & username/handle:</strong>
                <span>Provided during account registration.</span>
            </div>
            
            <div class="info-item">
                <strong>Password:</strong>
                <span>Stored as a bcrypt hash; we never keep raw passwords.</span>
            </div>
            
            <div class="info-item">
                <strong>Usage data:</strong>
                <span>Basic log data (e.g., IP address, device type) for security and analytics.</span>
            </div>
            
            <p>We do not request real names, location data, contacts, camera, or microphone access.</p>
            
            <h2>2. How We Use the Information</h2>
            
            <ul class="bullet-list">
                <li>Create and manage accounts, authenticate users, and operate core app features.</li>
                <li>Communicate with users regarding updates or support requests.</li>
                <li>Protect against fraud and misuse.</li>
            </ul>
            
            <h2>3. Data Sharing</h2>
            
            <p>We do not sell personal data.</p>
            
            <p>Data may be shared with trusted service providers (hosting, analytics) solely to operate the service, under agreements requiring confidentiality and security.</p>
            
            <h2>4. Data Retention</h2>
            
            <p>Personal data is kept while the account remains active.</p>
            
            <p>Users can delete their data by deleting their account within the app or contacting us (support@risingpunk.com).</p>
            
            <p>Deleted accounts are permanently removed from our active databases within a reasonable time frame.</p>
            
            <h2>5. Security</h2>
            
            <p>Passwords are hashed with bcrypt.</p>
            
            <p>We employ industry-standard measures (such as HTTPS) to protect data in transit and at rest.</p>
            
            <p>No method of transmission or storage is 100% secure, so we cannot guarantee absolute security.</p>
            
            <h2>6. Children's Privacy</h2>
            
            <p>RisingPunk is not directed to children under 13, and we do not knowingly collect data from them.</p>
            
            <p>If we learn that we have collected such data, we will delete it promptly.</p>
            
            <h2>7. User Rights</h2>
            
            <p>Users may request access, correction, or deletion of their data via in‑app settings or by contacting support@risingpunk.com.</p>
            
            <h2>8. Changes to This Policy</h2>
            
            <p>We may update this policy periodically. Material changes will be posted on this page with a new effective date.</p>
            
            <h2>9. Contact Us</h2>
            
            <div class="contact-info">
                <strong>Questions or requests can be sent to:</strong><br>
                <a href="mailto:support@risingpunk.com">support@risingpunk.com</a>
            </div>
        </div>
    </div>
</body>
</html>
  `);
});

export default router;
