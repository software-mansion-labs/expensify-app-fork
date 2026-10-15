package com.expensify.paintobserver

import android.os.Build
import android.os.Handler
import android.os.Looper
import android.view.Choreographer
import android.view.FrameMetrics
import android.view.View
import android.view.Window
import androidx.annotation.RequiresApi
import com.facebook.react.bridge.ReactContext

/**
 * Finds the frame that draws a mount and reports when that frame finished rendering, the last in-app point before
 * SurfaceFlinger presents it. Each window gets one FrameMetrics listener, registered only while a marker waits.
 * Everything runs on the main thread: attach and detach happen there and the listener is delivered there.
 */
internal object PaintFrameTracker {
  private class Request(val attachTimeNanos: Long, val onPaint: (Long) -> Unit)

  private val mainHandler = Handler(Looper.getMainLooper())
  private val requestsByWindow = HashMap<Window, MutableList<Request>>()
  private val listenersByWindow = HashMap<Window, Window.OnFrameMetricsAvailableListener>()

  /** Returns a function that cancels the request. */
  fun track(view: View, attachTimeNanos: Long, onPaint: (Long) -> Unit): () -> Unit {
    val window = findWindow(view)
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O || window == null || !view.isHardwareAccelerated) {
      return trackNextFrame(view, onPaint)
    }
    if (!ensureListener(window)) {
      return trackNextFrame(view, onPaint)
    }
    val request = Request(attachTimeNanos, onPaint)
    requestsByWindow.getOrPut(window) { mutableListOf() }.add(request)
    return { cancel(window, request) }
  }

  // FrameMetrics only sees the activity window; markers inside a Dialog (RN Modal) fall back to the frame commit.
  private fun findWindow(view: View): Window? {
    val window = (view.context as? ReactContext)?.currentActivity?.window ?: return null
    return window.takeIf { it.decorView === view.rootView }
  }

  @RequiresApi(Build.VERSION_CODES.O)
  private fun ensureListener(window: Window): Boolean {
    if (listenersByWindow.containsKey(window)) {
      return true
    }
    val listener = Window.OnFrameMetricsAvailableListener { _, frameMetrics, _ -> onFrame(window, frameMetrics) }
    return try {
      window.addOnFrameMetricsAvailableListener(listener, mainHandler)
      listenersByWindow[window] = listener
      true
    } catch (_: IllegalStateException) {
      false
    }
  }

  // A mount runs before the UI thread draws its frame (Fabric mounts in the animation phase or between frames), so the
  // first frame whose draw starts after the attach is the one that draws it.
  @RequiresApi(Build.VERSION_CODES.O)
  private fun onFrame(window: Window, frameMetrics: FrameMetrics) {
    val requests = requestsByWindow[window] ?: return
    val intendedVsync = frameMetrics.getMetric(FrameMetrics.INTENDED_VSYNC_TIMESTAMP)
    val drawStart =
        intendedVsync +
            frameMetrics.getMetric(FrameMetrics.UNKNOWN_DELAY_DURATION) +
            frameMetrics.getMetric(FrameMetrics.INPUT_HANDLING_DURATION) +
            frameMetrics.getMetric(FrameMetrics.ANIMATION_DURATION) +
            frameMetrics.getMetric(FrameMetrics.LAYOUT_MEASURE_DURATION)
    val drawn = requests.filter { it.attachTimeNanos <= drawStart }
    if (drawn.isEmpty()) {
      return
    }
    requests.removeAll(drawn)
    removeListenerIfIdle(window)

    val paintTime = intendedVsync + frameMetrics.getMetric(FrameMetrics.TOTAL_DURATION)
    drawn.forEach { it.onPaint(paintTime) }
  }

  private fun cancel(window: Window, request: Request) {
    requestsByWindow[window]?.remove(request)
    removeListenerIfIdle(window)
  }

  // Posted so the listener is never removed while its own callback runs.
  private fun removeListenerIfIdle(window: Window) {
    mainHandler.post {
      if (requestsByWindow[window].isNullOrEmpty()) {
        requestsByWindow.remove(window)
        listenersByWindow.remove(window)?.let { window.removeOnFrameMetricsAvailableListener(it) }
      }
    }
  }

  private fun trackNextFrame(view: View, onPaint: (Long) -> Unit): () -> Unit {
    var isCanceled = false
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      view.viewTreeObserver.registerFrameCommitCallback {
        if (!isCanceled) {
          onPaint(System.nanoTime())
        }
      }
      return { isCanceled = true }
    }
    val callback = Choreographer.FrameCallback { onPaint(System.nanoTime()) }
    Choreographer.getInstance().postFrameCallback(callback)
    return { Choreographer.getInstance().removeFrameCallback(callback) }
  }
}
