#import "BootSplashController.h"

void (^bootSplashDidAppearCallback)(void) = nil;

@implementation BootSplashController

- (void)setBootSplashDidAppearCallback:(void (^ _Nonnull)(void))callback {
    bootSplashDidAppearCallback = [callback copy];
}

- (void)viewDidAppear:(BOOL)animated {
    [super viewDidAppear:animated];
  
  NSLog(@"Called BootSplashController viewDidAppear");

    if (bootSplashDidAppearCallback) {
      NSLog(@"Hiding BootSplash from custom controller");
        bootSplashDidAppearCallback();
    }
}

@end
