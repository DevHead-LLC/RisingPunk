import nodemailer from 'nodemailer';
import crypto from 'crypto';

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export class EmailService {
  private static transporter: nodemailer.Transporter | null = null

  private static getBaseUrl(): string {

    console.log('🔍 [DEBUG] EmailService.getBaseUrl() called');
    console.log('🔍 [DEBUG] CLIENT_URL:', process.env.CLIENT_URL);
    console.log('🔍 [DEBUG] NODE_ENV:', process.env.NODE_ENV);
    
    // Check for CLIENT_URL environment variable first
    if (process.env.CLIENT_URL) {
      console.log('✅ [DEBUG] Using CLIENT_URL from environment:', process.env.CLIENT_URL);
      return process.env.CLIENT_URL;
    }
    
    // Fallback based on NODE_ENV
    const nodeEnv = process.env.NODE_ENV;
    console.log('🔍 [DEBUG] CLIENT_URL not set, using NODE_ENV fallback:', nodeEnv);
    
    switch (nodeEnv) {
      case 'staging':
        console.log('✅ [DEBUG] Using staging URL: https://api.risingpunk.dev');
        return 'https://api.risingpunk.dev';
      case 'production':
        console.log('✅ [DEBUG] Using production URL: https://api.risingpunk.com');
        return 'https://api.risingpunk.com';
      case 'development':
      default:
        console.log('✅ [DEBUG] Using development URL: http://localhost:5001');
        return 'http://localhost:5001';
    }
  };

  private static async getTransporter(): Promise<nodemailer.Transporter> {
    console.log('🔍 [DEBUG] EmailService.getTransporter() called');
    if (!this.transporter) {
      const emailUser = process.env.EMAIL_USER;
      const emailPassword = process.env.EMAIL_PASSWORD;
      
      console.log('🔍 [DEBUG] EMAIL_USER:', emailUser ? 'SET' : 'NOT SET');
      console.log('🔍 [DEBUG] EMAIL_PASSWORD:', emailPassword ? 'SET' : 'NOT SET');

      if (!emailUser || !emailPassword) {
        console.log('❌ [DEBUG] Missing email credentials');
        throw new Error('EMAIL_USER and EMAIL_PASSWORD environment variables are required');
      }

      console.log('🔍 [DEBUG] Creating nodemailer transporter');
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: emailUser,
          pass: emailPassword
        }
      });
      console.log('✅ [DEBUG] Nodemailer transporter created successfully');

      // Verify connection configuration
      try {
        await this.transporter.verify();
        console.log('✅ Email service configured successfully');
      } catch (error) {
        console.error('❌ Email service configuration failed:', error);
        throw new Error('Failed to configure email service');
      }
    }

    return this.transporter;
  }

  static generateVerificationToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  static generatePasswordResetToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  static createEmailVerificationTemplate(
    verificationUrl: string,
    userHandle: string
  ): EmailTemplate {
    const subject = 'Verify Your RisingPunk Account';
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verify Your RisingPunk Account</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f5f5f5;
            }
            .container {
              background-color: white;
              border-radius: 8px;
              padding: 40px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .logo {
              font-size: 24px;
              font-weight: bold;
              color: #667eea;
              margin-bottom: 10px;
            }
            .title {
              font-size: 20px;
              color: #2c3e50;
              margin-bottom: 20px;
            }
            .content {
              margin-bottom: 30px;
            }
            .button {
              display: inline-block;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 12px 30px;
              text-decoration: none;
              border-radius: 5px;
              font-weight: bold;
              margin: 20px 0;
            }
            .warning {
              background-color: #fff3cd;
              border: 1px solid #ffeaa7;
              border-radius: 4px;
              padding: 15px;
              margin: 20px 0;
              color: #856404;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #eee;
              color: #666;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">RisingPunk</div>
              <h1 class="title">Verify Your Account</h1>
            </div>
            
            <div class="content">
              <p>Hello <strong>${userHandle}</strong>,</p>
              
              <p>Welcome to RisingPunk! To complete your account setup and ensure you can recover your account if needed, please verify your email address.</p>
              
              <div style="text-align: center;">
                <a href="${verificationUrl}" class="button">Verify Email Address</a>
              </div>
              
              <div class="warning">
                <strong>Important:</strong> This verification link will expire in 72 hours. If you don't verify your email, you may not be able to recover your account if you forget your password.
              </div>
              
              <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #667eea;">${verificationUrl}</p>
            </div>
            
            <div class="footer">
              <p>This email was sent from RisingPunk. If you didn't create an account, you can safely ignore this email.</p>
              <p>© 2024 DevHead LLC. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
      Verify Your RisingPunk Account
      
      Hello ${userHandle},
      
      Welcome to RisingPunk! To complete your account setup and ensure you can recover your account if needed, please verify your email address.
      
      Click this link to verify: ${verificationUrl}
      
      Important: This verification link will expire in 72 hours. If you don't verify your email, you may not be able to recover your account if you forget your password.
      
      If you didn't create an account, you can safely ignore this email.
      
      © 2024 DevHead LLC. All rights reserved.
    `;

    return { subject, html, text };
  }

  static createPasswordResetTemplate(
    resetUrl: string,
    userHandle: string
  ): EmailTemplate {
    const subject = 'Reset Your RisingPunk Password';
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Your RisingPunk Password</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f5f5f5;
            }
            .container {
              background-color: white;
              border-radius: 8px;
              padding: 40px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .logo {
              font-size: 24px;
              font-weight: bold;
              color: #667eea;
              margin-bottom: 10px;
            }
            .title {
              font-size: 20px;
              color: #2c3e50;
              margin-bottom: 20px;
            }
            .content {
              margin-bottom: 30px;
            }
            .button {
              display: inline-block;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 12px 30px;
              text-decoration: none;
              border-radius: 5px;
              font-weight: bold;
              margin: 20px 0;
            }
            .warning {
              background-color: #f8d7da;
              border: 1px solid #f5c6cb;
              border-radius: 4px;
              padding: 15px;
              margin: 20px 0;
              color: #721c24;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #eee;
              color: #666;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">RisingPunk</div>
              <h1 class="title">Reset Your Password</h1>
            </div>
            
            <div class="content">
              <p>Hello <strong>${userHandle}</strong>,</p>
              
              <p>We received a request to reset your RisingPunk account password. Click the button below to create a new password:</p>
              
              <div style="text-align: center;">
                <a href="${resetUrl}" class="button">Reset Password</a>
              </div>
              
              <div class="warning">
                <strong>Security Notice:</strong> This password reset link will expire in 1 hour. If you didn't request this reset, please ignore this email and your password will remain unchanged.
              </div>
              
              <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #667eea;">${resetUrl}</p>
            </div>
            
            <div class="footer">
              <p>This email was sent from RisingPunk. If you didn't request a password reset, you can safely ignore this email.</p>
              <p>© 2024 DevHead LLC. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
      Reset Your RisingPunk Password
      
      Hello ${userHandle},
      
      We received a request to reset your RisingPunk account password. Click the link below to create a new password:
      
      ${resetUrl}
      
      Security Notice: This password reset link will expire in 1 hour. If you didn't request this reset, please ignore this email and your password will remain unchanged.
      
      If you didn't request a password reset, you can safely ignore this email.
      
      © 2024 DevHead LLC. All rights reserved.
    `;

    return { subject, html, text };
  }

  static async sendEmail(
    to: string,
    template: EmailTemplate
  ): Promise<boolean> {
    console.log('🔍 [DEBUG] sendEmail called with to:', to);
    try {
      console.log('🔍 [DEBUG] Getting transporter...');
      const transporter = await this.getTransporter();
      console.log('✅ [DEBUG] Transporter obtained');
      
      const mailOptions = {
        from: `"RisingPunk" <support@risingpunk.com>`,
        to: to,
        subject: template.subject,
        text: template.text,
        html: template.html
      };
      console.log('🔍 [DEBUG] Mail options prepared, sending email...');

      const result = await transporter.sendMail(mailOptions);
      console.log('✅ [DEBUG] Email sent successfully:', result.messageId);
      return true;
    } catch (error) {
      console.error('❌ [DEBUG] Failed to send email:', error);
      return false;
    }
  }

  static async sendVerificationEmail(
    email: string,
    userHandle: string,
    verificationToken: string
  ): Promise<boolean> {
    const baseUrl = this.getBaseUrl();
    const verificationUrl = `${baseUrl}/api/auth/verify-email/${verificationToken}`;
    
    const template = this.createEmailVerificationTemplate(verificationUrl, userHandle);
    return await this.sendEmail(email, template);
  }

  static async sendPasswordResetEmail(
    email: string,
    userHandle: string,
    resetToken: string
  ): Promise<boolean> {
    console.log('🔍 [DEBUG] sendPasswordResetEmail called with:', { email, userHandle, resetToken: resetToken.substring(0, 10) + '...' });
    const baseUrl = this.getBaseUrl();
    const resetUrl = `${baseUrl}/api/auth/reset-password?token=${resetToken}`;
    console.log('🔍 [DEBUG] Generated reset URL:', resetUrl);
    
    const template = this.createPasswordResetTemplate(resetUrl, userHandle);
    console.log('🔍 [DEBUG] Created email template, calling sendEmail');
    
    const result = await this.sendEmail(email, template);
    console.log('🔍 [DEBUG] sendEmail result:', result);
    
    return result;
  }
}
