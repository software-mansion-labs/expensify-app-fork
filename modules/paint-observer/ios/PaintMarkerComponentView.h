#import <React/RCTViewComponentView.h>
#import <UIKit/UIKit.h>

NS_ASSUME_NONNULL_BEGIN

/**
 * Reports `onPaint` once per mount: the vsync at which the render server picks up the Core Animation commit that
 * carried the mount inserting this view.
 */
@interface PaintMarkerComponentView : RCTViewComponentView
@end

NS_ASSUME_NONNULL_END
