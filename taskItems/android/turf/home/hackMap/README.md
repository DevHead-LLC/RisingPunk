# Android HackMap Investigation - Quick Reference

**Device**: Google Pixel 4a 5G  
**Issue**: HackMap not loading properly  
**Status**: 🔍 Ready for Diagnostic Testing

---

## 📋 Summary

The HackMap works fine on Pixel 9 Pro emulator but not on the Pixel 4a 5G physical device. This investigation aims to:

1. **Determine if this is a production issue** or device-specific problem
2. **Identify the root cause** through diagnostic logging
3. **Implement a targeted fix** if needed

---

## 🎯 Key Findings - REVISED

### 🔴 Most Likely: Debug vs Release Build Behavior

**Important Distinction**:
- You've been testing **RELEASE builds** on Pixel 4a 5G (via Play Store)
- You've been testing **DEBUG builds** on Pixel 9 Pro emulator (via `npx react-native run-android`)

**Key Differences in Release Builds**:
1. **No Metro bundler** - Bundle is pre-compiled, no hot reload
2. **Performance optimizations** - More aggressive
3. **Hermes bytecode** - Different code execution path
4. **Error handling** - Silent failures instead of red screens
5. **Network timeouts** - May behave differently

### 🟡 Container Dimension Timing (Most Likely Root Cause)

The map loading uses a viewport-based approach that depends on container dimensions:

```typescript
const shouldSkipInitialQuery = containerSize.width === 0 || containerSize.height === 0;
```

**On Pixel 4a 5G in release mode**:
- `onLayout` may fire later or with wrong values
- `Dimensions.get('window')` may be incorrect initially in landscape
- Query gets skipped because containerSize is 0
- Map never loads

**Why emulator works**:
- Debug builds have different timing
- Emulator has perfect dimensions immediately
- Faster layout calculation

### 🟢 Memory Constraints (Possible but Less Likely)

**Pixel 4a 5G**: 6GB RAM (2020)  
**Pixel 9 Pro**: 16GB RAM (2024)  

Older device may struggle with 1000-item cache, but unlikely to be primary cause.

---

## 📁 Investigation Files

### 🚨 NEW: Production Code Analysis
**File**: `taskItems/android/production-code-analysis.md`
- **2 CRITICAL ISSUES IDENTIFIED**:
  1. ProGuard minification (release builds only) 🔴
  2. Memory constraints on 6GB device 🟡
- Device vs Emulator comparison
- Why emulators don't show the issue
- Quick test procedures

### 🔌 NEW: Direct Device Deployment Guide
**File**: `taskItems/android/direct-device-deployment-guide.md`
- Deploy to Pixel 4a 5G via USB (NO Play Store needed!)
- Real-time logging and debugging
- Much faster iteration than Play Console

### Main Analysis Document
**File**: `taskItems/android/hackmap-android-investigation.md`
- Complete analysis of the issue
- Potential root causes identified
- Risk assessment and recommendations
- Multiple fix options proposed

### Diagnostic Code
**File**: `taskItems/android/hackmap-android-diagnostic-code.md`
- Specific code snippets to add
- Complete logging implementation
- Expected log patterns
- Testing instructions

### Related Files
- `mobile/src/components/hackMap/VisitingProfileModal.tsx` - Another user’s profile from the map; Android scroll / overlay pattern: [visiting-profile-modal-android-scroll.md](./visiting-profile-modal-android-scroll.md)
- `mobile/src/screens/HackMapScreen.tsx` - Map component (needs diagnostic logging)
- `mobile/android/build.gradle` - Build config (minSdk: 24, target: 35, ProGuard: ENABLED)
- `mobile/android/app/proguard-rules.pro` - ProGuard rules (strips console.log in release!)
- `taskItems/android/android-scrolling-fix.md` - Previous Android gesture issues
- `taskItems/hackMap/performance/hackmap-optimization-complete.md` - Recent iOS optimizations

---

## 🚀 Quick Start - REVISED

### The Real Issue: Debug vs Release Timing

You've been comparing:
- **Pixel 4a 5G**: Release build from Play Store
- **Pixel 9 Pro Emulator**: Debug build from `npx react-native run-android`

**To test properly, you need to compare apples to apples:**

### Option 1: Deploy Debug Build to Pixel 4a 5G (Recommended)

```bash
# Connect device via USB
adb devices

# Deploy debug build (same as emulator)
cd mobile
npx react-native run-android

# If map works now → It's a release build issue
# If map still fails → It's device-specific
```

This tests whether it's truly a device issue or a debug/release difference.

---

### Option 2: Deploy Release Build to Emulator

```bash
# Build release APK
cd mobile/android
./gradlew assembleRelease

# Install on emulator
adb -e install -r app/build/outputs/apk/release/app-release.apk

# If map fails → It's a release build issue affecting all devices
# If map works → It's specific to Pixel 4a 5G hardware
```

---

## 🔍 Expected Findings

### If Working (Pixel 9 Pro)
```
[HackMap android] Initial dimensions: { width: 915, height: 412 }
[HackMap android] onContainerLayout fired: { width: 915, height: 412 }
[HackMap android] shouldSkipInitialQuery: false
[HackMap android] Initial viewport data received: { hasGrid: true, ... }
[HackMap android] Found user house at: { x: 25, y: 20 }
```

### If Broken (Pixel 4a 5G)
Could be any of:
- Container size = 0 (layout timing issue)
- Wrong dimensions (dimension calculation issue)
- Query skipped (timing/state issue)
- No data received (API/network issue)
- Wrong viewport calculated (math issue)

---

## 🛠️ Potential Fixes

Based on diagnostic findings, choose one:

### Fix 1: Force Full Map on Android (Safest)
```typescript
const [needsFullMap, setNeedsFullMap] = useState<boolean>(
  Platform.OS === 'android' ? true : false
);
```
- **Pros**: Guaranteed to work on all Android devices
- **Cons**: Slower initial load (2500 cells vs 500-1000)

---

### Fix 2: Wait for Layout (Balanced)
```typescript
const [layoutReady, setLayoutReady] = useState(false);

const onContainerLayout = useCallback((e: LayoutChangeEvent) => {
  const { width, height } = e.nativeEvent.layout;
  if (width > 0 && height > 0) {
    setContainerSize({ width, height });
    setLayoutReady(true);
  }
}, []);

const shouldSkipInitialQuery = !layoutReady || containerSize.width === 0 || containerSize.height === 0;
```
- **Pros**: Ensures layout is complete before loading
- **Cons**: Small delay, but accurate

---

### Fix 3: Platform-Specific Dimensions (Targeted)
```typescript
const initialDims = Platform.OS === 'android' 
  ? { 
      width: Dimensions.get('window').width,
      height: Dimensions.get('window').height - 48, // Nav bar
    }
  : Dimensions.get('window');
```
- **Pros**: Accounts for Android-specific UI elements
- **Cons**: Nav bar height varies by device/version

---

### Fix 4: Increase Buffer (Quick)
```typescript
const buffer = Platform.OS === 'android' ? 20 : 15;
```
- **Pros**: Quick fix, more likely to find user house
- **Cons**: Loads slightly more data

---

## 📊 Risk Assessment

**Production Impact**: 🟡 **MEDIUM**

**Why not HIGH**:
- Works in Pixel 9 Pro emulator
- Pixel 4a 5G doesn't show in Play Store (may not be supported)
- Could be device-specific issue

**Why not LOW**:
- HackMap is core game feature
- If it's API level related, could affect other older devices
- Need to verify it's not a wider issue

**Recommendation**: 
1. ✅ Add diagnostic logging first
2. ✅ Test and gather data
3. ⏳ Decide on fix based on findings
4. ⏳ Consider if old device support is worth the effort

---

## 🎯 Decision Tree

```
Add diagnostic logging
    ↓
Test on both devices
    ↓
Compare logs
    ↓
┌────────────────────┐
│  Identify issue    │
└────────────────────┘
         ↓
    ┌────┴────────────────────────┐
    ↓                              ↓
Layout timing issue         Dimension calculation issue
    ↓                              ↓
Use Fix 2                      Use Fix 3
    ↓                              ↓
    └──────────┬───────────────────┘
               ↓
    ┌──────────┴──────────┐
    ↓                      ↓
Works on both       Still broken
    ↓                      ↓
✅ Done              Try Fix 1 (force full map)
                           ↓
                    ┌──────┴──────────┐
                    ↓                  ↓
                Works            Still broken
                    ↓                  ↓
            ✅ Done           🔍 Deeper investigation
                              (API, network, rendering)
```

---

## 📞 Next Actions

1. **Review** `hackmap-android-diagnostic-code.md`
2. **Add** all 8 diagnostic code snippets to `HackMapScreen.tsx`
3. **Test** on Pixel 4a 5G device
4. **Test** on Pixel 9 Pro emulator
5. **Compare** log outputs
6. **Choose** appropriate fix based on findings
7. **Test** fix on both devices
8. **Decide** if production deployment needed

---

## 💡 Key Insights

1. **No Platform-specific code** exists in HackMapScreen - it's platform-agnostic
2. **Recent iOS optimizations** shouldn't have affected Android (no Platform.OS checks)
3. **Container dimension timing** is the most likely culprit
4. **Pixel 4a 5G isn't in Play Store** - may not be worth extensive fixes
5. **Diagnostic logging first** - don't fix blindly

---

## 📝 Notes

- Pixel 4a 5G: Android 13 (API 33)
- minSdkVersion: 24 (Android 7.0)
- Device meets SDK requirements ✅
- Play Store incompatibility is separate issue
- Focus on whether production users are affected

---

## ✅ Success Criteria

After investigation:
- [ ] Identified specific failure point
- [ ] Compared behavior between devices
- [ ] Determined if production issue or device-specific
- [ ] Implemented appropriate fix (if needed)
- [ ] Tested fix on both devices
- [ ] Decided whether to deploy to production
- [ ] Updated documentation with findings

**Start here**: `hackmap-android-diagnostic-code.md` → Add code → Test → Compare → Fix if needed
