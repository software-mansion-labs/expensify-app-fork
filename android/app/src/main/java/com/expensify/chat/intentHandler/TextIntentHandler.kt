package com.expensify.chat.intentHandler

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.util.Log
import com.expensify.chat.utils.FileUtils


class TextIntentHandler(private val context: Context) : AbstractIntentHandler() {
    override fun handle(intent: Intent): Boolean {
        Log.i("TextIntentHandler", intent.toString())
        super.clearTemporaryFiles(context)
        when(intent.action) {
            Intent.ACTION_SEND -> {
                Log.i("TextIntentHandler", Intent.ACTION_SEND)
                handleTextIntent(intent, context)
                onCompleted()
                return true
            }
        }
        return false
    }

    private fun handleTextIntent(intent: Intent, context: Context) {
        when {
            intent.type == "text/plain" -> handleTextPlainIntent(intent, context)
            Regex("text/.*").matches(intent.type ?: "") -> handleTextFileIntent(intent, context)
            else -> throw UnsupportedOperationException("Unsupported MIME type: ${intent.type}")
        }
    }

    private fun handleTextFileIntent(intent: Intent, context: Context) {
        (intent.getParcelableExtra<Uri>(Intent.EXTRA_STREAM))?.let { fileUri ->
            Log.i("TextIntentHandler", "handleTextFileIntent uri: $fileUri")

            // Update UI to reflect image being shared
            if (fileUri == null) {
                return
            }

            val resultingPath: String? = FileUtils.copyUriToStorage(fileUri, context)
            if (resultingPath != null) {
                val shareFileObject = ShareFileObject(resultingPath, intent.type)

                val sharedPreferences = context.getSharedPreferences(IntentHandlerConstants.preferencesFile, Context.MODE_PRIVATE)
                val editor = sharedPreferences.edit()
                editor.putString(IntentHandlerConstants.shareObjectProperty, shareFileObject.toString())
                editor.apply()
            }
        }
    }

    private fun handleTextPlainIntent(intent: Intent, context: Context) {
            var intentTextContent = intent.getStringExtra(Intent.EXTRA_TEXT)
            Log.i("TextIntentHandler", "handleTextPlainIntent content: $intentTextContent")


            if(intentTextContent != null) {
                val shareFileObject = ShareFileObject(intentTextContent, intent.type)

                val sharedPreferences = context.getSharedPreferences(IntentHandlerConstants.preferencesFile, Context.MODE_PRIVATE)
                val editor = sharedPreferences.edit()
                editor.putString(IntentHandlerConstants.shareObjectProperty, shareFileObject.toString())
                editor.apply()
            }
    }

    override fun onCompleted() {
        val uri: Uri = Uri.parse("new-expensify://share/root")
        val deepLinkIntent = Intent(Intent.ACTION_VIEW, uri)
        deepLinkIntent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
        context.startActivity(deepLinkIntent)
    }

}