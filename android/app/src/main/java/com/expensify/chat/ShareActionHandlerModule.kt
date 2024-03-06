package com.expensify.chat

import android.content.Context
import android.util.Log
import com.expensify.chat.intentHandler.IntentHandlerConstants
import com.facebook.react.bridge.Callback
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class ShareActionHandlerModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    override fun getName() = "ShareActionHandlerModule"

    @ReactMethod
    fun processFiles(callback: Callback) {
        try {
            val sharedPreferences = reactApplicationContext.getSharedPreferences(IntentHandlerConstants.preferencesFile, Context.MODE_PRIVATE)
            val shareObject = sharedPreferences.getString(IntentHandlerConstants.shareObjectProperty, "{}")

            Log.i("TestLaunchIntent", shareObject.toString())
            callback.invoke(shareObject)
        } catch (exception: Exception) {
            Log.e("ImageIntentHandler", exception.toString())
            callback.invoke(exception.toString(), null)
        }
    }

}