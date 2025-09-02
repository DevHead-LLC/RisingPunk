# Current Task: Fix Onboarding Completion Centering ✅ COMPLETED

## Issue
After completing the slideshow and TurfScreen walkthrough onboarding, the panning/scrolling position is not properly centered on the home location and digital barracks. The position is "just off" from center, unlike when entering profile/financial statement screens and then closing them, which properly centers the view.

## Root Cause
The centering logic exists in `navigateToScreen` function for returning from profile screens, but onboarding completion handlers don't trigger this centering logic.

## Solution ✅ IMPLEMENTED
Added centering logic to both `handleOnboardingComplete` and `handleTurfIntroComplete` functions to ensure proper centering after onboarding completion.

## Changes Made
- **`mobile/src/screens/TurfScreen.tsx`** - Added centering logic to all onboarding completion handlers:
  - `handleOnboardingComplete` - Centers view after completing onboarding
  - `handleOnboardingSkip` - Centers view after skipping onboarding  
  - `handleTurfIntroComplete` - Centers view after completing turf intro
  - `handleTurfIntroSkip` - Centers view after skipping turf intro

## Centering Logic
Uses the exact same centering calculation as profile screen closing:
```typescript
const SCREEN_WIDTH = Dimensions.get('window').width;
const CONTENT_WIDTH = 2000;
const CENTER_X = (CONTENT_WIDTH - SCREEN_WIDTH) / 2;

horizontalScrollRef.current?.scrollTo({
  x: CENTER_X,
  y: 0,
  animated: false,
});
```

## Result
Now when onboarding (slideshow + turf walkthrough) is completed, the view will be properly centered on the home location and digital barracks, matching the behavior when closing profile/financial statement screens.
