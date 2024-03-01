package com.expensify.chat

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
            //Perform your operation here. For instance, load your files

            val fileArray: ArrayList<String> = ArrayList()
            // Add your files to "fileArray"

            val resultArray = Arguments.createArray()
            for (file in fileArray) {
                resultArray.pushString(file)
            }

            //invoke the callback with your loaded files
            callback.invoke(null, resultArray)

        } catch (exception: Exception) {
            callback.invoke(exception.toString(), null)
        }
    }

}