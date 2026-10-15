package com.expensify.paintobserver

import android.content.Context
import android.view.View
import com.facebook.react.bridge.ReactContext
import com.facebook.react.uimanager.UIManagerHelper

/**
 * Reports `onPaint` once per mount: the end of the frame that draws the mount which attached this view. Fabric
 * preallocates views while React renders, so the attach, not the creation, is what marks the mount.
 */
class PaintMarkerView(context: Context) : View(context) {
  private var didReport = false
  private var cancelTracking: (() -> Unit)? = null

  override fun onAttachedToWindow() {
    super.onAttachedToWindow()
    if (didReport || cancelTracking != null) {
      return
    }
    cancelTracking = PaintFrameTracker.track(this, System.nanoTime(), ::report)
  }

  override fun onDetachedFromWindow() {
    stopTracking()
    super.onDetachedFromWindow()
  }

  fun resetForRecycle() {
    stopTracking()
    didReport = false
  }

  private fun stopTracking() {
    cancelTracking?.invoke()
    cancelTracking = null
  }

  // System.nanoTime() is CLOCK_MONOTONIC, the steady_clock that performance.now() reads in React Native.
  private fun report(paintTimeNanos: Long) {
    cancelTracking = null
    didReport = true
    val reactContext = context as? ReactContext ?: return
    UIManagerHelper.getEventDispatcherForReactTag(reactContext, id)
        ?.dispatchEvent(PaintEvent(UIManagerHelper.getSurfaceId(this), id, paintTimeNanos / 1_000_000.0))
  }
}
