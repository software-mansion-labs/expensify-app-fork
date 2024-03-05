package com.expensify.chat

import android.content.Context
import android.util.Log
import com.expensify.chat.intentHandler.IntentHandlerConstants
import com.facebook.react.bridge.Arguments
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
            val fileSet = sharedPreferences.getStringSet(IntentHandlerConstants.fileArrayProperty, setOf())
            val fileArray: ArrayList<String> = ArrayList(fileSet)

            val resultArray = Arguments.createArray()
            for (file in fileArray) {
                resultArray.pushString(file)
            }

            callback.invoke(resultArray)
        } catch (exception: Exception) {
            Log.e("ImageIntentHandler", exception.toString())
            callback.invoke(exception.toString(), null)
        }
    }

}