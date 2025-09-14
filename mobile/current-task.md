# DEBUG LOGS FOR EMAIL TROUBLESHOOTING

## Problem
Forgot password emails work locally but fail silently on staging server. Need to identify where the email process is failing.

## Debug Logs Added (TO REMOVE AFTER FIX)

### 1. Auth Route Debug Logs
**File:** `server/src/routes/auth.ts`
**Lines:** 904-972 (forgot-password endpoint)
**Purpose:** Track if forgot-password route is being called and reaching email service
**Logs Added:**
- Line 904: `🔍 [DEBUG] Forgot password request received`
- Line 906: `🔍 [DEBUG] Email provided:`
- Line 909: `❌ [DEBUG] No email provided`
- Line 915: `🔍 [DEBUG] Looking up user by email hash`
- Line 918: `❌ [DEBUG] User not found for email`
- Line 923: `✅ [DEBUG] User found:`
- Line 926: `🔍 [DEBUG] Checking if email is verified:`
- Line 928: `❌ [DEBUG] Email not verified`
- Line 932: `✅ [DEBUG] Email is verified`
- Line 935: `🔍 [DEBUG] Checking if Google account:`
- Line 937: `❌ [DEBUG] Google account - cannot reset password`
- Line 941: `✅ [DEBUG] Not a Google account - proceeding with password reset`
- Line 944: `🔍 [DEBUG] Generating password reset token`
- Line 947: `✅ [DEBUG] Reset token generated, expires at:`
- Line 950: `🔍 [DEBUG] Saving reset token to user`
- Line 955: `✅ [DEBUG] Reset token saved to database`
- Line 958: `📧 [DEBUG] Attempting to send password reset email to:`
- Line 964: `📧 [DEBUG] Email send result:`
- Line 967: `✅ [DEBUG] Password reset email sent successfully`
- Line 970: `❌ [DEBUG] Failed to send password reset email`

### 2. EmailService Debug Logs  
**File:** `server/src/services/EmailService.ts`
**Lines:** 13-40 (getBaseUrl method)
**Purpose:** Track URL resolution and environment variables
**Logs Added:**
- Line 14: `🔍 [DEBUG] EmailService.getBaseUrl() called`
- Line 15: `🔍 [DEBUG] CLIENT_URL:`
- Line 16: `🔍 [DEBUG] NODE_ENV:`
- Line 20: `✅ [DEBUG] Using CLIENT_URL from environment:`
- Line 26: `🔍 [DEBUG] CLIENT_URL not set, using NODE_ENV fallback:`
- Line 30: `✅ [DEBUG] Using staging URL: https://api.risingpunk.dev`
- Line 33: `✅ [DEBUG] Using production URL: https://api.risingpunk.com`
- Line 37: `✅ [DEBUG] Using development URL: http://localhost:5001`

### 3. EmailService Transporter Debug Logs
**File:** `server/src/services/EmailService.ts`
**Lines:** 42-64 (getTransporter method)
**Purpose:** Track email service initialization and credentials
**Logs Added:**
- Line 43: `🔍 [DEBUG] EmailService.getTransporter() called`
- Line 48: `🔍 [DEBUG] EMAIL_USER:`
- Line 49: `🔍 [DEBUG] EMAIL_PASSWORD:`
- Line 52: `❌ [DEBUG] Missing email credentials`
- Line 56: `🔍 [DEBUG] Creating nodemailer transporter`
- Line 64: `✅ [DEBUG] Nodemailer transporter created successfully`

### 4. EmailService Send Method Debug Logs
**File:** `server/src/services/EmailService.ts`
**Lines:** 377-395 (sendPasswordResetEmail method)
**Purpose:** Track email sending process
**Logs Added:**
- Line 382: `🔍 [DEBUG] sendPasswordResetEmail called with:`
- Line 386: `🔍 [DEBUG] Generated reset URL:`
- Line 389: `🔍 [DEBUG] Created email template, calling sendEmail`
- Line 392: `🔍 [DEBUG] sendEmail result:`

### 5. EmailService SendEmail Method Debug Logs
**File:** `server/src/services/EmailService.ts`
**Lines:** 341-367 (sendEmail method)
**Purpose:** Track actual email sending
**Logs Added:**
- Line 345: `🔍 [DEBUG] sendEmail called with to:`
- Line 347: `🔍 [DEBUG] Getting transporter...`
- Line 349: `✅ [DEBUG] Transporter obtained`
- Line 358: `🔍 [DEBUG] Mail options prepared, sending email...`
- Line 361: `✅ [DEBUG] Email sent successfully:`
- Line 364: `❌ [DEBUG] Failed to send email:`

## Expected Behavior
- Should see "🔍 [DEBUG] Forgot password request received" when user triggers forgot password
- Should see "📧 [DEBUG] Attempting to send password reset email to:" 
- Should see "🔍 [DEBUG] EmailService.getBaseUrl() called" with environment details
- Should see "📧 [DEBUG] Email send result: true/false"

## Files to Clean Up After Fix
- server/src/routes/auth.ts (lines 904-972 - remove all [DEBUG] logs)
- server/src/services/EmailService.ts (lines 13-40, 42-64, 341-367, 377-395 - remove all [DEBUG] logs)
