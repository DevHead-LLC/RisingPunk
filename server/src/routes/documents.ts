import { Router, Request, Response } from 'express';
import { 
  renderPrivacyPolicyHTML, 
  renderTermsOfServiceHTML,
  getPrivacyPolicyEffectiveDate,
  getTermsOfServiceEffectiveDate
} from '../utils/documentRenderer';

const router = Router();

export const deleteAccountHandler = (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Delete Account - RisingPunk</title>
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
            <h1>Delete Your Account</h1>
        </div>
        
        <div class="content">
            <h2>How to Delete Your Account</h2>
            <p>You can delete your RisingPunk account directly from within the application:</p>
            <div class="info-item">
                <strong>In-App Deletion</strong>
                <span>Go to <strong>Settings → Account → Delete Account</strong> in the RisingPunk app to permanently delete your account and all associated data.</span>
            </div>
            
            <h2>Unable to Access the App?</h2>
            <p>If you don't have access to the application or cannot access it for any reason, you can request account deletion through our support team:</p>
            <div class="info-item">
                <strong>Manual Account Deletion Request</strong>
                <span>Please contact us at <a href="mailto:support@risingpunk.com?subject=Account Deletion Request">support@risingpunk.com</a> with the subject line "Account Deletion Request". We will verify your account through our manual verification process, and once verified, your account will be deleted.</span>
            </div>
            
            <h2>What Happens When You Delete Your Account?</h2>
            <ul class="bullet-list">
                <li>Your account and all associated data will be permanently removed from our active systems.</li>
                <li>Your data will be purged from backups within 30 days.</li>
                <li>This action cannot be undone.</li>
            </ul>
            
            <h2>Contact Support</h2>
            <div class="contact-info">
                <strong>support@risingpunk.com</strong><br>
                DevHead LLC, 3801 E. Windsong Dr., Phoenix, AZ 85048, USA
            </div>
        </div>
    </div>
</body>
</html>
  `);
};

router.get('/privacy-policy', (_req: Request, res: Response) => {
  const content = renderPrivacyPolicyHTML();
  const effectiveDate = getPrivacyPolicyEffectiveDate();

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
            <div class="date">Effective Date: ${effectiveDate}</div>
        </div>
        
        <div class="content">
            ${content}
        </div>
    </div>
</body>
</html>
  `);
});

router.get('/terms-of-service', (_req: Request, res: Response) => {
  const content = renderTermsOfServiceHTML();
  const effectiveDate = getTermsOfServiceEffectiveDate();

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
            <div class="date">Effective Date: ${effectiveDate}</div>
        </div>
        
        <div class="content">
            ${content}
        </div>
    </div>
</body>
</html>
  `);
});

export default router;
