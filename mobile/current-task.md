# Google Play Store Deployment - October 2025

## Step 1: Get D-U-N-S Number (START HERE)

**What is it?** A unique 9-digit identifier from Dun & Bradstreet (D&B) that verifies your organization's legal identity. Required for organization developer accounts (unless you're a government agency).

**Process:**

1. [ ] **Check if you already have a D-U-N-S number:**
   - Visit: https://www.dnb.com/duns-number/lookup.html
   - Search by business name, state, and country
   - If found, note the number and verify the business info matches

2. [ ] **If you don't have one, apply for free (takes 1-2 business days):**
   - **Online:** Visit https://www.dnb.com/duns-number/get-a-duns.html
   - Click "Get a D-U-N-S Number"
   - Fill out required info:
     - Legal business name
     - Business address (headquarters)
     - Phone number
     - Contact name and title
     - Number of employees
   - Submit application
   - **OR call:** 1-866-705-5711 (toll-free) - number assigned during call

3. [ ] **Verify D-U-N-S information is accurate:**
   - Business name must match exactly
   - Address must match exactly
   - Phone number should match your public registry/web listing
   - **Critical:** This must match your Google Payments profile info later

---

## Step 2: Account Setup

### Basic Requirements
- [ ] Create Google Play Developer account ($25 one-time fee)
- [ ] Accept Developer Distribution Agreement
- [ ] Link Google Payments profile during account creation (represents real-world identity)

### Organization Account Information Needed
- [ ] Developer name (can differ from org name, appears on Play Store, changeable anytime)
- [ ] D-U-N-S number (from Step 1 above)
- [ ] Organization name (must match Google Payments profile)
- [ ] Organization address (must match Google Payments profile and D-U-N-S profile)
- [ ] Organization phone number (should match public registry/web listing)
- [ ] Organization website
- [ ] Contact name
- [ ] Contact email address (for Google to contact you - must verify with OTP)
- [ ] Contact phone number (for Google to contact you - must verify with OTP)
- [ ] Developer email address (shown on Play Store - must verify with OTP)
- [ ] Developer phone number (shown on Play Store - must verify with OTP)

### Identity Verification
- [ ] Verify legal name and address before publishing (required)
- [ ] Ensure Google Payments profile matches Dun & Bradstreet profile exactly
- [ ] Keep contact emails/phones operational for duration of account

### Payment Method (if monetizing)
- [ ] Create merchant account
- [ ] Add payment method (bank account: name, sort code, account number)
- [ ] Verify payment method (deposit challenge OR upload bank documents - can take up to 5 days)

---

## Step 3: Code Requirements (Critical for October 2025)

- [x] **Update Target API Level to 35:**
  - Updated `targetSdkVersion = 35` in `mobile/android/build.gradle` ✓
  - Meets Android 15 requirement for November 2025

- [x] **Generate production keystore:**
  - Production keystore generated: `risingpunk-release.keystore` ✓
  - Release signing configured with production keystore ✓

- [ ] **Configure 16 KB memory page support:**
  - Critical for November 1, 2025 requirement

- [ ] **Build as AAB (Android App Bundle):**
  - Google requires AAB format, not APK
  - Configure build to produce AAB for release

**Current Code State:**
- `compileSdkVersion = 35` ✓ (already correct)
- `targetSdkVersion = 35` ✓ (updated to meet November 2025 requirements)
- Release signing uses production keystore ✓ (configured)

---

## Step 4: App Information

- [ ] App name and description
- [ ] High-quality screenshots (minimum 2)
- [ ] App icon (already exists) ✓
- [ ] Privacy Policy URL (required - app uses auth/data collection)
- [ ] Complete Content Rating questionnaire

---

## Step 5: Testing

- [ ] Set up Internal testing track
- [ ] Add minimum 20 test users
- [ ] Test for at least 2 weeks before public release (Google requirement)

---

## Step 6: Distribution Settings

- [ ] Set pricing (Free or Paid)
- [ ] Select distribution countries

---

## Step 7: Submit for Review

- [ ] Upload AAB file to Google Play Console
- [ ] Complete all required fields
- [ ] Submit for review

---

## Notes

- All contact emails and phone numbers must remain operational for duration of developer account
- Keep Google Payments profile up to date to maintain account standing
- Only account owner can manage merchant payment accounts
- Google will display legal name, legal address, developer email, and developer phone on Play Store for organization accounts
