package com.expensify.paintobserver

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import com.facebook.react.uimanager.events.Event

internal class PaintEvent(surfaceId: Int, viewId: Int, private val paintTimeMs: Double) :
    Event<PaintEvent>(surfaceId, viewId) {
  override fun getEventName() = EVENT_NAME

  override fun getEventData(): WritableMap = Arguments.createMap().apply { putDouble("paintTime", paintTimeMs) }

  companion object {
    const val EVENT_NAME = "topPaint"
  }
}
