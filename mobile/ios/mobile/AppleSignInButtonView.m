#import <React/RCTViewManager.h>
#import <React/RCTUIManager.h>
#import "AppleSignInButtonView-Swift.h"

@interface AppleSignInButtonViewManager : RCTViewManager
@end

@implementation AppleSignInButtonViewManager

RCT_EXPORT_MODULE(AppleSignInButtonView)

- (UIView *)view
{
  return [[AppleSignInButtonView alloc] init];
}

RCT_EXPORT_VIEW_PROPERTY(onPress, RCTBubblingEventBlock)

@end
