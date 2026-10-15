#import "PaintMarkerComponentView.h"

#import <QuartzCore/QuartzCore.h>

#import <react/renderer/components/PaintObserverSpec/ComponentDescriptors.h>
#import <react/renderer/components/PaintObserverSpec/EventEmitters.h>
#import <react/renderer/components/PaintObserverSpec/Props.h>
#import <react/renderer/components/PaintObserverSpec/RCTComponentViewHelpers.h>

#import <cmath>

using namespace facebook::react;

// Core Animation commits the implicit transaction from a main run loop observer of this order; ours runs right after.
static const CFIndex kAfterCoreAnimationCommitOrder = 2000001;

@interface PaintMarkerComponentView () <RCTPaintMarkerViewProtocol>
@end

@implementation PaintMarkerComponentView {
  BOOL _didReport;
  CFRunLoopObserverRef _commitObserver;
  CADisplayLink *_displayLink;
  CFTimeInterval _commitTime;
  CFTimeInterval _vsyncTime;
  CFTimeInterval _frameDuration;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider
{
  return concreteComponentDescriptorProvider<PaintMarkerComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame
{
  if (self = [super initWithFrame:frame]) {
    static const auto defaultProps = std::make_shared<const PaintMarkerProps>();
    _props = defaultProps;
    self.userInteractionEnabled = NO;
  }
  return self;
}

- (void)didMoveToWindow
{
  [super didMoveToWindow];

  if (self.window == nil) {
    [self stopTracking];
    return;
  }

  if (!_didReport && _displayLink == nil && _commitObserver == nil) {
    [self startTracking];
  }
}

- (void)prepareForRecycle
{
  [super prepareForRecycle];
  [self stopTracking];
  _didReport = NO;
}

- (void)dealloc
{
  [self stopTracking];
}

#pragma mark - Tracking

// The view joins the window while the mount transaction runs. The commit time comes from the run loop observer, the
// vsync grid from one display link tick; whichever lands second reports.
- (void)startTracking
{
  _commitTime = 0;
  _vsyncTime = 0;

  __weak PaintMarkerComponentView *weakSelf = self;
  _commitObserver = CFRunLoopObserverCreateWithHandler(
      kCFAllocatorDefault,
      kCFRunLoopBeforeWaiting | kCFRunLoopExit,
      false,
      kAfterCoreAnimationCommitOrder,
      ^(CFRunLoopObserverRef observer, CFRunLoopActivity activity) {
        [weakSelf handleCommit];
      });
  CFRunLoopAddObserver(CFRunLoopGetMain(), _commitObserver, kCFRunLoopCommonModes);

  _displayLink = [CADisplayLink displayLinkWithTarget:self selector:@selector(handleVsync:)];
  [_displayLink addToRunLoop:[NSRunLoop mainRunLoop] forMode:NSRunLoopCommonModes];
}

- (void)stopTracking
{
  [_displayLink invalidate];
  _displayLink = nil;

  if (_commitObserver != nil) {
    CFRunLoopObserverInvalidate(_commitObserver);
    CFRelease(_commitObserver);
    _commitObserver = nil;
  }
}

- (void)handleCommit
{
  _commitTime = CACurrentMediaTime();
  [self reportIfReady];
}

- (void)handleVsync:(CADisplayLink *)displayLink
{
  _vsyncTime = displayLink.timestamp;
  _frameDuration = displayLink.targetTimestamp - displayLink.timestamp;
  [displayLink invalidate];
  _displayLink = nil;
  [self reportIfReady];
}

- (void)reportIfReady
{
  if (_commitTime == 0 || _vsyncTime == 0) {
    return;
  }

  // The first vsync at or after the commit, on the grid of the tick (the tick can come before or after the commit).
  const double steps = _frameDuration > 0 ? std::ceil((_commitTime - _vsyncTime) / _frameDuration) : 0;
  const CFTimeInterval paintTime = _vsyncTime + steps * _frameDuration;

  // React Native reads performance.now() from mach_absolute_time on Apple platforms, the clock of CACurrentMediaTime.
  const double paintTimeMs = paintTime * 1000;

  [self stopTracking];
  _didReport = YES;

  if (_eventEmitter) {
    std::static_pointer_cast<const PaintMarkerEventEmitter>(_eventEmitter)->onPaint({.paintTime = paintTimeMs});
  }
}

@end

Class<RCTComponentViewProtocol> PaintMarkerCls(void)
{
  return PaintMarkerComponentView.class;
}
