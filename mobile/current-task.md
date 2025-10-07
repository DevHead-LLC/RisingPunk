# App Store Submission Checklist

## Phase 1: Xcode Build Preparation
- [x] **1.1** Set Build Configuration to Release
- [x] **1.2** Verify Bundle Identifier matches App Store Connect
- [x] **1.3** Confirm Version Number (1.0.0)
- [x] **1.4** Confirm Build Number (18+)
- [x] **1.5** Verify Code Signing Settings
- [x] **1.6** Clean Build Folder
- [x] **1.7** Create Archive

## Phase 2: Upload to App Store Connect
- [x] **2.1** Upload Archive via Xcode (Completed with hermes.framework symbol warning - will fix in next release)
- [x] **2.2** Verify Upload Success
- [x] **2.3** Wait for Processing (5-10 minutes)

## Phase 3: App Store Connect Configuration
- [x] **3.1** Select Build in App Store Connect
- [x] **3.2** Review Final Metadata
- [x] **3.3** Verify All Required Fields Complete
- [ ] **3.4** Check App Review Information

## Phase 4: Submit for Review
- [ ] **4.1** Submit App for Review
- [ ] **4.2** Confirm Submission
- [ ] **4.3** Note Submission ID

## Phase 5: Monitor Review
- [x] **5.1** Check Review Status (Received rejection - metadata issue)
- [x] **5.2** Respond to Any Feedback (Fixed app display name)
- [ ] **5.3** Handle Rejection (if any) - RESOLVED: App name mismatch

## Phase 6: App Store Rejection Resolution
- [x] **6.1** Identify Issue: App display name "mobile" vs marketplace name "RisingPunk"
- [x] **6.2** Update app.json displayName to "RisingPunk"
- [x] **6.3** Update Info.plist CFBundleDisplayName to "RisingPunk"
- [ ] **6.4** Create new build with corrected metadata
- [ ] **6.5** Resubmit to App Store

---

## Current Step: 6.4 - Create new build with corrected metadata

**Status:** 🔍 **IN PROGRESS**

**Issue Resolved:** App Store rejection due to metadata mismatch
- **Problem:** App displayed as "mobile" on device vs "RisingPunk" in App Store
- **Solution:** Updated both app.json and Info.plist to use "RisingPunk" as display name
- **Next:** Need to create new build and resubmit
