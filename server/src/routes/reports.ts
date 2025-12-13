import express, { Request, Response } from 'express';
import auth from '../middleware/auth';
import { EmailService } from '../services/EmailService';
import { ReportContext, ReportReason } from '../types/reports';

const router = express.Router();

interface SubmitReportRequest extends Request {
  body: {
    reportedUserId: string;
    reportedUsername: string;
    reportingUserId: string;
    reportingUsername: string;
    reason: ReportReason;
    description: string;
    context: ReportContext;
    contextData?: any;
  };
}

/**
 * POST /api/reports/submit
 * Submits a user report and sends email to support@risingpunk.com
 */
router.post('/submit', auth, async (req: SubmitReportRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const {
      reportedUserId,
      reportedUsername,
      reportingUserId,
      reportingUsername,
      reason,
      description,
      context,
      contextData,
    } = req.body;

    // Validate required fields
    if (!reportedUserId || !reportedUsername || !reportingUserId || !reportingUsername) {
      res.status(400).json({ error: 'Missing required user information' });
      return;
    }

    if (!reason || !description || !context) {
      res.status(400).json({ error: 'Missing required report information' });
      return;
    }

    // Validate reason is valid
    const validReasons: ReportReason[] = ['vulgar', 'hate-speech', 'harassment', 'spam', 'other'];
    if (!validReasons.includes(reason)) {
      res.status(400).json({ error: 'Invalid reason' });
      return;
    }

    // Validate description length (max 1000 characters)
    if (description.length > 1000) {
      res.status(400).json({ error: 'Description must be 1000 characters or less' });
      return;
    }

    // Verify reporting user matches authenticated user
    if (reportingUserId !== userId.toString()) {
      res.status(403).json({ error: 'Reporting user ID does not match authenticated user' });
      return;
    }

    // Format email content
    const timestamp = new Date().toISOString();
    const reasonLabel = {
      'vulgar': 'Vulgar/Profanity',
      'hate-speech': 'Hate Speech',
      'harassment': 'Harassment',
      'spam': 'Spam',
      'other': 'Other',
    }[reason];

    const contextLabel = {
      'username': 'Username',
      'crew-name': 'Crew Name',
      'crew-identifier': 'Crew Identifier',
      'internal-message-board': 'Internal Message Board',
      'external-message-board': 'External Message Board',
      'crew-rules': 'Crew Rules',
      'chat-message': 'Chat Message',
    }[context];

    // Build context data string
    let contextDataString = 'N/A';
    if (contextData) {
      switch (context) {
        case 'chat-message':
          contextDataString = `Message: ${contextData.message || 'N/A'}\nMessage ID: ${contextData.messageId || 'N/A'}\nTimestamp: ${contextData.timestamp || 'N/A'}`;
          break;
        case 'internal-message-board':
        case 'external-message-board':
          contextDataString = `Message: ${contextData.message || 'N/A'}`;
          break;
        case 'crew-rules':
          contextDataString = `Rule Text: ${contextData.ruleText || 'N/A'}\nRule Index: ${contextData.ruleIndex !== undefined ? contextData.ruleIndex : 'N/A'}`;
          break;
        case 'username':
          contextDataString = `Username: ${contextData.username || reportedUsername}`;
          break;
        case 'crew-name':
          contextDataString = `Crew Name: ${contextData.crewName || 'N/A'}`;
          break;
        case 'crew-identifier':
          contextDataString = `Crew Identifier: ${contextData.crewIdentifier || 'N/A'}`;
          break;
        default:
          contextDataString = JSON.stringify(contextData);
      }
    }

    const crewId = contextData?.crewId || 'N/A';

    // Create email content
    const emailSubject = '!!User Report!!';
    const emailText = `
USER REPORT SUBMITTED

Report Reason: ${reasonLabel}
Description: ${description}

REPORTED USER:
  Username: ${reportedUsername}
  User ID: ${reportedUserId}

REPORTING USER:
  Username: ${reportingUsername}
  User ID: ${reportingUserId}

CONTEXT:
  Type: ${contextLabel}
  Crew ID: ${crewId}

CONTEXT DATA:
${contextDataString}

TIMESTAMP: ${timestamp}
    `.trim();

    const emailHtml = `
      <html>
        <body style="font-family: monospace; line-height: 1.6; color: #333;">
          <h2 style="color: #d32f2f;">USER REPORT SUBMITTED</h2>
          
          <div style="margin-bottom: 20px;">
            <strong>Report Reason:</strong> ${reasonLabel}<br/>
            <strong>Description:</strong> ${description.replace(/\n/g, '<br/>')}
          </div>
          
          <div style="margin-bottom: 20px; padding: 10px; background-color: #f5f5f5; border-left: 4px solid #d32f2f;">
            <h3 style="margin-top: 0;">REPORTED USER</h3>
            <strong>Username:</strong> ${reportedUsername}<br/>
            <strong>User ID:</strong> ${reportedUserId}
          </div>
          
          <div style="margin-bottom: 20px; padding: 10px; background-color: #f5f5f5; border-left: 4px solid #2196f3;">
            <h3 style="margin-top: 0;">REPORTING USER</h3>
            <strong>Username:</strong> ${reportingUsername}<br/>
            <strong>User ID:</strong> ${reportingUserId}
          </div>
          
          <div style="margin-bottom: 20px;">
            <h3>CONTEXT</h3>
            <strong>Type:</strong> ${contextLabel}<br/>
            <strong>Crew ID:</strong> ${crewId}
          </div>
          
          <div style="margin-bottom: 20px; padding: 10px; background-color: #fff3cd; border: 1px solid #ffc107;">
            <h3 style="margin-top: 0;">CONTEXT DATA</h3>
            <pre style="white-space: pre-wrap; word-wrap: break-word;">${contextDataString.replace(/\n/g, '<br/>')}</pre>
          </div>
          
          <div style="margin-top: 20px; padding-top: 10px; border-top: 1px solid #ddd; color: #666; font-size: 12px;">
            <strong>Timestamp:</strong> ${timestamp}
          </div>
        </body>
      </html>
    `;

    // Send email
    const emailSent = await EmailService.sendEmail('support@risingpunk.com', {
      subject: emailSubject,
      text: emailText,
      html: emailHtml,
    });

    if (!emailSent) {
      console.error('Failed to send report email');
      res.status(500).json({ error: 'Failed to send report. Please try again later.' });
      return;
    }

    res.json({
      success: true,
      message: 'Report submitted successfully',
    });
  } catch (error: any) {
    console.error('Error submitting report:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
