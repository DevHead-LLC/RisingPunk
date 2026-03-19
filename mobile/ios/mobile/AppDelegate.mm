#import "AppDelegate.h"

#import <AppTrackingTransparency/AppTrackingTransparency.h>
#import <React/RCTBundleURLProvider.h>
#import <FirebaseCore/FirebaseCore.h>

@implementation AppDelegate

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  // Initialize Firebase before React Native bridge
  [FIRApp configure];
  
#if DEBUG
  // Enable Firebase Analytics debug mode for DebugView (iOS only)
  // This allows events to appear in Firebase Console → Analytics → DebugView
  // Method 1: Xcode scheme argument -FIRAnalyticsDebugEnabled (most reliable)
  // Method 2: UserDefaults (fallback if scheme argument doesn't work)
  
  // Set Firebase debug mode via UserDefaults
  [[NSUserDefaults standardUserDefaults] setBool:YES forKey:@"/google/firebase/debug_mode"];
  
  // Also set Analytics debug mode (required for DebugView)
  Class APMUserDefaults = NSClassFromString(@"APMUserDefaults");
  if (APMUserDefaults) {
    SEL standardSelector = NSSelectorFromString(@"standardUserDefaults");
    if ([APMUserDefaults respondsToSelector:standardSelector]) {
      #pragma clang diagnostic push
      #pragma clang diagnostic ignored "-Warc-performSelector-leaks"
      id apmDefaults = [APMUserDefaults performSelector:standardSelector];
      if (apmDefaults) {
        SEL setObjectSelector = NSSelectorFromString(@"setObject:forKey:");
        if ([apmDefaults respondsToSelector:setObjectSelector]) {
          [apmDefaults performSelector:setObjectSelector withObject:@YES withObject:@"/google/measurement/debug_mode"];
        }
      }
      #pragma clang diagnostic pop
    }
  }
  
  [[NSUserDefaults standardUserDefaults] synchronize];
#endif
  
  self.moduleName = @"mobile";
  // You can add your custom initial props in the dictionary below.
  // They will be passed down to the ViewController used by React Native.
  self.initialProps = @{};

  return [super application:application didFinishLaunchingWithOptions:launchOptions];
}

- (void)applicationDidBecomeActive:(UIApplication *)application
{
  [super applicationDidBecomeActive:application];

  // ATT must run while UIApplicationStateActive; didFinishLaunching is too early on iOS 15+.
  if (@available(iOS 14.0, *)) {
    if ([ATTrackingManager trackingAuthorizationStatus] == ATTrackingManagerAuthorizationStatusNotDetermined) {
      [ATTrackingManager requestTrackingAuthorizationWithCompletionHandler:^(__unused ATTrackingManagerAuthorizationStatus status) {
      }];
    }
  }
}

- (NSURL *)sourceURLForBridge:(RCTBridge *)bridge
{
  return [self bundleURL];
}

- (NSURL *)bundleURL
{
#if DEBUG
  return [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@"index"];
#else
  return [[NSBundle mainBundle] URLForResource:@"main" withExtension:@"jsbundle"];
#endif
}

// Force landscape orientation for the app and all modals.
- (UIInterfaceOrientationMask)application:(UIApplication *)application supportedInterfaceOrientationsForWindow:(UIWindow *)window
{
  return UIInterfaceOrientationMaskLandscape;
}

// Additional method to ensure landscape orientation is enforced
- (UIInterfaceOrientation)preferredInterfaceOrientationForPresentation
{
  return UIInterfaceOrientationLandscapeLeft;
}

@end
