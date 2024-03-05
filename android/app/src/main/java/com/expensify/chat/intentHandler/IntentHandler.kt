package com.expensify.chat.intentHandler

import android.content.Intent

object IntentHandlerConstants {
    const val preferencesFile = "shareActionHandler"
    const val fileArrayProperty = "filePaths"
}
interface IntentHandler {
    fun handle(intent: Intent): Boolean
    fun onCompleted()
}