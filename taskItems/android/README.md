# Android Development Documentation

**Last Updated**: January 21, 2026

This directory contains all Android-specific documentation for the Rising Punk mobile app.

---

## 📁 Directory Structure

```
taskItems/android/
├── README.md (this file)
├── production-code-analysis.md
├── direct-device-deployment-guide.md
├── edge-to-edge-display-migration.md
└── turf/
    ├── android-scrolling-fix.md
    ├── turf-tap-fix.md
    ├── investment-property-remodel-modal-android.md
    └── home/
        └── hackMap/
            ├── README.md
            ├── hackmap-android-investigation.md
            ├── hackmap-android-diagnostic-code.md
            ├── hackmap-improvements-needed.md
            └── quick-test-script.md
```

---

## 🚀 Quick Start

### New to Android Development on This Project?
1. Read [`build-scripts-reference.md`](./build-scripts-reference.md) - **NEW**: Device-specific build script setup
2. Read [`direct-device-deployment-guide.md`](./direct-device-deployment-guide.md) - Deploy to physical devices via USB
3. Review [`production-code-analysis.md`](./production-code-analysis.md) - Understand device vs emulator differences

### Testing on Pixel 4a 5G?
**Quick command**: `npm run android:pixel4a-staging`
- See [`build-scripts-reference.md`](./build-scripts-reference.md) for details

### Working on TurfScreen?
- [`turf/turf-tap-fix.md`](./turf/turf-tap-fix.md) - ✅ **FIXED**: Tap issue resolved (Jan 21, 2026)
- [`turf/android-scrolling-fix.md`](./turf/android-scrolling-fix.md) - Historical: Panning crash fix
- [`turf/investment-property-remodel-modal-android.md`](./turf/investment-property-remodel-modal-android.md) - ✅ **FIXED**: Remodel modal was top-left off-screen on Android; explicit overlay dimensions + Modal props (Feb 2026)

### Working on HackMap?
- [`turf/home/hackMap/README.md`](./turf/home/hackMap/README.md) - Quick reference for all HackMap issues
- [`turf/home/hackMap/quick-test-script.md`](./turf/home/hackMap/quick-test-script.md) - 10-minute diagnostic test

---

## 📚 Documentation by Topic

### 🔧 General Android Development

**[`direct-device-deployment-guide.md`](./direct-device-deployment-guide.md)**
- Deploy to physical Android devices via USB
- View real-time logs
- Debug without Play Store uploads
- Essential commands and troubleshooting

**[`production-code-analysis.md`](./production-code-analysis.md)**
- Why production builds behave differently than debug builds
- ProGuard, memory constraints, and device-specific issues
- Debug vs Release build comparison
- Device vs Emulator analysis

**[`edge-to-edge-display-migration.md`](./edge-to-edge-display-migration.md)** 🟡 **INVESTIGATION**
- **Issue**: Edge-to-edge display requirements for Android 15 (SDK 35)
- **Status**: Deprecated APIs identified, migration plan documented
- **Priority**: Medium - Required for SDK 35+ compliance
- **Action**: Replace deprecated `setDecorFitsSystemWindows()` with `WindowCompat.enableEdgeToEdge()`

---

### 📱 App-wide

**[`appWide/guest-login-play-as-guest.md`](./appWide/guest-login-play-as-guest.md)** 🔴 **CURRENT**
- **Issue**: On staging (api.risingpunk.dev), "Play as Guest" logs user back into the previous full account instead of creating/resuming a device-linked guest.
- **Constraints**: Same as iOS (one guest per device, link account, dependable login/logout, deviceId must not lock out, logout of other account must not break guest).
- **Reference**: [iOS guest-login doc](../../ios/appWide/guest-login-play-as-guest.md) for behavior and server details.

---

### 📱 TurfScreen Issues

**[`turf/turf-tap-fix.md`](./turf/turf-tap-fix.md)** 🔴 **CURRENT**
- **Issue**: Finger taps don't register on Android device
- **Cause**: Pan gesture too aggressive, consuming all touch events
- **Fix**: Adjust `minDistance` and `activeOffsetX` thresholds
- **Status**: Fix applied, ready for testing

**[`turf/android-scrolling-fix.md`](./turf/android-scrolling-fix.md)** ✅ **RESOLVED**
- **Issue**: Pan/scroll crashed app on Android
- **Cause**: `runOnJS` in high-frequency gesture handler
- **Fix**: Removed problematic `runOnJS` calls
- **Status**: Working, documented for reference

---

### 🗺️ HackMap Issues

**Navigation**: All HackMap docs are in [`turf/home/hackMap/`](./turf/home/hackMap/)

**[`turf/home/hackMap/README.md`](./turf/home/hackMap/README.md)** - **Start Here**
- Quick reference for all HackMap documentation
- Decision tree for diagnosis
- Links to all relevant files

**[`turf/home/hackMap/quick-test-script.md`](./turf/home/hackMap/quick-test-script.md)**
- 10-minute test procedure
- Identifies root cause (ProGuard, memory, or layout)
- Step-by-step commands

**[`turf/home/hackMap/hackmap-android-investigation.md`](./turf/home/hackMap/hackmap-android-investigation.md)**
- Complete technical analysis
- 5 potential root causes
- Risk assessment
- Multiple fix options

**[`turf/home/hackMap/hackmap-android-diagnostic-code.md`](./turf/home/hackMap/hackmap-android-diagnostic-code.md)**
- 8 code snippets for debugging
- Exact line numbers and locations
- Expected log patterns
- Testing procedures

**[`turf/home/hackMap/hackmap-improvements-needed.md`](./turf/home/hackMap/hackmap-improvements-needed.md)**
- Performance optimization history
- Completed improvements
- Known issues and fixes

---

## 🎯 Current Active Issues

### ✅ Resolved
1. **TurfScreen Tap Issue** - FIXED (January 21, 2026)
   - **File**: [`turf/turf-tap-fix.md`](./turf/turf-tap-fix.md)
   - **Fix**: Adjusted gesture thresholds (minDistance: 8, activeOffsetX: ±8)
   - **Status**: Applied and working

2. **Investment Property Remodel Modal** - FIXED (February 2026)
   - **File**: [`turf/investment-property-remodel-modal-android.md`](./turf/investment-property-remodel-modal-android.md)
   - **Fix**: Explicit overlay width/height + Modal props (onRequestClose, statusBarTranslucent, presentationStyle) and pointer events so modal centers on Android
   - **Status**: Applied and documented

### 🟡 Under Investigation
2. **Guest Login (Play as Guest)** - Staging build auto-logs into previous account
   - **File**: [`appWide/guest-login-play-as-guest.md`](./appWide/guest-login-play-as-guest.md)
   - **Issue**: "Play as Guest" on staging (api.risingpunk.dev) logs back into the account just signed out instead of creating/resuming guest.
   - **Constraints**: Align with iOS (one guest per device, dependable login/logout, deviceId must not lock out).

3. **Edge-to-Edge Display Migration** - Android 15 (SDK 35) compliance
   - **File**: [`edge-to-edge-display-migration.md`](./edge-to-edge-display-migration.md)
   - **Status**: Investigation complete, migration plan documented
   - **Priority**: MEDIUM - Required for SDK 35+ compliance
   - **Next Step**: Implement `WindowCompat.enableEdgeToEdge()` migration

4. **HackMap Loading** - Map not loading on Pixel 4a 5G
   - **Directory**: [`turf/home/hackMap/`](./turf/home/hackMap/)
   - **Status**: Multiple potential causes identified
   - **Priority**: MEDIUM - may be device-specific
   - **Next Step**: Test with new build script to confirm

---

## 🔍 Troubleshooting Flowchart

```
Android Issue?
    ↓
Is it TurfScreen related?
    ↓ YES → See turf/ directory
    ↓        ├─ Taps not working? → turf-tap-fix.md
    ↓        ├─ Panning crashes? → android-scrolling-fix.md
    ↓        └─ Remodel modal off-screen? → investment-property-remodel-modal-android.md
    ↓
    ↓ NO
    ↓
Is it HackMap related?
    ↓ YES → See turf/home/hackMap/ directory
    ↓        └─ Start with README.md for navigation
    ↓
    ↓ NO
    ↓
General Android issue?
    ↓ → See production-code-analysis.md
    ↓ → See direct-device-deployment-guide.md
    ↓ → Edge-to-edge/Android 15? → edge-to-edge-display-migration.md
```

---

## 🛠️ Common Tasks

### Deploy to Physical Device
```bash
# See: direct-device-deployment-guide.md
adb devices
cd mobile
npx react-native run-android
```

### View Device Logs
```bash
# See: direct-device-deployment-guide.md
adb logcat | grep "ReactNative"
```

### Test Release Build Locally
```bash
# See: production-code-analysis.md
cd mobile/android
./gradlew assembleRelease
adb install -r app/build/outputs/apk/release/app-release.apk
```

### Debug HackMap Issue
```bash
# See: turf/home/hackMap/quick-test-script.md
# Follow the 10-minute test procedure
```

---

## 📝 Document Maintenance

### When Adding New Documentation

1. **Determine category**:
   - General Android → Root `android/` directory
   - TurfScreen → `turf/` directory
   - HackMap → `turf/home/hackMap/` directory

2. **Update this README**:
   - Add to appropriate section
   - Update directory structure diagram
   - Add to troubleshooting flowchart if needed

3. **Cross-reference**:
   - Link from related documents
   - Update parent directory READMEs

---

## 🔗 Related Documentation

### Outside Android Directory
- `mobile/android/` - Android build configuration
- `mobile/src/screens/TurfScreen.tsx` - TurfScreen implementation
- `mobile/src/screens/HackMapScreen.tsx` - HackMap implementation
- `taskItems/hackMap/performance/` - HackMap performance docs (iOS + Android)

### Key Files to Reference
- `mobile/android/app/build.gradle` - Build configuration
- `mobile/android/app/proguard-rules.pro` - ProGuard rules
- `mobile/android/app/src/main/AndroidManifest.xml` - Manifest

---

## ✅ Success Criteria

This documentation is successful when:
- [ ] New developers can deploy to Android devices within 30 minutes
- [ ] Common issues have clear troubleshooting paths
- [ ] Each issue has a dedicated, well-organized document
- [ ] Navigation between related docs is intuitive
- [ ] Historical context is preserved but clearly marked

---

## 📞 Getting Help

1. **Check this README** for navigation
2. **Use the troubleshooting flowchart** above
3. **Search for keywords** in relevant documents
4. **Follow quick-start guides** for common tasks
5. **Review related files** if issue is unclear

---

**Last Updated**: January 2026  
**Maintained By**: Development Team  
**Status**: Active Development
