/**
 * Shared document data for Privacy Policy and Terms of Service
 * Used by web, mobile, and server applications
 * 
 * Last Updated: April 29, 2026
 */

export const DOCUMENTS = {
  privacyPolicy: {
    effectiveDate: 'April 29, 2026',
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
            label: 'Last login activity',
            text: 'we store the timestamp of successful account access, including new sign-ins and returning sessions, to support account security, fraud prevention, and account support.'
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
            label: 'Device and vendor identifiers (guest accounts)',
            text: 'for guest play we store a device-linked identifier and an optional stable device (vendor) identifier to persist your guest session and to attempt account recovery if you contact support; we do not guarantee that recovery is possible. Share these identifiers only with support@risingpunk.com when requesting recovery; never share them with anyone else.'
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
          },
          {
            label: 'Analytics and usage data (Mobile App)',
            text: 'we use Google Firebase Analytics to collect anonymous usage statistics in our mobile app, including app opens, screen views, and in-game actions (such as account creation, builds, battles, and feature usage). This data helps us improve the app experience and understand how users interact with the game. Analytics data is processed by Google and is subject to Google\'s Privacy Policy. No personally identifiable information (such as email addresses or usernames) is collected through Firebase Analytics. All analytics data is anonymized and aggregated.'
          },
          {
            label: 'Website analytics and tracking',
            text: 'if you visit our website, we use Google Analytics, Google Search Console, and Microsoft Clarity to understand website usage, improve our website experience, and analyze user behavior. These services may collect information such as page views, time on site, device information, and general location data (country/city level). This data is processed by Google and Microsoft respectively and is subject to their privacy policies. Website analytics are separate from app analytics and do not track your in-app behavior.'
          },
          {
            label: 'Advertising and attribution data',
            text: 'we use advertising platforms (Google Ads, YouTube Ads, and Apple Search Ads) to promote our app. These platforms may collect data about ad interactions, conversions, and device identifiers for attribution (to understand which ads led to installs). On iOS we support Apple\'s SKAdNetwork and may request permission to track through App Tracking Transparency (ATT); see "iOS: Advertising measurement (ATT and SKAdNetwork)" below. Data is used to measure advertising effectiveness and is processed by the respective platforms according to their privacy policies.'
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
            text: 'for newsletter subscriptions, user-generated content in chat, and—on iOS—optional tracking when you allow it through Apple\'s App Tracking Transparency prompt.'
          }
        ]
      },
      {
        title: 'How We Use Information',
        items: [
          'Authenticate and manage accounts.',
          'Record successful login and returning-session activity for account security and support.',
          'Send essential service messages or support replies.',
          'Send email verification links and password recovery emails.',
          'Protect the service against fraud or abuse.',
          'Send newsletter updates (only if you subscribed) with game updates, strategy tips, and exclusive rewards like balance increases you can claim in-game.',
          'Moderate user-generated content in chat to ensure a safe and respectful community environment.',
          'Measure advertising effectiveness and app install attribution (including Google Ads and Apple frameworks on iOS, as described in this Policy).'
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
        title: 'Guest Accounts and Device Linking',
        content: `You may play as a guest without providing an email. Guest accounts are linked to your device using device and vendor identifiers so you can resume the same account when you return. We store these identifiers to support guest session persistence and optional account recovery.

We cannot guarantee that a previously used guest account can be found or re-linked to your device if you lose access (for example after an app reinstall or device change). If you need to recover a guest account, you may contact support with your device and vendor IDs (shown in Profile → Account → Account recovery); we will attempt to re-link when possible but make no guarantees. Only share your device and vendor IDs with support@risingpunk.com when requesting account recovery; never share them elsewhere.

For better protection and the ability to use your account across devices, we strongly recommend that you link an email and password to your guest account and verify your email. Linked and verified accounts can sign in from any device and use password recovery.`,
        note: 'Guest accounts that are not linked to email have no cross-device recovery option and may be lost if device linking cannot be restored.'
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
          },
          {
            label: 'Google Firebase Analytics',
            text: 'collects anonymous app usage statistics and in-game event data. Data is processed according to Google\'s Privacy Policy and is not used to identify individual users.'
          },
          {
            label: 'Google Analytics (Website)',
            text: 'collects website usage statistics when you visit our website. Data is processed according to Google\'s Privacy Policy.'
          },
          {
            label: 'Microsoft Clarity (Website)',
            text: 'provides website analytics and user behavior insights when you visit our website. Data is processed according to Microsoft\'s Privacy Policy.'
          },
          {
            label: 'Google Ads / YouTube Ads',
            text: 'used for advertising and install attribution; on iOS our app declares compatible SKAdNetwork identifiers and we may request App Tracking Transparency permission for measurement. Data is processed according to Google\'s Privacy Policy.'
          },
          {
            label: 'Apple Search Ads',
            text: 'used for advertising and attribution tracking to measure ad effectiveness. Data is processed according to Apple\'s Privacy Policy.'
          }
        ],
        note: 'Each processor operates under a written data‑processing agreement.'
      },
      {
        title: 'iOS: Advertising measurement (ATT and SKAdNetwork)',
        content: `On Apple devices, we may use Apple\'s App Tracking Transparency (ATT). If we request access, Apple shows a system permission dialog; you can allow or deny tracking. That choice controls whether the Identifier for Advertisers (IDFA) may be used for advertising measurement as described by Apple and our partners (for example, Google).

Our iOS app includes SKAdNetwork identifiers so participating ad networks can use Apple\'s SKAdNetwork framework for privacy-preserving, aggregated install and campaign measurement. SKAdNetwork operates separately from ATT/IDFA; Apple publishes technical details in its developer documentation.

Whether you allow or deny tracking in the ATT prompt, we may still use Firebase Analytics and other tools described in this Policy, subject to your settings and applicable law.`
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
    effectiveDate: 'April 29, 2026',
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
          'We record successful login and returning-session activity to protect account security and support account recovery/troubleshooting.',
          'You are responsible for safeguarding your password.',
          'Unverified accounts may have limited functionality and may be unrecoverable if locked.',
          'We may suspend or terminate accounts for violations or security concerns.'
        ]
      },
      {
        title: 'Guest Accounts',
        content: `You may play as a guest without registering an email. Guest accounts are tied to your device. We collect device and vendor identifiers to support guest session persistence and account recovery. We cannot guarantee that a guest account can be found or re-linked if you lose access (e.g., after an app reinstall or if you are prompted to create a new guest). Account recovery may be attempted via support but is not assured. If you contact support for recovery, share your device and vendor IDs only with support@risingpunk.com; never share them with anyone else.

For better protection and to use your account across devices, we strongly recommend linking an email and password to your guest account and verifying your email. Linked and verified accounts can sign in from any device and use password recovery.`,
        note: 'We do not guarantee recovery of guest accounts that are not linked to email.'
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
        content: `The game does not currently offer in‑app purchases. We do not show third‑party advertising inside the app today; if that changes, we will update these Terms.

We run marketing campaigns through third‑party platforms (including Google Ads). We use measurement and attribution tools so we can understand which campaigns drive installs—including, on Apple devices, Apple\'s App Tracking Transparency prompt and SKAdNetwork as described in our Privacy Policy. By using the app on iOS, you may see Apple\'s tracking permission dialog; your choice applies as described by Apple and in the Privacy Policy.`
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
