package com.expensify.chat.intentHandler

import android.content.Context

object IntentHandlerFactory {
    fun getIntentHandler(context: Context, mimeType: String?): IntentHandler? {
        if (mimeType == null) return null
        return when {
            mimeType.startsWith("image/") -> ImageIntentHandler(context)
            mimeType.startsWith("application/") -> ApplicationIntentHandler(context)
            // Add other cases like video/*, application/pdf etc.
            else -> null
        }
    }
}