package com.expensify.paintobserver

import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.ViewManagerDelegate
import com.facebook.react.viewmanagers.PaintMarkerManagerDelegate
import com.facebook.react.viewmanagers.PaintMarkerManagerInterface

@ReactModule(name = PaintMarkerManager.REACT_CLASS)
class PaintMarkerManager : SimpleViewManager<PaintMarkerView>(), PaintMarkerManagerInterface<PaintMarkerView> {
  private val delegate = PaintMarkerManagerDelegate(this)

  override fun getDelegate(): ViewManagerDelegate<PaintMarkerView> = delegate

  override fun getName() = REACT_CLASS

  override fun createViewInstance(context: ThemedReactContext) = PaintMarkerView(context)

  override fun prepareToRecycleView(reactContext: ThemedReactContext, view: PaintMarkerView): PaintMarkerView? {
    view.resetForRecycle()
    return super.prepareToRecycleView(reactContext, view)
  }

  override fun getExportedCustomDirectEventTypeConstants(): MutableMap<String, Any> {
    val constants = super.getExportedCustomDirectEventTypeConstants() ?: mutableMapOf()
    constants[PaintEvent.EVENT_NAME] = mutableMapOf("registrationName" to "onPaint")
    return constants
  }

  companion object {
    const val REACT_CLASS = "PaintMarker"
  }
}
