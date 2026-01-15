/**
 * React renderers for Privacy Policy and Terms of Service
 * Uses shared document data structure
 */

// Import document data - adjust path based on your project structure
// For now, we'll define it here to match the shared structure
const DOCUMENTS = {
  privacyPolicy: {
    effectiveDate: 'January 15, 2026',
    sections: [
      {
        title: 'Data Controller',
        content: `DevHead LLC
3801 E. Windsong Dr., Phoenix, AZ 85048, USA
support@risingpunk.com (forwarded and hosted through Google Workspace)`
      },
      {
        title: 'Information We Collect',
        items: [
          {
            label: 'Email address',
            text: 'required to create and manage the account. Email addresses are verified through a secure verification process to ensure account security and enable password recovery.'
          },
          {
            label: 'Email verification status',
            text: 'we track whether your email has been verified to provide appropriate account security features.'
          },
          {
            label: 'Handle/username',
            text: 'chosen by you for in‑game display.'
          },
          {
            label: 'Password',
            text: 'stored only as a bcrypt hash.'
          },
          {
            label: 'Server logs',
            text: 'IP address, device ID, and usage data retained for 30 days to detect fraud and maintain security.'
          },
          {
            label: 'Newsletter subscription information',
            text: 'if you choose to subscribe to our newsletter via our website, we collect your email address and optionally your first name. This information is stored securely and used solely for sending you game updates, strategy tips, and exclusive rewards. You can unsubscribe at any time.'
          },
          {
            label: 'User-generated content',
            text: 'messages and content you post in the in-app chat system. This content is stored to provide the chat functionality and may be reviewed for moderation purposes.'
          }
        ]
      },
      {
        title: 'Legal Bases',
        items: [
          {
            label: 'Performance of a contract',
            text: 'operating and maintaining your game account.'
          },
          {
            label: 'Legitimate interests',
            text: 'securing the service and preventing fraud.'
          },
          {
            label: 'Consent',
            text: 'for newsletter subscriptions and user-generated content in chat.'
          }
        ]
      },
      {
        title: 'How We Use Information',
        items: [
          'Authenticate and manage accounts.',
          'Send essential service messages or support replies.',
          'Send email verification links and password recovery emails.',
          'Protect the service against fraud or abuse.',
          'Send newsletter updates (only if you subscribed) with game updates, strategy tips, and exclusive rewards like balance increases you can claim in-game.',
          'Moderate user-generated content in chat to ensure a safe and respectful community environment.'
        ],
        note: 'We do not sell personal data. We do not share your email address or personal information with third parties for marketing purposes. Newsletter subscribers will only receive emails from RisingPunk and can unsubscribe at any time.'
      },
      {
        title: 'Email Newsletter and Marketing Communications',
        content: `If you subscribe to our newsletter through our website:

• We will only send you emails related to RisingPunk, including game updates, strategy tips, and exclusive rewards.
• We will never spam you or send excessive emails.
• We will never share, sell, or rent your email address to third parties.
• You can unsubscribe at any time by clicking the unsubscribe link in any newsletter email or by contacting us at support@risingpunk.com.
• Your email address will be stored securely and used solely for the purpose of sending you the newsletter content you requested.
• We use Mailchimp to manage our newsletter, which operates under their own privacy policy and data processing agreement.`
      },
      {
        title: 'User-Generated Content and Chat Moderation',
        content: `RisingPunk includes an in-app chat system where users can communicate with each other. By using this feature:

• You are responsible for the content you post in chat.
• We allow users to report inappropriate content or actions through an in-app reporting mechanism.
• We reserve the right to review, moderate, and remove content that violates our Terms of Service, including but not limited to: harassment, hate speech, spam, illegal content, or any content that creates an unsafe environment.
• Reported content will be reviewed, and appropriate action will be taken, which may include content removal, warnings, or account suspension/termination.
• We may store chat messages temporarily for moderation purposes and to investigate reports of inappropriate behavior.
• Chat content is visible to other users in the game, so please do not share personal information in chat.`
      },
      {
        title: 'Email Verification and Account Security',
        content: `Email verification is required for account security and password recovery. Unverified accounts may be subject to the following limitations:`,
        items: [
          'Password recovery may not be available for unverified accounts.',
          'Unverified accounts that become locked may be unrecoverable and subject to deletion.',
          'We will attempt to notify users of verification requirements through in-app notifications.'
        ],
        note: 'Verification emails contain secure tokens that expire within 72 hours. You can request new verification emails as needed from your account settings.'
      },
      {
        title: 'Third‑Party Processors',
        items: [
          {
            label: 'Amazon Web Services (Elastic Beanstalk/EC2)',
            text: 'application hosting (USA).'
          },
          {
            label: 'MongoDB Atlas',
            text: 'database hosting (USA clusters).'
          },
          {
            label: 'Apple',
            text: 'app distribution and optional diagnostic data under Apple\'s own policy.'
          },
          {
            label: 'Google Workspace',
            text: 'handles support@risingpunk.com email forwarding.'
          },
          {
            label: 'Mailchimp',
            text: 'newsletter management and email delivery for subscribers who opt-in through our website. Mailchimp operates under their own privacy policy and data processing agreement.'
          }
        ],
        note: 'Each processor operates under a written data‑processing agreement.'
      },
      {
        title: 'International Data Transfers',
        content: 'Data is stored on servers in the United States. For EU/UK users, transfers rely on Standard Contractual Clauses or equivalent lawful mechanisms.'
      },
      {
        title: 'Data Retention',
        items: [
          {
            label: 'Active accounts:',
            text: 'retained until you delete or remain inactive for 12 months, after which they are scheduled for deletion.'
          },
          {
            label: 'User‑initiated deletion:',
            text: 'removed immediately from active systems and purged from backups within 30 days.'
          },
          {
            label: 'Server logs:',
            text: 'automatically deleted after 30 days.'
          },
          {
            label: 'Newsletter subscriptions:',
            text: 'retained until you unsubscribe. Upon unsubscription, your email address is removed from our mailing list.'
          },
          {
            label: 'Chat messages:',
            text: 'stored temporarily for moderation purposes. Messages may be retained longer if they are part of an active moderation investigation.'
          }
        ]
      },
      {
        title: 'Your Rights',
        content: 'Contact support@risingpunk.com to:',
        items: [
          'Access a copy of your email and handle.',
          'Rectify or update them.',
          'Delete your account (or request restriction/objection).',
          'Receive data in a portable format (JSON/CSV).',
          'Unsubscribe from the newsletter at any time.',
          'Request removal of specific chat messages if you believe they violate your privacy.'
        ],
        note: 'We respond within one month. EU/UK users may lodge a complaint with a supervisory authority (e.g., the ICO).'
      },
      {
        title: 'Security',
        content: 'Passwords are hashed; email addresses are encrypted at rest. We use HTTPS/TLS and role‑based access controls, but no method is 100% secure.'
      },
      {
        title: 'Data Breach Response',
        content: 'On discovering a personal‑data breach, we will notify affected users and regulators within 72 hours, outlining the incident and remedial steps.'
      },
      {
        title: 'Children\'s Privacy',
        content: 'RisingPunk is intended for users 16+. We do not knowingly collect data from younger children; any such data will be deleted.'
      },
      {
        title: 'Changes to This Policy',
        content: 'Material updates will be posted in‑app and/or via email with a revised effective date.'
      },
      {
        title: 'Contact',
        content: 'support@risingpunk.com',
        address: 'DevHead LLC, 3801 E. Windsong Dr., Phoenix, AZ 85048, USA'
      }
    ]
  },
  termsOfService: {
    effectiveDate: 'January 15, 2026',
    sections: [
      {
        title: 'Acceptance of Terms',
        content: 'Downloading or using RisingPunk constitutes agreement to these Terms and the Privacy Policy. If you do not agree, do not use the app.'
      },
      {
        title: 'Eligibility',
        content: 'You must be 16 years or older to create an account.'
      },
      {
        title: 'Account Registration and Security',
        items: [
          'Provide a valid email and choose a handle.',
          'Verify your email address to ensure account security and enable password recovery.',
          'You are responsible for safeguarding your password.',
          'Unverified accounts may have limited functionality and may be unrecoverable if locked.',
          'We may suspend or terminate accounts for violations or security concerns.'
        ]
      },
      {
        title: 'User Conduct',
        content: 'You agree not to:',
        items: [
          'Engage in cheating, fraud, or exploitation of bugs.',
          'Harass or impersonate others.',
          'Use the service for illegal or unauthorized purposes.',
          'Post inappropriate, offensive, or harmful content in chat.',
          'Share personal information in chat that could compromise your privacy or safety.',
          'Spam, flood, or disrupt chat channels.',
          'Use chat to promote scams, phishing, or malicious content.'
        ]
      },
      {
        title: 'User-Generated Content and Chat',
        content: `RisingPunk includes an in-app chat system where users can communicate with each other. By using this feature, you agree to the following:

• You are solely responsible for the content you post in chat.
• You grant us a license to use, display, and moderate your chat messages as necessary to provide and maintain the service.
• We reserve the right to review, moderate, edit, or remove any chat content at our discretion.
• You may report inappropriate content or behavior through the in-app reporting mechanism.
• We will investigate reports and take appropriate action, which may include content removal, warnings, temporary suspensions, or permanent account termination.
• Chat content may be stored temporarily for moderation and safety purposes.
• Do not share personal information, passwords, or sensitive data in chat.
• Chat is a public space - other users can see your messages, so communicate respectfully.`,
        items: [
          'Violations of chat rules may result in immediate suspension or termination of your account.',
          'Repeated violations will result in permanent account termination.',
          'We are not responsible for content posted by other users, but we will take action when violations are reported.'
        ]
      },
      {
        title: 'Reporting Inappropriate Content',
        content: `If you encounter inappropriate content or behavior in chat:

• Use the in-app reporting feature to report the content or user.
• Provide as much detail as possible to help us investigate.
• We will review all reports and take appropriate action.
• We may contact you for additional information if needed.
• False or malicious reports may result in action against your account.
• We reserve the right to take action even if content is not reported, if we discover violations through our moderation efforts.`
      },
      {
        title: 'Intellectual Property',
        content: 'All content and code are owned by DevHead LLC. We grant you a limited, non‑transferable license for personal entertainment.'
      },
      {
        title: 'Purchases and Ads',
        content: 'The game currently contains no in‑app purchases or advertising. Terms will be updated if this changes.'
      },
      {
        title: 'Suspension and Termination',
        content: 'We may suspend or terminate accounts at our discretion. If this occurs, data associated with the account may be retained for 30 days to allow an appeal via support@risingpunk.com. After that period, data is deleted.'
      },
      {
        title: 'Dispute Resolution and Governing Law',
        items: [
          'These Terms are governed by the laws of Arizona, USA.',
          'Binding arbitration in Phoenix, AZ, under the American Arbitration Association rules resolves any dispute, except that claims under small‑claims court or injunctions for intellectual property may be brought in court.',
          'You waive the right to participate in class actions or class‑wide arbitration.'
        ]
      },
      {
        title: 'Disclaimer of Warranties',
        content: 'The service is provided "as is" without warranties of any kind.'
      },
      {
        title: 'Limitation of Liability',
        content: 'To the maximum extent permitted by law, DevHead LLC is not liable for indirect, incidental, or consequential damages. Total liability will not exceed the amount you paid (if any) in the past 12 months.'
      },
      {
        title: 'Changes to Terms',
        content: 'We may modify these Terms. Continued use after changes constitutes acceptance. Updates will be posted in‑app and/or via email.'
      },
      {
        title: 'Contact',
        content: 'support@risingpunk.com',
        address: 'DevHead LLC, 3801 E. Windsong Dr., Phoenix, AZ 85048, USA'
      }
    ]
  }
};

/**
 * Renders Privacy Policy sections as React elements
 */
export function renderPrivacyPolicySections() {
  const doc = DOCUMENTS.privacyPolicy;
  
  return doc.sections.map((section, index) => {
    if (section.title === 'Contact') {
      return (
        <div key={index}>
          <h2>{section.title}</h2>
          <div className="contact-info">
            <p><strong>{section.content}</strong></p>
            <p>{section.address}</p>
          </div>
        </div>
      );
    }

    // Process content with bullet points
    let contentElements = [];
    if (section.content) {
      const lines = section.content.split('\n');
      let currentList = [];
      
      lines.forEach((line, lineIndex) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('•')) {
          currentList.push(trimmed.substring(1).trim());
        } else if (trimmed) {
          if (currentList.length > 0) {
            contentElements.push(
              <ul key={`list-${lineIndex}`}>
                {currentList.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            );
            currentList = [];
          }
          contentElements.push(<p key={lineIndex}>{trimmed}</p>);
        }
      });
      
      if (currentList.length > 0) {
        contentElements.push(
          <ul key={`list-final`}>
            {currentList.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        );
      }
    }

    return (
      <div key={index}>
        <h2>{section.title}</h2>
        {contentElements.length > 0 && <div>{contentElements}</div>}
        {section.items && (
          <>
            {Array.isArray(section.items) && typeof section.items[0] === 'string' ? (
              <ul>
                {section.items.map((item, itemIndex) => (
                  <li key={itemIndex}>{item}</li>
                ))}
              </ul>
            ) : (
              section.items.map((item, itemIndex) => {
                if (item.label && item.text) {
                  return (
                    <p key={itemIndex}>
                      <strong>{item.label}</strong> – {item.text}
                    </p>
                  );
                }
                return null;
              })
            )}
          </>
        )}
        {section.note && <p>{section.note}</p>}
      </div>
    );
  });
}

/**
 * Renders Terms of Service sections as React elements
 */
export function renderTermsOfServiceSections() {
  const doc = DOCUMENTS.termsOfService;
  
  return doc.sections.map((section, index) => {
    if (section.title === 'Contact') {
      return (
        <div key={index}>
          <h2>{section.title}</h2>
          <div className="contact-info">
            <p><strong>{section.content}</strong></p>
            <p>{section.address}</p>
          </div>
        </div>
      );
    }

    // Process content with bullet points
    let contentElements = [];
    if (section.content) {
      const lines = section.content.split('\n');
      let currentList = [];
      
      lines.forEach((line, lineIndex) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('•')) {
          currentList.push(trimmed.substring(1).trim());
        } else if (trimmed) {
          if (currentList.length > 0) {
            contentElements.push(
              <ul key={`list-${lineIndex}`}>
                {currentList.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            );
            currentList = [];
          }
          contentElements.push(<p key={lineIndex}>{trimmed}</p>);
        }
      });
      
      if (currentList.length > 0) {
        contentElements.push(
          <ul key={`list-final`}>
            {currentList.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        );
      }
    }

    return (
      <div key={index}>
        <h2>{section.title}</h2>
        {contentElements.length > 0 && <div>{contentElements}</div>}
        {section.items && (
          <ul>
            {section.items.map((item, itemIndex) => (
              <li key={itemIndex}>{item}</li>
            ))}
          </ul>
        )}
      </div>
    );
  });
}

export function getPrivacyPolicyEffectiveDate() {
  return DOCUMENTS.privacyPolicy.effectiveDate;
}

export function getTermsOfServiceEffectiveDate() {
  return DOCUMENTS.termsOfService.effectiveDate;
}
