package com.expensify.chat.intentHandler

import android.content.Intent

interface IntentHandler {
    fun handle(intent: Intent?): Boolean
    fun onCompleted()
}